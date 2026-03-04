import SwiftUI

/// BAR-354 (partial): Full package list — search, status filter chips, infinite scroll, detail navigation.
struct PackageListView: View {
    @StateObject private var viewModel = PackageListViewModel()
    @EnvironmentObject private var appState: AppState

    var body: some View {
        VStack(spacing: 0) {
            // Search
            SOSearchBar(text: $viewModel.searchText, placeholder: "Tracking #, customer, PMB...") {
                Task { await viewModel.search() }
            }
            .padding(.horizontal)
            .padding(.vertical, ShipOSTheme.Spacing.sm)

            // Status filter chips
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    FilterChip(label: "All", isSelected: viewModel.selectedStatus == nil) {
                        viewModel.selectedStatus = nil
                        Task { await viewModel.refresh() }
                    }
                    ForEach(PackageStatus.allCases, id: \.self) { status in
                        FilterChip(
                            label: status.displayName,
                            isSelected: viewModel.selectedStatus == status,
                            color: status.color
                        ) {
                            viewModel.selectedStatus = status
                            Task { await viewModel.refresh() }
                        }
                    }
                }
                .padding(.horizontal)
            }
            .padding(.bottom, ShipOSTheme.Spacing.sm)

            // Results count
            if !viewModel.packages.isEmpty {
                HStack {
                    Text("\(viewModel.totalCount) package\(viewModel.totalCount == 1 ? "" : "s")")
                        .font(ShipOSTheme.Typography.caption)
                        .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                    Spacer()

                    Menu {
                        Button("Newest First") { viewModel.sortBy = .newest }
                        Button("Oldest First") { viewModel.sortBy = .oldest }
                        Button("Carrier") { viewModel.sortBy = .carrier }
                    } label: {
                        Label(viewModel.sortBy.label, systemImage: "arrow.up.arrow.down")
                            .font(ShipOSTheme.Typography.caption)
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 4)
            }

            // Package list
            if viewModel.packages.isEmpty && !viewModel.isLoading {
                SOEmptyState(
                    icon: "shippingbox",
                    title: "No Packages",
                    message: viewModel.selectedStatus != nil
                        ? "No \(viewModel.selectedStatus!.displayName.lowercased()) packages found."
                        : "Check in your first package to get started.",
                    actionTitle: "Check In Package"
                ) {
                    appState.isShowingCheckIn = true
                }
            } else {
                List {
                    ForEach(viewModel.packages, id: \.id) { pkg in
                        NavigationLink {
                            PackageDetailView(package: pkg)
                        } label: {
                            SOPackageRow(package: pkg)
                        }
                        .swipeActions(edge: .trailing) {
                            if pkg.status == .checkedIn || pkg.status == .notified {
                                Button {
                                    viewModel.packageToCheckOut = pkg
                                } label: {
                                    Label("Check Out", systemImage: "checkmark.circle")
                                }
                                .tint(ShipOSTheme.Colors.success)
                            }
                        }
                        .swipeActions(edge: .leading) {
                            if pkg.status == .checkedIn {
                                Button {
                                    Task { await viewModel.notifyCustomer(pkg) }
                                } label: {
                                    Label("Notify", systemImage: "bell")
                                }
                                .tint(ShipOSTheme.Colors.warning)
                            }
                        }
                    }

                    if viewModel.hasMore {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .onAppear {
                                Task { await viewModel.loadMore() }
                            }
                    }
                }
                .listStyle(.plain)
                .refreshable { await viewModel.refresh() }
            }
        }
        .task { await viewModel.load() }
        .onChange(of: viewModel.searchText) { _, _ in
            Task { await viewModel.search() }
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    appState.isShowingCheckIn = true
                } label: {
                    Image(systemName: "plus.circle.fill")
                }
            }
        }
        .sheet(isPresented: $appState.isShowingCheckIn) {
            PackageCheckInView()
        }
        .sheet(item: $viewModel.packageToCheckOut) { _ in
            PackageCheckOutView()
        }
        .toast($viewModel.toast)
    }
}

