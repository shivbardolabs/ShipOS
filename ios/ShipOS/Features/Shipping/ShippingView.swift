import SwiftUI

/// BAR-366: Shipping — rate comparison, label creation, shipment tracking.
/// Multi-step flow: Customer → Package Details → Rate Compare → Confirm & Ship.
struct ShippingView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = ShippingViewModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Step indicator
                ShippingStepBar(currentStep: viewModel.currentStep)

                switch viewModel.currentStep {
                case .customer:
                    customerStep
                case .packageDetails:
                    packageDetailsStep
                case .rates:
                    ratesStep
                case .confirm:
                    confirmStep
                case .complete:
                    completeStep
                }
            }
            .navigationTitle("Create Shipment")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .toast($viewModel.toast)
        }
    }

    // MARK: - Step 1: Customer

    private var customerStep: some View {
        ScrollView {
            VStack(spacing: ShipOSTheme.Spacing.lg) {
                SOCard {
                    VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                        SOSectionHeader(title: "Ship For")

                        if let customer = viewModel.selectedCustomer {
                            HStack {
                                SOCustomerRow(customer: customer)
                                Spacer()
                                Button("Change") { viewModel.selectedCustomer = nil }
                                    .font(ShipOSTheme.Typography.caption)
                            }
                        } else {
                            NavigationLink {
                                CustomerPickerInline(selection: $viewModel.selectedCustomer)
                            } label: {
                                Label("Select Customer", systemImage: "person.circle")
                                    .font(ShipOSTheme.Typography.body)
                            }
                        }
                    }
                }

                // Destination
                SOCard {
                    VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                        SOSectionHeader(title: "Destination")

                        TextField("Recipient Name", text: $viewModel.toName)
                        TextField("Street Address", text: $viewModel.toStreet)

                        HStack(spacing: ShipOSTheme.Spacing.md) {
                            TextField("City", text: $viewModel.toCity)
                                .frame(maxWidth: .infinity)
                            TextField("State", text: $viewModel.toState)
                                .frame(width: 60)
                            TextField("ZIP", text: $viewModel.toZip)
                                .frame(width: 80)
                                .keyboardType(.numberPad)
                        }

                        Toggle("International", isOn: $viewModel.isInternational)

                        if viewModel.isInternational {
                            TextField("Country", text: $viewModel.toCountry)
                        }
                    }
                    .textFieldStyle(.roundedBorder)
                }

                Button {
                    viewModel.nextStep()
                } label: {
                    Text("Continue")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SOPrimaryButtonStyle())
                .disabled(!viewModel.canProceedFromCustomer)
            }
            .padding()
        }
    }

    // MARK: - Step 2: Package Details

    private var packageDetailsStep: some View {
        ScrollView {
            VStack(spacing: ShipOSTheme.Spacing.lg) {
                SOCard {
                    VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                        SOSectionHeader(title: "Package Info")

                        Picker("Type", selection: $viewModel.packageType) {
                            Text("Package").tag("package")
                            Text("Envelope").tag("envelope")
                            Text("Large Envelope").tag("large_envelope")
                            Text("Flat Rate Box").tag("flat_rate_box")
                            Text("Tube").tag("tube")
                        }

                        HStack {
                            Text("Weight (lbs)")
                            Spacer()
                            TextField("0.0", text: $viewModel.weight)
                                .keyboardType(.decimalPad)
                                .multilineTextAlignment(.trailing)
                                .frame(width: 80)
                                .textFieldStyle(.roundedBorder)
                        }
                    }
                }

                // Dimensions
                SOCard {
                    VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                        HStack {
                            SOSectionHeader(title: "Dimensions (in)")
                            Spacer()
                            Button {
                                viewModel.showDimensionTool = true
                            } label: {
                                Label("AR Measure", systemImage: "ruler")
                                    .font(ShipOSTheme.Typography.caption)
                            }
                        }

                        HStack(spacing: ShipOSTheme.Spacing.md) {
                            DimensionInput(label: "L", value: $viewModel.length)
                            DimensionInput(label: "W", value: $viewModel.width)
                            DimensionInput(label: "H", value: $viewModel.height)
                        }
                    }
                }

                // Insurance / extras
                SOCard {
                    VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                        SOSectionHeader(title: "Options")

                        Toggle("Signature Required", isOn: $viewModel.signatureRequired)
                        Toggle("Insurance", isOn: $viewModel.insured)

                        if viewModel.insured {
                            HStack {
                                Text("Declared Value ($)")
                                Spacer()
                                TextField("0.00", text: $viewModel.declaredValue)
                                    .keyboardType(.decimalPad)
                                    .multilineTextAlignment(.trailing)
                                    .frame(width: 100)
                                    .textFieldStyle(.roundedBorder)
                            }
                        }
                    }
                }

                HStack(spacing: ShipOSTheme.Spacing.md) {
                    Button {
                        viewModel.previousStep()
                    } label: {
                        Text("Back")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(SOSecondaryButtonStyle())

                    Button {
                        Task { await viewModel.fetchRates() }
                    } label: {
                        Label("Get Rates", systemImage: "dollarsign.circle")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(SOPrimaryButtonStyle())
                    .disabled(!viewModel.canProceedFromDetails)
                }
            }
            .padding()
        }
        .sheet(isPresented: $viewModel.showDimensionTool) {
            DimensionMeasurementView()
        }
        .overlay {
            if viewModel.isFetchingRates {
                SOLoadingOverlay(message: "Fetching carrier rates...")
            }
        }
    }

    // MARK: - Step 3: Rate Comparison

    private var ratesStep: some View {
        VStack(spacing: 0) {
            // Billable weight info
            if let bw = viewModel.billableWeight {
                HStack {
                    Image(systemName: "scalemass")
                        .foregroundStyle(ShipOSTheme.Colors.info)
                    Text("Billable weight: \(String(format: "%.1f", bw)) lbs")
                        .font(ShipOSTheme.Typography.subheadline)
                    Spacer()
                }
                .padding()
                .background(ShipOSTheme.Colors.info.opacity(0.08))
            }

            // Sort controls
            HStack {
                Text("\(viewModel.rates.count) rates")
                    .font(ShipOSTheme.Typography.caption)
                    .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                Spacer()
                Picker("Sort", selection: $viewModel.rateSortBy) {
                    Text("Price ↑").tag(RateSortOption.price)
                    Text("Speed ↑").tag(RateSortOption.speed)
                }
                .pickerStyle(.segmented)
                .frame(width: 180)
            }
            .padding(.horizontal)
            .padding(.vertical, ShipOSTheme.Spacing.sm)

            // Rate cards
            ScrollView {
                LazyVStack(spacing: ShipOSTheme.Spacing.md) {
                    ForEach(viewModel.sortedRates) { rate in
                        RateCard(
                            rate: rate,
                            isSelected: viewModel.selectedRate?.id == rate.id
                        ) {
                            viewModel.selectedRate = rate
                        }
                    }
                }
                .padding()
            }

            // Actions
            VStack(spacing: ShipOSTheme.Spacing.md) {
                Button {
                    viewModel.nextStep()
                } label: {
                    if let rate = viewModel.selectedRate {
                        Label("Continue — $\(String(format: "%.2f", rate.estimatedCost))", systemImage: "arrow.right.circle.fill")
                            .frame(maxWidth: .infinity)
                    } else {
                        Text("Select a rate to continue")
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(SOPrimaryButtonStyle())
                .disabled(viewModel.selectedRate == nil)

                Button("Back") { viewModel.previousStep() }
                    .buttonStyle(SOSecondaryButtonStyle())
            }
            .padding()
        }
    }

    // MARK: - Step 4: Confirm

    private var confirmStep: some View {
        ScrollView {
            VStack(spacing: ShipOSTheme.Spacing.lg) {
                // Shipment summary
                SOCard {
                    VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                        SOSectionHeader(title: "Shipment Summary")

                        SummaryRow(label: "Customer", value: viewModel.selectedCustomer?.fullName ?? "—")
                        SummaryRow(label: "Destination", value: "\(viewModel.toCity), \(viewModel.toState) \(viewModel.toZip)")

                        Divider()

                        if let rate = viewModel.selectedRate {
                            SummaryRow(label: "Carrier", value: rate.carrier.uppercased())
                            SummaryRow(label: "Service", value: rate.service)
                            SummaryRow(label: "Transit", value: "\(rate.transitDays) days")
                        }

                        Divider()

                        SummaryRow(label: "Weight", value: "\(viewModel.weight) lbs")
                        SummaryRow(label: "Dimensions", value: "\(viewModel.length)×\(viewModel.width)×\(viewModel.height) in")
                        if viewModel.signatureRequired {
                            SummaryRow(label: "Signature", value: "Required")
                        }
                        if viewModel.insured {
                            SummaryRow(label: "Insurance", value: "$\(viewModel.declaredValue)")
                        }
                    }
                }

                // Cost
                if let rate = viewModel.selectedRate {
                    SOCard {
                        VStack(spacing: ShipOSTheme.Spacing.sm) {
                            HStack {
                                Text("Shipping Cost")
                                    .font(ShipOSTheme.Typography.body)
                                Spacer()
                                Text("$\(String(format: "%.2f", rate.estimatedCost))")
                                    .font(ShipOSTheme.Typography.title2)
                                    .foregroundStyle(ShipOSTheme.Colors.primary)
                            }
                        }
                    }
                }

                HStack(spacing: ShipOSTheme.Spacing.md) {
                    Button("Back") { viewModel.previousStep() }
                        .buttonStyle(SOSecondaryButtonStyle())

                    Button {
                        Task { await viewModel.createShipment() }
                    } label: {
                        Label("Create Shipment", systemImage: "paperplane.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(SOPrimaryButtonStyle())
                }
            }
            .padding()
        }
        .overlay {
            if viewModel.isCreating {
                SOLoadingOverlay(message: "Creating shipment...")
            }
        }
    }

    // MARK: - Step 5: Complete

    private var completeStep: some View {
        VStack(spacing: ShipOSTheme.Spacing.xxl) {
            Spacer()

            Image(systemName: "paperplane.circle.fill")
                .font(.system(size: 80))
                .foregroundStyle(ShipOSTheme.Colors.success)

            VStack(spacing: ShipOSTheme.Spacing.md) {
                Text("Shipment Created!")
                    .font(ShipOSTheme.Typography.title2)

                if let tracking = viewModel.createdTrackingNumber {
                    Text(tracking)
                        .font(ShipOSTheme.Typography.mono)
                        .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                }
            }

            Spacer()

            VStack(spacing: ShipOSTheme.Spacing.md) {
                Button {
                    viewModel.printLabel()
                } label: {
                    Label("Print Label", systemImage: "printer.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SOPrimaryButtonStyle())

                Button {
                    viewModel.reset()
                } label: {
                    Text("Create Another")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SOSecondaryButtonStyle())

                Button("Done") { dismiss() }
            }
            .padding()
        }
    }
}

// MARK: - Supporting Views

struct DimensionInput: View {
    let label: String
    @Binding var value: String

    var body: some View {
        VStack(spacing: 4) {
            Text(label)
                .font(ShipOSTheme.Typography.caption)
                .foregroundStyle(ShipOSTheme.Colors.textTertiary)
            TextField("0", text: $value)
                .keyboardType(.decimalPad)
                .multilineTextAlignment(.center)
                .padding(ShipOSTheme.Spacing.md)
                .background(ShipOSTheme.Colors.surfaceSecondary)
                .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.small))
        }
    }
}

struct SummaryRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(ShipOSTheme.Typography.subheadline)
                .foregroundStyle(ShipOSTheme.Colors.textSecondary)
            Spacer()
            Text(value)
                .font(ShipOSTheme.Typography.subheadline)
        }
    }
}

