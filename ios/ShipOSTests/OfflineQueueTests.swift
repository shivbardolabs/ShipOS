import XCTest
@testable import ShipOS

// MARK: - BAR-378: Testing Suite (Part 3 — Offline & Sync Tests)

final class OfflineQueueTests: XCTestCase {

    // MARK: - Queued Request

    func testQueuedRequestEncoding() throws {
        let request = QueuedRequest(
            id: UUID(),
            path: "/api/packages/check-in",
            method: "POST",
            body: "{\"tracking\":\"123\"}".data(using: .utf8),
            createdAt: Date(),
            retryCount: 0,
            priority: .critical,
            entityType: "package",
            entityId: "pkg-001"
        )

        let data = try JSONEncoder().encode(request)
        let decoded = try JSONDecoder().decode(QueuedRequest.self, from: data)

        XCTAssertEqual(decoded.path, request.path)
        XCTAssertEqual(decoded.method, request.method)
        XCTAssertEqual(decoded.priority, .critical)
        XCTAssertEqual(decoded.entityType, "package")
        XCTAssertEqual(decoded.entityId, "pkg-001")
    }

    func testRequestPriorityOrdering() {
        XCTAssertTrue(QueuedRequest.RequestPriority.critical < .high)
        XCTAssertTrue(QueuedRequest.RequestPriority.high < .normal)
        XCTAssertTrue(QueuedRequest.RequestPriority.normal < .low)
    }

    // MARK: - Connectivity Status

    func testConnectivityStatusRawValues() {
        XCTAssertEqual(ConnectivityStatus.online.rawValue, "online")
        XCTAssertEqual(ConnectivityStatus.offline.rawValue, "offline")
        XCTAssertEqual(ConnectivityStatus.constrained.rawValue, "constrained")
    }

    // MARK: - Notification Deep Links

    func testDeepLinkFromPackageNotification() {
        let userInfo: [AnyHashable: Any] = [
            "type": "package_arrived",
            "packageId": "pkg-123",
        ]

        let link = NotificationDeepLink(userInfo: userInfo)
        if case .package(let id) = link {
            XCTAssertEqual(id, "pkg-123")
        } else {
            XCTFail("Expected .package deep link")
        }
    }

    func testDeepLinkFromCustomerNotification() {
        let userInfo: [AnyHashable: Any] = [
            "type": "customer_action",
            "customerId": "cust-456",
        ]

        let link = NotificationDeepLink(userInfo: userInfo)
        if case .customer(let id) = link {
            XCTAssertEqual(id, "cust-456")
        } else {
            XCTFail("Expected .customer deep link")
        }
    }

    func testDeepLinkFromComplianceAlert() {
        let userInfo: [AnyHashable: Any] = ["type": "compliance_alert"]
        let link = NotificationDeepLink(userInfo: userInfo)

        if case .compliance = link {
            // Success
        } else {
            XCTFail("Expected .compliance deep link")
        }
    }

    func testDeepLinkFromUnknownType() {
        let userInfo: [AnyHashable: Any] = ["type": "some_future_type"]
        let link = NotificationDeepLink(userInfo: userInfo)

        if case .dashboard = link {
            // Unknown type defaults to dashboard
        } else {
            XCTFail("Expected .dashboard deep link for unknown type")
        }
    }

    func testDeepLinkFromEmptyUserInfo() {
        let link = NotificationDeepLink(userInfo: [:])
        XCTAssertNil(link)
    }

    // MARK: - Notification Categories

    func testAllCategoriesHaveActions() {
        for category in ShipOSNotificationCategory.allCases {
            XCTAssertFalse(category.actions.isEmpty, "\(category.rawValue) should have actions")
        }
    }

    func testPackageArrivedHasNotifyAction() {
        let actions = ShipOSNotificationCategory.packageArrived.actions
        let identifiers = actions.map(\.identifier)
        XCTAssertTrue(identifiers.contains("NOTIFY_CUSTOMER"))
        XCTAssertTrue(identifiers.contains("VIEW_PACKAGE"))
    }

    // MARK: - Sync Result

    func testSyncResultEquality() {
        let result1 = SyncResult(processed: 5, succeeded: 4, failed: 1, errors: [])
        let result2 = SyncResult(processed: 5, succeeded: 4, failed: 1, errors: [])
        let result3 = SyncResult(processed: 10, succeeded: 10, failed: 0, errors: [])

        XCTAssertEqual(result1, result2)
        XCTAssertNotEqual(result1, result3)
    }
}
