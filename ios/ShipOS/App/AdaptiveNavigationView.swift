import SwiftUI

/// Adaptive navigation: TabView on iPhone, Sidebar on iPad.
/// Automatically switches based on horizontal size class.
struct AdaptiveNavigationView: View {
    @Environment(\.horizontalSizeClass) private var sizeClass
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var authManager: AuthManager

    var body: some View {
        Group {
            if sizeClass == .regular {
                iPadSidebarView
            } else {
                iPhoneTabView
            }
        }
        .fullScreenCover(isPresented: $appState.isShowingScanner) {
            EnhancedScannerView()
        }
        .sheet(isPresented: $appState.isShowingSmartIntake) {
            SmartIntakeView()
        }
        .sheet(isPresented: $appState.isShowingBatchOps) {
            BatchOperationsView()
        }
        .sheet(isPresented: $appState.isShowingEndOfDay) {
            EndOfDayView()
        }
        .sheet(isPresented: $appState.isShowingDimensionTool) {
            DimensionMeasurementView()
        }
        .sheet(isPresented: $appState.isShowingShipping) {
            ShippingView()
        }
        .sheet(isPresented: $appState.isShowingOnboarding) {
            CustomerOnboardingView()
        }
    }

    // MARK: - iPhone TabView

    private var iPhoneTabView: some View {
        TabView(selection: $appState.selectedTab) {
            ForEach(AppTab.allCases) { tab in
                NavigationStack {
                    tabContent(for: tab)
                        .navigationTitle(tab.title)
                }
                .tabItem {
                    Label(tab.title, systemImage: appState.selectedTab == tab ? tab.selectedIcon : tab.icon)
                }
                .tag(tab)
            }
        }
        .overlay(alignment: .bottom) {
            if appState.isShowingScanner {
                Color.black.opacity(0.001) // Dismiss area
            }
        }
    }

    // MARK: - iPad Sidebar

    private var iPadSidebarView: some View {
        NavigationSplitView {
            sidebarContent
        } detail: {
            NavigationStack {
                tabContent(for: appState.selectedTab)
                    .navigationTitle(appState.selectedTab.title)
            }
        }
    }

    private var sidebarContent: some View {
        List(selection: $appState.selectedTab) {
            Section("Main") {
                ForEach([AppTab.dashboard, .packages, .mail, .customers]) { tab in
                    sidebarRow(for: tab)
                }
            }

            Section("Communication") {
                sidebarRow(for: .notifications)
            }

            Section("System") {
                sidebarRow(for: .settings)
            }
        }
        .navigationTitle("ShipOS")
        .listStyle(.sidebar)
        .toolbar {
            ToolbarItem(placement: .bottomBar) {
                HStack {
                    if let user = authManager.currentUser {
                        Label(user.name, systemImage: "person.circle.fill")
                            .font(ShipOSTheme.Typography.caption)
                            .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                    }
                    Spacer()
                }
            }
        }
    }

    private func sidebarRow(for tab: AppTab) -> some View {
        Label(tab.title, systemImage: appState.selectedTab == tab ? tab.selectedIcon : tab.icon)
            .tag(tab)
    }

    // MARK: - Tab Content

    @ViewBuilder
    private func tabContent(for tab: AppTab) -> some View {
        switch tab {
        case .dashboard:
            DashboardView()
        case .packages:
            PackageListView()
        case .mail:
            MailListView()
        case .customers:
            CustomerListView()
        case .notifications:
            NotificationListView()
        case .settings:
            SettingsView()
        }
    }
}

#Preview("iPhone") {
    AdaptiveNavigationView()
        .environmentObject(AppState())
        .environmentObject(AuthManager.shared)
}

#Preview("iPad") {
    AdaptiveNavigationView()
        .environmentObject(AppState())
        .environmentObject(AuthManager.shared)
        .previewDevice("iPad Pro (12.9-inch)")
}
