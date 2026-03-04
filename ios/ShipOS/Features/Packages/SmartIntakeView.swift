import SwiftUI
import AVFoundation
import Vision

/// BAR-360: Smart Intake AI — camera capture → OCR → auto-fill check-in form.
/// Uses Vision framework to extract tracking numbers, carrier, and sender from package labels.
struct SmartIntakeView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = SmartIntakeViewModel()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Step indicator
                SmartIntakeStepBar(currentStep: viewModel.currentStep)

                switch viewModel.currentStep {
                case .capture:
                    captureStep
                case .processing:
                    processingStep
                case .review:
                    reviewStep
                case .complete:
                    completeStep
                }
            }
            .navigationTitle("Smart Intake")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
            .toast($viewModel.toast)
        }
    }

    // MARK: - Step 1: Capture

    private var captureStep: some View {
        VStack(spacing: ShipOSTheme.Spacing.lg) {
            // Camera preview
            ZStack {
                SmartIntakeCameraPreview(capturedImage: $viewModel.capturedImage)
                    .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.large))

                // Scanning overlay
                VStack {
                    Spacer()
                    HStack {
                        Image(systemName: "viewfinder")
                            .font(.title3)
                        Text("Point at package label")
                            .font(ShipOSTheme.Typography.subheadline)
                    }
                    .foregroundStyle(.white)
                    .padding(.horizontal, ShipOSTheme.Spacing.lg)
                    .padding(.vertical, ShipOSTheme.Spacing.md)
                    .background(.ultraThinMaterial)
                    .clipShape(Capsule())
                    .padding(.bottom, ShipOSTheme.Spacing.xl)
                }
            }
            .frame(maxHeight: .infinity)
            .padding(.horizontal)

            // Action buttons
            VStack(spacing: ShipOSTheme.Spacing.md) {
                Button {
                    viewModel.capturePhoto()
                } label: {
                    Label("Capture Label", systemImage: "camera.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SOPrimaryButtonStyle())

                Button {
                    viewModel.showPhotoLibrary = true
                } label: {
                    Label("Choose from Library", systemImage: "photo.on.rectangle")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SOSecondaryButtonStyle())
            }
            .padding()
        }
        .sheet(isPresented: $viewModel.showPhotoLibrary) {
            PhotoPickerView(image: $viewModel.capturedImage)
        }
        .onChange(of: viewModel.capturedImage) { _, newImage in
            if newImage != nil {
                Task { await viewModel.processImage() }
            }
        }
    }

    // MARK: - Step 2: Processing

    private var processingStep: some View {
        VStack(spacing: ShipOSTheme.Spacing.xxl) {
            Spacer()

            if let image = viewModel.capturedImage {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFit()
                    .frame(maxHeight: 250)
                    .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.large))
                    .overlay {
                        // Scanning animation
                        RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.large)
                            .stroke(ShipOSTheme.Colors.primary, lineWidth: 2)
                            .overlay {
                                GeometryReader { geo in
                                    Rectangle()
                                        .fill(ShipOSTheme.Colors.primary.opacity(0.3))
                                        .frame(height: 3)
                                        .offset(y: viewModel.scanLineOffset * geo.size.height)
                                }
                                .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.large))
                            }
                    }
            }

            VStack(spacing: ShipOSTheme.Spacing.md) {
                ProgressView()
                    .controlSize(.large)

                Text("Analyzing package label...")
                    .font(ShipOSTheme.Typography.headline)

                Text("Extracting tracking number, carrier, and sender info")
                    .font(ShipOSTheme.Typography.caption)
                    .foregroundStyle(ShipOSTheme.Colors.textSecondary)
            }

            Spacer()
        }
        .padding()
        .onAppear {
            withAnimation(.linear(duration: 2).repeatForever(autoreverses: true)) {
                viewModel.scanLineOffset = 1.0
            }
        }
    }

    // MARK: - Step 3: Review

    private var reviewStep: some View {
        ScrollView {
            VStack(spacing: ShipOSTheme.Spacing.lg) {
                // Thumbnail
                if let image = viewModel.capturedImage {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFit()
                        .frame(maxHeight: 150)
                        .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.medium))
                }

                // Confidence banner
                confidenceBanner

                // Extracted fields
                SOCard {
                    VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.lg) {
                        SOSectionHeader(title: "Extracted Info")

                        ExtractedFieldRow(
                            label: "Tracking #",
                            value: $viewModel.extractedTracking,
                            confidence: viewModel.trackingConfidence,
                            icon: "barcode"
                        )

                        ExtractedFieldRow(
                            label: "Carrier",
                            value: $viewModel.extractedCarrier,
                            confidence: viewModel.carrierConfidence,
                            icon: "shippingbox"
                        )

                        ExtractedFieldRow(
                            label: "Sender",
                            value: $viewModel.extractedSender,
                            confidence: viewModel.senderConfidence,
                            icon: "person"
                        )
                    }
                }

                // Customer assignment
                SOCard {
                    VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                        SOSectionHeader(title: "Assign Customer")

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

                // Additional fields
                SOCard {
                    VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                        SOSectionHeader(title: "Additional")

                        LabeledContent("Storage Location") {
                            TextField("e.g. Shelf A-3", text: $viewModel.storageLocation)
                                .multilineTextAlignment(.trailing)
                        }

                        LabeledContent("Package Type") {
                            Picker("", selection: $viewModel.packageType) {
                                Text("Package").tag("package")
                                Text("Envelope").tag("envelope")
                                Text("Box").tag("box")
                                Text("Tube").tag("tube")
                                Text("Pallet").tag("pallet")
                            }
                        }

                        TextField("Notes...", text: $viewModel.notes, axis: .vertical)
                            .lineLimit(2...4)
                    }
                }

                // Actions
                VStack(spacing: ShipOSTheme.Spacing.md) {
                    Button {
                        Task { await viewModel.submitCheckIn() }
                    } label: {
                        Label("Check In Package", systemImage: "arrow.down.circle.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(SOPrimaryButtonStyle())
                    .disabled(viewModel.extractedTracking.isEmpty)

                    Button {
                        viewModel.retake()
                    } label: {
                        Label("Retake Photo", systemImage: "camera.rotate")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(SOSecondaryButtonStyle())
                }
            }
            .padding()
        }
        .overlay {
            if viewModel.isSubmitting { SOLoadingOverlay(message: "Checking in...") }
        }
    }

    // MARK: - Confidence Banner

    private var confidenceBanner: some View {
        let avgConfidence = viewModel.overallConfidence
        let (color, icon, label): (Color, String, String) = {
            if avgConfidence >= 0.85 {
                return (ShipOSTheme.Colors.success, "checkmark.seal.fill", "High confidence — ready to submit")
            } else if avgConfidence >= 0.6 {
                return (ShipOSTheme.Colors.warning, "exclamationmark.triangle.fill", "Review extracted fields before submitting")
            } else {
                return (ShipOSTheme.Colors.error, "xmark.circle.fill", "Low confidence — please verify manually")
            }
        }()

        return HStack(spacing: ShipOSTheme.Spacing.md) {
            Image(systemName: icon)
                .foregroundStyle(color)
            Text(label)
                .font(ShipOSTheme.Typography.subheadline)
                .foregroundStyle(ShipOSTheme.Colors.textSecondary)
            Spacer()
            Text("\(Int(avgConfidence * 100))%")
                .font(ShipOSTheme.Typography.headline)
                .foregroundStyle(color)
        }
        .padding()
        .background(color.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.medium))
    }

    // MARK: - Step 4: Complete

    private var completeStep: some View {
        VStack(spacing: ShipOSTheme.Spacing.xxl) {
            Spacer()

            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 80))
                .foregroundStyle(ShipOSTheme.Colors.success)

            VStack(spacing: ShipOSTheme.Spacing.md) {
                Text("Package Checked In!")
                    .font(ShipOSTheme.Typography.title2)

                Text("Tracking: \(viewModel.extractedTracking)")
                    .font(ShipOSTheme.Typography.mono)
                    .foregroundStyle(ShipOSTheme.Colors.textSecondary)
            }

            Spacer()

            VStack(spacing: ShipOSTheme.Spacing.md) {
                Button {
                    viewModel.reset()
                } label: {
                    Label("Scan Next Package", systemImage: "camera.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SOPrimaryButtonStyle())

                Button("Done") { dismiss() }
                    .buttonStyle(SOSecondaryButtonStyle())
            }
            .padding()
        }
    }
}

