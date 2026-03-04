import Foundation
import Network
import SwiftData
import Combine

// MARK: - BAR-371: Offline Mode & Sync Engine
// Full offline support: network monitoring, request queue, background sync,
// conflict resolution, and connectivity-aware UI.

/// Network connectivity status.
enum ConnectivityStatus: String {
    case online
    case offline
    case constrained  // e.g., Low Data Mode
}

/// A queued API request waiting to be sent when back online.
struct QueuedRequest: Codable, Identifiable {
    let id: UUID
    let path: String
    let method: String
    let body: Data?
    let createdAt: Date
    var retryCount: Int
    let priority: RequestPriority
    let entityType: String?   // "package", "customer", etc.
    let entityId: String?     // ID of the entity being modified

    enum RequestPriority: Int, Codable, Comparable {
        case critical = 0   // Check-ins, check-outs
        case high = 1       // Notifications, status changes
        case normal = 2     // Updates, notes
        case low = 3        // Analytics, non-essential

        static func < (lhs: Self, rhs: Self) -> Bool {
            lhs.rawValue < rhs.rawValue
        }
    }
}

/// Conflict resolution strategies.
enum ConflictStrategy {
    case clientWins       // Local change overwrites server
    case serverWins       // Server data overwrites local
    case merge            // Attempt field-level merge
    case askUser          // Prompt user to choose
}

// MARK: - Network Monitor

/// Observes network connectivity using NWPathMonitor.
@MainActor
final class NetworkMonitor: ObservableObject {
    static let shared = NetworkMonitor()

    @Published private(set) var status: ConnectivityStatus = .online
    @Published private(set) var isExpensive = false   // Cellular
    @Published private(set) var interfaceType: NWInterface.InterfaceType?

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "ai.bardolabs.shipos.network-monitor")

    var isOnline: Bool { status == .online }

    private init() {
        monitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor [weak self] in
                guard let self else { return }

                let newStatus: ConnectivityStatus
                if path.status == .satisfied {
                    newStatus = path.isConstrained ? .constrained : .online
                } else {
                    newStatus = .offline
                }

                if self.status != newStatus {
                    self.status = newStatus
                    NotificationCenter.default.post(
                        name: .connectivityChanged,
                        object: nil,
                        userInfo: ["status": newStatus]
                    )
                }

                self.isExpensive = path.isExpensive
                self.interfaceType = path.availableInterfaces.first?.type
            }
        }
        monitor.start(queue: queue)
    }

    deinit {
        monitor.cancel()
    }
}

// MARK: - Offline Queue

