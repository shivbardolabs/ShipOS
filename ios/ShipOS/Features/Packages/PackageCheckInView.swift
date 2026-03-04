import SwiftUI
import AVFoundation

/// BAR-355: Check-In — scan/enter tracking number, fill carrier & customer, submit.
struct PackageCheckInView: View {
    @StateObject private var viewModel = CheckInViewModel()
    @Environment(\.dismiss) private var dismiss
    @FocusState private var focusedField: CheckInField?

    enum CheckInField {
        case tracking, sender, notes
    }

    var body: some View {
        NavigationStack {
            Form {
                // Tracking Number
                Section {
                    HStack {
                        TextField("Tracking number", text: $viewModel.trackingNumber)
                            .focused($focusedField, equals: .tracking)
                            .textInputAutocapitalization(.characters)
                            .autocorrectionDisabled()
                            .font(ShipOSTheme.Typography.body)

                        Button {
                            viewModel.isShowingScanner = true
                        } label: {
                            Image(systemName: "barcode.viewfinder")
                                .font(.title3)
                                .foregroundStyle(ShipOSTheme.Colors.primary)
                        }
                    }

                    if let detected = viewModel.detectedCarrier {
                        HStack {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(ShipOSTheme.Colors.success)
                                .font(.caption)
                            Text("Detected: \(detected)")
                                .font(ShipOSTheme.Typography.caption)
                                .foregroundStyle(ShipOSTheme.Colors.success)
                        }
                    }
                } header: {
                    Label("Tracking Number", systemImage: "number")
                } footer: {
                    Text("Scan barcode or type manually")
                }

                // Carrier
                Section {
                    Picker("Carrier", selection: $viewModel.carrier) {
                        Text("Auto-detect").tag("")
                        ForEach(CheckInViewModel.carriers, id: \.self) { carrier in
                            Text(carrier).tag(carrier)
                        }
                    }
                } header: {
                    Label("Carrier", systemImage: "shippingbox")
                }

                // Customer
                Section {
                    if let customer = viewModel.selectedCustomer {
                        HStack {
                            SOCustomerRow(customer: customer)
                            Spacer()
                            Button("Change") {
                                viewModel.isShowingCustomerPicker = true
                            }
                            .font(ShipOSTheme.Typography.caption)
                        }
                    } else {
                        Button {
                            viewModel.isShowingCustomerPicker = true
                        } label: {
                            Label("Select Customer", systemImage: "person.circle")
                                .foregroundStyle(ShipOSTheme.Colors.primary)
                        }
                    }
                } header: {
                    Label("Customer (PMB)", systemImage: "person")
                }

                // Details
                Section {
                    TextField("Sender name", text: $viewModel.senderName)
                        .focused($focusedField, equals: .sender)

                    Picker("Package type", selection: $viewModel.packageType) {
                        Text("Box").tag("box")
                        Text("Envelope").tag("envelope")
                        Text("Poly bag").tag("poly_bag")
                        Text("Tube").tag("tube")
                        Text("Other").tag("other")
                    }

                    Picker("Storage location", selection: $viewModel.storageLocation) {
                        Text("Not assigned").tag("")
                        ForEach(CheckInViewModel.storageLocations, id: \.self) { loc in
                            Text(loc).tag(loc)
                        }
                    }
                } header: {
                    Label("Package Details", systemImage: "info.circle")
                }

                // Dimensions (optional)
                Section {
                    HStack(spacing: ShipOSTheme.Spacing.sm) {
                        DimensionField(label: "W", value: $viewModel.weight, unit: "lbs")
                    }

                    HStack(spacing: ShipOSTheme.Spacing.sm) {
                        DimensionField(label: "L", value: $viewModel.length, unit: "in")
                        DimensionField(label: "W", value: $viewModel.width, unit: "in")
                        DimensionField(label: "H", value: $viewModel.height, unit: "in")
                    }
                } header: {
                    Label("Weight & Dimensions", systemImage: "ruler")
                }

                // Condition
                Section {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(CheckInViewModel.conditionTags, id: \.self) { tag in
                                ConditionTagToggle(
                                    label: tag,
                                    isSelected: viewModel.selectedConditionTags.contains(tag)
                                ) {
                                    viewModel.toggleConditionTag(tag)
                                }
                            }
                        }
                    }
                } header: {
                    Label("Condition", systemImage: "exclamationmark.triangle")
                }

                // Notes
                Section {
                    TextField("Optional notes...", text: $viewModel.notes, axis: .vertical)
                        .focused($focusedField, equals: .notes)
                        .lineLimit(3...)
                } header: {
                    Label("Notes", systemImage: "note.text")
                }
            }
            .navigationTitle("Check In Package")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Check In") {
                        Task { await viewModel.submit() }
                    }
                    .buttonStyle(SOPrimaryButtonStyle())
                    .disabled(!viewModel.canSubmit)
                }
                ToolbarItemGroup(placement: .keyboard) {
                    Spacer()
                    Button("Done") { focusedField = nil }
                }
            }
            .sheet(isPresented: $viewModel.isShowingScanner) {
                BarcodeScannerView { code in
                    viewModel.trackingNumber = code
                    viewModel.detectCarrier()
                    viewModel.isShowingScanner = false
                }
            }
            .sheet(isPresented: $viewModel.isShowingCustomerPicker) {
                CustomerPickerView(selection: $viewModel.selectedCustomer)
            }
            .overlay {
                if viewModel.isSubmitting {
                    SOLoadingOverlay(message: "Checking in package...")
                }
            }
            .toast($viewModel.toast)
            .onChange(of: viewModel.didComplete) { _, completed in
                if completed { dismiss() }
            }
        }
    }
}