// MARK: - Filter Chip

struct FilterChip: View {
    let label: String
    let isSelected: Bool
    var color: Color = ShipOSTheme.Colors.primary
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(ShipOSTheme.Typography.caption)
                .padding(.horizontal, 14)
                .padding(.vertical, 7)
                .background(isSelected ? color.opacity(0.15) : ShipOSTheme.Colors.surfaceSecondary)
                .foregroundStyle(isSelected ? color : ShipOSTheme.Colors.textSecondary)
                .clipShape(Capsule())
                .overlay(Capsule().stroke(isSelected ? color.opacity(0.4) : .clear, lineWidth: 1))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - View Model

@MainActor
final class PackageListViewModel: ObservableObject {
    enum SortOrder { case newest, oldest, carrier
        var label: String {
            switch self {
            case .newest: "Newest"
            case .oldest: "Oldest"
            case .carrier: "Carrier"
            }
        }
    }

    @Published var packages: [Package] = []
    @Published var searchText = ""
    @Published var selectedStatus: PackageStatus?
    @Published var sortBy: SortOrder = .newest { didSet { Task { await refresh() } } }
    @Published var isLoading = false
    @Published var hasMore = true
    @Published var totalCount = 0
    @Published var toast: ToastMessage?
    @Published var packageToCheckOut: Package?

    private var currentPage = 1
    private let pageSize = 30
    private var searchTask: Task<Void, Never>?

    func load() async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            let response: PackageListResponse = try await APIClient.shared.request(
                API.Packages.list(
                    search: searchText.isEmpty ? nil : searchText,
                    status: selectedStatus,
                    page: 1,
                    limit: pageSize
                )
            )
            packages = response.packages.map { $0.toModel() }
            totalCount = response.total ?? packages.count
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

        let nextPage = currentPage + 1
        do {
            let response: PackageListResponse = try await APIClient.shared.request(
                API.Packages.list(
                    search: searchText.isEmpty ? nil : searchText,
                    status: selectedStatus,
                    page: nextPage,
                    limit: pageSize
                )
            )
            packages.append(contentsOf: response.packages.map { $0.toModel() })
            currentPage = nextPage
            hasMore = response.packages.count >= pageSize
        } catch {
            print("[PackageList] Load more error: \(error)")
        }
    }

    func refresh() async {
        currentPage = 1
        await load()
    }

    func search() async {
        searchTask?.cancel()
        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(300))
            guard !Task.isCancelled else { return }
            await refresh()
        }
    }

    func notifyCustomer(_ pkg: Package) async {
        guard let customerId = pkg.customerId else {
            toast = ToastMessage(message: "No customer assigned", type: .error)
            return
        }
        do {
            let body = NotificationSendRequest(
                customerId: customerId,
                packageId: pkg.id,
                channel: "sms",
                message: nil
            )
            let _: NotificationDTO = try await APIClient.shared.request(
                API.Notifications.send(body: body)
            )
            toast = ToastMessage(message: "Customer notified ✓", type: .success)
        } catch {
            toast = ToastMessage(message: "Notification failed", type: .error)
        }
    }
}

// MARK: - Package Detail

struct PackageDetailView: View {
    let package: Package
    @State private var showingCheckOut = false

