import WidgetKit
import SwiftUI

// MARK: - BAR-373: Home Screen & Lock Screen Widgets
// WidgetKit widgets for package stats, recent activity, and quick actions.
// Supports small, medium, large, and Lock Screen (accessory) sizes.

// MARK: - Package Stats Widget

/// Timeline entry for the package stats widget.
struct PackageStatsEntry: TimelineEntry {
    let date: Date
    let checkedIn: Int
    let awaitingPickup: Int
    let heldPackages: Int
    let todayCheckIns: Int
    let isPlaceholder: Bool

    static var placeholder: PackageStatsEntry {
        PackageStatsEntry(
            date: Date(),
            checkedIn: 42,
            awaitingPickup: 15,
            heldPackages: 7,
            todayCheckIns: 23,
            isPlaceholder: true
        )
    }
}

/// Timeline provider that fetches package stats from the API or shared UserDefaults.
struct PackageStatsProvider: TimelineProvider {
    func placeholder(in context: Context) -> PackageStatsEntry {
        .placeholder
    }

    func getSnapshot(in context: Context, completion: @escaping (PackageStatsEntry) -> Void) {
        completion(loadCachedStats())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<PackageStatsEntry>) -> Void) {
        let entry = loadCachedStats()

        // Refresh every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
        completion(timeline)
    }

    private func loadCachedStats() -> PackageStatsEntry {
        let defaults = UserDefaults(suiteName: "group.ai.bardolabs.shipos") ?? .standard
        return PackageStatsEntry(
            date: Date(),
            checkedIn: defaults.integer(forKey: "widget_checked_in"),
            awaitingPickup: defaults.integer(forKey: "widget_awaiting_pickup"),
            heldPackages: defaults.integer(forKey: "widget_held"),
            todayCheckIns: defaults.integer(forKey: "widget_today_checkins"),
            isPlaceholder: false
        )
    }
}

/// The package stats widget view.
struct PackageStatsWidgetView: View {
    @Environment(\.widgetFamily) var family
    let entry: PackageStatsEntry

    var body: some View {
        switch family {
        case .systemSmall:
            smallView
        case .systemMedium:
            mediumView
        case .systemLarge:
            largeView
        case .accessoryCircular:
            circularView
        case .accessoryRectangular:
            rectangularView
        case .accessoryInline:
            inlineView
        default:
            mediumView
        }
    }

    // MARK: - Small Widget