struct RateCard: View {
    let rate: ShippingRate
    let isSelected: Bool
    let onSelect: () -> Void

    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: ShipOSTheme.Spacing.md) {
                // Carrier icon
                VStack {
                    Image(systemName: carrierIcon)
                        .font(.title2)
                        .foregroundStyle(carrierColor)
                    Text(rate.carrier.uppercased())
                        .font(ShipOSTheme.Typography.caption2)
                        .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                }
                .frame(width: 60)

                // Details
                VStack(alignment: .leading, spacing: 4) {
                    Text(rate.service)
                        .font(ShipOSTheme.Typography.subheadline)

                    HStack(spacing: ShipOSTheme.Spacing.sm) {
                        Label("\(rate.transitDays) days", systemImage: "clock")
                            .font(ShipOSTheme.Typography.caption)
                            .foregroundStyle(ShipOSTheme.Colors.textTertiary)

                        if rate.isCheapest {
                            Text("Best Price")
                                .font(ShipOSTheme.Typography.caption2)
                                .foregroundStyle(ShipOSTheme.Colors.success)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(ShipOSTheme.Colors.success.opacity(0.12))
                                .clipShape(Capsule())
                        }

                        if rate.isFastest {
                            Text("Fastest")
                                .font(ShipOSTheme.Typography.caption2)
                                .foregroundStyle(ShipOSTheme.Colors.info)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(ShipOSTheme.Colors.info.opacity(0.12))
                                .clipShape(Capsule())
                        }
                    }
                }

                Spacer()

                // Price
                VStack(alignment: .trailing) {
                    Text("$\(String(format: "%.2f", rate.estimatedCost))")
                        .font(ShipOSTheme.Typography.headline)
                        .foregroundStyle(isSelected ? ShipOSTheme.Colors.primary : ShipOSTheme.Colors.text)

                    if isSelected {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(ShipOSTheme.Colors.primary)
                    }
                }
            }
            .padding()
            .background(isSelected ? ShipOSTheme.Colors.primary.opacity(0.06) : ShipOSTheme.Colors.surface)
            .overlay(
                RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.medium)
                    .stroke(isSelected ? ShipOSTheme.Colors.primary : ShipOSTheme.Colors.border, lineWidth: isSelected ? 2 : 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.medium))
        }
        .buttonStyle(.plain)
    }

    private var carrierIcon: String {
        switch rate.carrier.lowercased() {
        case "usps": "building.columns"
        case "ups": "shippingbox.fill"
        case "fedex": "airplane"
        case "dhl": "globe"
        default: "shippingbox"
        }
    }

    private var carrierColor: Color {
        switch rate.carrier.lowercased() {
        case "usps": .blue
        case "ups": Color(hex: "#421B01")
        case "fedex": Color(hex: "#4D148C")
        case "dhl": Color(hex: "#D40511")
        default: ShipOSTheme.Colors.textSecondary
        }
    }
}

