import Foundation
@preconcurrency import UserNotifications
import UIKit
import Combine

// MARK: - BAR-372: Push Notifications
// APNs registration, token management, rich notification handling,
// deep linking, notification categories, and badge management.

/// Notification categories for actionable notifications.
enum ShipOSNotificationCategory: String, CaseIterable {
    case packageArrived = "PACKAGE_ARRIVED"
    case packageReady = "PACKAGE_READY"
    case complianceAlert = "COMPLIANCE_ALERT"
    case customerAction = "CUSTOMER_ACTION"
    case systemAlert = "SYSTEM_ALERT"

    var actions: [UNNotificationAction] {
        switch self {
        case .packageArrived:
            return [
                UNNotificationAction(identifier: "NOTIFY_CUSTOMER", title: "Notify Customer", options: .foreground),
                UNNotificationAction(identifier: "VIEW_PACKAGE", title: "View Package", options: .foreground),
                UNNotificationAction(identifier: "DISMISS", title: "Dismiss", options: .destructive),
            ]
        case .packageReady:
            return [
                UNNotificationAction(identifier: "CHECK_OUT", title: "Check Out", options: .foreground),
                UNNotificationAction(identifier: "EXTEND_HOLD", title: "Extend Hold", options: []),
            ]
        case .complianceAlert:
            return [
                UNNotificationAction(identifier: "VIEW_COMPLIANCE", title: "View Details", options: .foreground),
                UNNotificationAction(identifier: "SEND_REMINDER", title: "Send Reminder", options: []),
            ]
        case .customerAction:
            return [
                UNNotificationAction(identifier: "VIEW_CUSTOMER", title: "View Customer", options: .foreground),
            ]
        case .systemAlert:
            return [
                UNNotificationAction(identifier: "VIEW_DETAILS", title: "View", options: .foreground),
            ]
        }
    }
}

/// Deep link destinations from notification taps.
enum NotificationDeepLink {
    case package(id: String)
    case customer(id: String)
    case compliance
    case dashboard
    case checkIn
    case checkOut

    init?(userInfo: [AnyHashable: Any]) {
        guard let type = userInfo["type"] as? String else { return nil }

        switch type {
        case "package_arrived", "package_ready", "package_held":
            guard let id = userInfo["packageId"] as? String else { return nil }
            self = .package(id: id)
        case "customer_action", "customer_created":
            guard let id = userInfo["customerId"] as? String else { return nil }
            self = .customer(id: id)
        case "compliance_alert", "compliance_expiring":
            self = .compliance
        case "check_in_reminder":
            self = .checkIn
        case "check_out_reminder":
            self = .checkOut
        default:
            self = .dashboard
        }
    }
}

// MARK: - Push Notification Manager

@MainActor
final class PushNotificationManager: NSObject, ObservableObject {
    static let shared = PushNotificationManager()

    @Published private(set) var isAuthorized = false
    @Published private(set) var deviceToken: String?
    @Published private(set) var pendingDeepLink: NotificationDeepLink?
    @Published var badgeCount: Int = 0 {
        didSet { UNUserNotificationCenter.current().setBadgeCount(badgeCount) }
    }

    private var cancellables = Set<AnyCancellable>()

