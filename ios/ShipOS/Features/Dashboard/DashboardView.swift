import SwiftUI
import Charts

/// BAR-354: Full Dashboard — real-time stats, status chart, quick actions, recent activity.
struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    @EnvironmentObject private var appState: AppState

    var body: some View {
        ScrollView {
            VStack(spacing: ShipOSTheme.Spacing.lg) {
                // Greeting
                greetingSection

                // Quick Actions
                quickActionsSection

                // Stats Grid
                statsGrid

                // Status Breakdown Chart
                if let breakdown = viewModel.stats?.statusBreakdown {
                    statusChartSection(breakdown)
                }

                // Recent Activity
                activitySection
            }
            .padding()
        }
        .refreshable { await viewModel.load() }
        .task { await viewModel.load() }
        .toast($viewModel.toast)
        .overlay {
            if viewModel.isLoading && viewModel.stats == nil {
                SOLoadingOverlay(message: "Loading dashboard...")
            }
        }
    }

    // MARK: - Greeting

    private var greetingSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.xxs) {
                Text(greeting)
                    .font(ShipOSTheme.Typography.title2)
                    .foregroundStyle(ShipOSTheme.Colors.textPrimary)

                if let tenant = viewModel.tenantName {
                    Text(tenant)
                        .font(ShipOSTheme.Typography.subheadline)
                        .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                }
            }

            Spacer()

            // Refresh indicator
            if viewModel.isLoading {
                ProgressView()
                    .controlSize(.small)
            }
        }
    }

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 0..<12: return "Good morning ☀️"
        case 12..<17: return "Good afternoon 👋"
        default: return "Good evening 🌙"
        }
    }

    // MARK: - Quick Actions

    private var quickActionsSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: ShipOSTheme.Spacing.md) {
                QuickActionButton(
                    title: "Check In",
                    icon: "arrow.down.circle.fill",
                    color: ShipOSTheme.Colors.success
                ) {
                    appState.selectedTab = .packages
                    appState.isShowingCheckIn = true
                }

                QuickActionButton(
                    title: "Scan",
                    icon: "barcode.viewfinder",
                    color: ShipOSTheme.Colors.primary
                ) {
                    appState.isShowingScanner = true
                }

                QuickActionButton(
                    title: "Notify All",
                    icon: "bell.badge.fill",
                    color: ShipOSTheme.Colors.warning
                ) {
                    appState.selectedTab = .notifications
                }

                QuickActionButton(
                    title: "Check Out",
                    icon: "checkmark.circle.fill",
                    color: ShipOSTheme.Colors.info
                ) {
                    appState.selectedTab = .packages
                    appState.isShowingCheckOut = true
                }

                QuickActionButton(
                    title: "End of Day",
                    icon: "moon.fill",
                    color: Color(hex: "#a855f7")
                ) {
                    // Phase 3
                }
            }
        }
    }

    // MARK: - Stats

    private var statsGrid: some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: ShipOSTheme.Spacing.md) {
            SOStatCard(
                title: "Packages Held",
                value: "\(viewModel.stats?.overview.packagesHeld ?? 0)",
                icon: "shippingbox.fill",
                color: ShipOSTheme.Colors.info
            )

            SOStatCard(
                title: "Checked In Today",
                value: "\(viewModel.stats?.overview.checkedInToday ?? 0)",
                icon: "arrow.down.circle.fill",
                color: ShipOSTheme.Colors.success
            )

            SOStatCard(
                title: "Released Today",
                value: "\(viewModel.stats?.overview.releasedToday ?? 0)",
                icon: "checkmark.circle.fill",
                color: ShipOSTheme.Colors.primary
            )

            SOStatCard(
                title: "Active Customers",
                value: "\(viewModel.stats?.overview.activeCustomers ?? 0)",
                icon: "person.2.fill",
                color: ShipOSTheme.Colors.warning
            )

            SOStatCard(
                title: "Pending Notify",
                value: "\(viewModel.stats?.overview.pendingNotification ?? 0)",
                icon: "bell.fill",
                color: Color(hex: "#f97316")
            )

            SOStatCard(
                title: "Expiring IDs",
                value: "\(viewModel.stats?.overview.expiringIds ?? 0)",
                icon: "exclamationmark.triangle.fill",
                color: ShipOSTheme.Colors.error
            )
        }
    }

    // MARK: - Status Chart

    private func statusChartSection(_ breakdown: DashboardStats.StatusBreakdown) -> some View {
        SOCard {
            VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                SOSectionHeader(title: "Package Status")

                Chart {
                    if let v = breakdown.checkedIn, v > 0 {
                        SectorMark(angle: .value("Checked In", v), innerRadius: .ratio(0.6))
                            .foregroundStyle(ShipOSTheme.Colors.info)
                    }
                    if let v = breakdown.notified, v > 0 {
                        SectorMark(angle: .value("Notified", v), innerRadius: .ratio(0.6))
                            .foregroundStyle(ShipOSTheme.Colors.warning)
                    }
                    if let v = breakdown.held, v > 0 {
                        SectorMark(angle: .value("Held", v), innerRadius: .ratio(0.6))
                            .foregroundStyle(Color(hex: "#a855f7"))
                    }
                    if let v = breakdown.released, v > 0 {
                        SectorMark(angle: .value("Released", v), innerRadius: .ratio(0.6))
                            .foregroundStyle(ShipOSTheme.Colors.success)
                    }
                    if let v = breakdown.returned, v > 0 {
                        SectorMark(angle: .value("Returned", v), innerRadius: .ratio(0.6))
                            .foregroundStyle(Color(hex: "#f97316"))
                    }
                }
                .frame(height: 200)

                // Legend
                LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                    StatusLegend(label: "Checked In", count: breakdown.checkedIn ?? 0, color: ShipOSTheme.Colors.info)
                    StatusLegend(label: "Notified", count: breakdown.notified ?? 0, color: ShipOSTheme.Colors.warning)
                    StatusLegend(label: "Held", count: breakdown.held ?? 0, color: Color(hex: "#a855f7"))
                    StatusLegend(label: "Released", count: breakdown.released ?? 0, color: ShipOSTheme.Colors.success)
                    StatusLegend(label: "Returned", count: breakdown.returned ?? 0, color: Color(hex: "#f97316"))
                    StatusLegend(label: "Forwarded", count: breakdown.forwarded ?? 0, color: Color(hex: "#06b6d4"))
                }
            }
        }
    }

    // MARK: - Activity

    private var activitySection: some View {
        VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
            SOSectionHeader(
                title: "Recent Activity",
                count: viewModel.stats?.recentActivity.count
            )

            if let activities = viewModel.stats?.recentActivity, !activities.isEmpty {
                ForEach(activities.prefix(15)) { activity in
                    ActivityRow(activity: activity)
                    if activity.id != activities.prefix(15).last?.id {
                        Divider()
                    }
                }
            } else if viewModel.isLoading {
                ForEach(0..<5, id: \.self) { _ in
                    ShimmerRow()
                }
            } else {
                SOEmptyState(
                    icon: "clock",
                    title: "No Activity Yet",
                    message: "Check in a package to see activity here."
                )
                .frame(height: 200)
            }
        }
    }
}