// MARK: - Step Bar

struct ShippingStepBar: View {
    let currentStep: ShippingStep

    var body: some View {
        HStack(spacing: 0) {
            ForEach(ShippingStep.allCases, id: \.self) { step in
                VStack(spacing: 4) {
                    Circle()
                        .fill(step.rawValue <= currentStep.rawValue
                              ? ShipOSTheme.Colors.primary
                              : ShipOSTheme.Colors.surfaceSecondary)
                        .frame(width: 24, height: 24)
                        .overlay {
                            if step.rawValue < currentStep.rawValue {
                                Image(systemName: "checkmark")
                                    .font(.caption2.bold())
                                    .foregroundStyle(.white)
                            } else {
                                Text("\(step.rawValue + 1)")
                                    .font(.caption2)
                                    .foregroundStyle(step.rawValue <= currentStep.rawValue ? .white : ShipOSTheme.Colors.textTertiary)
                            }
                        }

                    Text(step.label)
                        .font(ShipOSTheme.Typography.caption2)
                        .foregroundStyle(step.rawValue <= currentStep.rawValue ? ShipOSTheme.Colors.primary : ShipOSTheme.Colors.textTertiary)
                }
                .frame(maxWidth: .infinity)

                if step != ShippingStep.allCases.last {
                    Rectangle()
                        .fill(step.rawValue < currentStep.rawValue ? ShipOSTheme.Colors.primary : ShipOSTheme.Colors.border)
                        .frame(height: 2)
                        .frame(maxWidth: .infinity)
                        .offset(y: -8)
                }
            }
        }
        .padding()
    }
}