// MARK: - Extracted Field Row

struct ExtractedFieldRow: View {
    let label: String
    @Binding var value: String
    let confidence: Double
    let icon: String

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Image(systemName: icon)
                    .font(.caption)
                    .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                Text(label)
                    .font(ShipOSTheme.Typography.caption)
                    .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                Spacer()
                ConfidencePill(confidence: confidence)
            }

            TextField(label, text: $value)
                .font(ShipOSTheme.Typography.mono)
                .padding(ShipOSTheme.Spacing.md)
                .background(ShipOSTheme.Colors.surfaceSecondary)
                .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.small))
        }
    }
}

struct ConfidencePill: View {
    let confidence: Double

    var color: Color {
        if confidence >= 0.85 { ShipOSTheme.Colors.success }
        else if confidence >= 0.6 { ShipOSTheme.Colors.warning }
        else { ShipOSTheme.Colors.error }
    }

    var body: some View {
        Text("\(Int(confidence * 100))%")
            .font(ShipOSTheme.Typography.caption2)
            .fontWeight(.medium)
            .foregroundStyle(color)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(color.opacity(0.12))
            .clipShape(Capsule())
    }
}

// MARK: - Step Bar

struct SmartIntakeStepBar: View {
    let currentStep: SmartIntakeStep

    var body: some View {
        HStack(spacing: 0) {
            ForEach(SmartIntakeStep.allCases, id: \.self) { step in
                VStack(spacing: 4) {
                    Circle()
                        .fill(step.rawValue <= currentStep.rawValue
                              ? ShipOSTheme.Colors.primary
                              : ShipOSTheme.Colors.surfaceSecondary)
                        .frame(width: 28, height: 28)
                        .overlay {
                            if step.rawValue < currentStep.rawValue {
                                Image(systemName: "checkmark")
                                    .font(.caption2.bold())
                                    .foregroundStyle(.white)
                            } else {
                                Text("\(step.rawValue + 1)")
                                    .font(ShipOSTheme.Typography.caption2)
                                    .foregroundStyle(step.rawValue <= currentStep.rawValue ? .white : ShipOSTheme.Colors.textTertiary)
                            }
                        }

                    Text(step.label)
                        .font(ShipOSTheme.Typography.caption2)
                        .foregroundStyle(step.rawValue <= currentStep.rawValue ? ShipOSTheme.Colors.primary : ShipOSTheme.Colors.textTertiary)
                }
                .frame(maxWidth: .infinity)

                if step != SmartIntakeStep.allCases.last {
                    Rectangle()
                        .fill(step.rawValue < currentStep.rawValue ? ShipOSTheme.Colors.primary : ShipOSTheme.Colors.border)
                        .frame(height: 2)
                        .frame(maxWidth: .infinity)
                        .offset(y: -10)
                }
            }
        }
        .padding()
    }
}

