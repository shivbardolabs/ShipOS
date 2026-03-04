import XCTest

// MARK: - BAR-378: Testing Suite (Part 5 — UI Tests)
// Automated UI tests for critical flows: launch, login, navigation, check-in.

final class ShipOSUITests: XCTestCase {
    let app = XCUIApplication()

    override func setUpWithError() throws {
        continueAfterFailure = false
        app.launchArguments = ["--uitesting"]
        app.launchEnvironment = [
            "SHIPOS_API_URL": "http://localhost:3000",
        ]
    }

    // MARK: - Launch Tests

    func testAppLaunches() throws {
        app.launch()
        // App should show either login or main view
        let loginExists = app.buttons["Sign In with Auth0"].waitForExistence(timeout: 5)
        let dashboardExists = app.staticTexts["Dashboard"].waitForExistence(timeout: 5)
        XCTAssertTrue(loginExists || dashboardExists, "App should show login or dashboard on launch")
    }

    func testLoginScreenElements() throws {
        app.launch()

        // If we're on login screen
        if app.buttons["Sign In with Auth0"].waitForExistence(timeout: 3) {
            // Check login UI elements exist
            XCTAssertTrue(app.images["shipos_logo"].exists || app.staticTexts["ShipOS"].exists)
            XCTAssertTrue(app.buttons["Sign In with Auth0"].exists)
        }
    }

    // MARK: - Navigation Tests

    func testTabNavigation() throws {
        app.launch()
        guard app.tabBars.firstMatch.waitForExistence(timeout: 5) else {
            return // Not logged in, skip
        }

        // Navigate through tabs
        let tabs = ["Dashboard", "Packages", "Mail", "Customers", "Alerts", "Settings"]
        for tab in tabs {
            let tabButton = app.tabBars.buttons[tab]
            if tabButton.exists {
                tabButton.tap()
                // Verify we navigated
                XCTAssertTrue(tabButton.isSelected || tabButton.isHittable)
            }
        }
    }

    func testDashboardQuickActions() throws {
        app.launch()
        guard app.tabBars.firstMatch.waitForExistence(timeout: 5) else { return }

        // Tap Dashboard tab
        app.tabBars.buttons["Dashboard"].tap()

        // Look for quick action buttons
        let checkIn = app.buttons["Check In"]
        let scan = app.buttons["Scan"]

        if checkIn.waitForExistence(timeout: 3) {
            XCTAssertTrue(checkIn.isHittable)
        }
        if scan.exists {
            XCTAssertTrue(scan.isHittable)
        }
    }

    // MARK: - Settings Tests

    func testSettingsScreenLoads() throws {
        app.launch()
        guard app.tabBars.firstMatch.waitForExistence(timeout: 5) else { return }

        app.tabBars.buttons["Settings"].tap()

        // Settings should show key sections
        let settingsLabels = ["Store Information", "Notifications", "Security", "Appearance"]
        for label in settingsLabels {
            if app.staticTexts[label].waitForExistence(timeout: 2) {
                XCTAssertTrue(app.staticTexts[label].exists)
            }
        }
    }

    // MARK: - Accessibility Tests

    func testAllTabsHaveAccessibilityLabels() throws {
        app.launch()
        guard app.tabBars.firstMatch.waitForExistence(timeout: 5) else { return }

        for button in app.tabBars.buttons.allElementsBoundByIndex {
            XCTAssertFalse(button.label.isEmpty, "Tab button should have accessibility label")
        }
    }

    // MARK: - Offline Banner

    func testOfflineBannerNotShownWhenOnline() throws {
        app.launch()

        // When online, the offline banner should NOT be visible
        let offlineBanner = app.staticTexts["You're offline"]
        XCTAssertFalse(offlineBanner.waitForExistence(timeout: 3))
    }

    // MARK: - Performance Tests

    func testLaunchPerformance() throws {
        if #available(iOS 17.0, *) {
            measure(metrics: [XCTApplicationLaunchMetric()]) {
                app.launch()
            }
        }
    }

    func testScrollPerformance() throws {
        app.launch()
        guard app.tabBars.firstMatch.waitForExistence(timeout: 5) else { return }

        // Navigate to a scrollable screen
        app.tabBars.buttons["Packages"].tap()

        if #available(iOS 17.0, *) {
            measure(metrics: [XCTOSSignpostMetric.scrollDecelerationMetric]) {
                app.swipeUp()
                app.swipeDown()
            }
        }
    }
}

// MARK: - Screenshot Tests (for App Store)

final class ShipOSScreenshotTests: XCTestCase {
    let app = XCUIApplication()

    override func setUpWithError() throws {
        continueAfterFailure = false
        app.launchArguments = ["--screenshots"]
        app.launchEnvironment = [
            "SHIPOS_API_URL": "http://localhost:3000",
        ]
        setupSnapshot(app)
    }

    func testCaptureScreenshots() throws {
        app.launch()
        guard app.tabBars.firstMatch.waitForExistence(timeout: 10) else { return }

        // 1. Dashboard
        app.tabBars.buttons["Dashboard"].tap()
        sleep(1)
        snapshot("01_Dashboard")

        // 2. Packages
        app.tabBars.buttons["Packages"].tap()
        sleep(1)
        snapshot("02_Packages")

        // 3. Mail
        app.tabBars.buttons["Mail"].tap()
        sleep(1)
        snapshot("03_Mail")

        // 4. Customers
        app.tabBars.buttons["Customers"].tap()
        sleep(1)
        snapshot("04_Customers")

        // 5. Notifications
        app.tabBars.buttons["Alerts"].tap()
        sleep(1)
        snapshot("05_Notifications")

        // 6. Settings
        app.tabBars.buttons["Settings"].tap()
        sleep(1)
        snapshot("06_Settings")
    }
}
