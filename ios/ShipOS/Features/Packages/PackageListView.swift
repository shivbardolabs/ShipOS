import SwiftUI
import SwiftData

/// Package list with search, filter, and infinite scroll.
struct PackageListView: View {
    @StateObject private var viewModel = PackageListViewModel()
    @State private var selectedStatus: PackageStatus?
    @State private var searchText = ""
    @State private var showingCheckIn = false

    var body: some View {
        VStack(spacing: 0) {
            // Search + Filter
            VStack(spacing: ShipOSTheme.Spacing.sm) {
                SOSearchBar(text: $searchText, placeholder: "Search tracking #, sender...") {
                    Task { await viewModel.search(query: searchText) }
                }

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: ShipOSTheme.Spacing.sm) {
                        FilterChip(title: "All", isSelected: selectedStatus == nil) {
                            selectedStatus = nil
                            Task { await viewModel.filter(status: nil) }
                        }

                        ForEach(PackageStatus.allCases) { status in
                            FilterChip(
                                title: status.displayName,
                                isSelected: selectedStatus == status,
                                color: ShipOSTheme.Colors.packageStatus(status)
                            ) {
                                selectedStatus = status
                                Task { await viewModel.filter(status: status) }
                            }
                        }
                    }
                    .padding(.horizontal)
                }
            }
            .padding(.vertical, ShipOSTheme.Spacing.sm)
            .background(ShipOSTheme.Colors.background)

            // Package List
            if viewModel.packages.isEmpty && !viewModel.isLoading {
                SOEmptyState(
                    icon: "shippingbox",
                    title: "No Packages",
                    message: selectedStatus != nil
                        ? "No packages with status \"\(selectedStatus!.displayName)\""
                        : "Check in your first package to get started.",
                    actionTitle: "Check In Package"
                ) {
                    showingCheckIn = true
                }
            } else {
                List {
                    ForEach(viewModel.packages, id: \.id) { pkg in
                        NavigationLink {
                            PackageDetailView(packageId: pkg.id)
                        } label: {
                            SOPackageRow(package: pkg)
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
        .onChange(of: searchText) { _, newValue in
            Task { await viewModel.search(query: newValue) }
        }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    showingCheckIn = true
                } label: {
                    Image(systemName: "plus.circle.fill")
                }
            }
        }
        .sheet(isPresented: $showingCheckIn) {
            PackageCheckInView()
        }
    }
}

// MARK: - Filter Chip

struct FilterChip: View {
    let title: String
    let isSelected: Bool
    var color: Color = ShipOSTheme.Colors.primary
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(ShipOSTheme.Typography.caption)
                .fontWeight(isSelected ? .semibold : .regular)
                .padding(.horizontal, ShipOSTheme.Spacing.md)
                .padding(.vertical, ShipOSTheme.Spacing.xs + 2)
                .background(isSelected ? color.opacity(0.15) : ShipOSTheme.Colors.surfaceSecondary)
                .foregroundStyle(isSelected ? color : ShipOSTheme.Colors.textSecondary)
                .clipShape(Capsule())
                .overlay(
                    Capsule()
                        .stroke(isSelected ? color.opacity(0.3) : .clear, lineWidth: 1)
                )
        }
    }
}

// MARK: - View Model

@MainActor
final class PackageListViewModel: ObservableObject {
    @Published var packages: [Package] = []
    @Published var isLoading = false
    @Published var hasMore = true

    private var currentPage = 1
    private var currentSearch: String?
    private var currentStatus: PackageStatus?
    private let pageSize = 50

    func load() async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            let response: PackageListResponse = try await APIClient.shared.request(
                API.Packages.list(
                    search: currentSearch,
                    status: currentStatus,
                    page: 1,
                    limit: pageSize
                )
            )
            packages = response.packages.map { $0.toModel() }
            currentPage = 1
            hasMore = response.packages.count >= pageSize
        } catch {
            print("[PackageList] Error: \(error)")
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
                    search: currentSearch,
                    status: currentStatus,
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

    func search(query: String) async {
        currentSearch = query.isEmpty ? nil : query
        currentPage = 1
        await load()
    }

    func filter(status: PackageStatus?) async {
        currentStatus = status
        currentPage = 1
        await load()
    }
}

// MARK: - Placeholder Detail Views

/// Package detail view (Phase 2 — skeleton for now).
struct PackageDetailView: View {
    let packageId: String

    var body: some View {
        Text("Package Detail: \(packageId)")
            .navigationTitle("Package")
    }
}

/// Package check-in view (Phase 2 — skeleton for now).
struct PackageCheckInView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Text("Package Check-In Flow")
                .navigationTitle("Check In")
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") { dismiss() }
                    }
                }
        }
    }
}

#Preview {
    NavigationStack {
        PackageListView()
            .navigationTitle("Packages")
    }
}