    override private init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
        registerCategories()
        checkAuthorizationStatus()
    }

    // MARK: - Authorization

    /// Request push notification permission.
    func requestAuthorization() async -> Bool {
        do {
            let granted = try await UNUserNotificationCenter.current().requestAuthorization(
                options: [.alert, .badge, .sound, .providesAppNotificationSettings]
            )
            isAuthorized = granted

            if granted {
                await registerForRemoteNotifications()
            }

            return granted
        } catch {
            print("[Push] Authorization error: \(error)")
            return false
        }
    }

    /// Check current authorization status.
    func checkAuthorizationStatus() {
        UNUserNotificationCenter.current().getNotificationSettings { [weak self] settings in
            Task { @MainActor [weak self] in
                self?.isAuthorized = settings.authorizationStatus == .authorized
            }
        }
    }

    /// Register for remote notifications on the main thread.
    private func registerForRemoteNotifications() async {
        UIApplication.shared.registerForRemoteNotifications()
    }

    // MARK: - Token Management

    /// Called from AppDelegate when APNs token is received.
    func didRegisterForRemoteNotifications(deviceToken token: Data) {
        let tokenString = token.map { String(format: "%02.2hhx", $0) }.joined()
        self.deviceToken = tokenString
        print("[Push] Device token: \(tokenString)")

        // Send to server
        Task { await sendTokenToServer(tokenString) }
    }

    /// Called when registration fails.
    func didFailToRegisterForRemoteNotifications(error: Error) {
        print("[Push] Registration failed: \(error)")
    }

    private func sendTokenToServer(_ token: String) async {
        do {
            let body = DeviceTokenRequest(token: token, platform: "ios")
            try await APIClient.shared.request(
                Endpoint(path: "/api/devices/register", method: .post, body: body)
            )
            print("[Push] Token registered with server")
        } catch {
            print("[Push] Failed to register token: \(error)")
        }
    }

    // MARK: - Categories

    private func registerCategories() {
        let categories = Set(ShipOSNotificationCategory.allCases.map { category in
            UNNotificationCategory(
                identifier: category.rawValue,
                actions: category.actions,
                intentIdentifiers: [],
                options: [.customDismissAction]
            )
        })

        UNUserNotificationCenter.current().setNotificationCategories(categories)
    }

    // MARK: - Deep Link Handling

    /// Process a deep link — call from the active view to navigate.
    func consumeDeepLink() -> NotificationDeepLink? {
        defer { pendingDeepLink = nil }
        return pendingDeepLink
    }

    /// Navigate to a deep link destination.
    func handleDeepLink(_ link: NotificationDeepLink, appState: AppState) {
        switch link {
        case .package:
            appState.selectedTab = .packages
        case .customer:
            appState.selectedTab = .customers
        case .compliance:
            appState.selectedTab = .settings
        case .dashboard:
            appState.selectedTab = .dashboard
        case .checkIn:
            appState.selectedTab = .packages
            appState.isShowingCheckIn = true
        case .checkOut:
            appState.selectedTab = .packages
            appState.isShowingCheckOut = true
        }
    }

    // MARK: - Local Notifications

    /// Schedule a local notification (e.g., end-of-day reminder).
    func scheduleLocalNotification(
        title: String,
        body: String,
        category: ShipOSNotificationCategory = .systemAlert,
        delay: TimeInterval = 0,
        userInfo: [String: Any] = [:]
    ) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default
        content.categoryIdentifier = category.rawValue
        content.userInfo = userInfo

        let trigger: UNNotificationTrigger?
        if delay > 0 {
            trigger = UNTimeIntervalNotificationTrigger(timeInterval: delay, repeats: false)
        } else {
            trigger = nil
        }

        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request) { error in
            if let error {
                print("[Push] Schedule error: \(error)")
            }
        }
    }

    /// Schedule daily end-of-day reminder.
    func scheduleEndOfDayReminder(hour: Int = 17, minute: Int = 0) {
        let content = UNMutableNotificationContent()
        content.title = "End of Day"
        content.body = "Time to run your end-of-day closeout report."
        content.sound = .default
        content.categoryIdentifier = ShipOSNotificationCategory.systemAlert.rawValue

        var dateComponents = DateComponents()
        dateComponents.hour = hour
        dateComponents.minute = minute

        let trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: true)

        let request = UNNotificationRequest(
            identifier: "eod_reminder",
            content: content,
            trigger: trigger
        )

        UNUserNotificationCenter.current().add(request)
    }

    /// Remove all pending notifications.
    func clearAllPending() {
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
    }

    /// Clear badge and delivered notifications.
    func clearBadge() {
        badgeCount = 0
        UNUserNotificationCenter.current().removeAllDeliveredNotifications()
    }
}

// MARK: - UNUserNotificationCenterDelegate