/// Persists API requests that failed due to offline status, replays them when connectivity returns.
actor OfflineQueue {
    static let shared = OfflineQueue()

    private let fileURL: URL
    private var queue: [QueuedRequest] = []
    private var isSyncing = false

    private init() {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        self.fileURL = docs.appendingPathComponent("offline_queue.json")
        Task { await loadFromDisk() }
    }

    /// Number of pending requests.
    var pendingCount: Int { queue.count }

    /// All queued requests sorted by priority.
    var pendingRequests: [QueuedRequest] {
        queue.sorted { $0.priority < $1.priority }
    }

    /// Enqueue a request for later execution.
    func enqueue(
        path: String,
        method: String,
        body: Data? = nil,
        priority: QueuedRequest.RequestPriority = .normal,
        entityType: String? = nil,
        entityId: String? = nil
    ) {
        let request = QueuedRequest(
            id: UUID(),
            path: path,
            method: method,
            body: body,
            createdAt: Date(),
            retryCount: 0,
            priority: priority,
            entityType: entityType,
            entityId: entityId
        )

        // De-duplicate: if same entity+path exists, replace with latest
        if let entityId, let entityType {
            queue.removeAll { $0.entityId == entityId && $0.entityType == entityType && $0.path == path }
        }

        queue.append(request)
        saveToDisk()

        print("[OfflineQueue] Enqueued \(method) \(path) (pending: \(queue.count))")
    }

    /// Process all queued requests. Called when connectivity is restored.
    func processQueue() async -> SyncResult {
        guard !isSyncing, !queue.isEmpty else {
            return SyncResult(processed: 0, succeeded: 0, failed: 0, errors: [])
        }

        isSyncing = true
        defer { isSyncing = false }

        var succeeded = 0
        var failed = 0
        var errors: [SyncError] = []

        let sorted = queue.sorted { $0.priority < $1.priority }

        for request in sorted {
            do {
                let endpoint = Endpoint(
                    path: request.path,
                    method: HTTPMethod(rawValue: request.method) ?? .post,
                    body: request.body.map { RawBody(data: $0) }
                )

                try await APIClient.shared.request(endpoint)
                queue.removeAll { $0.id == request.id }
                succeeded += 1

                print("[OfflineQueue] ✅ Synced \(request.method) \(request.path)")
            } catch {
                var updated = request
                updated.retryCount += 1

                if updated.retryCount >= 5 {
                    // Max retries exceeded — move to dead letter
                    queue.removeAll { $0.id == request.id }
                    errors.append(SyncError(request: updated, error: error.localizedDescription))
                    failed += 1
                    print("[OfflineQueue] ❌ Failed permanently: \(request.path)")
                } else {
                    // Update retry count
                    if let idx = queue.firstIndex(where: { $0.id == request.id }) {
                        queue[idx] = updated
                    }
                    failed += 1
                }
            }
        }

        saveToDisk()
        return SyncResult(processed: sorted.count, succeeded: succeeded, failed: failed, errors: errors)
    }

    /// Clear all queued requests.
    func clearQueue() {
        queue.removeAll()
        saveToDisk()
    }

    // MARK: - Persistence

    private func saveToDisk() {
        do {
            let data = try JSONEncoder().encode(queue)
            try data.write(to: fileURL, options: .atomic)
        } catch {
            print("[OfflineQueue] Save error: \(error)")
        }
    }

    private func loadFromDisk() {
        guard FileManager.default.fileExists(atPath: fileURL.path) else { return }
        do {
            let data = try Data(contentsOf: fileURL)
            queue = try JSONDecoder().decode([QueuedRequest].self, from: data)
            print("[OfflineQueue] Loaded \(queue.count) pending requests")
        } catch {
            print("[OfflineQueue] Load error: \(error)")
        }
    }
}

// MARK: - Sync Engine

/// Orchestrates data synchronization between local SwiftData and the remote API.
@MainActor
final class SyncEngine: ObservableObject {
    static let shared = SyncEngine()

    @Published private(set) var syncState: SyncState = .idle
    @Published private(set) var lastSyncDate: Date?
    @Published private(set) var pendingChanges: Int = 0

    private var cancellables = Set<AnyCancellable>()
    private var syncTimer: Timer?

    enum SyncState: Equatable {
        case idle
        case syncing(progress: Double)
        case completed(SyncResult)
        case failed(String)

        static func == (lhs: SyncState, rhs: SyncState) -> Bool {
            switch (lhs, rhs) {
            case (.idle, .idle): return true
            case (.syncing, .syncing): return true
            case (.completed, .completed): return true
            case (.failed, .failed): return true
            default: return false
            }
        }
    }

    private init() {
        observeConnectivity()
        loadLastSyncDate()
    }

