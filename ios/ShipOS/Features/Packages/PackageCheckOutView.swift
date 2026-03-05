import SwiftUI

/// BAR-356: Check-Out — scan/search package, verify customer identity, capture signature, release.
struct PackageCheckOutView: View {
    @StateObject private var viewModel = CheckOutViewModel()
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                switch viewModel.step {
                case .search:
                    searchStep
                case .verify:
                    verifyStep
                case .signature:
                    signatureStep
                case .complete:
                    completeStep
                }
            }
            .navigationTitle("Check Out")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    if viewModel.step != .complete {
                        Button("Cancel") { dismiss() }
                    }
                }
            }
            .overlay {
                if viewModel.isSubmitting {
                    SOLoadingOverlay(message: "Releasing package...")
                }
            }
            .toast($viewModel.toast)
        }
    }

    // MARK: - Step 1: Search

    private var searchStep: some View {
        VStack(spacing: ShipOSTheme.Spacing.lg) {
            StepIndicator(current: 1, total: 3)

            SOSearchBar(
                text: $viewModel.searchQuery,
                placeholder: "Tracking # or customer name..."
            ) {
                Task { await viewModel.searchPackages() }
            }
            .padding(.horizontal)

            // Scan button
            Button {
                viewModel.isShowingScanner = true
            } label: {
                Label("Scan Barcode", systemImage: "barcode.viewfinder")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(SOSecondaryButtonStyle())
            .padding(.horizontal)

            if viewModel.searchResults.isEmpty && !viewModel.isLoading {
                Spacer()
                SOEmptyState(
                    icon: "magnifyingglass",
                    title: "Find Package",
                    message: "Search by tracking number, customer name, or PMB to start checkout."
                )
                Spacer()
            } else {
                List {
                    ForEach(viewModel.searchResults, id: \.id) { pkg in
                        Button {
                            viewModel.selectPackage(pkg)
                        } label: {
                            SOPackageRow(package: pkg)
                        }
                    }
                }
                .listStyle(.plain)
            }
        }
        .sheet(isPresented: $viewModel.isShowingScanner) {
            BarcodeScannerView { code in
                viewModel.searchQuery = code
                viewModel.isShowingScanner = false
                Task { await viewModel.searchPackages() }
            }
        }
    }

    // MARK: - Step 2: Verify

    private var verifyStep: some View {
        ScrollView {
            VStack(spacing: ShipOSTheme.Spacing.lg) {
                StepIndicator(current: 2, total: 3)

                if let pkg = viewModel.selectedPackage {
                    // Package info card
                    SOCard {
                        VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                            SOSectionHeader(title: "Package Details")

                            DetailRow(label: "Tracking", value: pkg.trackingNumber)
                            DetailRow(label: "Carrier", value: pkg.carrier ?? "Unknown")
                            DetailRow(label: "Status", value: pkg.status.displayName)
                            DetailRow(label: "Checked In", value: pkg.checkedInAt?.relativeFormatted ?? "-")
                            DetailRow(label: "Storage", value: pkg.storageLocation ?? "Not assigned")

                            if let customer = pkg.customer {
                                Divider()
                                SOSectionHeader(title: "Customer")
                                DetailRow(label: "Name", value: customer.fullName)
                                DetailRow(label: "PMB", value: customer.pmbNumber ?? "-")
                            }
                        }
                    }
                    .padding(.horizontal)

                    // ID verification
                    SOCard {
                        VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                            SOSectionHeader(title: "ID Verification")

                            Text("Verify the customer's identity before releasing.")
                                .font(ShipOSTheme.Typography.caption)
                                .foregroundStyle(ShipOSTheme.Colors.textSecondary)

                            Picker("ID Type", selection: $viewModel.idType) {
                                Text("Driver's License").tag("drivers_license")
                                Text("Passport").tag("passport")
                                Text("State ID").tag("state_id")
                                Text("Known Customer").tag("known")
                            }
                            .pickerStyle(.segmented)

                            Toggle("ID Verified", isOn: $viewModel.idVerified)
                                .tint(ShipOSTheme.Colors.success)
                        }
                    }
                    .padding(.horizontal)

                    Button {
                        withAnimation { viewModel.step = .signature }
                    } label: {
                        Label("Continue to Signature", systemImage: "arrow.right")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(SOPrimaryButtonStyle())
                    .disabled(!viewModel.idVerified)
                    .padding(.horizontal)

                    Button {
                        withAnimation { viewModel.step = .search }
                    } label: {
                        Text("Back")
                    }
                    .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                }
            }
            .padding(.vertical)
        }
    }

    // MARK: - Step 3: Signature

    private var signatureStep: some View {
        VStack(spacing: ShipOSTheme.Spacing.lg) {
            StepIndicator(current: 3, total: 3)

            Text("Customer Signature")
                .font(ShipOSTheme.Typography.headline)

            Text("Customer signs below to confirm package receipt")
                .font(ShipOSTheme.Typography.caption)
                .foregroundStyle(ShipOSTheme.Colors.textSecondary)

            // Signature pad
            SignaturePadView(signature: $viewModel.signatureImage)
                .frame(height: 200)
                .background(ShipOSTheme.Colors.surfaceSecondary)
                .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.md))
                .overlay(
                    RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.md)
                        .stroke(ShipOSTheme.Colors.border, lineWidth: 1)
                )
                .padding(.horizontal)

            HStack(spacing: ShipOSTheme.Spacing.md) {
                Button("Clear") {
                    viewModel.signatureImage = nil
                }
                .buttonStyle(SOSecondaryButtonStyle())

                Button {
                    Task { await viewModel.completeCheckOut() }
                } label: {
                    Label("Release Package", systemImage: "checkmark.circle.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SOPrimaryButtonStyle())
                .disabled(viewModel.signatureImage == nil)
            }
            .padding(.horizontal)

            Button {
                withAnimation { viewModel.step = .verify }
            } label: {
                Text("Back")
            }
            .foregroundStyle(ShipOSTheme.Colors.textSecondary)

            Spacer()
        }
        .padding(.top)
    }

    // MARK: - Complete

    private var completeStep: some View {
        VStack(spacing: ShipOSTheme.Spacing.xl) {
            Spacer()

            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 80))
                .foregroundStyle(ShipOSTheme.Colors.success)

            Text("Package Released!")
                .font(ShipOSTheme.Typography.title2)

            if let pkg = viewModel.selectedPackage {
                Text(pkg.trackingNumber)
                    .font(ShipOSTheme.Typography.body)
                    .foregroundStyle(ShipOSTheme.Colors.textSecondary)
            }

            Button("Done") {
                dismiss()
            }
            .buttonStyle(SOPrimaryButtonStyle())
            .padding(.horizontal, 40)

            Spacer()
        }
    }
}

