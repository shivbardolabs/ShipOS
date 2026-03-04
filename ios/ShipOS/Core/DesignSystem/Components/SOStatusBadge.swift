import SwiftUI

// MARK: - Status Badge

/// Colored badge for package/customer status display.
struct SOStatusBadge: View {
    let text: String
    let color: Color

    init(_ text: String, color: Color) {
        self.text = text
        self.color = color
    }

    /// Convenience init for package status.
    init(status: PackageStatus) {
        self.text = status.displayName
        self.color = ShipOSTheme.Colors.packageStatus(status)
    }

    var body: some View {
        Text(text)
            .font(ShipOSTheme.Typography.caption)
            .fontWeight(.medium)
            .foregroundStyle(color)
            .padding(.horizontal, ShipOSTheme.Spacing.sm)
            .padding(.vertical, ShipOSTheme.Spacing.xxs + 1)
            .background(color.opacity(0.12))
            .clipShape(Capsule())
    }
}

// MARK: - Search Bar

/// Styled search bar matching the app design.
struct SOSearchBar: View {
    @Binding var text: String
    var placeholder: String = "Search..."
    var onSubmit: (() -> Void)? = nil

    @FocusState private var isFocused: Bool

    var body: some View {
        HStack(spacing: ShipOSTheme.Spacing.sm) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(ShipOSTheme.Colors.textTertiary)

            TextField(placeholder, text: $text)
                .font(ShipOSTheme.Typography.body)
                .focused($isFocused)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.never)
                .onSubmit { onSubmit?() }

            if !text.isEmpty {
                Button {
                    text = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                }
            }
        }
        .padding(ShipOSTheme.Spacing.md)
        .background(ShipOSTheme.Colors.surfaceSecondary)
        .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.medium))
    }
}

// MARK: - Loading Overlay

/// Full-screen loading overlay.
struct SOLoadingOverlay: View {
    var message: String = "Loading..."

    var body: some View {
        ZStack {
            Color.black.opacity(0.3)
                .ignoresSafeArea()

            VStack(spacing: ShipOSTheme.Spacing.lg) {
                ProgressView()
                    .controlSize(.large)
                    .tint(.white)

                Text(message)
                    .font(ShipOSTheme.Typography.subheadline)
                    .foregroundStyle(.white)
            }
            .padding(ShipOSTheme.Spacing.xxl)
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.large))
        }
    }
}

// MARK: - Toast Banner

/// Animated toast banner shown at top of screen.
struct SOToastBanner: View {
    let message: ToastMessage

    var body: some View {
        HStack(spacing: ShipOSTheme.Spacing.sm) {
            Image(systemName: iconName)
                .foregroundStyle(iconColor)

            Text(message.message)
                .font(ShipOSTheme.Typography.subheadline)
                .foregroundStyle(ShipOSTheme.Colors.textPrimary)

            Spacer()
        }
        .padding(ShipOSTheme.Spacing.lg)
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.medium))
        .padding(.horizontal)
        .transition(.move(edge: .top).combined(with: .opacity))
    }

    private var iconName: String {
        switch message.type {
        case .success: "checkmark.circle.fill"
        case .error: "xmark.circle.fill"
        case .warning: "exclamationmark.triangle.fill"
        case .info: "info.circle.fill"
        }
    }

    private var iconColor: Color {
        switch message.type {
        case .success: ShipOSTheme.Colors.success
        case .error: ShipOSTheme.Colors.error
        case .warning: ShipOSTheme.Colors.warning
        case .info: ShipOSTheme.Colors.info
        }
    }
}

// MARK: - Section Header

/// Styled section header for lists.
struct SOSectionHeader: View {
    let title: String
    var count: Int? = nil
    var action: (() -> Void)? = nil
    var actionLabel: String? = nil

    var body: some View {
        HStack {
            Text(title)
                .font(ShipOSTheme.Typography.headline)
                .foregroundStyle(ShipOSTheme.Colors.textPrimary)

            if let count {
                Text("\(count)")
                    .font(ShipOSTheme.Typography.caption)
                    .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(ShipOSTheme.Colors.surfaceSecondary)
                    .clipShape(Capsule())
            }

            Spacer()

            if let action, let actionLabel {
                Button(actionLabel, action: action)
                    .font(ShipOSTheme.Typography.subheadline)
                    .foregroundStyle(ShipOSTheme.Colors.primary)
            }
        }
    }
}

// MARK: - Previews

#Preview("Status Badges") {
    HStack {
        SOStatusBadge(status: .checkedIn)
        SOStatusBadge(status: .notified)
        SOStatusBadge(status: .held)
        SOStatusBadge(status: .released)
    }
    .padding()
}

#Preview("Search Bar") {
    SOSearchBar(text: .constant("FedEx"))
        .padding()
}
