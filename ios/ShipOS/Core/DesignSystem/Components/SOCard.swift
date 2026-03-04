import SwiftUI

// MARK: - Card

/// Standard card container used throughout the app.
struct SOCard<Content: View>: View {
    let content: () -> Content

    init(@ViewBuilder content: @escaping () -> Content) {
        self.content = content
    }

    var body: some View {
        content()
            .padding(ShipOSTheme.Spacing.lg)
            .background(ShipOSTheme.Colors.surfaceGroupedSecondary)
            .clipShape(RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.large))
    }
}

// MARK: - Stat Card

/// Dashboard stat card with icon, value, and label.
struct SOStatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color
    var trend: String? = nil
    var trendUp: Bool? = nil

    var body: some View {
        SOCard {
            VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.sm) {
                HStack {
                    Image(systemName: icon)
                        .font(.title3)
                        .foregroundStyle(color)
                        .frame(width: 36, height: 36)
                        .background(color.opacity(0.12))
                        .clipShape(RoundedRectangle(cornerRadius: 10))

                    Spacer()

                    if let trend, let trendUp {
                        HStack(spacing: 2) {
                            Image(systemName: trendUp ? "arrow.up.right" : "arrow.down.right")
                                .font(.caption2)
                            Text(trend)
                                .font(ShipOSTheme.Typography.caption2)
                        }
                        .foregroundStyle(trendUp ? ShipOSTheme.Colors.success : ShipOSTheme.Colors.error)
                    }
                }

                VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.xxs) {
                    Text(value)
                        .font(ShipOSTheme.Typography.title)
                        .foregroundStyle(ShipOSTheme.Colors.textPrimary)

                    Text(title)
                        .font(ShipOSTheme.Typography.caption)
                        .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                }
            }
        }
    }
}

// MARK: - Empty State

/// Full-screen empty state with icon, title, message, and optional action.
struct SOEmptyState: View {
    let icon: String
    let title: String
    let message: String
    var actionTitle: String? = nil
    var action: (() -> Void)? = nil

    var body: some View {
        VStack(spacing: ShipOSTheme.Spacing.lg) {
            Image(systemName: icon)
                .font(.system(size: 56))
                .foregroundStyle(ShipOSTheme.Colors.textTertiary)

            VStack(spacing: ShipOSTheme.Spacing.sm) {
                Text(title)
                    .font(ShipOSTheme.Typography.title3)
                    .foregroundStyle(ShipOSTheme.Colors.textPrimary)

                Text(message)
                    .font(ShipOSTheme.Typography.body)
                    .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                    .multilineTextAlignment(.center)
            }

            if let actionTitle, let action {
                Button(action: action) {
                    Text(actionTitle)
                        .font(ShipOSTheme.Typography.headline)
                        .padding(.horizontal, ShipOSTheme.Spacing.xl)
                        .padding(.vertical, ShipOSTheme.Spacing.md)
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding(ShipOSTheme.Spacing.xxl)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

// MARK: - Previews

#Preview("Stat Cards") {
    ScrollView {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: 12) {
            SOStatCard(
                title: "Packages Held",
                value: "47",
                icon: "shippingbox.fill",
                color: ShipOSTheme.Colors.info,
                trend: "+12%",
                trendUp: true
            )

            SOStatCard(
                title: "Checked In Today",
                value: "23",
                icon: "arrow.down.circle.fill",
                color: ShipOSTheme.Colors.success
            )

            SOStatCard(
                title: "Pending Pickup",
                value: "8",
                icon: "clock.fill",
                color: ShipOSTheme.Colors.warning
            )

            SOStatCard(
                title: "Active Customers",
                value: "156",
                icon: "person.2.fill",
                color: ShipOSTheme.Colors.primary
            )
        }
        .padding()
    }
}

#Preview("Empty State") {
    SOEmptyState(
        icon: "shippingbox",
        title: "No Packages",
        message: "Check in your first package to get started.",
        actionTitle: "Scan Package"
    ) {}
}
