import SwiftUI

/// BAR-363: Batch Operations — multi-select packages for bulk check-out, notify, move, status update.
struct BatchOperationsView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = BatchOpsViewModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Action toolbar
                if !viewModel.selectedIds.isEmpty {
                    batchActionBar
                }

                // Search + filter
                SOSearchBar(text: $viewModel.searchText, placeholder: "Search packages...") {
                    Task { await viewModel.search() }
                }
                .padding(.horizontal)
                .padding(.vertical, ShipOSTheme.Spacing.sm)

                // Status filter
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        FilterChip(label: "Checked In", isSelected: viewModel.statusFilter == .checkedIn, color: ShipOSTheme.Colors.info) {
                            viewModel.statusFilter = .checkedIn
                            Task { await viewModel.refresh() }
                        }
                        FilterChip(label: "Notified", isSelected: viewModel.statusFilter == .notified, color: ShipOSTheme.Colors.warning) {
                            viewModel.statusFilter = .notified
                            Task { await viewModel.refresh() }
                        }
                        FilterChip(label: "Held", isSelected: viewModel.statusFilter == .held, color: Color(hex: "#a855f7")) {
                            viewModel.statusFilter = .held
                            Task { await viewModel.refresh() }
                        }
                    }
                    .padding(.horizontal)
                }

                // Select all
                HStack {
                    Button {
                        viewModel.toggleSelectAll()
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: viewModel.allSelected ? "checkmark.square.fill" : "square")
                                .foregroundStyle(ShipOSTheme.Colors.primary)
                            Text(viewModel.allSelected ? "Deselect All" : "Select All (\(viewModel.packages.count))")
                                .font(ShipOSTheme.Typography.caption)
                        }
                    }
                    .buttonStyle(.plain)

                    Spacer()

                    Text("\(viewModel.selectedIds.count) selected")
                        .font(ShipOSTheme.Typography.caption)
                        .foregroundStyle(ShipOSTheme.Colors.primary)
                }
                .padding(.horizontal)
                .padding(.vertical, ShipOSTheme.Spacing.xs)

                // Package list with checkboxes
                if viewModel.packages.isEmpty && !viewModel.isLoading {
                    SOEmptyState(
                        icon: "shippingbox",
                        title: "No Packages",
                        message: "No packages match the current filter."
                    )
                } else {
                    List {
                        ForEach(viewModel.packages, id: \.id) { pkg in
                            BatchPackageRow(
                                package: pkg,
                                isSelected: viewModel.selectedIds.contains(pkg.id)
                            ) {
                                viewModel.toggleSelection(pkg.id)
                            }
                        }

                        if viewModel.hasMore {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                                .onAppear { Task { await viewModel.loadMore() } }
                        }
                    }
                    .listStyle(.plain)
                    .refreshable { await viewModel.refresh() }
                }
            }
            .navigationTitle("Batch Operations")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .task { await viewModel.load() }
            .sheet(isPresented: $viewModel.showingStoragePicker) {
                StorageLocationPicker(onSelected: { location in
                    Task { await viewModel.batchMoveStorage(to: location) }
                })
            }
            .confirmationDialog(
                "Batch Check Out",
                isPresented: $viewModel.showingCheckOutConfirm
            ) {
                Button("Check Out \(viewModel.selectedIds.count) Packages", role: .destructive) {
                    Task { await viewModel.batchCheckOut() }
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This will release \(viewModel.selectedIds.count) selected packages. This cannot be undone.")
            }
            .overlay {
                if viewModel.isProcessing {
                    batchProgressOverlay
                }
            }
            .toast($viewModel.toast)
        }
    }

    // MARK: - Batch Action Bar

    private var batchActionBar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: ShipOSTheme.Spacing.md) {
                BatchActionButton(
                    icon: "checkmark.circle.fill",
                    label: "Check Out",
                    color: ShipOSTheme.Colors.success
                ) {
                    viewModel.showingCheckOutConfirm = true
                }

                BatchActionButton(
                    icon: "bell.fill",
                    label: "Notify",
                    color: ShipOSTheme.Colors.warning
                ) {
                    Task { await viewModel.batchNotify() }
                }

                BatchActionButton(
                    icon: "arrow.right.square.fill",
                    label: "Move",
                    color: ShipOSTheme.Colors.info
                ) {
                    viewModel.showingStoragePicker = true
                }

                BatchActionButton(
                    icon: "tray.full.fill",
                    label: "Hold",
                    color: Color(hex: "#a855f7")
                ) {
                    Task { await viewModel.batchUpdateStatus(to: .held) }
                }

                BatchActionButton(
                    icon: "arrow.uturn.left",
                    label: "Return",
                    color: Color(hex: "#f97316")
                ) {
                    Task { await viewModel.batchUpdateStatus(to: .returned) }
                }
            }
            .padding(.horizontal)
            .padding(.vertical, ShipOSTheme.Spacing.md)
        }
        .background(ShipOSTheme.Colors.surfaceSecondary)
    }

    // MARK: - Progress Overlay

    private var batchProgressOverlay: some View {
        ZStack {
            Color.black.opacity(0.3).ignoresSafeArea()

            VStack(spacing: ShipOSTheme.Spacing.lg) {
                ProgressView(value: viewModel.progress, total: 1.0)
                    .progressViewStyle(.linear)
                    .tint(ShipOSTheme.Colors.primary)

                Text("Processing \(viewModel.processedCount)/\(viewModel.selectedIds.count)...")
                    .font(ShipOSTheme.Typography.subheadline)
                    .foregroundStyle(.white)

                Text(viewModel.currentAction)
                    .font(ShipOSTheme.Typography.caption)
                    .foregroundStyle(.white.opacity(0.7))
            }
            .padding(ShipOSTheme.Spacing.xxl)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.large))
            .padding(.horizontal, ShipOSTheme.Spacing.xxl)
        }
    }
}