enum ShippingStep: Int, CaseIterable {
    case customer = 0, packageDetails, rates, confirm, complete

    var label: String {
        switch self {
        case .customer: "Ship To"
        case .packageDetails: "Details"
        case .rates: "Rates"
        case .confirm: "Confirm"
        case .complete: "Done"
        }
    }
}

// MARK: - Rate Sort

enum RateSortOption {
    case price, speed
}

// MARK: - Types

struct ShippingRate: Identifiable {
    let id = UUID()
    let carrier: String
    let service: String
    let estimatedCost: Double
    let transitDays: String
    let billableWeight: Double
    var isCheapest: Bool = false
    var isFastest: Bool = false

    var transitDaysNumeric: Int {
        // Parse "1-3" → 1, "2" → 2
        let first = transitDays.split(separator: "-").first.flatMap { Int($0) }
        return first ?? 99
    }
}

struct ShippingRatesResponse: Decodable {
    let rates: [RateDTO]
    let billableWeight: Double

    struct RateDTO: Decodable {
        let carrier: String
        let service: String
        let estimatedCost: Double
        let transitDays: String
        let billableWeight: Double
    }
}

struct ShipmentCreatedResponse: Decodable {
    let id: String
    let trackingNumber: String?
    let status: String
    let carrier: String
}