    var body: some View {
        ScrollView {
            VStack(spacing: ShipOSTheme.Spacing.lg) {
                // Status banner
                HStack {
                    SOStatusBadge(package.status.displayName, color: package.status.color)
                    Spacer()
                    if let carrier = package.carrier {
                        Text(carrier)
                            .font(ShipOSTheme.Typography.caption)
                            .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                    }
                }

                // Tracking
                SOCard {
                    VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                        SOSectionHeader(title: "Tracking")
                        DetailRow(label: "Number", value: package.trackingNumber)
                        DetailRow(label: "Carrier", value: package.carrier ?? "Unknown")
                        if let type = package.packageType {
                            DetailRow(label: "Type", value: type.capitalized)
                        }
                        if let weight = package.weight {
                            DetailRow(label: "Weight", value: String(format: "%.1f lbs", weight))
                        }
                        if let loc = package.storageLocation {
                            DetailRow(label: "Storage", value: loc)
                        }
                    }
                }

                // Timeline
                SOCard {
                    VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                        SOSectionHeader(title: "Timeline")
                        TimelineRow(event: "Checked In", date: package.checkedInAt, icon: "arrow.down.circle.fill", color: ShipOSTheme.Colors.success)
                        TimelineRow(event: "Notified", date: package.notifiedAt, icon: "bell.fill", color: ShipOSTheme.Colors.warning)
                        TimelineRow(event: "Released", date: package.releasedAt, icon: "checkmark.circle.fill", color: ShipOSTheme.Colors.primary)
                    }
                }

                // Customer
                if let customer = package.customer {
                    SOCard {
                        VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                            SOSectionHeader(title: "Customer")
                            DetailRow(label: "Name", value: customer.fullName)
                            DetailRow(label: "PMB", value: customer.pmbNumber ?? "-")
                        }
                    }
                }

                // Notes
                if let notes = package.notes, !notes.isEmpty {
                    SOCard {
                        VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.sm) {
                            SOSectionHeader(title: "Notes")
                            Text(notes)
                                .font(ShipOSTheme.Typography.body)
                                .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                        }
                    }
                }

                // Actions
                if package.status == .checkedIn || package.status == .notified {
                    Button {
                        showingCheckOut = true
                    } label: {
                        Label("Check Out Package", systemImage: "checkmark.circle.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(SOPrimaryButtonStyle())
                }
            }
            .padding()
        }
        .navigationTitle("Package")
        .navigationBarTitleDisplayMode(.inline)
        .sheet(isPresented: $showingCheckOut) {
            PackageCheckOutView()
        }
    }
}

// MARK: - Timeline Row

struct TimelineRow: View {
    let event: String
    let date: Date?
    let icon: String
    let color: Color

    var body: some View {
        HStack(spacing: ShipOSTheme.Spacing.md) {
            Image(systemName: date != nil ? icon : "circle")
                .font(.body)
                .foregroundStyle(date != nil ? color : ShipOSTheme.Colors.textTertiary)
                .frame(width: 28, height: 28)

            Text(event)
                .font(ShipOSTheme.Typography.body)
                .foregroundStyle(date != nil ? ShipOSTheme.Colors.textPrimary : ShipOSTheme.Colors.textTertiary)

            Spacer()

            if let date {
                Text(date.shortFormatted)
                    .font(ShipOSTheme.Typography.caption)
                    .foregroundStyle(ShipOSTheme.Colors.textSecondary)
            } else {
                Text("—")
                    .foregroundStyle(ShipOSTheme.Colors.textTertiary)
            }
        }
    }
}

// MARK: - Package Status Extensions

extension PackageStatus {
    var displayName: String {
        switch self {
        case .checkedIn: "Checked In"
        case .notified: "Notified"
        case .held: "Held"
        case .released: "Released"
        case .returned: "Returned"
        case .forwarded: "Forwarded"
        }
    }

    var color: Color {
        switch self {
        case .checkedIn: ShipOSTheme.Colors.info
        case .notified: ShipOSTheme.Colors.warning
        case .held: Color(hex: "#a855f7")
        case .released: ShipOSTheme.Colors.success
        case .returned: Color(hex: "#f97316")
        case .forwarded: Color(hex: "#06b6d4")
        }
    }
}

#Preview {
    NavigationStack {
        PackageListView()
            .navigationTitle("Packages")
    }
    .environmentObject(AppState())
}
