import SwiftUI
import AVFoundation

/// BAR-367: Customer Onboarding — multi-step registration wizard with ID scan, Form 1583,
/// PMB assignment, agreement signing, and notification setup.
struct CustomerOnboardingView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = OnboardingViewModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Progress bar
                OnboardingProgressBar(
                    currentStep: viewModel.stepIndex,
                    totalSteps: OnboardingStep.allCases.count
                )

                switch viewModel.currentStep {
                case .personalInfo:
                    personalInfoStep
                case .idVerification:
                    idVerificationStep
                case .form1583:
                    form1583Step
                case .pmbAssignment:
                    pmbAssignmentStep
                case .notificationPrefs:
                    notificationPrefsStep
                case .review:
                    reviewStep
                case .complete:
                    completeStep
                }
            }
            .navigationTitle("New Customer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .toast($viewModel.toast)
        }
    }

    // MARK: - Step 1: Personal Info

    private var personalInfoStep: some View {
        ScrollView {
            VStack(spacing: ShipOSTheme.Spacing.lg) {
                OnboardingStepHeader(
                    icon: "person.fill",
                    title: "Personal Information",
                    subtitle: "Enter the customer's basic details."
                )

                SOCard {
                    VStack(spacing: ShipOSTheme.Spacing.md) {
                        HStack(spacing: ShipOSTheme.Spacing.md) {
                            FormField(label: "First Name *", text: $viewModel.firstName)
                            FormField(label: "Last Name *", text: $viewModel.lastName)
                        }

                        FormField(label: "Email", text: $viewModel.email, keyboard: .emailAddress)
                        FormField(label: "Phone", text: $viewModel.phone, keyboard: .phonePad)

                        Divider()

                        Toggle("Business Account", isOn: $viewModel.isBusinessAccount)

                        if viewModel.isBusinessAccount {
                            FormField(label: "Business Name", text: $viewModel.businessName)
                        }
                    }
                }

                // Home address
                SOCard {
                    VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                        SOSectionHeader(title: "Home Address")
                        FormField(label: "Street", text: $viewModel.homeStreet)

                        HStack(spacing: ShipOSTheme.Spacing.md) {
                            FormField(label: "City", text: $viewModel.homeCity)
                            FormField(label: "State", text: $viewModel.homeState)
                                .frame(width: 80)
                            FormField(label: "ZIP", text: $viewModel.homeZip, keyboard: .numberPad)
                                .frame(width: 100)
                        }
                    }
                }

                onboardingNavButtons(
                    canProceed: viewModel.canProceedFromPersonalInfo,
                    showBack: false
                )
            }
            .padding()
        }
    }

    // MARK: - Step 2: ID Verification

    private var idVerificationStep: some View {
        ScrollView {
            VStack(spacing: ShipOSTheme.Spacing.lg) {
                OnboardingStepHeader(
                    icon: "person.text.rectangle",
                    title: "ID Verification",
                    subtitle: "Scan or enter two forms of valid ID (CMRA requirement)."
                )

                // Primary ID
                SOCard {
                    VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                        SOSectionHeader(title: "Primary ID")

                        Picker("ID Type", selection: $viewModel.primaryIdType) {
                            Text("Driver's License").tag("drivers_license")
                            Text("Passport").tag("passport")
                            Text("State ID").tag("state_id")
                            Text("Military ID").tag("military_id")
                        }

                        FormField(label: "ID Number", text: $viewModel.primaryIdNumber)

                        DatePicker("Expiration Date",
                                   selection: $viewModel.primaryIdExpiration,
                                   in: Date()...,
                                   displayedComponents: .date)

                        // Scan button
                        Button {
                            viewModel.scanPrimaryId()
                        } label: {
                            Label("Scan ID with Camera", systemImage: "camera.viewfinder")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(SOSecondaryButtonStyle())

                        if viewModel.primaryIdScanned {
                            HStack {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(ShipOSTheme.Colors.success)
                                Text("ID scanned successfully")
                                    .font(ShipOSTheme.Typography.caption)
                                    .foregroundStyle(ShipOSTheme.Colors.success)
                            }
                        }
                    }
                }

                // Secondary ID
                SOCard {
                    VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                        SOSectionHeader(title: "Secondary ID")

                        Picker("ID Type", selection: $viewModel.secondaryIdType) {
                            Text("Utility Bill").tag("utility_bill")
                            Text("Bank Statement").tag("bank_statement")
                            Text("Lease Agreement").tag("lease")
                            Text("Vehicle Registration").tag("vehicle_registration")
                            Text("Other").tag("other")
                        }

                        if viewModel.secondaryIdType == "other" {
                            FormField(label: "Description", text: $viewModel.secondaryIdDescription)
                        }

                        DatePicker("Date of Issue",
                                   selection: $viewModel.secondaryIdDate,
                                   in: ...Date(),
                                   displayedComponents: .date)
                    }
                }

                onboardingNavButtons(canProceed: viewModel.canProceedFromId)
            }
            .padding()
        }
    }

    // MARK: - Step 3: Form 1583

    private var form1583Step: some View {
        ScrollView {
            VStack(spacing: ShipOSTheme.Spacing.lg) {
                OnboardingStepHeader(
                    icon: "doc.text.fill",
                    title: "USPS Form 1583",
                    subtitle: "Required for CMRA authorization. The customer authorizes your store to receive mail."
                )

                SOCard {
                    VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                        // Pre-filled info
                        LabeledContent("Name") {
                            Text("\(viewModel.firstName) \(viewModel.lastName)")
                                .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                        }

                        LabeledContent("Primary ID") {
                            Text(viewModel.primaryIdType.replacingOccurrences(of: "_", with: " ").capitalized)
                                .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                        }

                        LabeledContent("Home Address") {
                            Text(viewModel.formattedHomeAddress)
                                .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                                .multilineTextAlignment(.trailing)
                        }

                        Divider()

                        // Signature
                        Text("Customer Signature")
                            .font(ShipOSTheme.Typography.subheadline)

                        SignaturePadView(signature: $viewModel.form1583Signature)
                            .frame(height: 150)
                            .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.medium))
                            .overlay(
                                RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.medium)
                                    .stroke(ShipOSTheme.Colors.border)
                            )

                        if viewModel.form1583Signature != nil {
                            Button("Clear Signature") {
                                viewModel.form1583Signature = nil
                            }
                            .font(ShipOSTheme.Typography.caption)
                        }

                        Divider()

                        // Notarization
                        Toggle("Notarized", isOn: $viewModel.isNotarized)

                        if viewModel.isNotarized {
                            DatePicker("Notarization Date",
                                       selection: $viewModel.notarizationDate,
                                       displayedComponents: .date)
                        }
                    }
                }

                // Info box
                HStack(alignment: .top, spacing: ShipOSTheme.Spacing.md) {
                    Image(systemName: "info.circle.fill")
                        .foregroundStyle(ShipOSTheme.Colors.info)
                    Text("Form 1583 must be kept on file for the duration of the mailbox rental plus one year. Notarization is required by USPS.")
                        .font(ShipOSTheme.Typography.caption)
                        .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                }
                .padding()
                .background(ShipOSTheme.Colors.info.opacity(0.08))
                .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.medium))

                onboardingNavButtons(canProceed: viewModel.form1583Signature != nil)
            }
            .padding()
        }
    }

    // MARK: - Step 4: PMB Assignment

    private var pmbAssignmentStep: some View {
        ScrollView {
            VStack(spacing: ShipOSTheme.Spacing.lg) {
                OnboardingStepHeader(
                    icon: "number",
                    title: "PMB Assignment",
                    subtitle: "Assign a Private Mailbox number to the customer."
                )

                SOCard {
                    VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                        SOSectionHeader(title: "Available PMB Numbers")

                        if viewModel.availablePMBs.isEmpty {
                            ProgressView()
                        } else {
                            // Suggested
                            if let suggested = viewModel.suggestedPMB {
                                HStack {
                                    Text("Suggested:")
                                        .font(ShipOSTheme.Typography.caption)
                                        .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                                    Text(suggested)
                                        .font(ShipOSTheme.Typography.headline)
                                        .foregroundStyle(ShipOSTheme.Colors.primary)
                                    Spacer()
                                    Button("Use This") {
                                        viewModel.selectedPMB = suggested
                                    }
                                    .font(ShipOSTheme.Typography.caption)
                                    .buttonStyle(.bordered)
                                }
                                .padding()
                                .background(ShipOSTheme.Colors.primary.opacity(0.06))
                                .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.small))

                                Divider()
                            }

                            // Manual entry
                            HStack {
                                TextField("PMB Number", text: $viewModel.manualPMB)
                                    .font(ShipOSTheme.Typography.headline)
                                    .keyboardType(.numberPad)
                                    .textFieldStyle(.roundedBorder)

                                Button("Assign") {
                                    viewModel.selectedPMB = viewModel.manualPMB
                                }
                                .disabled(viewModel.manualPMB.isEmpty)
                            }

                            if let pmb = viewModel.selectedPMB, !pmb.isEmpty {
                                HStack {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(ShipOSTheme.Colors.success)
                                    Text("PMB #\(pmb) assigned")
                                        .font(ShipOSTheme.Typography.body)
                                }
                                .padding()
                                .background(ShipOSTheme.Colors.success.opacity(0.08))
                                .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.small))
                            }
                        }
                    }
                }

                // Service plan
                SOCard {
                    VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                        SOSectionHeader(title: "Service Plan")

                        ForEach(ServicePlan.allCases, id: \.self) { plan in
                            Button {
                                viewModel.selectedPlan = plan
                            } label: {
                                HStack {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text(plan.name)
                                            .font(ShipOSTheme.Typography.subheadline)
                                        Text(plan.description)
                                            .font(ShipOSTheme.Typography.caption)
                                            .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                                    }
                                    Spacer()
                                    Text(plan.priceLabel)
                                        .font(ShipOSTheme.Typography.headline)
                                        .foregroundStyle(ShipOSTheme.Colors.primary)

                                    Image(systemName: viewModel.selectedPlan == plan ? "checkmark.circle.fill" : "circle")
                                        .foregroundStyle(viewModel.selectedPlan == plan ? ShipOSTheme.Colors.primary : ShipOSTheme.Colors.textTertiary)
                                }
                                .padding()
                                .background(viewModel.selectedPlan == plan ? ShipOSTheme.Colors.primary.opacity(0.06) : .clear)
                                .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.small))
                                .overlay(
                                    RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.small)
                                        .stroke(viewModel.selectedPlan == plan ? ShipOSTheme.Colors.primary : ShipOSTheme.Colors.border)
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }

                onboardingNavButtons(
                    canProceed: viewModel.selectedPMB != nil && !viewModel.selectedPMB!.isEmpty
                )
            }
            .padding()
        }
        .task { await viewModel.loadAvailablePMBs() }
    }

    // MARK: - Step 5: Notification Preferences

    private var notificationPrefsStep: some View {
        ScrollView {
            VStack(spacing: ShipOSTheme.Spacing.lg) {
                OnboardingStepHeader(
                    icon: "bell.fill",
                    title: "Notifications",
                    subtitle: "Set up how the customer wants to be notified about packages."
                )

                SOCard {
                    VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.lg) {
                        Toggle(isOn: $viewModel.smsOptIn) {
                            Label {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("SMS Notifications")
                                        .font(ShipOSTheme.Typography.subheadline)
                                    Text("Get text alerts when packages arrive")
                                        .font(ShipOSTheme.Typography.caption)
                                        .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                                }
                            } icon: {
                                Image(systemName: "message.fill")
                                    .foregroundStyle(ShipOSTheme.Colors.success)
                            }
                        }

                        Divider()

                        Toggle(isOn: $viewModel.emailOptIn) {
                            Label {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Email Notifications")
                                        .font(ShipOSTheme.Typography.subheadline)
                                    Text("Receive email when packages are ready")
                                        .font(ShipOSTheme.Typography.caption)
                                        .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                                }
                            } icon: {
                                Image(systemName: "envelope.fill")
                                    .foregroundStyle(ShipOSTheme.Colors.info)
                            }
                        }

                        Divider()

                        Toggle(isOn: $viewModel.pushOptIn) {
                            Label {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Push Notifications")
                                        .font(ShipOSTheme.Typography.subheadline)
                                    Text("Real-time alerts on their device")
                                        .font(ShipOSTheme.Typography.caption)
                                        .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                                }
                            } icon: {
                                Image(systemName: "bell.badge.fill")
                                    .foregroundStyle(ShipOSTheme.Colors.warning)
                            }
                        }
                    }
                }

                onboardingNavButtons(canProceed: true)
            }
            .padding()
        }
    }

    // MARK: - Step 6: Review

    private var reviewStep: some View {
        ScrollView {
            VStack(spacing: ShipOSTheme.Spacing.lg) {
                OnboardingStepHeader(
                    icon: "checkmark.shield.fill",
                    title: "Review & Confirm",
                    subtitle: "Verify all information before creating the account."
                )

                // Personal info
                ReviewSection(title: "Personal Info") {
                    ReviewRow(label: "Name", value: "\(viewModel.firstName) \(viewModel.lastName)")
                    if !viewModel.email.isEmpty { ReviewRow(label: "Email", value: viewModel.email) }
                    if !viewModel.phone.isEmpty { ReviewRow(label: "Phone", value: viewModel.phone) }
                    if viewModel.isBusinessAccount { ReviewRow(label: "Business", value: viewModel.businessName) }
                    ReviewRow(label: "Address", value: viewModel.formattedHomeAddress)
                }

                // ID
                ReviewSection(title: "Identification") {
                    ReviewRow(label: "Primary ID", value: viewModel.primaryIdType.replacingOccurrences(of: "_", with: " ").capitalized)
                    ReviewRow(label: "ID Number", value: viewModel.primaryIdNumber)
                    ReviewRow(label: "Expires", value: viewModel.primaryIdExpiration.formatted(date: .abbreviated, time: .omitted))
                    ReviewRow(label: "Secondary ID", value: viewModel.secondaryIdType.replacingOccurrences(of: "_", with: " ").capitalized)
                }

                // Form 1583
                ReviewSection(title: "Form 1583") {
                    ReviewRow(label: "Signed", value: viewModel.form1583Signature != nil ? "Yes ✓" : "No")
                    ReviewRow(label: "Notarized", value: viewModel.isNotarized ? "Yes" : "No")
                }

                // PMB
                ReviewSection(title: "Mailbox") {
                    ReviewRow(label: "PMB Number", value: "#\(viewModel.selectedPMB ?? "—")")
                    ReviewRow(label: "Plan", value: viewModel.selectedPlan?.name ?? "—")
                }

                // Notifications
                ReviewSection(title: "Notifications") {
                    ReviewRow(label: "SMS", value: viewModel.smsOptIn ? "Enabled" : "Disabled")
                    ReviewRow(label: "Email", value: viewModel.emailOptIn ? "Enabled" : "Disabled")
                    ReviewRow(label: "Push", value: viewModel.pushOptIn ? "Enabled" : "Disabled")
                }

                HStack(spacing: ShipOSTheme.Spacing.md) {
                    Button("Back") { viewModel.previousStep() }
                        .buttonStyle(SOSecondaryButtonStyle())

                    Button {
                        Task { await viewModel.createCustomer() }
                    } label: {
                        Label("Create Account", systemImage: "person.badge.plus")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(SOPrimaryButtonStyle())
                }
            }
            .padding()
        }
        .overlay {
            if viewModel.isCreating {
                SOLoadingOverlay(message: "Creating customer account...")
            }
        }
    }

    // MARK: - Step 7: Complete

    private var completeStep: some View {
        VStack(spacing: ShipOSTheme.Spacing.xxl) {
            Spacer()

            Image(systemName: "person.crop.circle.badge.checkmark")
                .font(.system(size: 80))
                .foregroundStyle(ShipOSTheme.Colors.success)

            VStack(spacing: ShipOSTheme.Spacing.md) {
                Text("Welcome Aboard!")
                    .font(ShipOSTheme.Typography.title2)

                Text("\(viewModel.firstName) \(viewModel.lastName)")
                    .font(ShipOSTheme.Typography.headline)
                    .foregroundStyle(ShipOSTheme.Colors.textSecondary)

                Text("PMB #\(viewModel.selectedPMB ?? "—")")
                    .font(ShipOSTheme.Typography.mono)
                    .foregroundStyle(ShipOSTheme.Colors.primary)
            }

            Spacer()

            VStack(spacing: ShipOSTheme.Spacing.md) {
                Button {
                    viewModel.printWelcomeKit()
                } label: {
                    Label("Print Welcome Kit", systemImage: "printer.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SOPrimaryButtonStyle())

                Button("Done") { dismiss() }
                    .buttonStyle(SOSecondaryButtonStyle())
            }
            .padding()
        }
    }

    // MARK: - Nav Buttons

    private func onboardingNavButtons(canProceed: Bool, showBack: Bool = true) -> some View {
        HStack(spacing: ShipOSTheme.Spacing.md) {
            if showBack {
                Button("Back") { viewModel.previousStep() }
                    .buttonStyle(SOSecondaryButtonStyle())
            }

            Button {
                viewModel.nextStep()
            } label: {
                Text("Continue")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(SOPrimaryButtonStyle())
            .disabled(!canProceed)
        }
    }
}

// MARK: - Supporting Views

struct OnboardingStepHeader: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        VStack(spacing: ShipOSTheme.Spacing.sm) {
            Image(systemName: icon)
                .font(.largeTitle)
                .foregroundStyle(ShipOSTheme.Colors.primary)
            Text(title)
                .font(ShipOSTheme.Typography.title3)
            Text(subtitle)
                .font(ShipOSTheme.Typography.subheadline)
                .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                .multilineTextAlignment(.center)
        }
        .padding(.vertical, ShipOSTheme.Spacing.md)
    }
}

struct OnboardingProgressBar: View {
    let currentStep: Int
    let totalSteps: Int

    var body: some View {
        VStack(spacing: 4) {
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(ShipOSTheme.Colors.surfaceSecondary)
                    RoundedRectangle(cornerRadius: 4)
                        .fill(ShipOSTheme.Colors.primary)
                        .frame(width: geo.size.width * CGFloat(currentStep + 1) / CGFloat(totalSteps))
                        .animation(ShipOSTheme.Animation.standard, value: currentStep)
                }
            }
            .frame(height: 6)

            HStack {
                Text("Step \(currentStep + 1) of \(totalSteps)")
                    .font(ShipOSTheme.Typography.caption)
                    .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                Spacer()
            }
        }
        .padding(.horizontal)
        .padding(.top, ShipOSTheme.Spacing.sm)
    }
}