// MARK: - Batch Package Row

struct BatchPackageRow: View {
    let package: Package
    let isSelected: Bool
    let onToggle: () -> Void

    var body: some View {
        Button(action: onToggle) {
            HStack(spacing: ShipOSTheme.Spacing.md) {
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(isSelected ? ShipOSTheme.Colors.primary : ShipOSTheme.Colors.textTertiary)
                    .animation(ShipOSTheme.Animation.quick, value: isSelected)

                SOPackageRow(package: package)
            }
        }
        .buttonStyle(.plain)
        .listRowBackground(isSelected ? ShipOSTheme.Colors.primary.opacity(0.05) : nil)
    }
}

// MARK: - Batch Action Button

struct BatchActionButton: View {
    let icon: String
    let label: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.body)
                    .foregroundStyle(color)
                    .frame(width: 44, height: 44)
                    .background(color.opacity(0.12))
                    .clipShape(Circle())

                Text(label)
                    .font(ShipOSTheme.Typography.caption2)
                    .foregroundStyle(ShipOSTheme.Colors.textSecondary)
            }
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Storage Location Picker

struct StorageLocationPicker: View {
    let onSelected: (String) -> Void
    @Environment(\.dismiss) private var dismiss
    @State private var locations: [String] = []
    @State private var customLocation = ""

    var body: some View {
        NavigationStack {
            List {
                Section("Saved Locations") {
                    ForEach(locations, id: \.self) { loc in
                        Button {
                            onSelected(loc)
                            dismiss()
                        } label: {
                            Label(loc, systemImage: "mappin.circle")
                        }
                    }

                    if locations.isEmpty {
                        Text("No saved locations")
                            .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                    }
                }

                Section("Custom") {
                    HStack {
                        TextField("Location...", text: $customLocation)
                        Button("Apply") {
                            guard !customLocation.isEmpty else { return }
                            onSelected(customLocation)
                            dismiss()
                        }
                        .disabled(customLocation.isEmpty)
                    }
                }
            }
            .navigationTitle("Move To")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .task { await loadLocations() }
        }
    }

    private func loadLocations() async {
        do {
            let result: [String] = try await APIClient.shared.request(
                API.Settings.storageLocations()
            )
            locations = result
        } catch {
            // Provide defaults
            locations = ["Shelf A", "Shelf B", "Shelf C", "Back Room", "Front Counter", "Overflow"]
        }
    }
}

// MARK: - View Model

@MainActor
final class BatchOpsViewModel: ObservableObject {
    @Published var packages: [Package] = []
    @Published var selectedIds: Set<String> = []
    @Published var searchText = ""
    @Published var statusFilter: PackageStatus = .checkedIn
    @Published var isLoading = false
    @Published var hasMore = true
    @Published var toast: ToastMessage?

