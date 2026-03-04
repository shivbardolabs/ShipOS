import Foundation

// MARK: - Local User

/// Represents the authenticated user, matching the web app's LocalUser type.
struct LocalUser: Codable, Identifiable, Equatable {
    let id: String
    let auth0Id: String
    let name: String
    let email: String
    let role: UserRole
    let status: String
    let avatar: String?
    let tenantId: String?
    let lastLoginAt: Date?
    let loginCount: Int
    let agreedToTermsAt: Date?
    let termsVersionAccepted: Int?
    let privacyVersionAccepted: Int?
    let tenant: Tenant?

    var isAdmin: Bool { role == .admin || role == .superadmin }
    var isSuperAdmin: Bool { role == .superadmin }
}

enum UserRole: String, Codable {
    case superadmin
    case admin
    case manager
    case employee
}

// MARK: - Tenant

struct Tenant: Codable, Identifiable, Equatable {
    let id: String
    let name: String
    let slug: String
    let address: String?
    let city: String?
    let state: String?
    let zipCode: String?
    let country: String
    let phone: String?
    let email: String?
    let timezone: String
    let businessHours: String?
    let taxRate: Double
    let logoUrl: String?
    let status: String
    let subscriptionTier: String
}

struct TenantUpdateRequest: Encodable {
    var name: String?
    var address: String?
    var city: String?
    var state: String?
    var zipCode: String?
    var phone: String?
    var email: String?
    var timezone: String?
    var businessHours: String?
}

// MARK: - API Response

struct UserMeResponse: Decodable {
    let user: LocalUser
}
