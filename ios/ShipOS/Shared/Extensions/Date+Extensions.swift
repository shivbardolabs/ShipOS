import Foundation

extension Date {
    /// Relative time string: "2m ago", "3h ago", "Yesterday", etc.
    var relativeFormatted: String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: self, relativeTo: Date())
    }

    /// Short date: "Mar 4, 2026"
    var shortFormatted: String {
        formatted(date: .abbreviated, time: .omitted)
    }

    /// Short date + time: "Mar 4, 3:42 PM"
    var shortDateTimeFormatted: String {
        formatted(date: .abbreviated, time: .shortened)
    }

    /// Time only: "3:42 PM"
    var timeFormatted: String {
        formatted(date: .omitted, time: .shortened)
    }

    /// ISO 8601 string.
    var iso8601: String {
        ISO8601DateFormatter.standard.string(from: self)
    }
}
