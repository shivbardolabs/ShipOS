import XCTest
@testable import ShipOS

// MARK: - BAR-378: Testing Suite (Part 4 — Performance & Cache Tests)

final class PerformanceTests: XCTestCase {

    // MARK: - Response Cache

    func testResponseCacheSetAndGet() async {
        let cache = ResponseCache.shared
        let data = "test response".data(using: .utf8)!

        await cache.set(data, for: "test_key", ttl: 60)
        let retrieved = await cache.get(for: "test_key")

        XCTAssertEqual(retrieved, data)
    }

    func testResponseCacheMiss() async {
        let result = await ResponseCache.shared.get(for: "nonexistent_key")
        XCTAssertNil(result)
    }

    func testResponseCacheInvalidation() async {
        let cache = ResponseCache.shared
        let data = "cached".data(using: .utf8)!

        await cache.set(data, for: "to_invalidate", ttl: 60)
        await cache.invalidate("to_invalidate")

        let result = await cache.get(for: "to_invalidate")
        XCTAssertNil(result)
    }

    func testResponseCachePrefixInvalidation() async {
        let cache = ResponseCache.shared

        await cache.set(Data(), for: "/api/packages/1", ttl: 60)
        await cache.set(Data(), for: "/api/packages/2", ttl: 60)
        await cache.set(Data(), for: "/api/customers/1", ttl: 60)

        await cache.invalidatePrefix("/api/packages")

        XCTAssertNil(await cache.get(for: "/api/packages/1"))
        XCTAssertNil(await cache.get(for: "/api/packages/2"))
        XCTAssertNotNil(await cache.get(for: "/api/customers/1"))

        // Cleanup
        await cache.clearAll()
    }

    // MARK: - Endpoint Performance

    func testEndpointConstructionPerformance() throws {
        measure {
            for i in 0..<1000 {
                let endpoint = API.Packages.list(search: "test\(i)", status: nil, page: 1, limit: 25)
                _ = try? endpoint.urlRequest(baseURL: URL(string: "https://app.getshipos.com")!)
            }
        }
    }

    func testJSONDecodingPerformance() throws {
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

        measure {
            for _ in 0..<1000 {
                _ = try? decoder.decode(PackageDTO.self, from: json)
            }
        }
    }

    func testEncryptionPerformance() throws {
        let key = DataEncryption.generateKey()
        let data = Data((0..<4096).map { _ in UInt8.random(in: 0...255) }) // 4KB

        measure {
            for _ in 0..<100 {
                let encrypted = try! DataEncryption.encrypt(data, using: key)
                _ = try! DataEncryption.decrypt(encrypted, using: key)
            }
        }
    }
}