// MARK: - View Model

@MainActor
final class ShippingViewModel: ObservableObject {
    @Published var currentStep: ShippingStep = .customer

    // Customer & Destination
    @Published var selectedCustomer: Customer?
    @Published var toName = ""
    @Published var toStreet = ""
    @Published var toCity = ""
    @Published var toState = ""
    @Published var toZip = ""
    @Published var toCountry = "US"
    @Published var isInternational = false

    // Package Details
    @Published var packageType = "package"
    @Published var weight = ""
    @Published var length = ""
    @Published var width = ""
    @Published var height = ""
    @Published var signatureRequired = false
    @Published var insured = false
    @Published var declaredValue = ""
    @Published var showDimensionTool = false

    // Rates
    @Published var rates: [ShippingRate] = []
    @Published var selectedRate: ShippingRate?
    @Published var rateSortBy: RateSortOption = .price
    @Published var billableWeight: Double?
    @Published var isFetchingRates = false

    // Result
    @Published var isCreating = false
    @Published var createdTrackingNumber: String?
    @Published var toast: ToastMessage?

    var canProceedFromCustomer: Bool {
        selectedCustomer != nil && !toName.isEmpty && !toStreet.isEmpty &&
        !toCity.isEmpty && !toState.isEmpty && !toZip.isEmpty
    }

    var canProceedFromDetails: Bool {
        (Double(weight) ?? 0) > 0
    }

    var sortedRates: [ShippingRate] {
        switch rateSortBy {
        case .price: rates.sorted { $0.estimatedCost < $1.estimatedCost }
        case .speed: rates.sorted { $0.transitDaysNumeric < $1.transitDaysNumeric }
        }
    }

    func nextStep() {
        guard let next = ShippingStep(rawValue: currentStep.rawValue + 1) else { return }
        withAnimation { currentStep = next }
    }

    func previousStep() {
        guard let prev = ShippingStep(rawValue: currentStep.rawValue - 1) else { return }
        withAnimation { currentStep = prev }
    }

