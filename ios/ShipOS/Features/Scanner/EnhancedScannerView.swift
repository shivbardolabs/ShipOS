import SwiftUI
@preconcurrency import AVFoundation
import Vision
import VisionKit

/// BAR-365: Enhanced Scanner — multi-format barcode/QR scanner with VisionKit DataScanner,
/// continuous scanning, flashlight, scan history, and quick actions from results.
struct EnhancedScannerView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = EnhancedScannerViewModel()

    var body: some View {
        NavigationStack {
            ZStack {
                // Scanner
                if DataScannerViewController.isSupailable {
                    DataScannerRepresentable(viewModel: viewModel)
                        .ignoresSafeArea()
                } else {
                    legacyScanner
                }

                // Overlay
                VStack {
                    // Top bar
                    topBar

                    Spacer()

                    // Scan result
                    if let result = viewModel.lastScannedResult {
                        scanResultCard(result)
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    }

                    // Bottom controls
                    bottomControls
                }
            }
            .navigationBarHidden(true)
            .sheet(isPresented: $viewModel.showHistory) {
                ScanHistoryView(history: viewModel.scanHistory) { item in
                    viewModel.handleHistorySelection(item)
                }
            }
            .sheet(isPresented: $viewModel.showCheckInSheet) {
                PackageCheckInView()
            }
            .toast($viewModel.toast)
        }
    }

    // MARK: - Top Bar

    private var topBar: some View {
        HStack {
            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.title3)
                    .foregroundStyle(.white)
                    .frame(width: 44, height: 44)
                    .background(.ultraThinMaterial)
                    .clipShape(Circle())
            }

            Spacer()

            // Mode selector
            HStack(spacing: 0) {
                ForEach(ScanMode.allCases, id: \.self) { mode in
                    Button {
                        withAnimation { viewModel.scanMode = mode }
                    } label: {
                        Text(mode.label)
                            .font(ShipOSTheme.Typography.caption)
                            .foregroundStyle(viewModel.scanMode == mode ? .white : .white.opacity(0.6))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 6)
                            .background(viewModel.scanMode == mode ? ShipOSTheme.Colors.primary : .clear)
                            .clipShape(Capsule())
                    }
                }
            }
            .background(.ultraThinMaterial)
            .clipShape(Capsule())

            Spacer()

            // History
            Button {
                viewModel.showHistory = true
            } label: {
                ZStack(alignment: .topTrailing) {
                    Image(systemName: "clock.arrow.circlepath")
                        .font(.title3)
                        .foregroundStyle(.white)
                        .frame(width: 44, height: 44)
                        .background(.ultraThinMaterial)
                        .clipShape(Circle())

                    if !viewModel.scanHistory.isEmpty {
                        Text("\(viewModel.scanHistory.count)")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(4)
                            .background(ShipOSTheme.Colors.primary)
                            .clipShape(Circle())
                            .offset(x: 4, y: -4)
                    }
                }
            }
        }
        .padding()
    }

    // MARK: - Scan Result Card

    private func scanResultCard(_ result: ScanResult) -> some View {
        VStack(spacing: ShipOSTheme.Spacing.md) {
            // Result display
            HStack(spacing: ShipOSTheme.Spacing.md) {
                Image(systemName: result.typeIcon)
                    .font(.title2)
                    .foregroundStyle(ShipOSTheme.Colors.primary)
                    .frame(width: 48, height: 48)
                    .background(ShipOSTheme.Colors.primary.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                VStack(alignment: .leading, spacing: 4) {
                    Text(result.value)
                        .font(ShipOSTheme.Typography.mono)
                        .lineLimit(2)

                    HStack(spacing: ShipOSTheme.Spacing.sm) {
                        Text(result.type.displayName)
                            .font(ShipOSTheme.Typography.caption)
                            .foregroundStyle(ShipOSTheme.Colors.textSecondary)

                        if let carrier = result.detectedCarrier {
                            SOStatusBadge(carrier, color: ShipOSTheme.Colors.info)
                        }
                    }
                }

                Spacer()

                Button {
                    UIPasteboard.general.string = result.value
                    viewModel.toast = ToastMessage(message: "Copied!", type: .success)
                } label: {
                    Image(systemName: "doc.on.doc")
                        .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                }
            }

            // Quick actions
            HStack(spacing: ShipOSTheme.Spacing.md) {
                ScanActionButton(icon: "arrow.down.circle.fill", label: "Check In", color: ShipOSTheme.Colors.success) {
                    viewModel.checkInScanned()
                }

                ScanActionButton(icon: "magnifyingglass", label: "Search", color: ShipOSTheme.Colors.info) {
                    viewModel.searchScanned()
                }

                ScanActionButton(icon: "doc.on.doc", label: "Copy", color: Color(hex: "#a855f7")) {
                    UIPasteboard.general.string = result.value
                    viewModel.toast = ToastMessage(message: "Copied!", type: .success)
                }

                if viewModel.continuousMode {
                    ScanActionButton(icon: "forward.fill", label: "Next", color: ShipOSTheme.Colors.primary) {
                        viewModel.dismissResult()
                    }
                }
            }
        }
        .padding()
        .background(.ultraThickMaterial)
        .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.large))
        .padding()
    }

    // MARK: - Bottom Controls

    private var bottomControls: some View {
        HStack(spacing: ShipOSTheme.Spacing.xxl) {
            // Continuous mode toggle
            Button {
                viewModel.continuousMode.toggle()
            } label: {
                VStack(spacing: 4) {
                    Image(systemName: viewModel.continuousMode ? "repeat.circle.fill" : "repeat.circle")
                        .font(.title3)
                    Text("Continuous")
                        .font(ShipOSTheme.Typography.caption2)
                }
                .foregroundStyle(viewModel.continuousMode ? ShipOSTheme.Colors.primary : .white)
                .frame(width: 70, height: 56)
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            // Flashlight
            Button {
                viewModel.toggleFlashlight()
            } label: {
                VStack(spacing: 4) {
                    Image(systemName: viewModel.isFlashlightOn ? "flashlight.on.fill" : "flashlight.off.fill")
                        .font(.title3)
                    Text("Light")
                        .font(ShipOSTheme.Typography.caption2)
                }
                .foregroundStyle(viewModel.isFlashlightOn ? ShipOSTheme.Colors.warning : .white)
                .frame(width: 70, height: 56)
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            // Gallery
            Button {
                viewModel.showPhotoLibrary = true
            } label: {
                VStack(spacing: 4) {
                    Image(systemName: "photo.on.rectangle")
                        .font(.title3)
                    Text("Gallery")
                        .font(ShipOSTheme.Typography.caption2)
                }
                .foregroundStyle(.white)
                .frame(width: 70, height: 56)
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
        .padding()
        .padding(.bottom)
    }

    // MARK: - Legacy Scanner (fallback for older devices)

    private var legacyScanner: some View {
        LegacyBarcodeScannerView(onScanned: { code in
            viewModel.handleScan(value: code, type: .barcode)
        })
        .ignoresSafeArea()
    }
}

// MARK: - Scan Action Button

struct ScanActionButton: View {
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
                Text(label)
                    .font(ShipOSTheme.Typography.caption2)
                    .foregroundStyle(ShipOSTheme.Colors.textSecondary)
            }
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - DataScanner (VisionKit)

@available(iOS 16.0, *)
struct DataScannerRepresentable: UIViewControllerRepresentable {
    @ObservedObject var viewModel: EnhancedScannerViewModel

    func makeUIViewController(context: Context) -> DataScannerViewController {
        let recognizedTypes: [DataScannerViewController.RecognizedDataType] = [
            .barcode(symbologies: [
                .ean8, .ean13, .upce, .code39, .code128, .itf14,
                .qr, .dataMatrix, .pdf417, .aztec
            ]),
            .text()
        ]

        let scanner = DataScannerViewController(
            recognizedDataTypes: recognizedTypes,
            qualityLevel: .accurate,
            recognizesMultipleItems: viewModel.continuousMode,
            isHighFrameRateTrackingEnabled: true,
            isHighlightingEnabled: true
        )
        scanner.delegate = context.coordinator
        try? scanner.startScanning()
        return scanner
    }

    func updateUIViewController(_ uiViewController: DataScannerViewController, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(viewModel: viewModel) }

    class Coordinator: NSObject, DataScannerViewControllerDelegate {
        let viewModel: EnhancedScannerViewModel
        init(viewModel: EnhancedScannerViewModel) { self.viewModel = viewModel }

        func dataScanner(_ dataScanner: DataScannerViewController, didTapOn item: RecognizedItem) {
            switch item {
            case .barcode(let barcode):
                if let value = barcode.payloadStringValue {
                    DispatchQueue.main.async {
                        self.viewModel.handleScan(value: value, type: self.mapSymbology(barcode.observation.symbology))
                    }
                }
            case .text(let text):
                DispatchQueue.main.async {
                    self.viewModel.handleScan(value: text.transcript, type: .text)
                }
            @unknown default:
                break
            }
        }

        func dataScanner(_ dataScanner: DataScannerViewController, didAdd addedItems: [RecognizedItem], allItems: [RecognizedItem]) {
            guard viewModel.continuousMode else { return }
            for item in addedItems {
                if case .barcode(let barcode) = item, let value = barcode.payloadStringValue {
                    DispatchQueue.main.async {
                        self.viewModel.handleScan(value: value, type: self.mapSymbology(barcode.observation.symbology))
                    }
                }
            }
        }

        private func mapSymbology(_ symbology: VNBarcodeSymbology) -> ScanResultType {
            switch symbology {
            case .qr: return .qrCode
            case .dataMatrix: return .dataMatrix
            default: return .barcode
            }
        }
    }
}

// MARK: - Legacy Barcode Scanner (AVFoundation fallback)

struct LegacyBarcodeScannerView: UIViewControllerRepresentable {
    let onScanned: (String) -> Void

    func makeUIViewController(context: Context) -> LegacyBarcodeScannerVC {
        let vc = LegacyBarcodeScannerVC()
        vc.onScanned = onScanned
        return vc
    }

    func updateUIViewController(_ uiViewController: LegacyBarcodeScannerVC, context: Context) {}
}

final class LegacyBarcodeScannerVC: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    var onScanned: ((String) -> Void)?
    private let session = AVCaptureSession()
    private var previewLayer: AVCaptureVideoPreviewLayer?

    override func viewDidLoad() {
        super.viewDidLoad()
        setupCamera()
    }

    private func setupCamera() {
        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device) else { return }

        let output = AVCaptureMetadataOutput()
        session.beginConfiguration()
        if session.canAddInput(input) { session.addInput(input) }
        if session.canAddOutput(output) { session.addOutput(output) }
        session.commitConfiguration()

        output.setMetadataObjectsDelegate(self, queue: .main)
        output.metadataObjectTypes = [
            .ean8, .ean13, .upce, .code39, .code128, .interleaved2of5,
            .qr, .dataMatrix, .pdf417, .aztec
        ]

        let preview = AVCaptureVideoPreviewLayer(session: session)
        preview.videoGravity = .resizeAspectFill
        preview.frame = view.bounds
        view.layer.addSublayer(preview)
        previewLayer = preview

        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            self?.session.startRunning()
        }
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.bounds
    }

    func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) {
        guard let metadata = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
              let value = metadata.stringValue else { return }
        onScanned?(value)
    }
}

