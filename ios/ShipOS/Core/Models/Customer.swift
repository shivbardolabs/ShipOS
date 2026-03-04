import Foundation
import SwiftData

// MARK: - Customer (SwiftData)

@Model
final class Customer: Identifiable {
    @Attribute(.unique) var id: String
    var firstName: String
    var lastName: String
    var email: String?
    var phone: String?
    var pmbNumber: String?
    var status: String      // active, inactive, suspended
    var address: String?
    var city: String?
    var state: String?
    var zipCode: String?
    var country: String
    var notes: String?
    var smsOptIn: Bool
    var emailOptIn: Bool
    var complianceStatus: String?  // compliant, pending, non_compliant
    var createdAt: Date
    var updatedAt: Date

    init(
        id: String = UUID().uuidString,
        firstName: String,
        lastName: String,
        email: String? = nil,
        phone: String? = nil,
        pmbNumber: String? = nil,
        status: String = "active",
        address: String? = nil,
        city: String? = nil,
        state: String? = nil,
        zipCode: String? = nil,
        country: String = "US",
        notes: String? = nil,
        smsOptIn: Bool = false,
        emailOptIn: Bool = false,
        complianceStatus: String? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.firstName = firstName
        self.lastName = lastName
        self.email = email
        self.phone = phone
        self.pmbNumber = pmbNumber
        self.status = status
        self.address = address
        self.city = city
        self.state = state
        self.zipCode = zipCode
        self.country = country
        self.notes = notes
        self.smsOptIn = smsOptIn
        self.emailOptIn = emailOptIn
        self.complianceStatus = complianceStatus
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    // Computed
    var fullName: String { "\(firstName) \(lastName)" }

    var initials: String {
        let first = firstName.prefix(1).uppercased()
        let last = lastName.prefix(1).uppercased()
        return "\(first)\(last)"
    }

    var formattedAddress: String? {
        let parts = [address, city, state, zipCode].compactMap { $0 }
        return parts.isEmpty ? nil : parts.joined(separator: ", ")
    }
}

// MARK: - API Response

struct CustomerListResponse: Decodable {
    let customers: [CustomerDTO]
    let total: Int
    let page: Int
    let limit: Int
}

struct CustomerDetailResponse: Decodable {
    let customer: CustomerDTO
}

struct CustomerDTO: Decodable, Identifiable {
    let id: String
    let firstName: String
    let lastName: String
    let email: String?
    let phone: String?
    let pmbNumber: String?
    let status: String
    let address: String?
    let city: String?
    let state: String?
    let zipCode: String?
    let country: String?
    let notes: String?
    let smsOptIn: Bool?
    let emailOptIn: Bool?
    let complianceStatus: String?
    let createdAt: Date
    let updatedAt: Date

    // Optional expanded relations
    let packages: [PackageDTO]?

    var fullName: String { "\(firstName) \(lastName)" }
    var initials: String {
        "\(firstName.prefix(1).uppercased())\(lastName.prefix(1).uppercased())"
    }

    func toModel() -> Customer {
        Customer(
            id: id,
            firstName: firstName,
            lastName: lastName,
            email: email,
            phone: phone,
            pmbNumber: pmbNumber,
            status: status,
            address: address,
            city: city,
            state: state,
            zipCode: zipCode,
            country: country ?? "US",
            notes: notes,
            smsOptIn: smsOptIn ?? false,
            emailOptIn: emailOptIn ?? false,
            complianceStatus: complianceStatus,
            createdAt: createdAt,
            updatedAt: updatedAt
        )
    }
}

// MARK: - Request Models

struct CustomerCreateRequest: Encodable {
    let firstName: String
    let lastName: String
    let email: String?
    let phone: String?
    let pmbNumber: String?
    let address: String?
    let city: String?
    let state: String?
    let zipCode: String?
}

struct CustomerUpdateRequest: Encodable {
    var firstName: String?
    var lastName: String?
    var email: String?
    var phone: String?
    var status: String?
    var address: String?
    var city: String?
    var state: String?
    var zipCode: String?
    var notes: String?
}

// MARK: - Preview Data

extension Customer {
    static var preview: Customer {
        Customer(
            id: "cust-001",
            firstName: "John",
            lastName: "Smith",
            email: "john@example.com",
            phone: "+1 (555) 123-4567",
            pmbNumber: "101",
            status: "active",
            address: "123 Main St",
            city: "New York",
            state: "NY",
            zipCode: "10001"
        )
    }
}