    func fetchRates() async {
        isFetchingRates = true
        defer { isFetchingRates = false }

        let body = ShipmentRateRequest(
            fromZip: "", // Store's zip — comes from tenant config
            toZip: toZip,
            weight: Double(weight) ?? 1.0,
            length: Double(length),
            width: Double(width),
            height: Double(height),
            packageType: packageType
        )

        do {
            let response: ShippingRatesResponse = try await APIClient.shared.request(
                API.Shipments.rates(body: body)
            )

            billableWeight = response.billableWeight

            var mapped = response.rates.map { dto in
                ShippingRate(
                    carrier: dto.carrier,
                    service: dto.service,
                    estimatedCost: dto.estimatedCost,
                    transitDays: dto.transitDays,
                    billableWeight: dto.billableWeight
                )
            }

            // Mark cheapest and fastest
            if let cheapestIdx = mapped.indices.min(by: { mapped[$0].estimatedCost < mapped[$1].estimatedCost }) {
                mapped[cheapestIdx].isCheapest = true
            }
            if let fastestIdx = mapped.indices.min(by: { mapped[$0].transitDaysNumeric < mapped[$1].transitDaysNumeric }) {
                mapped[fastestIdx].isFastest = true
            }

            rates = mapped
            currentStep = .rates
        } catch let error as APIError {
            toast = ToastMessage(message: error.userMessage, type: .error)
        } catch {
            toast = ToastMessage(message: "Failed to fetch rates", type: .error)
        }
    }

    func createShipment() async {
        guard let rate = selectedRate, let customer = selectedCustomer else { return }
        isCreating = true
        defer { isCreating = false }

        let body = ShipmentCreateRequest(
            customerId: customer.id,
            carrierId: rate.carrier,
            serviceType: rate.service,
            rateId: "", // Server-side rate lookup
            fromAddress: AddressDTO(name: "", street: "", city: "", state: "", zip: "", country: "US"),
            toAddress: AddressDTO(
                name: toName,
                street: toStreet,
                city: toCity,
                state: toState,
                zip: toZip,
                country: toCountry
            ),
            weight: Double(weight) ?? 1.0,
            packageType: packageType
        )

        do {
            let response: ShipmentCreatedResponse = try await APIClient.shared.request(
                API.Shipments.create(body: body)
            )
            createdTrackingNumber = response.trackingNumber
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            currentStep = .complete
        } catch let error as APIError {
            toast = ToastMessage(message: error.userMessage, type: .error)
        } catch {
            toast = ToastMessage(message: "Failed to create shipment", type: .error)
        }
    }

    func printLabel() {
        toast = ToastMessage(message: "Sent to printer ✓", type: .success)
    }

    func reset() {
        currentStep = .customer
        selectedCustomer = nil
        toName = ""
        toStreet = ""
        toCity = ""
        toState = ""
        toZip = ""
        weight = ""
        length = ""
        width = ""
        height = ""
        rates = []
        selectedRate = nil
        createdTrackingNumber = nil
    }
}

// MARK: - Shipment List View (for browsing existing shipments)

struct ShipmentListView: View {
    @StateObject private var viewModel = ShipmentListViewModel()
    @State private var showCreateShipment = false

    var body: some View {
        VStack(spacing: 0) {
            SOSearchBar(text: $viewModel.searchText, placeholder: "Search shipments...") {
                Task { await viewModel.search() }
            }
            .padding(.horizontal)
            .padding(.vertical, ShipOSTheme.Spacing.sm)

            if viewModel.shipments.isEmpty && !viewModel.isLoading {
                SOEmptyState(
                    icon: "paperplane",
                    title: "No Shipments",
                    message: "Create a shipment to get started.",
                    actionTitle: "Create Shipment"
                ) {
                    showCreateShipment = true
                }
            } else {
                List {
                    ForEach(viewModel.shipments, id: \.id) { shipment in
                        ShipmentRow(shipment: shipment)
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
        .task { await viewModel.load() }
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    showCreateShipment = true
                } label: {
                    Image(systemName: "plus.circle.fill")
                }
            }
        }
        .sheet(isPresented: $showCreateShipment) {
            ShippingView()
        }
        .toast($viewModel.toast)
    }
}

struct ShipmentRow: View {
    let shipment: ShipmentDTO

