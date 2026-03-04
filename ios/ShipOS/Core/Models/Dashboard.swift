import Foundation

// MARK: - Dashboard Stats

/// Dashboard statistics from /api/dashboard.
struct DashboardStats: Decodable {
    let overview: DashboardOverview
    let recentActivity: [ActivityItem]
    let statusBreakdown: StatusBreakdown?

    struct DashboardOverview: Decodable {
        let totalPackages: Int
        let packagesHeld: Int
        let checkedInToday: Int
        let releasedToday: Int
        let pendingNotification: Int
        let activeCustomers: Int
        let expiringIds: Int
        let storageAlerts: Int
    }

    struct StatusBreakdown: Decodable {
        let checkedIn: Int?
        let notified: Int?
        let held: Int?
        let released: Int?
        let returned: Int?
        let forwarded: Int?
    }
}

struct ActivityItem: Decodable, Identifiable {
    let id: String
    let type: String       // check_in, check_out, notification, customer
    let title: String
    let subtitle: String?
    let timestamp: Date
    let metadata: [String: String]?

    var icon: String {
        switch type {
        case "check_in": "arrow.down.circle.fill"
        case "check_out": "checkmark.circle.fill"
        case "notification": "bell.fill"
        case "customer": "person.fill"
        default: "circle.fill"
        }
    }
}

// MARK: - Supporting Types

struct MailPieceDTO: Decodable, Identifiable {
    let id: String
    let type: String          // letter, large_envelope, magazine, catalog, other
    let senderName: String?
    let customerId: String?
    let customerName: String?
    let status: String        // received, notified, picked_up
    let receivedAt: Date
    let notifiedAt: Date?
    let pickedUpAt: Date?
    let notes: String?
    let createdAt: Date
    let updatedAt: Date
}

struct MailCreateRequest: Encodable {
    let type: String
    let senderName: String?
    let customerId: String
    let notes: String?
}

struct ShipmentRateRequest: Encodable {
    let fromZip: String
    let toZip: String
    let weight: Double
    let length: Double?
    let width: Double?
    let height: Double?
    let packageType: String?
}

struct ShipmentCreateRequest: Encodable {
    let customerId: String
    let carrierId: String
    let serviceType: String
    let rateId: String
    let fromAddress: AddressDTO
    let toAddress: AddressDTO
    let weight: Double
    let packageType: String?
}

struct AddressDTO: Codable {
    let name: String
    let street: String
    let city: String
    let state: String
    let zip: String
    let country: String
}

struct EndOfDayRequest: Encodable {
    let notes: String?
    let carrierPickups: [String]?
}
