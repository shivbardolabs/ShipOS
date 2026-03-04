import Foundation

/// Central configuration for environment-specific values.
enum AppConfiguration {

    // MARK: - API

    static var apiBaseURL: URL {
        if let urlString = ProcessInfo.processInfo.environment["SHIPOS_API_URL"],
           let url = URL(string: urlString) {
            return url
        }

        #if DEBUG
        return URL(string: "http://localhost:3000")!
        #else
        return URL(string: "https://app.getshipos.com")!
        #endif
    }

    /// Auth0 API identifier / audience for token scoping.
    static var apiIdentifier: String {
        ProcessInfo.processInfo.environment["AUTH0_API_IDENTIFIER"]
            ?? "https://api.getshipos.com"
    }

    // MARK: - Auth0

    static var auth0Domain: String {
        ProcessInfo.processInfo.environment["AUTH0_DOMAIN"]
            ?? Bundle.main.object(forInfoDictionaryKey: "AUTH0_DOMAIN") as? String
            ?? "bardolabs.us.auth0.com"
    }

    static var auth0ClientId: String {
        ProcessInfo.processInfo.environment["AUTH0_CLIENT_ID"]
            ?? Bundle.main.object(forInfoDictionaryKey: "AUTH0_CLIENT_ID") as? String
            ?? ""
    }

    // MARK: - Feature Flags

    static var isDebug: Bool {
        #if DEBUG
        return true
        #else
        return false
        #endif
    }

    // MARK: - Networking

    static let requestTimeout: TimeInterval = 30
    static let uploadTimeout: TimeInterval = 120
    static let maxRetryAttempts = 3
    static let retryDelay: TimeInterval = 1.0
}