// MARK: - Dimension Field

struct DimensionField: View {
    let label: String
    @Binding var value: String
    let unit: String

    var body: some View {
        HStack(spacing: 4) {
            Text(label)
                .font(ShipOSTheme.Typography.caption)
                .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                .frame(width: 16)

            TextField("0", text: $value)
                .keyboardType(.decimalPad)
                .textFieldStyle(.roundedBorder)
                .font(ShipOSTheme.Typography.body)

            Text(unit)
                .font(ShipOSTheme.Typography.caption)
                .foregroundStyle(ShipOSTheme.Colors.textTertiary)
        }
    }
}

// MARK: - Condition Tag Toggle

struct ConditionTagToggle: View {
    let label: String
    let isSelected: Bool
    let toggle: () -> Void

    var body: some View {
        Button(action: toggle) {
            Text(label)
                .font(ShipOSTheme.Typography.caption)
                .padding(.horizontal, 12)
                .padding(.vertical, 6)
                .background(
                    isSelected ? ShipOSTheme.Colors.warning.opacity(0.15) : ShipOSTheme.Colors.surfaceSecondary
                )
                .foregroundStyle(
                    isSelected ? ShipOSTheme.Colors.warning : ShipOSTheme.Colors.textSecondary
                )
                .clipShape(Capsule())
                .overlay(
                    Capsule().stroke(
                        isSelected ? ShipOSTheme.Colors.warning : Color.clear,
                        lineWidth: 1
                    )
                )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - View Model

@MainActor
final class CheckInViewModel: ObservableObject {
    // Form fields
    @Published var trackingNumber = ""
    @Published var carrier = ""
    @Published var selectedCustomer: Customer?
    @Published var senderName = ""
    @Published var packageType = "box"
    @Published var storageLocation = ""
    @Published var weight = ""
    @Published var length = ""
    @Published var width = ""
    @Published var height = ""
    @Published var selectedConditionTags: Set<String> = []
    @Published var notes = ""

    // State
    @Published var detectedCarrier: String?
    @Published var isShowingScanner = false
    @Published var isShowingCustomerPicker = false
    @Published var isSubmitting = false
    @Published var toast: ToastMessage?
    @Published var didComplete = false

    static let carriers = ["USPS", "UPS", "FedEx", "DHL", "Amazon", "OnTrac", "LaserShip", "Other"]
    static let storageLocations = ["A-1", "A-2", "A-3", "B-1", "B-2", "B-3", "C-1", "C-2", "Oversize", "Front Desk"]
    static let conditionTags = ["Good", "Damaged", "Wet", "Opened", "Fragile", "Heavy"]

    var canSubmit: Bool {
        !trackingNumber.trimmingCharacters(in: .whitespaces).isEmpty
    }

    func detectCarrier() {
        let t = trackingNumber.uppercased()
        if t.hasPrefix("1Z") { detectedCarrier = "UPS"; carrier = "UPS" }
        else if t.count == 22 || t.count == 20 { detectedCarrier = "USPS"; carrier = "USPS" }
        else if t.count == 12 || t.count == 15 { detectedCarrier = "FedEx"; carrier = "FedEx" }
        else if t.hasPrefix("TBA") { detectedCarrier = "Amazon"; carrier = "Amazon" }
        else { detectedCarrier = nil }
    }

    func toggleConditionTag(_ tag: String) {
        if selectedConditionTags.contains(tag) {
            selectedConditionTags.remove(tag)
        } else {
            selectedConditionTags.insert(tag)
        }
    }

    func submit() async {
        guard canSubmit else { return }
        isSubmitting = true
        defer { isSubmitting = false }

        let body = PackageCheckInRequest(
            trackingNumber: trackingNumber.trimmingCharacters(in: .whitespaces),
            carrier: carrier.isEmpty ? detectedCarrier : carrier,
            customerId: selectedCustomer?.id,
            senderName: senderName.isEmpty ? nil : senderName,
            packageType: packageType,
            weight: Double(weight),
            storageLocation: storageLocation.isEmpty ? nil : storageLocation,
            notes: notes.isEmpty ? nil : notes,
            conditionTags: selectedConditionTags.isEmpty ? nil : Array(selectedConditionTags)
        )

        do {
            let _: PackageDTO = try await APIClient.shared.request(API.Packages.checkIn(body: body))
            toast = ToastMessage(message: "Package checked in ✓", type: .success)

            try? await Task.sleep(for: .seconds(1))
            didComplete = true
        } catch let error as APIError {
            toast = ToastMessage(message: error.userMessage, type: .error)
        } catch {
            toast = ToastMessage(message: "Check-in failed. Try again.", type: .error)
        }
    }
}

// MARK: - Barcode Scanner

struct BarcodeScannerView: View {
    let onScan: (String) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                CameraPreview(onScan: onScan)
                    .ignoresSafeArea()

                VStack {
                    Spacer()
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(ShipOSTheme.Colors.primary, lineWidth: 3)
                        .frame(width: 280, height: 120)
                        .background(Color.clear)
                    Spacer()

                    Text("Point camera at barcode")
                        .font(ShipOSTheme.Typography.subheadline)
                        .foregroundStyle(.white)
                        .padding()
                        .background(.ultraThinMaterial)
                        .clipShape(Capsule())
                        .padding(.bottom, 40)
                }
            }
            .navigationTitle("Scan Barcode")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }
}

/// Simple camera preview for barcode scanning.
struct CameraPreview: UIViewRepresentable {
    let onScan: (String) -> Void