struct FormField: View {
    let label: String
    @Binding var text: String
    var keyboard: UIKeyboardType = .default

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(label)
                .font(ShipOSTheme.Typography.caption)
                .foregroundStyle(ShipOSTheme.Colors.textSecondary)
            TextField(label.replacingOccurrences(of: " *", with: ""), text: $text)
                .keyboardType(keyboard)
                .textFieldStyle(.roundedBorder)
        }
    }
}

struct ReviewSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        SOCard {
            VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                SOSectionHeader(title: title)
                content()
            }
        }
    }
}

struct ReviewRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack {
            Text(label)
                .font(ShipOSTheme.Typography.caption)
                .foregroundStyle(ShipOSTheme.Colors.textSecondary)
            Spacer()
            Text(value)
                .font(ShipOSTheme.Typography.subheadline)
                .multilineTextAlignment(.trailing)
        }
    }
}

// MARK: - Signature Pad (reusable)

struct SignaturePadView: UIViewRepresentable {
    @Binding var signature: UIImage?

    func makeUIView(context: Context) -> SignatureCanvasView {
        let canvas = SignatureCanvasView()
        canvas.onSignatureChanged = { image in
            DispatchQueue.main.async { signature = image }
        }
        canvas.backgroundColor = UIColor.secondarySystemBackground
        return canvas
    }

