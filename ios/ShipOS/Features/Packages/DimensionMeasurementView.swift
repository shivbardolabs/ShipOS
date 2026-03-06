import SwiftUI
import ARKit
import RealityKit

/// BAR-361: AR Dimension Measurement — LiDAR/ARKit based package measuring tool.
/// Guides user to place points on corners to capture L×W×H.
struct DimensionMeasurementView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = DimensionViewModel()

    var body: some View {
        NavigationStack {
            ZStack {
                // AR View
                if ARWorldTrackingConfiguration.isSupported {
                    DimensionARView(viewModel: viewModel)
                        .ignoresSafeArea()
                } else {
                    manualMeasurementFallback
                }

                // Overlay UI
                VStack {
                    // Instructions banner
                    instructionBanner
                        .padding(.top)

                    Spacer()

                    // Measurement display
                    if viewModel.hasAnyMeasurement {
                        measurementCard
                    }

                    // Controls
                    controlBar
                        .padding(.bottom)
                }
            }
            .navigationTitle("Measure")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    if viewModel.isComplete {
                        Button("Save") {
                            viewModel.saveMeasurements()
                            dismiss()
                        }
                    }
                }
            }
            .toast($viewModel.toast)
        }
    }

    // MARK: - Instruction Banner

    private var instructionBanner: some View {
        HStack(spacing: ShipOSTheme.Spacing.md) {
            Image(systemName: viewModel.currentInstruction.icon)
                .font(.title3)
                .foregroundStyle(ShipOSTheme.Colors.primary)

            VStack(alignment: .leading, spacing: 2) {
                Text(viewModel.currentInstruction.title)
                    .font(ShipOSTheme.Typography.subheadline)
                Text(viewModel.currentInstruction.subtitle)
                    .font(ShipOSTheme.Typography.caption)
                    .foregroundStyle(ShipOSTheme.Colors.textSecondary)
            }

            Spacer()

            Text("Step \(viewModel.currentMeasurementStep)/3")
                .font(ShipOSTheme.Typography.caption)
                .foregroundStyle(ShipOSTheme.Colors.textTertiary)
        }
        .padding()
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.medium))
        .padding(.horizontal)
    }

    // MARK: - Measurement Card

    private var measurementCard: some View {
        HStack(spacing: ShipOSTheme.Spacing.xl) {
            DimensionPill(label: "L", value: viewModel.length, unit: viewModel.unit)
            DimensionPill(label: "W", value: viewModel.width, unit: viewModel.unit)
            DimensionPill(label: "H", value: viewModel.height, unit: viewModel.unit)
        }
        .padding()
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.large))
        .padding(.horizontal)
    }

    // MARK: - Controls

    private var controlBar: some View {
        HStack(spacing: ShipOSTheme.Spacing.xxl) {
            // Unit toggle
            Button {
                viewModel.toggleUnit()
            } label: {
                VStack(spacing: 4) {
                    Image(systemName: "ruler")
                        .font(.title3)
                    Text(viewModel.unit == .inches ? "in" : "cm")
                        .font(ShipOSTheme.Typography.caption)
                }
                .foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(.ultraThinMaterial)
                .clipShape(Circle())
            }

            // Measure / Place point
            Button {
                viewModel.placePoint()
            } label: {
                Image(systemName: viewModel.isComplete ? "checkmark" : "plus.circle.fill")
                    .font(.system(size: 32))
                    .foregroundStyle(.white)
                    .frame(width: 72, height: 72)
                    .background(ShipOSTheme.Colors.primary)
                    .clipShape(Circle())
                    .shadow(color: ShipOSTheme.Colors.primary.opacity(0.4), radius: 8, y: 4)
            }
            .disabled(viewModel.isComplete)

            // Reset
            Button {
                viewModel.reset()
            } label: {
                VStack(spacing: 4) {
                    Image(systemName: "arrow.counterclockwise")
                        .font(.title3)
                    Text("Reset")
                        .font(ShipOSTheme.Typography.caption)
                }
                .foregroundStyle(.white)
                .frame(width: 56, height: 56)
                .background(.ultraThinMaterial)
                .clipShape(Circle())
            }
        }
        .padding()
    }

    // MARK: - Manual Fallback

    private var manualMeasurementFallback: some View {
        VStack(spacing: ShipOSTheme.Spacing.xxl) {
            Image(systemName: "ruler.fill")
                .font(.system(size: 60))
                .foregroundStyle(ShipOSTheme.Colors.primary)

            Text("AR Not Available")
                .font(ShipOSTheme.Typography.title2)

            Text("Enter dimensions manually")
                .font(ShipOSTheme.Typography.body)
                .foregroundStyle(ShipOSTheme.Colors.textSecondary)

            VStack(spacing: ShipOSTheme.Spacing.lg) {
                ManualDimensionField(label: "Length", value: $viewModel.manualLength, unit: viewModel.unit)
                ManualDimensionField(label: "Width", value: $viewModel.manualWidth, unit: viewModel.unit)
                ManualDimensionField(label: "Height", value: $viewModel.manualHeight, unit: viewModel.unit)
            }
            .padding(.horizontal, ShipOSTheme.Spacing.xxl)

            HStack {
                Picker("Unit", selection: $viewModel.unit) {
                    Text("Inches").tag(MeasurementUnit.inches)
                    Text("Centimeters").tag(MeasurementUnit.centimeters)
                }
                .pickerStyle(.segmented)
            }
            .padding(.horizontal, ShipOSTheme.Spacing.xxl)

            Button {
                viewModel.saveManualMeasurements()
                dismiss()
            } label: {
                Text("Save Dimensions")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(SOPrimaryButtonStyle())
            .padding(.horizontal, ShipOSTheme.Spacing.xxl)
            .disabled(!viewModel.canSaveManual)
        }
    }
}

