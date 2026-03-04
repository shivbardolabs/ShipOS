import SwiftUI

/// ShipOS Design System — centralized theme matching the web app.
/// Indigo primary (#6366f1), semantic colors, type scale, spacing.
enum ShipOSTheme {

    // MARK: - Colors

    enum Colors {
        // Brand
        static let primary = Color(hex: "#6366f1")       // Indigo-500
        static let primaryLight = Color(hex: "#818cf8")   // Indigo-400
        static let primaryDark = Color(hex: "#4f46e5")    // Indigo-600

        // Semantic
        static let success = Color(hex: "#22c55e")        // Green-500
        static let warning = Color(hex: "#f59e0b")        // Amber-500
        static let error = Color(hex: "#ef4444")          // Red-500
        static let info = Color(hex: "#3b82f6")           // Blue-500

        // Text
        static let textPrimary = Color(.label)
        static let textSecondary = Color(.secondaryLabel)
        static let textTertiary = Color(.tertiaryLabel)

        // Surfaces
        static let background = Color(.systemBackground)
        static let surfacePrimary = Color(.secondarySystemBackground)
        static let surfaceSecondary = Color(.tertiarySystemBackground)
        static let surfaceGrouped = Color(.systemGroupedBackground)
        static let surfaceGroupedSecondary = Color(.secondarySystemGroupedBackground)

        // Borders
        static let border = Color(.separator)
        static let borderLight = Color(.opaqueSeparator)

        // Package status colors
        static func packageStatus(_ status: PackageStatus) -> Color {
            switch status {
            case .checkedIn: info
            case .notified: warning
            case .held: Color(hex: "#a855f7")    // Purple
            case .released: success
            case .returned: Color(hex: "#f97316") // Orange
            case .forwarded: Color(hex: "#06b6d4") // Cyan
            }
        }

        // Customer status colors
        static func customerStatus(_ status: String) -> Color {
            switch status.lowercased() {
            case "active": success
            case "inactive": textTertiary
            case "suspended": error
            default: textSecondary
            }
        }
    }

    // MARK: - Typography

    enum Typography {
        static let largeTitle = Font.system(.largeTitle, design: .rounded, weight: .bold)
        static let title = Font.system(.title, design: .rounded, weight: .semibold)
        static let title2 = Font.system(.title2, design: .rounded, weight: .semibold)
        static let title3 = Font.system(.title3, design: .rounded, weight: .medium)
        static let headline = Font.system(.headline, design: .rounded, weight: .semibold)
        static let subheadline = Font.system(.subheadline, design: .rounded, weight: .medium)
        static let body = Font.system(.body, design: .rounded)
        static let callout = Font.system(.callout, design: .rounded)
        static let footnote = Font.system(.footnote, design: .rounded)
        static let caption = Font.system(.caption, design: .rounded)
        static let caption2 = Font.system(.caption2, design: .rounded)

        // Monospace for tracking numbers, IDs
        static let mono = Font.system(.body, design: .monospaced)
        static let monoSmall = Font.system(.caption, design: .monospaced)
    }

    // MARK: - Spacing

    enum Spacing {
        static let xxs: CGFloat = 2
        static let xs: CGFloat = 4
        static let sm: CGFloat = 8
        static let md: CGFloat = 12
        static let lg: CGFloat = 16
        static let xl: CGFloat = 24
        static let xxl: CGFloat = 32
        static let xxxl: CGFloat = 48
    }

    // MARK: - Corner Radius

    enum CornerRadius {
        static let small: CGFloat = 8
        static let medium: CGFloat = 12
        static let large: CGFloat = 16
        static let xl: CGFloat = 24
    }

    // MARK: - Shadows

    enum Shadow {
        static let small = ShadowStyle(color: .black.opacity(0.05), radius: 2, y: 1)
        static let medium = ShadowStyle(color: .black.opacity(0.08), radius: 8, y: 2)
        static let large = ShadowStyle(color: .black.opacity(0.12), radius: 16, y: 4)
    }

    // MARK: - Animation

    enum Animation {
        static let quick = SwiftUI.Animation.easeInOut(duration: 0.15)
        static let standard = SwiftUI.Animation.easeInOut(duration: 0.25)
        static let smooth = SwiftUI.Animation.spring(response: 0.3, dampingFraction: 0.8)
        static let bouncy = SwiftUI.Animation.spring(response: 0.4, dampingFraction: 0.6)
    }
}

// MARK: - Shadow Style Helper

struct ShadowStyle {
    let color: Color
    let radius: CGFloat
    let y: CGFloat
}

// MARK: - Hex Color Extension

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)

        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}
