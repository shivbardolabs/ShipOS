import SwiftUI

/// BAR-358: Customer Detail — profile header, package history, compliance, contact actions.
struct CustomerDetailView: View {
    let customer: Customer
    @StateObject private var viewModel = CustomerDetailViewModel()
    @State private var showingEditSheet = false

    var body: some View {
        ScrollView {
            VStack(spacing: ShipOSTheme.Spacing.lg) {
                // Profile header
                profileHeader

                // Quick actions
                quickActions

                // Stats
                statsCards

                // Package history
                packageHistory

                // Customer info
                customerInfo

                // Compliance
                complianceSection
            }
            .padding()
        }
        .navigationTitle("Customer")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    Button {
                        showingEditSheet = true
                    } label: {
                        Label("Edit", systemImage: "pencil")
                    }

                    Button {
                        Task { await viewModel.sendNotification(to: customer.id) }
                    } label: {
                        Label("Send Notification", systemImage: "bell")
                    }

                    if let phone = customer.phone, !phone.isEmpty {
                        Link(destination: URL(string: "tel:\(phone)")!) {
                            Label("Call", systemImage: "phone")
                        }

                        Link(destination: URL(string: "sms:\(phone)")!) {
                            Label("Text", systemImage: "message")
                        }
                    }

                    if let email = customer.email, !email.isEmpty {
                        Link(destination: URL(string: "mailto:\(email)")!) {
                            Label("Email", systemImage: "envelope")
                        }
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .task { await viewModel.load(customerId: customer.id) }
        .sheet(isPresented: $showingEditSheet) {
            EditCustomerView(customer: customer)
        }
        .toast($viewModel.toast)
    }

    // MARK: - Profile Header

    private var profileHeader: some View {
        VStack(spacing: ShipOSTheme.Spacing.md) {
            // Avatar
            Text(customer.initials)
                .font(.system(size: 32, weight: .semibold, design: .rounded))
                .foregroundStyle(.white)
                .frame(width: 80, height: 80)
                .background(ShipOSTheme.Colors.primary.gradient)
                .clipShape(Circle())

            // Name + PMB
            VStack(spacing: 4) {
                Text(customer.fullName)
                    .font(ShipOSTheme.Typography.title2)

                if let pmb = customer.pmbNumber {
                    Text("PMB #\(pmb)")
                        .font(ShipOSTheme.Typography.subheadline)
                        .foregroundStyle(ShipOSTheme.Colors.primary)
                }
            }

            // Status badge
            SOStatusBadge(
                customer.status?.capitalized ?? "Active",
                color: customerStatusColor
            )
        }
    }

    private var customerStatusColor: Color {
        switch customer.status {
        case "active": ShipOSTheme.Colors.success
        case "inactive": ShipOSTheme.Colors.textTertiary
        case "suspended": ShipOSTheme.Colors.error
        default: ShipOSTheme.Colors.info
        }
    }

    // MARK: - Quick Actions

    private var quickActions: some View {
        HStack(spacing: ShipOSTheme.Spacing.lg) {
            if let phone = customer.phone, !phone.isEmpty {
                ContactActionButton(icon: "phone.fill", label: "Call", color: ShipOSTheme.Colors.success) {
                    if let url = URL(string: "tel:\(phone)") { UIApplication.shared.open(url) }
                }
                ContactActionButton(icon: "message.fill", label: "Text", color: ShipOSTheme.Colors.info) {
                    if let url = URL(string: "sms:\(phone)") { UIApplication.shared.open(url) }
                }
            }

            if let email = customer.email, !email.isEmpty {
                ContactActionButton(icon: "envelope.fill", label: "Email", color: Color(hex: "#a855f7")) {
                    if let url = URL(string: "mailto:\(email)") { UIApplication.shared.open(url) }
                }
            }

            ContactActionButton(icon: "bell.fill", label: "Notify", color: ShipOSTheme.Colors.warning) {
                Task { await viewModel.sendNotification(to: customer.id) }
            }
        }
    }

    // MARK: - Stats

    private var statsCards: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: ShipOSTheme.Spacing.md) {
            MiniStatCard(
                value: "\(viewModel.activePackages)",
                label: "Active",
                color: ShipOSTheme.Colors.info
            )
            MiniStatCard(
                value: "\(viewModel.totalPackages)",
                label: "Total",
                color: ShipOSTheme.Colors.primary
            )
            MiniStatCard(
                value: customer.createdAt?.shortFormatted ?? "-",
                label: "Member Since",
                color: ShipOSTheme.Colors.success
            )
        }
    }

    // MARK: - Package History

    private var packageHistory: some View {
        VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
            SOSectionHeader(
                title: "Packages",
                count: viewModel.packages.count,
                action: viewModel.packages.count > 5 ? AnyView(
                    NavigationLink {
                        // Full package list filtered to this customer
                        Text("All packages for \(customer.fullName)")
                    } label: {
                        Text("See All")
                            .font(ShipOSTheme.Typography.caption)
                            .foregroundStyle(ShipOSTheme.Colors.primary)
                    }
                ) : nil
            )

            if viewModel.packages.isEmpty && !viewModel.isLoading {
                SOEmptyState(
                    icon: "shippingbox",
                    title: "No Packages",
                    message: "This customer has no packages yet."
                )
                .frame(height: 120)
            } else {
                ForEach(viewModel.packages.prefix(5), id: \.id) { pkg in
                    NavigationLink {
                        PackageDetailView(package: pkg)
                    } label: {
                        SOPackageRow(package: pkg)
                    }
                    .buttonStyle(.plain)

                    if pkg.id != viewModel.packages.prefix(5).last?.id {
                        Divider()
                    }
                }
            }
        }
    }

    // MARK: - Customer Info

    private var customerInfo: some View {
        SOCard {
            VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                SOSectionHeader(title: "Contact Info")

                if let email = customer.email {
                    DetailRow(label: "Email", value: email)
                }
                if let phone = customer.phone {
                    DetailRow(label: "Phone", value: phone)
                }
                if let address = customer.formattedAddress, !address.isEmpty {
                    DetailRow(label: "Address", value: address)
                }

                Divider()

                SOSectionHeader(title: "Preferences")
                DetailRow(label: "SMS Opt-In", value: customer.smsOptIn ? "Yes" : "No")
                DetailRow(label: "Email Opt-In", value: customer.emailOptIn ? "Yes" : "No")
            }
        }
    }

    // MARK: - Compliance

    private var complianceSection: some View {
        SOCard {
            VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                SOSectionHeader(title: "Compliance")

                HStack {
                    Text("Status")
                        .font(ShipOSTheme.Typography.caption)
                        .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                        .frame(width: 80, alignment: .leading)

                    SOStatusBadge(
                        customer.complianceStatus?.capitalized ?? "Unknown",
                        color: complianceColor
                    )
                }

                if let notes = customer.notes, !notes.isEmpty {
                    DetailRow(label: "Notes", value: notes)
                }
            }
        }
    }

    private var complianceColor: Color {
        switch customer.complianceStatus {
        case "compliant": ShipOSTheme.Colors.success
        case "pending": ShipOSTheme.Colors.warning
        case "non_compliant": ShipOSTheme.Colors.error
        default: ShipOSTheme.Colors.textTertiary
        }
    }
}

