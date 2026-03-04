import SwiftUI

// MARK: - Package Row

/// Standard list row for displaying a package.
struct SOPackageRow: View {
    let package: Package

    var body: some View {
        HStack(spacing: ShipOSTheme.Spacing.md) {
            // Carrier icon
            carrierIcon
                .frame(width: 44, height: 44)
                .background(ShipOSTheme.Colors.surfaceSecondary)
                .clipShape(RoundedRectangle(cornerRadius: 10))

            // Details
            VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.xxs) {
                HStack {
                    Text(package.trackingNumber)
                        .font(ShipOSTheme.Typography.mono)
                        .foregroundStyle(ShipOSTheme.Colors.textPrimary)
                        .lineLimit(1)

                    Spacer()

                    SOStatusBadge(status: package.status)
                }

                HStack {
                    if let customer = package.customer {
                        Text("\(customer.firstName) \(customer.lastName)")
                            .font(ShipOSTheme.Typography.subheadline)
                            .foregroundStyle(ShipOSTheme.Colors.textSecondary)

                        if let pmb = customer.pmbNumber {
                            Text("PMB \(pmb)")
                                .font(ShipOSTheme.Typography.caption)
                                .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                        }
                    }

                    Spacer()

                    if let date = package.checkedInAt {
                        Text(date.relativeFormatted)
                            .font(ShipOSTheme.Typography.caption)
                            .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                    }
                }
            }
        }
        .padding(.vertical, ShipOSTheme.Spacing.xs)
    }

    @ViewBuilder
    private var carrierIcon: some View {
        let carrier = package.carrier?.lowercased() ?? ""
        let (icon, color): (String, Color) = {
            switch carrier {
            case "usps": ("envelope.fill", .blue)
            case "ups": ("shippingbox.fill", Color(hex: "#421B01"))
            case "fedex": ("shippingbox.fill", Color(hex: "#4D148C"))
            case "amazon": ("shippingbox.fill", Color(hex: "#FF9900"))
            case "dhl": ("shippingbox.fill", Color(hex: "#D40511"))
            default: ("shippingbox", ShipOSTheme.Colors.textTertiary)
            }
        }()

        Image(systemName: icon)
            .font(.title3)
            .foregroundStyle(color)
    }
}

// MARK: - Customer Row

/// Standard list row for displaying a customer.
struct SOCustomerRow: View {
    let customer: Customer

    var body: some View {
        HStack(spacing: ShipOSTheme.Spacing.md) {
            // Avatar
            ZStack {
                Circle()
                    .fill(ShipOSTheme.Colors.primary.opacity(0.12))

                Text(customer.initials)
                    .font(ShipOSTheme.Typography.headline)
                    .foregroundStyle(ShipOSTheme.Colors.primary)
            }
            .frame(width: 44, height: 44)

            // Details
            VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.xxs) {
                HStack {
                    Text(customer.fullName)
                        .font(ShipOSTheme.Typography.headline)
                        .foregroundStyle(ShipOSTheme.Colors.textPrimary)

                    Spacer()

                    SOStatusBadge(customer.status.capitalized, color: ShipOSTheme.Colors.customerStatus(customer.status))
                }

                HStack(spacing: ShipOSTheme.Spacing.md) {
                    if let pmb = customer.pmbNumber {
                        Label("PMB \(pmb)", systemImage: "tray.full")
                            .font(ShipOSTheme.Typography.caption)
                            .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                    }

                    if let email = customer.email {
                        Label(email, systemImage: "envelope")
                            .font(ShipOSTheme.Typography.caption)
                            .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                            .lineLimit(1)
                    }
                }
            }
        }
        .padding(.vertical, ShipOSTheme.Spacing.xs)
    }
}

// MARK: - Preview

#Preview("Package Row") {
    List {
        SOPackageRow(package: .preview)
        SOPackageRow(package: .previewNotified)
    }
}

#Preview("Customer Row") {
    List {
        SOCustomerRow(customer: .preview)
    }
}