// MARK: - Supporting Views

struct StatusLegend: View {
    let label: String
    let count: Int
    let color: Color

    var body: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(color)
                .frame(width: 8, height: 8)
            Text("\(label) (\(count))")
                .font(ShipOSTheme.Typography.caption2)
                .foregroundStyle(ShipOSTheme.Colors.textSecondary)
        }
    }
}

struct QuickActionButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: ShipOSTheme.Spacing.sm) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundStyle(color)
                    .frame(width: 52, height: 52)
                    .background(color.opacity(0.12))
                    .clipShape(RoundedRectangle(cornerRadius: 14))

                Text(title)
                    .font(ShipOSTheme.Typography.caption)
                    .foregroundStyle(ShipOSTheme.Colors.textSecondary)
            }
        }
        .buttonStyle(.plain)
        .hapticOnTap(.light)
    }
}

struct ActivityRow: View {
    let activity: ActivityItem

    var body: some View {
        HStack(spacing: ShipOSTheme.Spacing.md) {
            Image(systemName: activity.icon)
                .font(.body)
                .foregroundStyle(activityColor)
                .frame(width: 32, height: 32)
                .background(activityColor.opacity(0.1))
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 2) {
                Text(activity.title)
                    .font(ShipOSTheme.Typography.subheadline)
                    .foregroundStyle(ShipOSTheme.Colors.textPrimary)

                if let subtitle = activity.subtitle {
                    Text(subtitle)
                        .font(ShipOSTheme.Typography.caption)
                        .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                }
            }

            Spacer()

            Text(activity.timestamp.relativeFormatted)
                .font(ShipOSTheme.Typography.caption)
                .foregroundStyle(ShipOSTheme.Colors.textTertiary)
        }
    }

    private var activityColor: Color {
        switch activity.type {
        case "check_in": ShipOSTheme.Colors.success
        case "check_out": ShipOSTheme.Colors.primary
        case "notification": ShipOSTheme.Colors.warning
        default: ShipOSTheme.Colors.info
        }
    }
}

struct ShimmerRow: View {
    @State private var isAnimating = false

    var body: some View {
        HStack(spacing: 12) {
            Circle()
                .fill(ShipOSTheme.Colors.surfaceSecondary)
                .frame(width: 32, height: 32)

            VStack(alignment: .leading, spacing: 4) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(ShipOSTheme.Colors.surfaceSecondary)
                    .frame(width: 160, height: 14)
                RoundedRectangle(cornerRadius: 4)
                    .fill(ShipOSTheme.Colors.surfaceSecondary)
                    .frame(width: 100, height: 12)
            }
            Spacer()
        }
        .opacity(isAnimating ? 0.5 : 1.0)
        .animation(.easeInOut(duration: 1.0).repeatForever(), value: isAnimating)
        .onAppear { isAnimating = true }
    }
}

// MARK: - View Model

@MainActor
final class DashboardViewModel: ObservableObject {
    @Published var stats: DashboardStats?
    @Published var isLoading = false
    @Published var toast: ToastMessage?
    @Published var tenantName: String?

    func load() async {
        isLoading = true
        defer { isLoading = false }

        do {
            async let statsTask: DashboardStats = APIClient.shared.request(API.Dashboard.stats())
            async let userTask: UserMeResponse = APIClient.shared.request(API.Users.me())

            let (loadedStats, userResponse) = try await (statsTask, userTask)
            stats = loadedStats
            tenantName = userResponse.user.tenant?.name
        } catch {
            toast = ToastMessage(message: "Failed to load dashboard", type: .error)
            print("[Dashboard] Error: \(error)")
        }
    }
}

#Preview {
    NavigationStack {
        DashboardView()
            .navigationTitle("Dashboard")
    }
    .environmentObject(AppState())
    .environmentObject(AuthManager.shared)
}