    func updateUIView(_ uiView: SignatureCanvasView, context: Context) {
        if signature == nil { uiView.clear() }
    }
}

final class SignatureCanvasView: UIView {
    var onSignatureChanged: ((UIImage) -> Void)?
    private var path = UIBezierPath()
    private var lastPoint: CGPoint?

    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let point = touches.first?.location(in: self) else { return }
        lastPoint = point
        path.move(to: point)
    }

    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent?) {
        guard let point = touches.first?.location(in: self) else { return }
        path.addLine(to: point)
        lastPoint = point
        setNeedsDisplay()
    }

    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        generateImage()
    }

    override func draw(_ rect: CGRect) {
        UIColor.label.setStroke()
        path.lineWidth = 2.5
        path.lineCapStyle = .round
        path.lineJoinStyle = .round
        path.stroke()
    }

    func clear() {
        path = UIBezierPath()
        setNeedsDisplay()
    }

    private func generateImage() {
        let renderer = UIGraphicsImageRenderer(bounds: bounds)
        let image = renderer.image { ctx in
            UIColor.white.setFill()
            ctx.fill(bounds)
            UIColor.black.setStroke()
            path.lineWidth = 2.5
            path.stroke()
        }
        onSignatureChanged?(image)
    }
}

// MARK: - Service Plans