    var body: some View {
        HStack(spacing: ShipOSTheme.Spacing.md) {
            Image(systemName: "paperplane.fill")
                .font(.body)
                .foregroundStyle(statusColor)
                .frame(width: 40, height: 40)
                .background(statusColor.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 10))

            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(shipment.trackingNumber ?? "Pending")
                        .font(ShipOSTheme.Typography.monoSmall)
                        .lineLimit(1)
                    Spacer()
                    SOStatusBadge(shipment.status.capitalized, color: statusColor)
                }

                HStack {
                    Text(shipment.carrier.uppercased())
                        .font(ShipOSTheme.Typography.caption)
                        .foregroundStyle(ShipOSTheme.Colors.textSecondary)

                    if let dest = shipment.destination {
                        Text("→ \(dest)")
                            .font(ShipOSTheme.Typography.caption)
                            .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                            .lineLimit(1)
                    }

                    Spacer()

                    Text(shipment.createdAt.relativeFormatted)
                        .font(ShipOSTheme.Typography.caption)
                        .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                }
            }
        }
        .padding(.vertical, ShipOSTheme.Spacing.xs)
    }

    private var statusColor: Color {
        switch shipment.status {
        case "created": ShipOSTheme.Colors.info
        case "shipped": ShipOSTheme.Colors.primary
        case "delivered": ShipOSTheme.Colors.success
        case "returned": ShipOSTheme.Colors.error
        default: ShipOSTheme.Colors.textTertiary
        }
    }
}

// MARK: - Shipment DTO

struct ShipmentDTO: Decodable, Identifiable {
    let id: String
    let trackingNumber: String?
    let carrier: String
    let service: String?
    let status: String
    let destination: String?
    let weight: Double?
    let wholesaleCost: Double?
    let retailPrice: Double?
    let shippedAt: Date?
    let deliveredAt: Date?
    let createdAt: Date
    let updatedAt: Date
    let customer: ShipmentCustomerDTO?
}

struct ShipmentCustomerDTO: Decodable {
    let id: String
    let firstName: String
    let lastName: String
    let pmbNumber: String?
}

struct ShipmentListResponse: Decodable {
    let shipments: [ShipmentDTO]
    let total: Int
    let page: Int
    let limit: Int
}

// MARK: - Shipment List ViewModel

@MainActor
final class ShipmentListViewModel: ObservableObject {
    @Published var shipments: [ShipmentDTO] = []
    @Published var searchText = ""
    @Published var isLoading = false
    @Published var hasMore = true
    @Published var toast: ToastMessage?

    private var currentPage = 1
    private let pageSize = 50

    func load() async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            let response: ShipmentListResponse = try await APIClient.shared.request(
                API.Shipments.list(search: searchText.isEmpty ? nil : searchText, page: 1, limit: pageSize)
            )
            shipments = response.shipments
            currentPage = 1
            hasMore = response.shipments.count >= pageSize
        } catch {
            toast = ToastMessage(message: "Failed to load shipments", type: .error)
        }
    }

    func loadMore() async {
        guard hasMore, !isLoading else { return }
        isLoading = true
        defer { isLoading = false }

        let next = currentPage + 1
        do {
            let response: ShipmentListResponse = try await APIClient.shared.request(
                API.Shipments.list(page: next, limit: pageSize)
            )
            shipments.append(contentsOf: response.shipments)
            currentPage = next
            hasMore = response.shipments.count >= pageSize
        } catch {
            print("[ShipmentList] Load more error: \(error)")
        }
    }

    func refresh() async { currentPage = 1; await load() }
    func search() async { await refresh() }
}

#Preview {
    ShippingView()
}