// MARK: - Step Indicator

struct StepIndicator: View {
    let current: Int
    let total: Int

    var body: some View {
        HStack(spacing: 8) {
            ForEach(1...total, id: \.self) { step in
                Capsule()
                    .fill(step <= current ? ShipOSTheme.Colors.primary : ShipOSTheme.Colors.surfaceSecondary)
                    .frame(height: 4)
            }
        }
        .padding(.horizontal)
    }
}

// MARK: - Detail Row

struct DetailRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(ShipOSTheme.Typography.caption)
                .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                .frame(width: 80, alignment: .leading)
            Text(value)
                .font(ShipOSTheme.Typography.body)
                .foregroundStyle(ShipOSTheme.Colors.textPrimary)
            Spacer()
        }
    }
}

// SignaturePadView is defined in CustomerOnboardingView.swift

// MARK: - View Model

@MainActor
final class CheckOutViewModel: ObservableObject {
    enum Step { case search, verify, signature, complete }

    @Published var step: Step = .search
    @Published var searchQuery = ""
    @Published var searchResults: [Package] = []
    @Published var selectedPackage: Package?
    @Published var isLoading = false
    @Published var isSubmitting = false
    @Published var isShowingScanner = false
    @Published var toast: ToastMessage?

    // Verification
    @Published var idType = "drivers_license"
    @Published var idVerified = false
    @Published var signatureImage: UIImage?

    func searchPackages() async {
        guard !searchQuery.isEmpty else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            let response: PackageListResponse = try await APIClient.shared.request(
                API.Packages.list(search: searchQuery, status: .checkedIn, page: 1, limit: 20)
            )
            searchResults = response.packages.map { $0.toModel() }
        } catch {
            toast = ToastMessage(message: "Search failed", type: .error)
        }
    }

    func selectPackage(_ pkg: Package) {
        selectedPackage = pkg
        withAnimation { step = .verify }
    }

    func completeCheckOut() async {
        guard let pkg = selectedPackage else { return }
        isSubmitting = true
        defer { isSubmitting = false }

        do {
            let body = PackageCheckOutRequest(
                signatureData: signatureImage?.pngData()?.base64EncodedString(),
                idType: idType,
                idVerified: idVerified,
                notes: nil
            )
            let _: PackageDTO = try await APIClient.shared.request(
                API.Packages.checkOut(id: pkg.id, body: body)
            )
            withAnimation { step = .complete }
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        } catch let error as APIError {
            toast = ToastMessage(message: error.userMessage, type: .error)
        } catch {
            toast = ToastMessage(message: "Check-out failed", type: .error)
        }
    }
}

#Preview {
    PackageCheckOutView()
}
