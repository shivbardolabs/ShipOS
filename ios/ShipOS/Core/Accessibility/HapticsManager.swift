import SwiftUI
import UIKit
import CoreHaptics

// MARK: - BAR-374: Haptics & Accessibility
// Centralized haptic feedback engine, VoiceOver support,
// Dynamic Type adaptations, and accessibility modifiers.

// MARK: - Haptics Manager

/// Centralized haptic feedback engine with pattern support and CHHapticEngine for complex haptics.
@MainActor
final class HapticsManager {
    static let shared = HapticsManager()

    private var engine: CHHapticEngine?
    private let supportsHaptics: Bool

    @AppStorage("haptics_enabled") var isEnabled = true

    private init() {
        supportsHaptics = CHHapticEngine.capabilitiesForHardware().supportsHaptics
        prepareEngine()
    }

    // MARK: - Simple Feedback

    /// Light tap — navigation, selection changes.
    func tap() {
        guard isEnabled else { return }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    /// Medium impact — button presses, confirmations.
    func impact() {
        guard isEnabled else { return }
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
    }

    /// Heavy impact — significant actions (check-in, check-out).
    func heavyImpact() {
        guard isEnabled else { return }
        UIImpactFeedbackGenerator(style: .heavy).impactOccurred()
    }

    /// Success feedback — operation completed.
    func success() {
        guard isEnabled else { return }
        UINotificationFeedbackGenerator().notificationOccurred(.success)
    }

    /// Warning feedback — attention needed.
    func warning() {
        guard isEnabled else { return }
        UINotificationFeedbackGenerator().notificationOccurred(.warning)
    }

    /// Error feedback — operation failed.
    func error() {
        guard isEnabled else { return }
        UINotificationFeedbackGenerator().notificationOccurred(.error)
    }

    /// Selection tick — picker changes, toggle switches.
    func selection() {
        guard isEnabled else { return }
        UISelectionFeedbackGenerator().selectionChanged()
    }

    // MARK: - Complex Haptic Patterns

    /// Scan success — two quick taps followed by a longer buzz.
    func scanSuccess() {
        guard isEnabled, supportsHaptics else {
            success()
            return
        }

        do {
            let pattern = try CHHapticPattern(events: [
                CHHapticEvent(
                    eventType: .hapticTransient,
                    parameters: [
                        CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.6),
                        CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.5),
                    ],
                    relativeTime: 0
                ),
                CHHapticEvent(
                    eventType: .hapticTransient,
                    parameters: [
                        CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.8),
                        CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.7),
                    ],
                    relativeTime: 0.1
                ),
                CHHapticEvent(
                    eventType: .hapticContinuous,
                    parameters: [
                        CHHapticEventParameter(parameterID: .hapticIntensity, value: 1.0),
                        CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.3),
                    ],
                    relativeTime: 0.25,
                    duration: 0.15
                ),
            ], parameters: [])

            try playPattern(pattern)
        } catch {
            success()
        }
    }

    /// Check-in haptic — a building crescendo confirming package received.
    func checkIn() {
        guard isEnabled, supportsHaptics else {
            heavyImpact()
            return
        }

        do {
            let events = (0..<4).map { i in
                CHHapticEvent(
                    eventType: .hapticTransient,
                    parameters: [
                        CHHapticEventParameter(parameterID: .hapticIntensity, value: Float(i + 1) * 0.25),
                        CHHapticEventParameter(parameterID: .hapticSharpness, value: Float(i + 1) * 0.2),
                    ],
                    relativeTime: Double(i) * 0.08
                )
            }
            let pattern = try CHHapticPattern(events: events, parameters: [])
            try playPattern(pattern)
        } catch {
            heavyImpact()
        }
    }

    /// Check-out haptic — a satisfying "complete" double-tap.
    func checkOut() {
        guard isEnabled, supportsHaptics else {
            success()
            return
        }

        do {
            let pattern = try CHHapticPattern(events: [
                CHHapticEvent(
                    eventType: .hapticTransient,
                    parameters: [
                        CHHapticEventParameter(parameterID: .hapticIntensity, value: 0.9),
                        CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.6),
                    ],
                    relativeTime: 0
                ),
                CHHapticEvent(
                    eventType: .hapticTransient,
                    parameters: [
                        CHHapticEventParameter(parameterID: .hapticIntensity, value: 1.0),
                        CHHapticEventParameter(parameterID: .hapticSharpness, value: 0.8),
                    ],
                    relativeTime: 0.15
                ),
            ], parameters: [])

            try playPattern(pattern)
        } catch {
            success()
        }
    }

    /// Error haptic — a sharp triple buzz.
    func errorPattern() {
        guard isEnabled, supportsHaptics else {
            error()
            return
        }

        do {
            let events = (0..<3).map { i in
                CHHapticEvent(
                    eventType: .hapticTransient,
                    parameters: [
                        CHHapticEventParameter(parameterID: .hapticIntensity, value: 1.0),
                        CHHapticEventParameter(parameterID: .hapticSharpness, value: 1.0),
                    ],
                    relativeTime: Double(i) * 0.12
                )
            }
            let pattern = try CHHapticPattern(events: events, parameters: [])
            try playPattern(pattern)
        } catch {
            print("[Haptics] Error: \(error)")
        }
    }

    // MARK: - Engine Management

    private func prepareEngine() {
        guard supportsHaptics else { return }

        do {
            engine = try CHHapticEngine()
            engine?.resetHandler = { [weak self] in
                Task { @MainActor in
                    try? self?.engine?.start()
                }
            }
            engine?.playsHapticsOnly = true
            try engine?.start()
        } catch {
            print("[Haptics] Engine init error: \(error)")
        }
    }

    private func playPattern(_ pattern: CHHapticPattern) throws {
        guard let engine else { return }
        let player = try engine.makePlayer(with: pattern)
        try player.start(atTime: CHHapticTimeImmediate)
    }
}