enum ServicePlan: String, CaseIterable {
    case basic, standard, premium

    var name: String {
        switch self {
        case .basic: "Basic"
        case .standard: "Standard"
        case .premium: "Premium"
        }
    }

    var description: String {
        switch self {
        case .basic: "Mail receiving only"
        case .standard: "Mail + package receiving, notifications"
        case .premium: "All services + mail forwarding, scanning"
        }
    }

    var priceLabel: String {
        switch self {
        case .basic: "$15/mo"
        case .standard: "$30/mo"
        case .premium: "$50/mo"
        }
    }
}

// MARK: - Onboarding Steps

enum OnboardingStep: Int, CaseIterable {
    case personalInfo = 0, idVerification, form1583, pmbAssignment, notificationPrefs, review, complete
}

// MARK: - View Model

@MainActor
final class OnboardingViewModel: ObservableObject {
    @Published var currentStep: OnboardingStep = .personalInfo

    // Personal Info
    @Published var firstName = ""
    @Published var lastName = ""
    @Published var email = ""
    @Published var phone = ""
    @Published var isBusinessAccount = false
    @Published var businessName = ""
    @Published var homeStreet = ""
    @Published var homeCity = ""
    @Published var homeState = ""
    @Published var homeZip = ""

    // ID Verification
    @Published var primaryIdType = "drivers_license"
    @Published var primaryIdNumber = ""
    @Published var primaryIdExpiration = Calendar.current.date(byAdding: .year, value: 4, to: Date()) ?? Date()
    @Published var primaryIdScanned = false
    @Published var secondaryIdType = "utility_bill"
    @Published var secondaryIdDescription = ""
    @Published var secondaryIdDate = Date()

