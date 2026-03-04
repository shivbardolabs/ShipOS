import SwiftUI

/// BAR-357: Full customer list — search, filter, infinite scroll, add customer.
struct CustomerListView: View {
    @StateObject private var viewModel = CustomerListViewModel()
    @State private var showingAddCustomer = false

    var body: some View {
        VStack(spacing: 0) {
            SOSearchBar(text: $viewModel.searchText, placeholder: "Name, PMB, email, phone...") {
                Task { await viewModel.search() }
            }
            .padding(.horizontal)
            .padding(.vertical, ShipOSTheme.Spacing.sm)

            // Filter chips
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    FilterChip(label: "All", isSelected: viewModel.statusFilter == nil) {
                        viewModel.statusFilter = nil
                        Task { await viewModel.refresh() }
                    }
                    FilterChip(label: "Active", isSelected: viewModel.statusFilter == "active", color: ShipOSTheme.Colors.success) {
                        viewModel.statusFilter = "active"
                        Task { await viewModel.refresh() }
                    }
                    FilterChip(label: "Inactive", isSelected: viewModel.statusFilter == "inactive", color: ShipOSTheme.Colors.textTertiary) {
                        viewModel.statusFilter = "inactive"
                        Task { await viewModel.refresh() }
                    }
                    FilterChip(label: "Suspended", isSelected: viewModel.statusFilter == "suspended", color: ShipOSTheme.Colors.error) {
                        viewModel.statusFilter = "suspended"
                        Task { await viewModel.refresh() }
                    }
                }
                .padding(.horizontal)
            }

            // Count
            if !viewModel.customers.isEmpty {
                HStack {
                    Text("\(viewModel.totalCount) customer\(viewModel.totalCount == 1 ? "" : "s")")
                        .font(ShipOSTheme.Typography.caption)
                        .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                    Spacer()
                }
                .padding(.horizontal)
                .padding(.top, ShipOSTheme.Spacing.xs)
            }

            if viewModel.customers.isEmpty && !viewModel.isLoading {
                SOEmptyState(
                    icon: "person.2",
                    title: "No Customers",
                    message: "Add your first customer to start managing packages.",
                    actionTitle: "Add Customer"
                ) {
                    showingAddCustomer = true
                }
            } else {
                List {
                    ForEach(viewModel.customers, id: \.id) { customer in
                        NavigationLink {
                            CustomerDetailView(customer: customer)
                        } label: {
                            SOCustomerRow(customer: customer)
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
                    showingAddCustomer = true
                } label: {
                    Image(systemName: "person.badge.plus")
                }
            }
        }
        .sheet(isPresented: $showingAddCustomer) {
            AddCustomerView(onSaved: {
                Task { await viewModel.refresh() }
            })
        }
        .toast($viewModel.toast)
    }
}

// MARK: - View Model

@MainActor
final class CustomerListViewModel: ObservableObject {
    @Published var customers: [Customer] = []
    @Published var searchText = ""
    @Published var statusFilter: String?
    @Published var isLoading = false
    @Published var hasMore = true
    @Published var totalCount = 0
    @Published var toast: ToastMessage?

    private var currentPage = 1
    private let pageSize = 50
    private var searchTask: Task<Void, Never>?

    func load() async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            let response: CustomerListResponse = try await APIClient.shared.request(
                API.Customers.list(search: searchText.isEmpty ? nil : searchText, page: 1, limit: pageSize)
            )
            customers = response.customers.map { $0.toModel() }
            totalCount = response.total ?? customers.count
            currentPage = 1
            hasMore = response.customers.count >= pageSize
        } catch {
            toast = ToastMessage(message: "Failed to load customers", type: .error)
        }
    }

    func loadMore() async {
        guard hasMore, !isLoading else { return }
        isLoading = true
        defer { isLoading = false }

        let nextPage = currentPage + 1
        do {
            let response: CustomerListResponse = try await APIClient.shared.request(
                API.Customers.list(search: searchText.isEmpty ? nil : searchText, page: nextPage, limit: pageSize)
            )
            customers.append(contentsOf: response.customers.map { $0.toModel() })
            currentPage = nextPage
            hasMore = response.customers.count >= pageSize
        } catch {
            print("[CustomerList] Load more error: \(error)")
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
}

#Preview {
    NavigationStack {
        CustomerListView()
            .navigationTitle("Customers")
    }
}