// MARK: - Accessibility Helpers

/// View modifier for consistent VoiceOver accessibility across the app.
struct AccessibleModifier: ViewModifier {
    let label: String
    let hint: String?
    let traits: AccessibilityTraits

    func body(content: Content) -> some View {
        content
            .accessibilityLabel(label)
            .accessibilityHint(hint ?? "")
            .accessibilityAddTraits(traits)
    }
}

extension View {
    /// Make a view accessible with label, hint, and traits.
    func accessible(
        _ label: String,
        hint: String? = nil,
        traits: AccessibilityTraits = []
    ) -> some View {
        modifier(AccessibleModifier(label: label, hint: hint, traits: traits))
    }

    /// Add haptic feedback on tap.
    func hapticTap(_ style: HapticStyle = .light) -> some View {
        simultaneousGesture(
            TapGesture().onEnded {
                switch style {
                case .light: HapticsManager.shared.tap()
                case .medium: HapticsManager.shared.impact()
                case .heavy: HapticsManager.shared.heavyImpact()
                case .success: HapticsManager.shared.success()
                case .selection: HapticsManager.shared.selection()
                }
            }
        )
    }
}

enum HapticStyle {
    case light, medium, heavy, success, selection
}

// MARK: - Dynamic Type Support

/// A container that adapts its layout based on Dynamic Type size.
struct DynamicTypeStack<Content: View>: View {
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize
    let threshold: DynamicTypeSize
    @ViewBuilder let content: Content

    init(
        threshold: DynamicTypeSize = .accessibility1,
        @ViewBuilder content: () -> Content
    ) {
        self.threshold = threshold
        self.content = content()
    }

    var body: some View {
        if dynamicTypeSize >= threshold {
            VStack(alignment: .leading, spacing: 8) {
                content
            }
        } else {
            HStack(spacing: 12) {
                content
            }
        }
    }
}