    private var smallView: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "shippingbox.fill")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.indigo)
                Text("ShipOS")
                    .font(.system(.caption, design: .rounded, weight: .semibold))
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Text("\(entry.checkedIn)")
                .font(.system(size: 36, weight: .bold, design: .rounded))
                .foregroundStyle(.primary)

            Text("Packages Held")
                .font(.system(.caption2, design: .rounded))
                .foregroundStyle(.secondary)

            HStack(spacing: 4) {
                Image(systemName: "arrow.down.circle.fill")
                    .font(.system(size: 10))
                    .foregroundStyle(.green)
                Text("+\(entry.todayCheckIns) today")
                    .font(.system(.caption2, design: .rounded, weight: .medium))
                    .foregroundStyle(.green)
            }
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }

    // MARK: - Medium Widget

    private var mediumView: some View {
        HStack(spacing: 16) {
            // Left: Main stat
            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    Image(systemName: "shippingbox.fill")
                        .foregroundStyle(.indigo)
                    Text("ShipOS")
                        .font(.system(.subheadline, design: .rounded, weight: .semibold))
                }

                Spacer()

                Text("\(entry.todayCheckIns)")
                    .font(.system(size: 40, weight: .bold, design: .rounded))

                Text("Check-ins today")
                    .font(.system(.caption, design: .rounded))
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Right: Stats grid
            VStack(spacing: 12) {
                statPill(icon: "tray.full.fill", value: entry.checkedIn, label: "Held", color: .blue)
                statPill(icon: "bell.badge.fill", value: entry.awaitingPickup, label: "Notified", color: .orange)
                statPill(icon: "exclamationmark.triangle.fill", value: entry.heldPackages, label: "Overdue", color: .red)
            }
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }

    // MARK: - Large Widget

    private var largeView: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Image(systemName: "shippingbox.fill")
                    .foregroundStyle(.indigo)
                Text("ShipOS Dashboard")
                    .font(.system(.headline, design: .rounded, weight: .semibold))
                Spacer()
                Text(entry.date, style: .time)
                    .font(.system(.caption, design: .rounded))
                    .foregroundStyle(.secondary)
            }

            Divider()

            // Stats grid
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
                widgetStatCard(title: "Held Packages", value: "\(entry.checkedIn)", icon: "tray.full.fill", color: .blue)
                widgetStatCard(title: "Today Check-ins", value: "\(entry.todayCheckIns)", icon: "arrow.down.circle.fill", color: .green)
                widgetStatCard(title: "Awaiting Pickup", value: "\(entry.awaitingPickup)", icon: "bell.badge.fill", color: .orange)
                widgetStatCard(title: "Overdue", value: "\(entry.heldPackages)", icon: "exclamationmark.triangle.fill", color: .red)
            }

            Spacer()

            // Quick actions hint
            HStack(spacing: 16) {
                quickActionLink(icon: "arrow.down.circle", label: "Check In")
                quickActionLink(icon: "barcode.viewfinder", label: "Scan")
                quickActionLink(icon: "bell.badge", label: "Notify")
                quickActionLink(icon: "checkmark.circle", label: "Check Out")
            }
            .padding(.top, 4)
        }
        .padding()
        .containerBackground(.fill.tertiary, for: .widget)
    }

    // MARK: - Lock Screen Widgets

    private var circularView: some View {
        ZStack {
            AccessoryWidgetBackground()
            VStack(spacing: 2) {
                Image(systemName: "shippingbox.fill")
                    .font(.system(size: 14))
                Text("\(entry.checkedIn)")
                    .font(.system(.title3, design: .rounded, weight: .bold))
            }
        }
    }

    private var rectangularView: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("ShipOS")
                    .font(.system(.caption2, design: .rounded, weight: .semibold))
                    .foregroundStyle(.secondary)
                Text("\(entry.checkedIn) held")
                    .font(.system(.headline, design: .rounded, weight: .bold))
                Text("+\(entry.todayCheckIns) today")
                    .font(.system(.caption2, design: .rounded))
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Image(systemName: "shippingbox.fill")
                .font(.title3)
        }
    }

    private var inlineView: some View {
        HStack {
            Image(systemName: "shippingbox.fill")
            Text("\(entry.checkedIn) packages • +\(entry.todayCheckIns) today")
        }
    }

    // MARK: - Helper Views

    private func statPill(icon: String, value: Int, label: String, color: Color) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 12))
                .foregroundStyle(color)

            VStack(alignment: .leading, spacing: 1) {
                Text("\(value)")
                    .font(.system(.subheadline, design: .rounded, weight: .bold))
                Text(label)
                    .font(.system(.caption2, design: .rounded))
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func widgetStatCard(title: String, value: String, icon: String, color: Color) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Image(systemName: icon)
                    .font(.system(size: 14))
                    .foregroundStyle(color)
                Spacer()
            }

            Text(value)
                .font(.system(.title2, design: .rounded, weight: .bold))

            Text(title)
                .font(.system(.caption2, design: .rounded))
                .foregroundStyle(.secondary)
        }
        .padding(10)
        .background(.quaternary.opacity(0.5))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private func quickActionLink(icon: String, label: String) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(.indigo)
            Text(label)
                .font(.system(.caption2, design: .rounded))
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Widget Configuration

struct PackageStatsWidget: Widget {
    let kind = "PackageStatsWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: PackageStatsProvider()) { entry in
            PackageStatsWidgetView(entry: entry)
        }
        .configurationDisplayName("Package Stats")
        .description("See your current package counts at a glance.")
        .supportedFamilies([
            .systemSmall,
            .systemMedium,
            .systemLarge,
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryInline,
        ])
    }
}

// MARK: - Widget Bundle

@main
struct ShipOSWidgetBundle: WidgetBundle {
    var body: some Widget {
        PackageStatsWidget()
    }
}

// MARK: - Previews

#Preview("Small", as: .systemSmall) {
    PackageStatsWidget()
} timeline: {
    PackageStatsEntry.placeholder
}

#Preview("Medium", as: .systemMedium) {
    PackageStatsWidget()
} timeline: {
    PackageStatsEntry.placeholder
}

#Preview("Large", as: .systemLarge) {
    PackageStatsWidget()
} timeline: {
    PackageStatsEntry.placeholder
}

#Preview("Lock Screen Circular", as: .accessoryCircular) {
    PackageStatsWidget()
} timeline: {
    PackageStatsEntry.placeholder
}

#Preview("Lock Screen Rectangular", as: .accessoryRectangular) {
    PackageStatsWidget()
} timeline: {
    PackageStatsEntry.placeholder
}
