import SwiftUI
import SwiftData

/// ShipOS — Main app entry point.
/// Configures SwiftData, Auth, and the root view hierarchy.
@main
struct ShipOSApp: App {
    @StateObject private var authManager = AuthManager.shared
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(authManager)
                .environmentObject(appState)
                .tint(ShipOSTheme.Colors.primary)
        }
        .modelContainer(PersistenceController.shared.container)
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
    @Published var toastMessage: ToastMessage?

    func showToast(_ message: String, type: ToastType = .info) {
        toastMessage = ToastMessage(message: message, type: type)
    }
}

enum AppTab: String, CaseIterable, Identifiable {
    case dashboard
    case packages
    case customers
    case notifications
    case settings

    var id: String { rawValue }

    var title: String {
        switch self {
        case .dashboard: "Dashboard"
        case .packages: "Packages"
        case .customers: "Customers"
        case .notifications: "Notifications"
        case .settings: "Settings"
        }
    }

    var icon: String {
        switch self {
        case .dashboard: "square.grid.2x2"
        case .packages: "shippingbox"
        case .customers: "person.2"
        case .notifications: "bell"
        case .settings: "gearshape"
        }
    }

    var selectedIcon: String {
        switch self {
        case .dashboard: "square.grid.2x2.fill"
        case .packages: "shippingbox.fill"
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