/// Scales an icon or image based on the current Dynamic Type size.
struct ScaledIcon: View {
    let systemName: String
    let baseSize: CGFloat
    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    var body: some View {
        Image(systemName: systemName)
            .font(.system(size: scaledSize))
    }

    private var scaledSize: CGFloat {
        switch dynamicTypeSize {
        case .xSmall, .small: baseSize * 0.85
        case .medium, .large: baseSize
        case .xLarge, .xxLarge: baseSize * 1.15
        case .xxxLarge: baseSize * 1.3
        case .accessibility1: baseSize * 1.5
        case .accessibility2: baseSize * 1.7
        case .accessibility3: baseSize * 1.9
        case .accessibility4: baseSize * 2.1
        case .accessibility5: baseSize * 2.3
        @unknown default: baseSize
        }
    }
}

// MARK: - Accessible Stat Card

/// A stat card variant optimized for VoiceOver + Dynamic Type.
struct AccessibleStatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    let trend: String?
    let trendUp: Bool?

    @Environment(\.dynamicTypeSize) private var dynamicTypeSize

    init(
        title: String,
        value: String,
        icon: String,
        color: Color,
        trend: String? = nil,
        trendUp: Bool? = nil
    ) {
        self.title = title
        self.value = value
        self.icon = icon
        self.color = color
        self.trend = trend
        self.trendUp = trendUp
    }

    var body: some View {
        VStack(alignment: .leading, spacing: dynamicTypeSize.isAccessibilitySize ? 8 : 6) {
            HStack {
                ScaledIcon(systemName: icon, baseSize: 16)
                    .foregroundStyle(color)

                Spacer()

                if let trend, let trendUp {
                    HStack(spacing: 2) {
                        Image(systemName: trendUp ? "arrow.up.right" : "arrow.down.right")
                            .font(.system(size: 10))
                        Text(trend)
                            .font(ShipOSTheme.Typography.caption2)
                    }
                    .foregroundStyle(trendUp ? ShipOSTheme.Colors.success : ShipOSTheme.Colors.error)
                }
            }

            Text(value)
                .font(.system(dynamicTypeSize.isAccessibilitySize ? .title2 : .title3, design: .rounded, weight: .bold))
                .minimumScaleFactor(0.6)
                .lineLimit(1)

            Text(title)
                .font(ShipOSTheme.Typography.caption)
                .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                .lineLimit(dynamicTypeSize.isAccessibilitySize ? 2 : 1)
        }
        .padding(ShipOSTheme.Spacing.md)
        .background(ShipOSTheme.Colors.surfacePrimary)
        .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.medium))
        .soShadow(ShipOSTheme.Shadow.small)
        .accessibilityElement(children: .ignore)
        .accessibilityLabel("\(title): \(value)\(trend != nil ? ", trend \(trend!)" : "")")
    }
}

// MARK: - Reduce Motion Support

struct ReduceMotionModifier: ViewModifier {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    let animation: Animation

    func body(content: Content) -> some View {
        content.animation(reduceMotion ? .none : animation, value: reduceMotion)
    }
}

extension View {
    /// Apply animation only when Reduce Motion is off.
    func motionSafe(_ animation: Animation = .default) -> some View {
        modifier(ReduceMotionModifier(animation: animation))
    }
}

// MARK: - High Contrast Support

struct HighContrastModifier: ViewModifier {
    @Environment(\.colorSchemeContrast) private var contrast
    let normalOpacity: Double
    let highContrastOpacity: Double

    func body(content: Content) -> some View {
        content
            .opacity(contrast == .increased ? highContrastOpacity : normalOpacity)
    }
}

extension View {
    /// Adjust opacity based on contrast accessibility setting.
    func contrastAdaptive(normal: Double = 1.0, high: Double = 1.0) -> some View {
        modifier(HighContrastModifier(normalOpacity: normal, highContrastOpacity: high))
    }
}