// MARK: - Mini Stat Card

struct MiniStatCard: View {
    let value: String
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(ShipOSTheme.Typography.headline)
                .foregroundStyle(color)
            Text(label)
                .font(ShipOSTheme.Typography.caption2)
                .foregroundStyle(ShipOSTheme.Colors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, ShipOSTheme.Spacing.md)
        .background(ShipOSTheme.Colors.surfaceSecondary)
        .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.md))
    }
}

// MARK: - Contact Action Button

struct ContactActionButton: View {
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

// MARK: - View Model

@MainActor
final class CustomerDetailViewModel: ObservableObject {
    @Published var packages: [Package] = []
    @Published var activePackages = 0
    @Published var totalPackages = 0
    @Published var isLoading = false
    @Published var toast: ToastMessage?

    func load(customerId: String) async {
        isLoading = true
        defer { isLoading = false }

        do {
            let response: PackageListResponse = try await APIClient.shared.request(
                API.Packages.list(search: customerId, page: 1, limit: 50)
            )
            packages = response.packages.map { $0.toModel() }
            totalPackages = response.total ?? packages.count
            activePackages = packages.filter { $0.status == .checkedIn || $0.status == .notified || $0.status == .held }.count
        } catch {
            print("[CustomerDetail] Error loading packages: \(error)")
        }
    }