extension PushNotificationManager: UNUserNotificationCenterDelegate {
    /// Called when notification arrives while app is in foreground.
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification
    ) async -> UNNotificationPresentationOptions {
        // Show banner even when app is active
        return [.banner, .badge, .sound, .list]
    }

    /// Called when user taps on a notification.
    nonisolated func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse
    ) async {
        // Extract values before crossing isolation boundary (non-Sendable types)
        let actionIdentifier = response.actionIdentifier
        let userInfo = response.notification.request.content.userInfo
        let packageId = userInfo["packageId"] as? String
        let customerId = userInfo["customerId"] as? String
        let deepLink = NotificationDeepLink(userInfo: userInfo)

        await MainActor.run {
            // Handle action buttons
            switch actionIdentifier {
            case "NOTIFY_CUSTOMER":
                if let packageId {
                    pendingDeepLink = .package(id: packageId)
                }

            case "CHECK_OUT":
                pendingDeepLink = .checkOut

            case "VIEW_COMPLIANCE":
                pendingDeepLink = .compliance

            case "VIEW_CUSTOMER":
                if let customerId {
                    pendingDeepLink = .customer(id: customerId)
                }

            case "VIEW_PACKAGE", "VIEW_DETAILS":
                if let deepLink {
                    pendingDeepLink = deepLink
                }

            case UNNotificationDefaultActionIdentifier:
                // User tapped the notification itself
                if let deepLink {
                    pendingDeepLink = deepLink
                }

            default:
                break
            }
        }
    }
}

// MARK: - Request Models

struct DeviceTokenRequest: Encodable {
    let token: String
    let platform: String
}

// MARK: - Notification Settings View

import SwiftUI

struct PushNotificationSettingsView: View {
    @ObservedObject var pushManager = PushNotificationManager.shared
    @State private var eodReminderEnabled = false
    @State private var eodTime = DateComponents(hour: 17, minute: 0)

    var body: some View {
        List {
            Section {
                HStack {
                    Image(systemName: pushManager.isAuthorized ? "bell.badge.fill" : "bell.slash")
                        .font(.title2)
                        .foregroundStyle(pushManager.isAuthorized ? ShipOSTheme.Colors.success : ShipOSTheme.Colors.error)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(pushManager.isAuthorized ? "Notifications Enabled" : "Notifications Disabled")
                            .font(ShipOSTheme.Typography.headline)

                        Text(pushManager.isAuthorized
                             ? "You'll receive real-time alerts for packages, compliance, and more."
                             : "Enable notifications to stay updated on package arrivals and alerts.")
                        .font(ShipOSTheme.Typography.caption)
                        .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                    }
                }

                if !pushManager.isAuthorized {
                    Button("Enable Notifications") {
                        Task { await pushManager.requestAuthorization() }
                    }
                    .buttonStyle(.soPrimary)
                }
            }

            if pushManager.isAuthorized {
                Section("Notification Categories") {
                    notificationToggle("Package Arrivals", icon: "shippingbox.fill", color: ShipOSTheme.Colors.info, key: "notif_packages")
                    notificationToggle("Customer Alerts", icon: "person.fill", color: ShipOSTheme.Colors.primary, key: "notif_customers")
                    notificationToggle("Compliance Warnings", icon: "exclamationmark.shield.fill", color: ShipOSTheme.Colors.warning, key: "notif_compliance")
                    notificationToggle("System Updates", icon: "gear", color: ShipOSTheme.Colors.textSecondary, key: "notif_system")
                }

                Section("Scheduled Reminders") {
                    Toggle(isOn: $eodReminderEnabled) {
                        Label("End of Day Reminder", systemImage: "moon.fill")
                    }
                    .onChange(of: eodReminderEnabled) { _, enabled in
                        if enabled {
                            pushManager.scheduleEndOfDayReminder()
                        } else {
                            UNUserNotificationCenter.current()
                                .removePendingNotificationRequests(withIdentifiers: ["eod_reminder"])
                        }
                    }
                }

                Section {
                    Button("Clear All Notifications", role: .destructive) {
                        pushManager.clearBadge()
                    }
                }
            }
        }
        .navigationTitle("Push Notifications")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func notificationToggle(_ title: String, icon: String, color: Color, key: String) -> some View {
        Toggle(isOn: Binding(
            get: { UserDefaults.standard.bool(forKey: key) },
            set: { UserDefaults.standard.set($0, forKey: key) }
        )) {
            Label(title, systemImage: icon)
                .foregroundStyle(color)
        }
    }
}