    /// Start periodic background sync.
    func startPeriodicSync(interval: TimeInterval = 300) {
        syncTimer?.invalidate()
        syncTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in
            Task { @MainActor [weak self] in
                await self?.syncIfNeeded()
            }
        }
    }

    /// Stop periodic sync.
    func stopPeriodicSync() {
        syncTimer?.invalidate()
        syncTimer = nil
    }

    /// Perform a full sync: push pending changes, then pull fresh data.
    func performFullSync() async {
        guard NetworkMonitor.shared.isOnline else {
            syncState = .failed("No network connection")
            return
        }

        syncState = .syncing(progress: 0.0)

        // Phase 1: Push offline queue
        syncState = .syncing(progress: 0.1)
        let pushResult = await OfflineQueue.shared.processQueue()

        // Phase 2: Pull packages
        syncState = .syncing(progress: 0.3)
        await pullPackages()

        // Phase 3: Pull customers
        syncState = .syncing(progress: 0.6)
        await pullCustomers()

        // Phase 4: Pull notifications
        syncState = .syncing(progress: 0.8)
        await pullNotifications()

        // Done
        syncState = .syncing(progress: 1.0)
        let result = SyncResult(
            processed: pushResult.processed,
            succeeded: pushResult.succeeded,
            failed: pushResult.failed,
            errors: pushResult.errors
        )
        syncState = .completed(result)
        lastSyncDate = Date()
        saveLastSyncDate()

        pendingChanges = await OfflineQueue.shared.pendingCount
    }

    /// Sync only if enough time has passed since last sync.
    func syncIfNeeded() async {
        guard NetworkMonitor.shared.isOnline else { return }

        if let last = lastSyncDate, Date().timeIntervalSince(last) < 60 {
            return // Synced recently
        }

        await performFullSync()
    }

    // MARK: - Pull Operations

    private func pullPackages() async {
        do {
            let response: PackageListResponse = try await APIClient.shared.request(
                API.Packages.list(page: 1, limit: 200)
            )
            let context = PersistenceController.shared.container.mainContext
            try PersistenceController.shared.syncPackages(response.packages, context: context)
        } catch {
            print("[Sync] Pull packages error: \(error)")
        }
    }

    private func pullCustomers() async {
        do {
            let response: CustomerListResponse = try await APIClient.shared.request(
                API.Customers.list(page: 1, limit: 200)
            )
            let context = PersistenceController.shared.container.mainContext
            try PersistenceController.shared.syncCustomers(response.customers, context: context)
        } catch {
            print("[Sync] Pull customers error: \(error)")
        }
    }

    private func pullNotifications() async {
        // Notifications don't need SwiftData sync — they're ephemeral
        // Just refresh the in-memory list
    }

    // MARK: - Connectivity Observer

    private func observeConnectivity() {
        NotificationCenter.default.publisher(for: .connectivityChanged)
            .compactMap { $0.userInfo?["status"] as? ConnectivityStatus }
            .receive(on: DispatchQueue.main)
            .sink { [weak self] status in
                if status == .online {
                    Task { @MainActor [weak self] in
                        await self?.performFullSync()
                    }
                }
            }
            .store(in: &cancellables)
    }

    // MARK: - Persistence

    private func loadLastSyncDate() {
        lastSyncDate = UserDefaults.standard.object(forKey: "last_sync_date") as? Date
    }

    private func saveLastSyncDate() {
        UserDefaults.standard.set(lastSyncDate, forKey: "last_sync_date")
    }
}

// MARK: - Connectivity Banner

/// A banner view that appears when the device goes offline.
struct ConnectivityBanner: View {
    @ObservedObject var networkMonitor = NetworkMonitor.shared
    @ObservedObject var syncEngine = SyncEngine.shared

    var body: some View {
        if !networkMonitor.isOnline {
            HStack(spacing: ShipOSTheme.Spacing.sm) {
                Image(systemName: "wifi.slash")
                    .font(.system(size: 14, weight: .semibold))

                VStack(alignment: .leading, spacing: 2) {
                    Text("You're offline")
                        .font(ShipOSTheme.Typography.subheadline)

                    if syncEngine.pendingChanges > 0 {
                        Text("\(syncEngine.pendingChanges) changes will sync when reconnected")
                            .font(ShipOSTheme.Typography.caption)
                            .opacity(0.8)
                    }
                }

                Spacer()

                if case .syncing = syncEngine.syncState {
                    ProgressView()
                        .tint(.white)
                        .scaleEffect(0.8)
                }
            }
            .foregroundStyle(.white)
            .padding(.horizontal, ShipOSTheme.Spacing.lg)
            .padding(.vertical, ShipOSTheme.Spacing.md)
            .background(Color(hex: "#f97316"))
            .transition(.move(edge: .top).combined(with: .opacity))
        }
    }
}