// MARK: - Supporting Views

struct DimensionPill: View {
    let label: String
    let value: Double?
    let unit: MeasurementUnit

    var body: some View {
        VStack(spacing: 4) {
            Text(label)
                .font(ShipOSTheme.Typography.caption2)
                .foregroundStyle(.white.opacity(0.7))

            if let value {
                Text(String(format: "%.1f", value))
                    .font(ShipOSTheme.Typography.headline)
                    .foregroundStyle(.white)
            } else {
                Text("—")
                    .font(ShipOSTheme.Typography.headline)
                    .foregroundStyle(.white.opacity(0.4))
            }

            Text(unit == .inches ? "in" : "cm")
                .font(ShipOSTheme.Typography.caption2)
                .foregroundStyle(.white.opacity(0.5))
        }
        .frame(width: 60)
    }
}

struct ManualDimensionField: View {
    let label: String
    @Binding var value: String
    let unit: MeasurementUnit

    var body: some View {
        HStack {
            Text(label)
                .font(ShipOSTheme.Typography.body)
                .frame(width: 70, alignment: .leading)

            TextField("0.0", text: $value)
                .keyboardType(.decimalPad)
                .font(ShipOSTheme.Typography.headline)
                .multilineTextAlignment(.center)
                .padding(ShipOSTheme.Spacing.md)
                .background(ShipOSTheme.Colors.surfaceSecondary)
                .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.small))

            Text(unit == .inches ? "in" : "cm")
                .font(ShipOSTheme.Typography.caption)
                .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                .frame(width: 30)
        }
    }
}

// MARK: - Measurement Types

enum MeasurementUnit: String, CaseIterable {
    case inches, centimeters
}

struct MeasurementInstruction {
    let title: String
    let subtitle: String
    let icon: String
}

// MARK: - View Model

@MainActor
final class DimensionViewModel: ObservableObject {
    @Published var length: Double?
    @Published var width: Double?
    @Published var height: Double?
    @Published var unit: MeasurementUnit = .inches
    @Published var toast: ToastMessage?

    // Manual fallback
    @Published var manualLength = ""
    @Published var manualWidth = ""
    @Published var manualHeight = ""

    // AR state
    @Published var points: [SIMD3<Float>] = []

    var currentMeasurementStep: Int {
        if length == nil { return 1 }
        if width == nil { return 2 }
        return 3
    }

    var isComplete: Bool { length != nil && width != nil && height != nil }
    var hasAnyMeasurement: Bool { length != nil || width != nil || height != nil }

    var canSaveManual: Bool {
        Double(manualLength) ?? 0 > 0 &&
        Double(manualWidth) ?? 0 > 0 &&
        Double(manualHeight) ?? 0 > 0
    }

    var currentInstruction: MeasurementInstruction {
        switch currentMeasurementStep {
        case 1:
            MeasurementInstruction(
                title: "Measure Length",
                subtitle: "Tap two endpoints along the longest edge",
                icon: "arrow.left.and.right"
            )
        case 2:
            MeasurementInstruction(
                title: "Measure Width",
                subtitle: "Tap two endpoints along the shorter edge",
                icon: "arrow.up.and.down"
            )
        default:
            MeasurementInstruction(
                title: "Measure Height",
                subtitle: "Tap the top and bottom of the package",
                icon: "arrow.up"
            )
        }
    }

    func placePoint() {
        // AR scene handles point placement via hit-testing
        // This triggers the measurement capture in the AR view
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    }

    func recordMeasurement(_ meters: Float) {
        let value = unit == .inches
            ? Double(meters) * 39.3701
            : Double(meters) * 100.0

        if length == nil {
            length = value
        } else if width == nil {
            width = value
        } else if height == nil {
            height = value
            UINotificationFeedbackGenerator().notificationOccurred(.success)
        }
    }

