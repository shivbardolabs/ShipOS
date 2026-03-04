import XCTest
@testable import ShipOS

// MARK: - BAR-378: Testing Suite (Part 2 — Model & Business Logic Tests)

final class ModelTests: XCTestCase {

    // MARK: - Package Model

    func testPackageStatusRawValues() {
        XCTAssertEqual(PackageStatus.checkedIn.rawValue, "checked_in")
        XCTAssertEqual(PackageStatus.notified.rawValue, "notified")
        XCTAssertEqual(PackageStatus.pickedUp.rawValue, "picked_up")
        XCTAssertEqual(PackageStatus.returned.rawValue, "returned")
        XCTAssertEqual(PackageStatus.held.rawValue, "held")
        XCTAssertEqual(PackageStatus.forwarded.rawValue, "forwarded")
    }

    func testPackageDTOToModel() throws {
        let dto = PackageDTO(
            id: "pkg-123",
            trackingNumber: "1Z999AA10123456784",
            carrier: "UPS",
            status: .checkedIn,
            senderName: "Amazon",
            packageType: "box",
            weight: 2.5,
            length: 12.0,
            width: 8.0,
            height: 6.0,
            storageLocation: "A-1",
            notes: "Handle with care",
            conditionTags: ["fragile"],
            photoUrl: nil,
            signatureUrl: nil,
            checkedInAt: Date(),
            notifiedAt: nil,
            releasedAt: nil,
            holdDeadline: nil,
            customerId: "cust-001",
            customer: CustomerSummaryDTO(id: "cust-001", firstName: "John", lastName: "Doe", pmbNumber: "101"),
            createdAt: Date(),
            updatedAt: Date()
        )

        let model = dto.toModel()

        XCTAssertEqual(model.id, "pkg-123")
        XCTAssertEqual(model.trackingNumber, "1Z999AA10123456784")
        XCTAssertEqual(model.carrier, "UPS")
        XCTAssertEqual(model.status, "checked_in")
        XCTAssertEqual(model.senderName, "Amazon")
        XCTAssertEqual(model.weight, 2.5)
    }

    // MARK: - Customer Model

    func testCustomerDTOFullName() {
        let dto = CustomerDTO(
            id: "cust-001",
            firstName: "Jane",
            lastName: "Smith",
            email: "jane@example.com",
            phone: "+15551234567",
            pmbNumber: "205",
            status: "active",
            address: nil, city: nil, state: nil, zipCode: nil, country: nil,
            notes: nil, smsOptIn: true, emailOptIn: false,
            complianceStatus: "compliant",
            createdAt: Date(), updatedAt: Date(),
            packages: nil
        )

        XCTAssertEqual(dto.fullName, "Jane Smith")
        XCTAssertEqual(dto.initials, "JS")
    }

    func testCustomerDTOInitials() {
        let dto1 = CustomerDTO(
            id: "c1", firstName: "Alice", lastName: "Brown",
            email: nil, phone: nil, pmbNumber: "100", status: "active",
            address: nil, city: nil, state: nil, zipCode: nil, country: nil,
            notes: nil, smsOptIn: false, emailOptIn: false,
            complianceStatus: nil, createdAt: Date(), updatedAt: Date(), packages: nil
        )
        XCTAssertEqual(dto1.initials, "AB")

        let dto2 = CustomerDTO(
            id: "c2", firstName: "X", lastName: "",
            email: nil, phone: nil, pmbNumber: "101", status: "active",
            address: nil, city: nil, state: nil, zipCode: nil, country: nil,
            notes: nil, smsOptIn: false, emailOptIn: false,
            complianceStatus: nil, createdAt: Date(), updatedAt: Date(), packages: nil
        )
        XCTAssertEqual(dto2.initials, "X")
    }

    // MARK: - Endpoint Construction

    func testPackagesListEndpoint() throws {
        let endpoint = API.Packages.list(search: "FedEx", status: .held, page: 3, limit: 50)
        let request = try endpoint.urlRequest(baseURL: URL(string: "https://app.getshipos.com")!)

        XCTAssertEqual(request.httpMethod, "GET")
        let url = request.url!.absoluteString
        XCTAssertTrue(url.contains("/api/packages"))
        XCTAssertTrue(url.contains("search=FedEx"))
        XCTAssertTrue(url.contains("status=held"))
        XCTAssertTrue(url.contains("page=3"))
        XCTAssertTrue(url.contains("limit=50"))
    }

    func testCustomersListEndpoint() throws {
        let endpoint = API.Customers.list(search: "John", page: 1, limit: 20)
        let request = try endpoint.urlRequest(baseURL: URL(string: "https://app.getshipos.com")!)

        XCTAssertEqual(request.httpMethod, "GET")
        let url = request.url!.absoluteString
        XCTAssertTrue(url.contains("/api/customers"))
        XCTAssertTrue(url.contains("search=John"))
    }

    func testCheckInEndpointHasBody() throws {
        let body = PackageCheckInRequest(
            trackingNumber: "TEST123",
            carrier: "USPS",
            customerId: nil,
            senderName: nil,
            packageType: nil,
            weight: nil,
            storageLocation: nil,
            notes: nil,
            conditionTags: nil
        )

        let endpoint = API.Packages.checkIn(body: body)
        let request = try endpoint.urlRequest(baseURL: URL(string: "https://app.getshipos.com")!)

        XCTAssertEqual(request.httpMethod, "POST")
        XCTAssertNotNil(request.httpBody)

        let decoded = try JSONSerialization.jsonObject(with: request.httpBody!) as! [String: Any]
        XCTAssertEqual(decoded["tracking_number"] as? String, "TEST123")
        XCTAssertEqual(decoded["carrier"] as? String, "USPS")
    }

    // MARK: - Date Extensions

    func testDateRelativeFormatting() {
        let now = Date()
        let fiveMinAgo = Calendar.current.date(byAdding: .minute, value: -5, to: now)!
        let twoHoursAgo = Calendar.current.date(byAdding: .hour, value: -2, to: now)!

        // These should produce non-empty strings
        XCTAssertFalse(fiveMinAgo.relativeFormatted.isEmpty)
        XCTAssertFalse(twoHoursAgo.relativeFormatted.isEmpty)
    }

    // MARK: - User Agent Header

    func testRequestIncludesUserAgent() throws {
        let endpoint = Endpoint(path: "/api/test", method: .get)
        let request = try endpoint.urlRequest(baseURL: URL(string: "https://app.getshipos.com")!)

        XCTAssertEqual(request.value(forHTTPHeaderField: "User-Agent"), "ShipOS-iOS/1.0")
        XCTAssertEqual(request.value(forHTTPHeaderField: "Accept"), "application/json")
    }

    // MARK: - Auth Token Injection

    func testAuthTokenInRequest() throws {
        let endpoint = Endpoint(path: "/api/protected", method: .get, authToken: "my-token-123")
        let request = try endpoint.urlRequest(baseURL: URL(string: "https://app.getshipos.com")!)

        XCTAssertEqual(request.value(forHTTPHeaderField: "Authorization"), "Bearer my-token-123")
    }

    func testNoAuthTokenWhenNil() throws {
        let endpoint = Endpoint(path: "/api/public", method: .get)
        let request = try endpoint.urlRequest(baseURL: URL(string: "https://app.getshipos.com")!)

        XCTAssertNil(request.value(forHTTPHeaderField: "Authorization"))
    }
}