    func sendNotification(to customerId: String) async {
        do {
            let body = NotificationSendRequest(
                customerId: customerId,
                packageId: nil,
                channel: "sms",
                message: nil
            )
            let _: NotificationDTO = try await APIClient.shared.request(
                API.Notifications.send(body: body)
            )
            toast = ToastMessage(message: "Notification sent ✓", type: .success)
        } catch {
            toast = ToastMessage(message: "Failed to send notification", type: .error)
        }
    }
}

// MARK: - Edit Customer (placeholder)

struct EditCustomerView: View {
    let customer: Customer
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Text("Edit Customer: \(customer.fullName)")
                .navigationTitle("Edit Customer")
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") { dismiss() }
                    }
                }
        }
    }
}

// MARK: - Add Customer

struct AddCustomerView: View {
    var onSaved: (() -> Void)?
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = AddCustomerViewModel()

    var body: some View {
        NavigationStack {
            Form {
                Section("Name") {
                    TextField("First name *", text: $viewModel.firstName)
                    TextField("Last name *", text: $viewModel.lastName)
                }

                Section("Contact") {
                    TextField("Email", text: $viewModel.email)
                        .keyboardType(.emailAddress)
                        .textInputAutocapitalization(.never)
                    TextField("Phone", text: $viewModel.phone)
                        .keyboardType(.phonePad)
                }

                Section("PMB") {
                    TextField("PMB Number *", text: $viewModel.pmbNumber)
                        .keyboardType(.numberPad)
                }

                Section("Address") {
                    TextField("Address", text: $viewModel.address)
                    TextField("City", text: $viewModel.city)
                    TextField("State", text: $viewModel.state)
                    TextField("Zip", text: $viewModel.zip)
                        .keyboardType(.numberPad)
                }

                Section("Preferences") {
                    Toggle("SMS Notifications", isOn: $viewModel.smsOptIn)
                    Toggle("Email Notifications", isOn: $viewModel.emailOptIn)
                }

                Section("Notes") {
                    TextField("Optional notes...", text: $viewModel.notes, axis: .vertical)
                        .lineLimit(3...)
                }
            }
            .navigationTitle("New Customer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task {
                            if await viewModel.save() {
                                onSaved?()
                                dismiss()
                            }
                        }
                    }
                    .disabled(!viewModel.canSave)
                }
            }
            .overlay {
                if viewModel.isSaving {
                    SOLoadingOverlay(message: "Saving...")
                }
            }
            .toast($viewModel.toast)
        }
    }
}

@MainActor
final class AddCustomerViewModel: ObservableObject {
    @Published var firstName = ""
    @Published var lastName = ""
    @Published var email = ""
    @Published var phone = ""
    @Published var pmbNumber = ""
    @Published var address = ""
    @Published var city = ""
    @Published var state = ""
    @Published var zip = ""
    @Published var smsOptIn = true
    @Published var emailOptIn = true
    @Published var notes = ""
    @Published var isSaving = false
    @Published var toast: ToastMessage?

    var canSave: Bool {
        !firstName.trimmingCharacters(in: .whitespaces).isEmpty
        && !lastName.trimmingCharacters(in: .whitespaces).isEmpty
        && !pmbNumber.trimmingCharacters(in: .whitespaces).isEmpty
    }

    func save() async -> Bool {
        isSaving = true
        defer { isSaving = false }

        let body = CustomerCreateRequest(
            firstName: firstName.trimmingCharacters(in: .whitespaces),
            lastName: lastName.trimmingCharacters(in: .whitespaces),
            email: email.isEmpty ? nil : email,
            phone: phone.isEmpty ? nil : phone,
            pmbNumber: pmbNumber.trimmingCharacters(in: .whitespaces),
            address: address.isEmpty ? nil : address,
            city: city.isEmpty ? nil : city,
            state: state.isEmpty ? nil : state,
            zipCode: zip.isEmpty ? nil : zip,
            smsOptIn: smsOptIn,
            emailOptIn: emailOptIn,
            notes: notes.isEmpty ? nil : notes
        )

        do {
            let _: CustomerDTO = try await APIClient.shared.request(
                API.Customers.create(body: body)
            )
            toast = ToastMessage(message: "Customer created ✓", type: .success)
            return true
        } catch let error as APIError {
            toast = ToastMessage(message: error.userMessage, type: .error)
            return false
        } catch {
            toast = ToastMessage(message: "Failed to save", type: .error)
            return false
        }
    }
}

#Preview {
    NavigationStack {
        CustomerDetailView(customer: Customer.preview)
    }
}