    func toggleUnit() {
        let factor: Double = unit == .inches ? 2.54 : 1.0 / 2.54
        unit = unit == .inches ? .centimeters : .inches
        length = length.map { $0 * factor }
        width = width.map { $0 * factor }
        height = height.map { $0 * factor }
    }

    func reset() {
        length = nil
        width = nil
        height = nil
        points = []
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    func saveMeasurements() {
        toast = ToastMessage(
            message: String(format: "Saved: %.1f × %.1f × %.1f %@",
                            length ?? 0, width ?? 0, height ?? 0,
                            unit == .inches ? "in" : "cm"),
            type: .success
        )
    }

    func saveManualMeasurements() {
        length = Double(manualLength)
        width = Double(manualWidth)
        height = Double(manualHeight)
        saveMeasurements()
    }
}

// MARK: - AR View (RealityKit)

struct DimensionARView: UIViewRepresentable {
    @ObservedObject var viewModel: DimensionViewModel

    func makeUIView(context: Context) -> ARView {
        let arView = ARView(frame: .zero)

        // Configure AR session
        let config = ARWorldTrackingConfiguration()
        config.planeDetection = [.horizontal, .vertical]

        if ARWorldTrackingConfiguration.supportsSceneReconstruction(.mesh) {
            config.sceneReconstruction = .mesh
        }

        arView.session.run(config)

        // Add tap gesture for point placement
        let tap = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleTap(_:)))
        arView.addGestureRecognizer(tap)

        // Add crosshair
        let crosshair = UIImageView(image: UIImage(systemName: "plus.circle")?.withTintColor(.white, renderingMode: .alwaysOriginal))
        crosshair.translatesAutoresizingMaskIntoConstraints = false
        arView.addSubview(crosshair)
        NSLayoutConstraint.activate([
            crosshair.centerXAnchor.constraint(equalTo: arView.centerXAnchor),
            crosshair.centerYAnchor.constraint(equalTo: arView.centerYAnchor),
            crosshair.widthAnchor.constraint(equalToConstant: 32),
            crosshair.heightAnchor.constraint(equalToConstant: 32)
        ])

        context.coordinator.arView = arView
        return arView
    }

    func updateUIView(_ uiView: ARView, context: Context) {}

    func makeCoordinator() -> Coordinator { Coordinator(viewModel: viewModel) }

    class Coordinator: NSObject {
        var arView: ARView?
        let viewModel: DimensionViewModel
        private var startPoint: SIMD3<Float>?
        private var lineAnchor: AnchorEntity?

        init(viewModel: DimensionViewModel) { self.viewModel = viewModel }

        @objc func handleTap(_ gesture: UITapGestureRecognizer) {
            guard let arView else { return }
            let location = gesture.location(in: arView)

            // Raycast to find surface point
            guard let result = arView.raycast(from: location, allowing: .estimatedPlane, alignment: .any).first else {
                return
            }

            let position = result.worldTransform.columns.3
            let point = SIMD3<Float>(position.x, position.y, position.z)

            if let start = startPoint {
                // Second point — calculate distance
                let distance = simd_distance(start, point)

                // Add visual line
                addLine(from: start, to: point, in: arView)

                // Record measurement
                DispatchQueue.main.async {
                    self.viewModel.recordMeasurement(distance)
                }

                startPoint = nil
            } else {
                // First point
                startPoint = point
                addDot(at: point, in: arView)
            }

            UIImpactFeedbackGenerator(style: .rigid).impactOccurred()
        }

        private func addDot(at position: SIMD3<Float>, in arView: ARView) {
            let sphere = MeshResource.generateSphere(radius: 0.008)
            let material = SimpleMaterial(color: .systemIndigo, isMetallic: false)
            let entity = ModelEntity(mesh: sphere, materials: [material])

            let anchor = AnchorEntity(world: position)
            anchor.addChild(entity)
            arView.scene.addAnchor(anchor)
        }

        private func addLine(from start: SIMD3<Float>, to end: SIMD3<Float>, in arView: ARView) {
            let distance = simd_distance(start, end)
            let midPoint = (start + end) / 2

            // Create thin cylinder as line
            let cylinder = MeshResource.generateBox(
                width: 0.003, height: 0.003, depth: distance
            )
            let material = SimpleMaterial(color: .systemIndigo, isMetallic: false)
            let entity = ModelEntity(mesh: cylinder, materials: [material])

            // Orient along the line
            let direction = normalize(end - start)
            let rotation = simd_quatf(from: SIMD3<Float>(0, 0, 1), to: direction)
            entity.orientation = rotation

            let anchor = AnchorEntity(world: midPoint)
            anchor.addChild(entity)

            // Add endpoint dots
            addDot(at: end, in: arView)

            arView.scene.addAnchor(anchor)
        }
    }
}

#Preview {
    DimensionMeasurementView()
}
