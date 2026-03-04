import SwiftUI

/// Inline customer picker — used in Shipping and other flows that need to select a customer.
/// Shows search bar, recent/suggested list, and infinite scroll.
struct CustomerPickerInline: View {
    @Binding var selection: Customer?
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = CustomerPickerViewModel()

    var body: some View {
        VStack(spacing: 0) {
            SOSearchBar(text: $viewModel.searchText, placeholder: "Search by name, PMB, email...") {
                Task { await viewModel.search() }
            }
            .padding(.horizontal)
            .padding(.vertical, ShipOSTheme.Spacing.sm)

            List {
                if viewModel.customers.isEmpty && !viewModel.isLoading {
                    Text("No customers found")
                        .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                        .frame(maxWidth: .infinity)
                        .listRowSeparator(.hidden)
                } else {
                    ForEach(viewModel.customers) { customer in
                        Button {
                            selection = customer
                            dismiss()
                        } label: {
                            SOCustomerRow(customer: customer)
                        }
                        .buttonStyle(.plain)
                    }

                    if viewModel.hasMore && !viewModel.isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .onAppear { Task { await viewModel.loadMore() } }
                    }
                }
            }
            .listStyle(.plain)
        }
        .navigationTitle("Select Customer")
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.load() }
    }
}

@MainActor
final class CustomerPickerViewModel: ObservableObject {
    @Published var customers: [Customer] = []
    @Published var searchText = ""
    @Published var isLoading = false
    @Published var hasMore = true

    private var currentPage = 1
    private let pageSize = 50

    func load() async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            let response: CustomerListResponse = try await APIClient.shared.request(
                API.Customers.list(
                    search: searchText.isEmpty ? nil : searchText,
                    status: "active",
                    page: 1,
                    limit: pageSize
                )
            )
            customers = response.customers.map { $0.toModel() }
            currentPage = 1
            hasMore = response.customers.count >= pageSize
        } catch {
            print("[CustomerPicker] Load error: \(error)")
        }
    }

    func loadMore() async {
        guard hasMore, !isLoading else { return }
        isLoading = true
        defer { isLoading = false }

        let next = currentPage + 1
        do {
            let response: CustomerListResponse = try await APIClient.shared.request(
                API.Customers.list(
                    search: searchText.isEmpty ? nil : searchText,
                    status: "active",
                    page: next,
                    limit: pageSize
                )
            )
            customers.append(contentsOf: response.customers.map { $0.toModel() })
            currentPage = next
            hasMore = response.customers.count >= pageSize
        } catch {
            print("[CustomerPicker] LoadMore error: \(error)")
        }
    }

    func search() async {
        currentPage = 1
        await load()
    }
}

#Preview {
    NavigationStack {
        CustomerPickerInline(selection: .constant(nil))
    }
}