enum SmartIntakeStep: Int, CaseIterable {
    case capture = 0, processing, review, complete

    var label: String {
        switch self {
        case .capture: "Capture"
        case .processing: "Analyze"
        case .review: "Review"
        case .complete: "Done"
        }
    }
}

// MARK: - View Model

@MainActor
final class SmartIntakeViewModel: ObservableObject {
    @Published var currentStep: SmartIntakeStep = .capture
    @Published var capturedImage: UIImage?
    @Published var showPhotoLibrary = false
    @Published var scanLineOffset: CGFloat = 0

    // Extracted data
    @Published var extractedTracking = ""
    @Published var extractedCarrier = ""
    @Published var extractedSender = ""
    @Published var trackingConfidence: Double = 0
    @Published var carrierConfidence: Double = 0
    @Published var senderConfidence: Double = 0

    // Form
    @Published var selectedCustomer: Customer?
    @Published var storageLocation = ""
    @Published var packageType = "package"
    @Published var notes = ""

    @Published var isSubmitting = false
    @Published var toast: ToastMessage?

    var overallConfidence: Double {
        let validConfidences = [trackingConfidence, carrierConfidence, senderConfidence].filter { $0 > 0 }
        guard !validConfidences.isEmpty else { return 0 }
        return validConfidences.reduce(0, +) / Double(validConfidences.count)
    }