// MARK: - Scan History View

struct ScanHistoryView: View {
    let history: [ScanResult]
    let onSelect: (ScanResult) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            if history.isEmpty {
                SOEmptyState(
                    icon: "clock.arrow.circlepath",
                    title: "No Scan History",
                    message: "Scanned barcodes will appear here."
                )
            } else {
                List {
                    ForEach(history) { result in
                        Button {
                            onSelect(result)
                            dismiss()
                        } label: {
                            HStack(spacing: ShipOSTheme.Spacing.md) {
                                Image(systemName: result.typeIcon)
                                    .font(.body)
                                    .foregroundStyle(ShipOSTheme.Colors.primary)
                                    .frame(width: 36, height: 36)
                                    .background(ShipOSTheme.Colors.primary.opacity(0.12))
                                    .clipShape(RoundedRectangle(cornerRadius: 8))

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(result.value)
                                        .font(ShipOSTheme.Typography.monoSmall)
                                        .lineLimit(1)

                                    HStack {
                                        Text(result.type.displayName)
                                            .font(ShipOSTheme.Typography.caption)
                                            .foregroundStyle(ShipOSTheme.Colors.textSecondary)

                                        if let carrier = result.detectedCarrier {
                                            Text("· \(carrier)")
                                                .font(ShipOSTheme.Typography.caption)
                                                .foregroundStyle(ShipOSTheme.Colors.primary)
                                        }

                                        Spacer()

                                        Text(result.scannedAt.relativeFormatted)
                                            .font(ShipOSTheme.Typography.caption)
                                            .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                                    }
                                }
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
                .listStyle(.plain)
            }
        }
    }
}

// MARK: - Types

enum ScanMode: String, CaseIterable {
    case barcode, qrCode, text

