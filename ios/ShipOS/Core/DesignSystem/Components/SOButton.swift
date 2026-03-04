import SwiftUI

// MARK: - Button Styles

/// Primary action button — filled, full-width.
struct SOPrimaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(ShipOSTheme.Typography.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, minHeight: 50)
            .background(
                isEnabled
                    ? ShipOSTheme.Colors.primary
                    : ShipOSTheme.Colors.primary.opacity(0.4)
            )
            .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.medium))
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(ShipOSTheme.Animation.quick, value: configuration.isPressed)
    }
}

/// Secondary button — outlined.
struct SOSecondaryButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(ShipOSTheme.Typography.headline)
            .foregroundStyle(isEnabled ? ShipOSTheme.Colors.primary : ShipOSTheme.Colors.textTertiary)
            .frame(maxWidth: .infinity, minHeight: 50)
            .background(ShipOSTheme.Colors.surfacePrimary)
            .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.medium))
            .overlay(
                RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.medium)
                    .stroke(
                        isEnabled ? ShipOSTheme.Colors.primary.opacity(0.3) : ShipOSTheme.Colors.border,
                        lineWidth: 1
                    )
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(ShipOSTheme.Animation.quick, value: configuration.isPressed)
    }
}

/// Destructive button — red filled.
struct SODestructiveButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(ShipOSTheme.Typography.headline)
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity, minHeight: 50)
            .background(ShipOSTheme.Colors.error)
            .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.medium))
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(ShipOSTheme.Animation.quick, value: configuration.isPressed)
    }
}

/// Compact pill button for inline actions.
struct SOPillButtonStyle: ButtonStyle {
    let color: Color

    init(color: Color = ShipOSTheme.Colors.primary) {
        self.color = color
    }

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(ShipOSTheme.Typography.caption)
            .foregroundStyle(color)
            .padding(.horizontal, ShipOSTheme.Spacing.md)
            .padding(.vertical, ShipOSTheme.Spacing.xs)
            .background(color.opacity(0.12))
            .clipShape(Capsule())
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
    }
}

// MARK: - Button Style Extensions

extension ButtonStyle where Self == SOPrimaryButtonStyle {
    static var soPrimary: SOPrimaryButtonStyle { SOPrimaryButtonStyle() }
}

extension ButtonStyle where Self == SOSecondaryButtonStyle {
    static var soSecondary: SOSecondaryButtonStyle { SOSecondaryButtonStyle() }
}

extension ButtonStyle where Self == SODestructiveButtonStyle {
    static var soDestructive: SODestructiveButtonStyle { SODestructiveButtonStyle() }
}

// MARK: - Preview

#Preview {
    VStack(spacing: 16) {
        Button("Check In Package") {}
            .buttonStyle(.soPrimary)

        Button("View Details") {}
            .buttonStyle(.soSecondary)

        Button("Delete Package") {}
            .buttonStyle(.soDestructive)

        Button("Check In Package") {}
            .buttonStyle(.soPrimary)
            .disabled(true)

        HStack {
            Button("Held") {}
                .buttonStyle(SOPillButtonStyle(color: .blue))
            Button("Notified") {}
                .buttonStyle(SOPillButtonStyle(color: .orange))
            Button("Released") {}
                .buttonStyle(SOPillButtonStyle(color: .green))
        }
    }
    .padding()
}