    func capturePhoto() {
        // Camera will set capturedImage via binding → triggers processImage
    }

    func processImage() async {
        guard let image = capturedImage, let cgImage = image.cgImage else { return }
        currentStep = .processing

        // Run Vision OCR
        let recognizedTexts = await performOCR(on: cgImage)

        // Extract structured data
        extractTrackingNumber(from: recognizedTexts)
        extractSenderName(from: recognizedTexts)

        try? await Task.sleep(for: .milliseconds(800)) // Brief delay for UX
        currentStep = .review
    }

    private func performOCR(on cgImage: CGImage) async -> [(String, Float)] {
        await withCheckedContinuation { continuation in
            let request = VNRecognizeTextRequest { request, error in
                guard let observations = request.results as? [VNRecognizedTextObservation] else {
                    continuation.resume(returning: [])
                    return
                }

                let results: [(String, Float)] = observations.compactMap { obs in
                    guard let candidate = obs.topCandidates(1).first else { return nil }
                    return (candidate.string, candidate.confidence)
                }
                continuation.resume(returning: results)
            }

            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = true

            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            try? handler.perform([request])
        }
    }

    private func extractTrackingNumber(from texts: [(String, Float)]) {
        // Tracking number patterns by carrier
        let patterns: [(regex: String, carrier: String)] = [
            // UPS: 1Z + 6 alphanumeric + 2 numeric + 8 numeric
            (#"1Z[A-Z0-9]{6}\d{10}"#, "UPS"),
            // FedEx: 12–34 digits
            (#"\b\d{12,34}\b"#, "FedEx"),
            // USPS: 20–34 digits or starts with 94
            (#"(?:94|93|92|91)\d{18,30}"#, "USPS"),
            (#"\b\d{20,34}\b"#, "USPS"),
            // Amazon: TBA + digits
            (#"TBA\d{10,15}"#, "Amazon"),
            // DHL: \d{10,11}
            (#"\b\d{10,11}\b"#, "DHL"),
        ]

        for (text, confidence) in texts {
            let cleaned = text.replacingOccurrences(of: " ", with: "").uppercased()

            for (pattern, carrier) in patterns {
                if let range = cleaned.range(of: pattern, options: .regularExpression) {
                    extractedTracking = String(cleaned[range])
                    extractedCarrier = carrier
                    trackingConfidence = Double(confidence)
                    carrierConfidence = min(Double(confidence) + 0.1, 1.0)
                    return
                }
            }
        }

        // Fallback: longest alphanumeric string
        if let best = texts.filter({ $0.0.count >= 10 }).max(by: { $0.0.count < $1.0.count }) {
            extractedTracking = best.0.replacingOccurrences(of: " ", with: "")
            trackingConfidence = Double(best.1) * 0.6 // Lower confidence for fallback
        }
    }

    private func extractSenderName(from texts: [(String, Float)]) {
        // Look for "FROM:" or sender-like patterns
        let senderKeywords = ["FROM:", "FROM", "SHIPPER:", "SENDER:", "ORIGIN:"]

        for (i, (text, confidence)) in texts.enumerated() {
            let upper = text.uppercased()
            if senderKeywords.contains(where: { upper.contains($0) }) {
                // The sender name is usually the next line or after the keyword
                let afterKeyword = upper.components(separatedBy: CharacterSet(charactersIn: ":")).last?.trimmingCharacters(in: .whitespaces)
                if let name = afterKeyword, name.count > 2 {
                    extractedSender = text.components(separatedBy: ":").last?.trimmingCharacters(in: .whitespaces) ?? text
                    senderConfidence = Double(confidence)
                    return
                }
                // Try next text line
                if i + 1 < texts.count {
                    extractedSender = texts[i + 1].0
                    senderConfidence = Double(texts[i + 1].1) * 0.9
                    return
                }
            }
        }

        // Fallback: known company names
        let companies = ["AMAZON", "EBAY", "WALMART", "TARGET", "APPLE", "USPS", "UPS STORE", "FEDEX OFFICE"]
        for (text, confidence) in texts {
            if companies.contains(where: { text.uppercased().contains($0) }) {
                extractedSender = text
                senderConfidence = Double(confidence) * 0.8
                return
            }
        }
    }

    func submitCheckIn() async {
        guard !extractedTracking.isEmpty else { return }
        isSubmitting = true
        defer { isSubmitting = false }

        let body = PackageCheckInRequest(
            trackingNumber: extractedTracking,
            carrier: extractedCarrier.isEmpty ? nil : extractedCarrier,
            customerId: selectedCustomer?.id,
            senderName: extractedSender.isEmpty ? nil : extractedSender,
            packageType: packageType,
            weight: nil,
            storageLocation: storageLocation.isEmpty ? nil : storageLocation,
            notes: notes.isEmpty ? nil : notes,
            conditionTags: nil
        )

        do {
            let _: PackageDTO = try await APIClient.shared.request(
                API.Packages.checkIn(body: body)
            )
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            currentStep = .complete
        } catch let error as APIError {
            toast = ToastMessage(message: error.userMessage, type: .error)
        } catch {
            toast = ToastMessage(message: "Check-in failed", type: .error)
        }
    }

    func retake() {
        capturedImage = nil
        currentStep = .capture
        extractedTracking = ""
        extractedCarrier = ""
        extractedSender = ""
        trackingConfidence = 0
        carrierConfidence = 0
        senderConfidence = 0
    }

    func reset() {
        retake()
        selectedCustomer = nil
        storageLocation = ""
        packageType = "package"
        notes = ""
    }
}

// MARK: - Camera Preview (AVFoundation)

struct SmartIntakeCameraPreview: UIViewRepresentable {
    @Binding var capturedImage: UIImage?

    func makeUIView(context: Context) -> SmartIntakeCameraUIView {
        let view = SmartIntakeCameraUIView()
        view.onCapture = { image in
            DispatchQueue.main.async { capturedImage = image }
        }
        return view
    }

    func updateUIView(_ uiView: SmartIntakeCameraUIView, context: Context) {}
}

final class SmartIntakeCameraUIView: UIView {
    var onCapture: ((UIImage) -> Void)?
    private let captureSession = AVCaptureSession()
    private let photoOutput = AVCapturePhotoOutput()
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private let delegate = PhotoCaptureDelegate()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupCamera()
    }

    required init?(coder: NSCoder) { fatalError() }

    override func layoutSubviews() {
        super.layoutSubviews()
        previewLayer?.frame = bounds
    }

    private func setupCamera() {
        guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
              let input = try? AVCaptureDeviceInput(device: device) else { return }

        captureSession.beginConfiguration()
        captureSession.sessionPreset = .photo
        if captureSession.canAddInput(input) { captureSession.addInput(input) }
        if captureSession.canAddOutput(photoOutput) { captureSession.addOutput(photoOutput) }
        captureSession.commitConfiguration()

        let preview = AVCaptureVideoPreviewLayer(session: captureSession)
        preview.videoGravity = .resizeAspectFill
        layer.addSublayer(preview)
        previewLayer = preview

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.captureSession.startRunning()
        }
    }

    func capture() {
        let settings = AVCapturePhotoSettings()
        delegate.onCapture = onCapture
        photoOutput.capturePhoto(with: settings, delegate: delegate)
    }
}

final class PhotoCaptureDelegate: NSObject, AVCapturePhotoCaptureDelegate {
    var onCapture: ((UIImage) -> Void)?

    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        guard let data = photo.fileDataRepresentation(),
              let image = UIImage(data: data) else { return }
        onCapture?(image)
    }
}

// MARK: - Photo Picker

struct PhotoPickerView: UIViewControllerRepresentable {
    @Binding var image: UIImage?
    @Environment(\.dismiss) private var dismiss

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = .photoLibrary
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(self) }

    class Coordinator: NSObject, UINavigationControllerDelegate, UIImagePickerControllerDelegate {
        let parent: PhotoPickerView
        init(_ parent: PhotoPickerView) { self.parent = parent }

        func imagePickerController(_ picker: UIImagePickerController, didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]) {
            if let image = info[.originalImage] as? UIImage {
                parent.image = image
            }
            parent.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}

#Preview {
    SmartIntakeView()
}