    var label: String {
        switch self {
        case .barcode: "Barcode"
        case .qrCode: "QR"
        case .text: "Text"
        }
    }
}

enum ScanResultType: String {
    case barcode, qrCode, dataMatrix, text

    var displayName: String {
        switch self {
        case .barcode: "Barcode"
        case .qrCode: "QR Code"
        case .dataMatrix: "Data Matrix"
        case .text: "Text"
        }
    }
}

struct ScanResult: Identifiable {
    let id = UUID()
    let value: String
    let type: ScanResultType
    let detectedCarrier: String?
    let scannedAt: Date

    var typeIcon: String {
        switch type {
        case .barcode: "barcode"
        case .qrCode: "qrcode"
        case .dataMatrix: "square.grid.3x3"
        case .text: "doc.text"
        }
    }
}

// MARK: - View Model

@MainActor
final class EnhancedScannerViewModel: ObservableObject {
    @Published var scanMode: ScanMode = .barcode
    @Published var continuousMode = false
    @Published var isFlashlightOn = false
    @Published var lastScannedResult: ScanResult?
    @Published var scanHistory: [ScanResult] = []
    @Published var toast: ToastMessage?

    @Published var showHistory = false
    @Published var showCheckInSheet = false
    @Published var showPhotoLibrary = false