    // Batch processing
    @Published var isProcessing = false
    @Published var progress: Double = 0
    @Published var processedCount = 0
    @Published var currentAction = ""

    // Sheets
    @Published var showingStoragePicker = false
    @Published var showingCheckOutConfirm = false

    private var currentPage = 1
    private let pageSize = 100

    var allSelected: Bool { !packages.isEmpty && selectedIds.count == packages.count }

    func load() async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            let response: PackageListResponse = try await APIClient.shared.request(
                API.Packages.list(
                    search: searchText.isEmpty ? nil : searchText,
                    status: statusFilter,
                    page: 1,
                    limit: pageSize
                )
            )
            packages = response.packages.map { $0.toModel() }
            currentPage = 1
            hasMore = response.packages.count >= pageSize
        } catch {
            toast = ToastMessage(message: "Failed to load packages", type: .error)
        }
    }

    func loadMore() async {
        guard hasMore, !isLoading else { return }
        isLoading = true
        defer { isLoading = false }

        let next = currentPage + 1
        do {
            let response: PackageListResponse = try await APIClient.shared.request(
                API.Packages.list(status: statusFilter, page: next, limit: pageSize)
            )
            packages.append(contentsOf: response.packages.map { $0.toModel() })
            currentPage = next
            hasMore = response.packages.count >= pageSize
        } catch {
            print("[BatchOps] Load more error: \(error)")
        }
    }

    func refresh() async {
        selectedIds.removeAll()
        currentPage = 1
        await load()
    }

    func search() async {
        await refresh()
    }

    func toggleSelection(_ id: String) {
        if selectedIds.contains(id) {
            selectedIds.remove(id)
        } else {
            selectedIds.insert(id)
        }
        UISelectionFeedbackGenerator().selectionChanged()
    }

    func toggleSelectAll() {
        if allSelected {
            selectedIds.removeAll()
        } else {
            selectedIds = Set(packages.map(\.id))
        }
    }

    // MARK: - Batch Actions

    func batchCheckOut() async {
        await processBatch(action: "Checking out") { id in
            let body = PackageCheckOutRequest(signatureUrl: nil, notes: "Batch checkout")
            let _: PackageDTO = try await APIClient.shared.request(
                API.Packages.checkOut(id: id, body: body)
            )
        }
    }

    func batchNotify() async {
        await processBatch(action: "Notifying") { id in
            guard let pkg = self.packages.first(where: { $0.id == id }),
                  let customerId = pkg.customerId else { return }

            let body = NotificationSendRequest(
                customerId: customerId,
                packageId: id,
                type: "sms",
                message: nil,
                templateId: nil
            )
            let _: NotificationDTO = try await APIClient.shared.request(
                API.Notifications.send(body: body)
            )
        }
    }

    func batchMoveStorage(to location: String) async {
        await processBatch(action: "Moving to \(location)") { id in
            let body = PackageUpdateRequest(storageLocation: location)
            let _: PackageDTO = try await APIClient.shared.request(
                API.Packages.update(id: id, body: body)
            )
        }
    }

    func batchUpdateStatus(to status: PackageStatus) async {
        await processBatch(action: "Updating to \(status.displayName)") { id in
            let body = PackageUpdateRequest(status: status.rawValue)
            let _: PackageDTO = try await APIClient.shared.request(
                API.Packages.update(id: id, body: body)
            )
        }
    }

    private func processBatch(action: String, operation: @escaping (String) async throws -> Void) async {
        let ids = Array(selectedIds)
        guard !ids.isEmpty else { return }

        isProcessing = true
        processedCount = 0
        progress = 0
        currentAction = action

        var successCount = 0
        var failCount = 0

        for (index, id) in ids.enumerated() {
            do {
                try await operation(id)
                successCount += 1
            } catch {
                failCount += 1
            }

            processedCount = index + 1
            progress = Double(processedCount) / Double(ids.count)
        }

        isProcessing = false
        selectedIds.removeAll()

        if failCount == 0 {
            toast = ToastMessage(message: "\(action): \(successCount) packages ✓", type: .success)
        } else {
            toast = ToastMessage(message: "\(successCount) succeeded, \(failCount) failed", type: .warning)
        }

        UINotificationFeedbackGenerator().notificationOccurred(failCount == 0 ? .success : .warning)
        await refresh()
    }
}

#Preview {
    BatchOperationsView()
}
