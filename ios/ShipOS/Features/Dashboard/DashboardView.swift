import SwiftUI

/// Dashboard — real-time stats, quick actions, recent activity.
struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()
    @EnvironmentObject private var appState: AppState

    var body: some View {
        ScrollView {
            VStack(spacing: ShipOSTheme.Spacing.lg) {
                // Quick Actions
                quickActionsSection

                // Stats Grid
                statsGrid

                // Recent Activity
                activitySection
            }
            .padding()
        }
        .refreshable { await viewModel.load() }
        .task { await viewModel.load() }
        .toast($viewModel.toast)
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
                }

                QuickActionButton(
                    title: "Scan",
                    icon: "barcode.viewfinder",
                    color: ShipOSTheme.Colors.primary
                ) {
                    appState.isShowingScanner = true
                }

                QuickActionButton(
                    title: "Notify",
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
        }
    }

    // MARK: - Activity

    private var activitySection: some View {
        VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
            SOSectionHeader(title: "Recent Activity")

            if let activities = viewModel.stats?.recentActivity, !activities.isEmpty {
                ForEach(activities.prefix(10)) { activity in
                    ActivityRow(activity: activity)
                }
            } else if viewModel.isLoading {
                ForEach(0..<3, id: \.self) { _ in
                    ShimmerRow()
                }
            } else {
                Text("No recent activity")
                    .font(ShipOSTheme.Typography.body)
                    .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                    .frame(maxWidth: .infinity)
                    .padding()
            }
        }
    }
}

// MARK: - Quick Action Button

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
    }
}

// MARK: - Activity Row

struct ActivityRow: View {
    let activity: ActivityItem

    var body: some View {
        HStack(spacing: ShipOSTheme.Spacing.md) {
            Image(systemName: activity.icon)
                .font(.body)
                .foregroundStyle(ShipOSTheme.Colors.primary)
                .frame(width: 32, height: 32)
                .background(ShipOSTheme.Colors.primary.opacity(0.1))
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
}

// MARK: - Shimmer Row (Loading)

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

    func load() async {
        isLoading = true
        defer { isLoading = false }

        do {
            stats = try await APIClient.shared.request(API.Dashboard.stats())
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
