import Foundation
import SwiftData

// MARK: - Package Status

enum PackageStatus: String, Codable, CaseIterable, Identifiable {
    case checkedIn = "checked_in"
    case notified
    case held
    case released
    case returned
    case forwarded

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .checkedIn: "Checked In"
        case .notified: "Notified"
        case .held: "Held"
        case .released: "Released"
        case .returned: "Returned"
        case .forwarded: "Forwarded"
        }
    }

    var icon: String {
        switch self {
        case .checkedIn: "arrow.down.circle.fill"
        case .notified: "bell.fill"
        case .held: "tray.full.fill"
        case .released: "checkmark.circle.fill"
        case .returned: "arrow.uturn.left.circle.fill"
        case .forwarded: "arrow.right.circle.fill"
        }
    }

}

// MARK: - Package (SwiftData)

@Model
final class Package: Identifiable {
    @Attribute(.unique) var id: String
    var trackingNumber: String
    var carrier: String?
    var status: PackageStatus
    var senderName: String?
    var packageType: String?
    var weight: Double?
    var length: Double?
    var width: Double?
    var height: Double?
    var storageLocation: String?
    var notes: String?
    var conditionTags: [String]?
    var photoURL: String?
    var signatureURL: String?
    var checkedInAt: Date?
    var notifiedAt: Date?
    var releasedAt: Date?
    var holdDeadline: Date?
    var createdAt: Date
    var updatedAt: Date

    // Relationships
    var customerId: String?
    @Transient var customer: CustomerSummary?

    init(
        id: String = UUID().uuidString,
        trackingNumber: String,
        carrier: String? = nil,
        status: PackageStatus = .checkedIn,
        senderName: String? = nil,
        packageType: String? = nil,
        weight: Double? = nil,
        length: Double? = nil,
        width: Double? = nil,
        height: Double? = nil,
        storageLocation: String? = nil,
        notes: String? = nil,
        conditionTags: [String]? = nil,
        photoURL: String? = nil,
        signatureURL: String? = nil,
        checkedInAt: Date? = Date(),
        notifiedAt: Date? = nil,
        releasedAt: Date? = nil,
        holdDeadline: Date? = nil,
        customerId: String? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.trackingNumber = trackingNumber
        self.carrier = carrier
        self.status = status
        self.senderName = senderName
        self.packageType = packageType
        self.weight = weight
        self.length = length
        self.width = width
        self.height = height
        self.storageLocation = storageLocation
        self.notes = notes
        self.conditionTags = conditionTags
        self.photoURL = photoURL
        self.signatureURL = signatureURL
        self.checkedInAt = checkedInAt
        self.notifiedAt = notifiedAt
        self.releasedAt = releasedAt
        self.holdDeadline = holdDeadline
        self.customerId = customerId
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

// MARK: - Customer Summary (Embedded in Package response)

struct CustomerSummary: Codable, Hashable {
    let id: String
    let firstName: String
    let lastName: String
    let pmbNumber: String?

    var fullName: String { "\(firstName) \(lastName)" }
}

// MARK: - API Request/Response Models

struct PackageListResponse: Decodable {
    let packages: [PackageDTO]
    let total: Int
    let page: Int
    let limit: Int
}

struct PackageDTO: Decodable, Identifiable {
    let id: String
    let trackingNumber: String
    let carrier: String?
    let status: PackageStatus
    let senderName: String?
    let packageType: String?
    let weight: Double?
    let length: Double?
    let width: Double?
    let height: Double?
    let storageLocation: String?
    let notes: String?
    let conditionTags: [String]?
    let photoUrl: String?
    let signatureUrl: String?
    let checkedInAt: Date?
    let notifiedAt: Date?
    let releasedAt: Date?
    let holdDeadline: Date?
    let customerId: String?
    let customer: CustomerSummary?
    let createdAt: Date
    let updatedAt: Date

    /// Convert DTO to SwiftData model.
    func toModel() -> Package {
        let pkg = Package(
            id: id,
            trackingNumber: trackingNumber,
            carrier: carrier,
            status: status,
            senderName: senderName,
            packageType: packageType,
            weight: weight,
            length: length,
            width: width,
            height: height,
            storageLocation: storageLocation,
            notes: notes,
            conditionTags: conditionTags,
            photoURL: photoUrl,
            signatureURL: signatureUrl,
            checkedInAt: checkedInAt,
            notifiedAt: notifiedAt,
            releasedAt: releasedAt,
            holdDeadline: holdDeadline,
            customerId: customerId,
            createdAt: createdAt,
            updatedAt: updatedAt
        )
        pkg.customer = customer
        return pkg
    }
}

struct PackageCheckInRequest: Encodable {
    let trackingNumber: String
    let carrier: String?
    let customerId: String?
    let senderName: String?
    let packageType: String?
    let weight: Double?
    let storageLocation: String?
    let notes: String?
    let conditionTags: [String]?
}

struct PackageUpdateRequest: Encodable {
    var status: String?
    var storageLocation: String?
    var notes: String?
    var conditionTags: [String]?
}

struct PackageCheckOutRequest: Encodable {
    let status: String = "released"
    var signatureUrl: String? = nil
    var signatureData: String? = nil
    var idType: String? = nil
    var idVerified: Bool? = nil
    let notes: String?
}

// MARK: - Preview Data

extension Package {
    static var preview: Package {
        Package(
            id: "pkg-001",
            trackingNumber: "1Z999AA10123456784",
            carrier: "UPS",
            status: .checkedIn,
            senderName: "Amazon.com",
            checkedInAt: Date().addingTimeInterval(-3600),
            customerId: "cust-001"
        )
    }

    static var previewNotified: Package {
        Package(
            id: "pkg-002",
            trackingNumber: "9400111899223046854834",
            carrier: "USPS",
            status: .notified,
            senderName: "eBay",
            checkedInAt: Date().addingTimeInterval(-86400),
            notifiedAt: Date().addingTimeInterval(-7200),
            customerId: "cust-002"
        )
    }
}

// MARK: - Batch Request Types

struct BatchCheckOutRequest: Encodable {
    let packageIds: [String]
}

struct BatchNotifyRequest: Encodable {
    let packageIds: [String]
}

struct BatchStatusRequest: Encodable {
    let packageIds: [String]
    let status: String
}

struct BatchMoveRequest: Encodable {
    let packageIds: [String]
    let storageLocation: String
}
