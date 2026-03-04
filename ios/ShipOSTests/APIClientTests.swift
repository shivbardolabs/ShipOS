import XCTest
@testable import ShipOS

final class APIClientTests: XCTestCase {

    func testEndpointURLConstruction() throws {
        let endpoint = API.Packages.list(search: "FedEx", status: .checkedIn, page: 2, limit: 25)
        let request = try endpoint.urlRequest(baseURL: URL(string: "https://app.getshipos.com")!)

        XCTAssertEqual(request.httpMethod, "GET")
        XCTAssertTrue(request.url!.absoluteString.contains("search=FedEx"))
        XCTAssertTrue(request.url!.absoluteString.contains("status=checked_in"))
        XCTAssertTrue(request.url!.absoluteString.contains("page=2"))
        XCTAssertTrue(request.url!.absoluteString.contains("limit=25"))
    }

    func testEndpointWithBody() throws {
        let body = PackageCheckInRequest(
            trackingNumber: "1Z999AA10123456784",
            carrier: "UPS",
            customerId: "cust-001",
            senderName: "Amazon",
            packageType: "box",
            weight: 2.5,
            storageLocation: "A-1",
            notes: nil,
            conditionTags: ["damaged"]
        )

        let endpoint = API.Packages.checkIn(body: body)
        let request = try endpoint.urlRequest(baseURL: URL(string: "https://app.getshipos.com")!)

        XCTAssertEqual(request.httpMethod, "POST")
        XCTAssertNotNil(request.httpBody)
        XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), "application/json")
    }

    func testPackageDTODecoding() throws {
        let json = """
        {
            "id": "pkg-001",
            "tracking_number": "1Z999AA10123456784",
            "carrier": "UPS",
            "status": "checked_in",
            "sender_name": "Amazon",
            "package_type": "box",
            "weight": 2.5,
            "length": null,
            "width": null,
            "height": null,
            "storage_location": "A-1",
            "notes": null,
            "condition_tags": ["good"],
            "photo_url": null,
            "signature_url": null,
            "checked_in_at": "2026-03-04T12:00:00.000Z",
            "notified_at": null,
            "released_at": null,
            "hold_deadline": null,
            "customer_id": "cust-001",
            "customer": {
                "id": "cust-001",
                "first_name": "John",
                "last_name": "Smith",
                "pmb_number": "101"
            },
            "created_at": "2026-03-04T12:00:00.000Z",
            "updated_at": "2026-03-04T12:00:00.000Z"
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let dateString = try container.decode(String.self)
            if let date = ISO8601DateFormatter.withFractionalSeconds.date(from: dateString) {
                return date
            }
            if let date = ISO8601DateFormatter.standard.date(from: dateString) {
                return date
            }
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid date")
        }

        let dto = try decoder.decode(PackageDTO.self, from: json)

        XCTAssertEqual(dto.id, "pkg-001")
        XCTAssertEqual(dto.trackingNumber, "1Z999AA10123456784")
        XCTAssertEqual(dto.carrier, "UPS")
        XCTAssertEqual(dto.status, .checkedIn)
        XCTAssertEqual(dto.customer?.firstName, "John")
        XCTAssertEqual(dto.customer?.pmbNumber, "101")
    }

    func testCustomerDTODecoding() throws {
        let json = """
        {
            "id": "cust-001",
            "first_name": "Jane",
            "last_name": "Doe",
            "email": "jane@example.com",
            "phone": "+15551234567",
            "pmb_number": "205",
            "status": "active",
            "address": "456 Oak Ave",
            "city": "Brooklyn",
            "state": "NY",
            "zip_code": "11201",
            "country": "US",
            "notes": null,
            "sms_opt_in": true,
            "email_opt_in": false,
            "compliance_status": "compliant",
            "created_at": "2026-01-15T10:00:00Z",
            "updated_at": "2026-03-01T14:30:00Z",
            "packages": null
        }
        """.data(using: .utf8)!

        let decoder = JSONDecoder()
        decoder.keyDecodingStrategy = .convertFromSnakeCase
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let dateString = try container.decode(String.self)
            if let date = ISO8601DateFormatter.withFractionalSeconds.date(from: dateString) {
                return date
            }
            if let date = ISO8601DateFormatter.standard.date(from: dateString) {
                return date
            }
            throw DecodingError.dataCorruptedError(in: container, debugDescription: "Invalid date")
        }

        let dto = try decoder.decode(CustomerDTO.self, from: json)

        XCTAssertEqual(dto.id, "cust-001")
        XCTAssertEqual(dto.fullName, "Jane Doe")
        XCTAssertEqual(dto.initials, "JD")
        XCTAssertEqual(dto.pmbNumber, "205")
        XCTAssertEqual(dto.complianceStatus, "compliant")
    }

    func testBase64URLDecoding() {
        // Standard JWT payload segment (base64url encoded)
        let encoded = "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ"
        let data = Data(base64URLEncoded: encoded)
        XCTAssertNotNil(data)

        if let data, let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            XCTAssertEqual(json["name"] as? String, "John Doe")
        }
    }
}