    private var recentScans: Set<String> = [] // Dedup within session

    func handleScan(value: String, type: ScanResultType) {
        // Deduplicate
        let key = "\(type.rawValue):\(value)"
        guard !recentScans.contains(key) else { return }
        recentScans.insert(key)

        let carrier = detectCarrier(from: value)
        let result = ScanResult(
            value: value,
            type: type,
            detectedCarrier: carrier,
            scannedAt: Date()
        )

        withAnimation(.spring(response: 0.3)) {
            lastScannedResult = result
        }
        scanHistory.insert(result, at: 0)

        // Limit history
        if scanHistory.count > 100 { scanHistory = Array(scanHistory.prefix(100)) }

        // Haptic
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    func dismissResult() {
        withAnimation { lastScannedResult = nil }
    }

    func checkInScanned() {
        showCheckInSheet = true
    }

    func searchScanned() {
        // Navigate to package list with search pre-filled
        toast = ToastMessage(message: "Searching...", type: .info)
    }

    func handleHistorySelection(_ item: ScanResult) {
        lastScannedResult = item
    }

    func toggleFlashlight() {
        guard let device = AVCaptureDevice.default(for: .video), device.hasTorch else { return }
        try? device.lockForConfiguration()
        device.torchMode = isFlashlightOn ? .off : .on
        device.unlockForConfiguration()
        isFlashlightOn.toggle()
    }

    private func detectCarrier(from value: String) -> String? {
        let upper = value.uppercased()
        if upper.hasPrefix("1Z") { return "UPS" }
        if upper.hasPrefix("94") || upper.hasPrefix("92") || upper.hasPrefix("93") || upper.hasPrefix("91") { return "USPS" }
        if upper.hasPrefix("TBA") { return "Amazon" }
        if upper.count == 12 || upper.count == 15 || upper.count == 20 { return "FedEx" }
        if upper.count == 10 || upper.count == 11 { return "DHL" }
        return nil
    }
}

// MARK: - DataScanner availability check

extension DataScannerViewController {
    /// Safe availability check for VisionKit DataScanner.
    static var isSupailable: Bool {
        DataScannerViewController.isSupported && DataScannerViewController.isAvailable
    }
}

#Preview {
    EnhancedScannerView()
}
