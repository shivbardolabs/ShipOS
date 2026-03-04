import SwiftUI

/// Customer list with search, filter, and infinite scroll.
struct CustomerListView: View {
    @StateObject private var viewModel = CustomerListViewModel()
    @State private var searchText = ""
    @State private var showingAddCustomer = false

    var body: some View {
        VStack(spacing: 0) {
            SOSearchBar(text: $searchText, placeholder: "Search name, PMB, email...") {
                Task { await viewModel.search(query: searchText) }
            }
            .padding(.horizontal)
            .padding(.vertical, ShipOSTheme.Spacing.sm)

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
                            CustomerDetailView(customerId: customer.id)
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
        .onChange(of: searchText) { _, newValue in
            Task { await viewModel.search(query: newValue) }
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
            AddCustomerView()
        }
    }
}

// MARK: - View Model

@MainActor
final class CustomerListViewModel: ObservableObject {
    @Published var customers: [Customer] = []
    @Published var isLoading = false
    @Published var hasMore = true

    private var currentPage = 1
    private var currentSearch: String?
    private let pageSize = 50

    func load() async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            let response: CustomerListResponse = try await APIClient.shared.request(
                API.Customers.list(search: currentSearch, page: 1, limit: pageSize)
            )
            customers = response.customers.map { $0.toModel() }
            currentPage = 1
            hasMore = response.customers.count >= pageSize
        } catch {
            print("[CustomerList] Error: \(error)")
        }
    }

    func loadMore() async {
        guard hasMore, !isLoading else { return }
        isLoading = true
        defer { isLoading = false }

        let nextPage = currentPage + 1
        do {
            let response: CustomerListResponse = try await APIClient.shared.request(
                API.Customers.list(search: currentSearch, page: nextPage, limit: pageSize)
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

    func search(query: String) async {
        currentSearch = query.isEmpty ? nil : query
        currentPage = 1
        await load()
    }
}

// MARK: - Placeholder Views

struct CustomerDetailView: View {
    let customerId: String

    var body: some View {
        Text("Customer Detail: \(customerId)")
            .navigationTitle("Customer")
    }
}

struct AddCustomerView: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Text("Add Customer Form")
                .navigationTitle("New Customer")
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
        CustomerListView()
            .navigationTitle("Customers")
    }
}