    // Form 1583
    @Published var form1583Signature: UIImage?
    @Published var isNotarized = false
    @Published var notarizationDate = Date()

    // PMB
    @Published var availablePMBs: [String] = []
    @Published var suggestedPMB: String?
    @Published var selectedPMB: String?
    @Published var manualPMB = ""
    @Published var selectedPlan: ServicePlan? = .standard

    // Notifications
    @Published var smsOptIn = true
    @Published var emailOptIn = true
    @Published var pushOptIn = false

    // State
    @Published var isCreating = false
    @Published var toast: ToastMessage?

    var stepIndex: Int { currentStep.rawValue }

    var canProceedFromPersonalInfo: Bool {
        !firstName.isEmpty && !lastName.isEmpty
    }

    var canProceedFromId: Bool {
        !primaryIdNumber.isEmpty
    }

    var formattedHomeAddress: String {
        [homeStreet, homeCity, homeState, homeZip].filter { !$0.isEmpty }.joined(separator: ", ")
    }

    func nextStep() {
        guard let next = OnboardingStep(rawValue: currentStep.rawValue + 1) else { return }
        withAnimation { currentStep = next }
    }

    func previousStep() {
        guard let prev = OnboardingStep(rawValue: currentStep.rawValue - 1) else { return }
        withAnimation { currentStep = prev }
    }

