import Foundation
import WidgetKit

// MARK: - Widget Data Provider
// Bridges the main app with WidgetKit by writing shared UserDefaults
// and triggering widget timeline reloads.

@MainActor
final class WidgetDataProvider {
    static let shared = WidgetDataProvider()

    private let defaults: UserDefaults

    private init() {
        defaults = UserDefaults(suiteName: "group.ai.bardolabs.shipos") ?? .standard
    }

    // MARK: - Update Stats

    /// Update package stats for the widget. Call after any data sync.
    func updatePackageStats(
        checkedIn: Int,
        awaitingPickup: Int,
        held: Int,
        todayCheckIns: Int
    ) {
        defaults.set(checkedIn, forKey: "widget_checked_in")
        defaults.set(awaitingPickup, forKey: "widget_awaiting_pickup")
        defaults.set(held, forKey: "widget_held")
        defaults.set(todayCheckIns, forKey: "widget_today_checkins")
        defaults.set(Date(), forKey: "widget_last_updated")

        // Tell WidgetKit to refresh
        WidgetCenter.shared.reloadAllTimelines()
    }

    /// Update mail badge count.
    func updateMailBadge(_ count: Int) {
        defaults.set(count, forKey: "widget_mail_unread")
    }

    /// Update notification badge count.
    func updateNotificationBadge(_ count: Int) {
        defaults.set(count, forKey: "widget_notifications_unread")
    }

    /// Read the last widget update date.
    var lastUpdated: Date? {
        defaults.object(forKey: "widget_last_updated") as? Date
    }

    /// Force refresh all widget timelines.
    func refreshWidgets() {
        WidgetCenter.shared.reloadAllTimelines()
    }
}