    func makeUIView(context: Context) -> UIView {
        let view = UIView(frame: .zero)
        view.backgroundColor = .black

        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device) else { return view }

        let session = AVCaptureSession()
        session.addInput(input)

        let output = AVCaptureMetadataOutput()
        session.addOutput(output)
        output.setMetadataObjectsDelegate(context.coordinator, queue: .main)
        output.metadataObjectTypes = [.ean8, .ean13, .code128, .code39, .code93, .qr, .dataMatrix, .interleaved2of5]

        let preview = AVCaptureVideoPreviewLayer(session: session)
        preview.videoGravity = .resizeAspectFill
        preview.frame = UIScreen.main.bounds
        view.layer.addSublayer(preview)

        DispatchQueue.global(qos: .userInitiated).async {
            session.startRunning()
        }

        context.coordinator.session = session
        return view
    }

    func updateUIView(_ uiView: UIView, context: Context) {}

    func makeCoordinator() -> Coordinator {
        Coordinator(onScan: onScan)
    }

    class Coordinator: NSObject, AVCaptureMetadataOutputObjectsDelegate {
        let onScan: (String) -> Void
        var session: AVCaptureSession?
        var hasScanned = false

        init(onScan: @escaping (String) -> Void) {
            self.onScan = onScan
        }

        func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) {
            guard !hasScanned,
                  let code = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
                  let value = code.stringValue else { return }

            hasScanned = true
            session?.stopRunning()

            UIImpactFeedbackGenerator(style: .medium).impactOccurred()
            onScan(value)
        }
    }
}

// MARK: - Customer Picker

struct CustomerPickerView: View {
    @Binding var selection: Customer?
    @Environment(\.dismiss) private var dismiss
    @State private var searchText = ""
    @State private var customers: [Customer] = []
    @State private var isLoading = false

    var body: some View {
        NavigationStack {
            List {
                ForEach(customers, id: \.id) { customer in
                    Button {
                        selection = customer
                        dismiss()
                    } label: {
                        SOCustomerRow(customer: customer)
                    }
                }
            }
            .listStyle(.plain)
            .searchable(text: $searchText, prompt: "Search by name, PMB, email...")
            .navigationTitle("Select Customer")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .task { await loadCustomers() }
            .onChange(of: searchText) { _, _ in
                Task { await loadCustomers() }
            }
            .overlay {
                if isLoading && customers.isEmpty {
                    ProgressView()
                }
            }
        }
    }

    private func loadCustomers() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let response: CustomerListResponse = try await APIClient.shared.request(
                API.Customers.list(search: searchText.isEmpty ? nil : searchText, page: 1, limit: 50)
            )
            customers = response.customers.map { $0.toModel() }
        } catch {
            print("[CustomerPicker] Error: \(error)")
        }
    }
}

#Preview {
    PackageCheckInView()
}
