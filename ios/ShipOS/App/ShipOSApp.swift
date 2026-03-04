import SwiftUI
import SwiftData

/// ShipOS — Main app entry point.
/// Configures SwiftData, Auth, Push Notifications, Sync, and the root view hierarchy.
@main
struct ShipOSApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate
    @StateObject private var authManager = AuthManager.shared
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(authManager)
                .environmentObject(appState)
                .tint(ShipOSTheme.Colors.primary)
                .overlay(alignment: .top) {
                    ConnectivityBanner()
                }
                .onAppear {
                    SyncEngine.shared.startPeriodicSync()
                }
        }
        .modelContainer(PersistenceController.shared.container)
    }
}

// MARK: - App Delegate (Push Notifications)

class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // Push notification manager is initialized on first access
        _ = PushNotificationManager.shared
        return true
    }

    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        Task { @MainActor in
            PushNotificationManager.shared.didRegisterForRemoteNotifications(deviceToken: deviceToken)
        }
    }

    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        Task { @MainActor in
            PushNotificationManager.shared.didFailToRegisterForRemoteNotifications(error: error)
        }
    }
}

// MARK: - App State

/// Global app state observable across the view hierarchy.
@MainActor
final class AppState: ObservableObject {
    @Published var selectedTab: AppTab = .dashboard
    @Published var isShowingScanner = false
    @Published var isShowingCheckIn = false
    @Published var isShowingCheckOut = false
    @Published var isShowingSmartIntake = false
    @Published var isShowingBatchOps = false
    @Published var isShowingEndOfDay = false
    @Published var isShowingDimensionTool = false
    @Published var isShowingShipping = false
    @Published var isShowingOnboarding = false
    @Published var toastMessage: ToastMessage?

    func showToast(_ message: String, type: ToastType = .info) {
        toastMessage = ToastMessage(message: message, type: type)
    }
}

enum AppTab: String, CaseIterable, Identifiable {
    case dashboard
    case packages
    case mail
    case customers
    case notifications
    case settings

    var id: String { rawValue }

    var title: String {
        switch self {
        case .dashboard: "Dashboard"
        case .packages: "Packages"
        case .mail: "Mail"
        case .customers: "Customers"
        case .notifications: "Notifications"
        case .settings: "Settings"
        }
    }

    var icon: String {
        switch self {
        case .dashboard: "square.grid.2x2"
        case .packages: "shippingbox"
        case .mail: "envelope"
        case .customers: "person.2"
        case .notifications: "bell"
        case .settings: "gearshape"
        }
    }

    var selectedIcon: String {
        switch self {
        case .dashboard: "square.grid.2x2.fill"
        case .packages: "shippingbox.fill"
        case .mail: "envelope.fill"
        case .customers: "person.2.fill"
        case .notifications: "bell.fill"
        case .settings: "gearshape.fill"
        }
    }
}

struct ToastMessage: Identifiable, Equatable {
    let id = UUID()
    let message: String
    let type: ToastType
}

enum ToastType {
    case success, error, info, warning
}