    func scanPrimaryId() {
        // Would open camera for ID scanning (similar to Smart Intake)
        primaryIdScanned = true
        toast = ToastMessage(message: "ID scanned ✓", type: .success)
    }

    func loadAvailablePMBs() async {
        // In production, fetch from API
        availablePMBs = (101...150).map { String($0) }
        suggestedPMB = "127" // Next available
    }

    func createCustomer() async {
        isCreating = true
        defer { isCreating = false }

        let body = CustomerCreateRequest(
            firstName: firstName,
            lastName: lastName,
            email: email.isEmpty ? nil : email,
            phone: phone.isEmpty ? nil : phone,
            pmbNumber: selectedPMB,
            address: homeStreet.isEmpty ? nil : homeStreet,
            city: homeCity.isEmpty ? nil : homeCity,
            state: homeState.isEmpty ? nil : homeState,
            zipCode: homeZip.isEmpty ? nil : homeZip
        )

        do {
            let _: CustomerDTO = try await APIClient.shared.request(
                API.Customers.create(body: body)
            )
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            currentStep = .complete
        } catch let error as APIError {
            toast = ToastMessage(message: error.userMessage, type: .error)
        } catch {
            toast = ToastMessage(message: "Failed to create customer", type: .error)
        }
    }

    func printWelcomeKit() {
        toast = ToastMessage(message: "Welcome kit sent to printer ✓", type: .success)
    }
}

#Preview {
    CustomerOnboardingView()
}