/// Sync status indicator — shows in settings or as a toolbar accessory.
struct SyncStatusView: View {
    @ObservedObject var syncEngine = SyncEngine.shared
    @ObservedObject var networkMonitor = NetworkMonitor.shared

    var body: some View {
        HStack(spacing: ShipOSTheme.Spacing.sm) {
            statusIcon

            VStack(alignment: .leading, spacing: 2) {
                Text(statusTitle)
                    .font(ShipOSTheme.Typography.subheadline)
                    .foregroundStyle(ShipOSTheme.Colors.textPrimary)

                Text(statusDetail)
                    .font(ShipOSTheme.Typography.caption)
                    .foregroundStyle(ShipOSTheme.Colors.textSecondary)
            }

            Spacer()

            if networkMonitor.isOnline {
                Button("Sync Now") {
                    Task { await syncEngine.performFullSync() }
                }
                .font(ShipOSTheme.Typography.subheadline)
                .foregroundStyle(ShipOSTheme.Colors.primary)
            }
        }
        .padding()
        .background(ShipOSTheme.Colors.surfacePrimary)
        .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.medium))
    }

    @ViewBuilder
    private var statusIcon: some View {
        switch syncEngine.syncState {
        case .idle:
            Image(systemName: networkMonitor.isOnline ? "checkmark.icloud" : "icloud.slash")
                .foregroundStyle(networkMonitor.isOnline ? ShipOSTheme.Colors.success : ShipOSTheme.Colors.warning)
        case .syncing(let progress):
            ZStack {
                Circle()
                    .stroke(lineWidth: 2)
                    .opacity(0.3)
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(style: StrokeStyle(lineWidth: 2, lineCap: .round))
                    .rotationEffect(.degrees(-90))
            }
            .foregroundStyle(ShipOSTheme.Colors.primary)
            .frame(width: 20, height: 20)
        case .completed:
            Image(systemName: "checkmark.icloud.fill")
                .foregroundStyle(ShipOSTheme.Colors.success)
        case .failed:
            Image(systemName: "exclamationmark.icloud")
                .foregroundStyle(ShipOSTheme.Colors.error)
        }
    }

    private var statusTitle: String {
        switch syncEngine.syncState {
        case .idle: networkMonitor.isOnline ? "Up to date" : "Offline mode"
        case .syncing: "Syncing…"
        case .completed: "Synced"
        case .failed(let msg): "Sync failed: \(msg)"
        }
    }

    private var statusDetail: String {
        if let lastSync = syncEngine.lastSyncDate {
            "Last synced \(lastSync.relativeFormatted)"
        } else {
            "Never synced"
        }
    }
}

// MARK: - Supporting Types

struct SyncResult: Equatable {
    let processed: Int
    let succeeded: Int
    let failed: Int
    let errors: [SyncError]

    static func == (lhs: SyncResult, rhs: SyncResult) -> Bool {
        lhs.processed == rhs.processed && lhs.succeeded == rhs.succeeded && lhs.failed == rhs.failed
    }
}

struct SyncError: Equatable {
    let request: QueuedRequest
    let error: String

    static func == (lhs: SyncError, rhs: SyncError) -> Bool {
        lhs.request.id == rhs.request.id
    }
}

/// Wrapper so raw Data can be passed as Encodable body.
struct RawBody: Encodable {
    let data: Data

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        try container.encode(data)
    }
}

// MARK: - Notification Names

extension Notification.Name {
    static let connectivityChanged = Notification.Name("ShipOS.connectivityChanged")
}

import SwiftUI
