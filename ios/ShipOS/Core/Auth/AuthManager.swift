import Foundation
import Auth0
import KeychainAccess
import LocalAuthentication
import Combine

// MARK: - Auth State

enum AuthState: Equatable {
    case loading
    case unauthenticated
    case authenticated
}

// MARK: - Auth Manager

/// Manages Auth0 authentication with PKCE flow, Keychain token storage,
/// and optional biometric (Face ID / Touch ID) unlock.
@MainActor
final class AuthManager: ObservableObject {
    static let shared = AuthManager()

    // MARK: Published State

    @Published private(set) var state: AuthState = .loading
    @Published private(set) var currentUser: LocalUser?
    @Published private(set) var error: AuthError?
    @Published var isBiometricEnabled: Bool {
        didSet { UserDefaults.standard.set(isBiometricEnabled, forKey: Keys.biometricEnabled) }
    }

    // MARK: Private

    private let keychain: Keychain
    private let credentialsManager: CredentialsManager
    private var cancellables = Set<AnyCancellable>()

    private enum Keys {
        static let service = "ai.bardolabs.shipos"
        static let accessToken = "access_token"
        static let refreshToken = "refresh_token"
        static let idToken = "id_token"
        static let biometricEnabled = "biometric_unlock_enabled"
        static let userProfile = "cached_user_profile"
    }

    // MARK: Init

    private init() {
        self.keychain = Keychain(service: Keys.service)
            .accessibility(.afterFirstUnlockThisDeviceOnly)

        self.credentialsManager = CredentialsManager(authentication: Auth0.authentication())

        self.isBiometricEnabled = UserDefaults.standard.bool(forKey: Keys.biometricEnabled)

        Task { await checkExistingSession() }
    }

    // MARK: - Public API

    /// Initiate Auth0 Universal Login with PKCE.
    func login() async {
        do {
            error = nil
            let credentials = try await Auth0
                .webAuth()
                .scope("openid profile email offline_access")
                .audience(AppConfiguration.apiIdentifier)
                .start()

            try storeCredentials(credentials)
            await fetchUserProfile()
            state = .authenticated

        } catch let webAuthError as WebAuthError {
            if case .userCancelled = webAuthError {
                // User dismissed - not an error
                return
            }
            self.error = .loginFailed(webAuthError.localizedDescription)
            state = .unauthenticated
        } catch {
            self.error = .loginFailed(error.localizedDescription)
            state = .unauthenticated
        }
    }

    /// Log out: clear tokens, reset state.
    func logout() async {
        do {
            try await Auth0.webAuth().clearSession()
        } catch {
            // Session clear failed — still clear local state
            print("[Auth] Session clear error: \(error)")
        }

        clearCredentials()
        currentUser = nil
        state = .unauthenticated
    }

    /// Get a valid access token, refreshing if needed.
    func getAccessToken() async throws -> String {
        // Try existing token first
        if let token = keychain[Keys.accessToken],
           !isTokenExpired(token) {
            return token
        }

        // Try to refresh
        guard let refreshToken = keychain[Keys.refreshToken] else {
            await logout()
            throw AuthError.noRefreshToken
        }

        do {
            let credentials = try await Auth0
                .authentication()
                .renew(withRefreshToken: refreshToken)
                .start()

            try storeCredentials(credentials)
            return credentials.accessToken

        } catch {
            await logout()
            throw AuthError.tokenRefreshFailed(error.localizedDescription)
        }
    }

    /// Attempt biometric unlock (Face ID / Touch ID).
    func unlockWithBiometrics() async -> Bool {
        guard isBiometricEnabled else { return false }

        let context = LAContext()
        var nsError: NSError?

        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &nsError) else {
            return false
        }

        do {
            let success = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: "Unlock ShipOS"
            )

            if success {
                await checkExistingSession()
            }

            return success
        } catch {
            return false
        }
    }

    /// Check what biometric type is available.
    var biometricType: BiometricType {
        let context = LAContext()
        var error: NSError?
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return .none
        }

        switch context.biometryType {
        case .none: return .none
        case .faceID: return .faceID
        case .touchID: return .touchID
        case .opticID: return .opticID
        @unknown default: return .none
        }
    }

    // MARK: - Private Helpers

    private func checkExistingSession() async {
        guard let token = keychain[Keys.accessToken] else {
            state = .unauthenticated
            return
        }

        if isTokenExpired(token) {
            // Try refresh
            do {
                _ = try await getAccessToken()
                await fetchUserProfile()
                state = .authenticated
            } catch {
                state = .unauthenticated
            }
        } else {
            // Restore cached user first for instant UI
            if let cached = loadCachedUser() {
                currentUser = cached
            }
            state = .authenticated

            // Then refresh in background
            await fetchUserProfile()
        }
    }

    private func fetchUserProfile() async {
        do {
            let token = try await getAccessToken()
            let user = try await APIClient.shared.fetchCurrentUser(token: token)
            currentUser = user
            cacheUser(user)
        } catch {
            print("[Auth] Failed to fetch user profile: \(error)")
            // Keep cached user if available
        }
    }

    private func storeCredentials(_ credentials: Credentials) throws {
        keychain[Keys.accessToken] = credentials.accessToken
        keychain[Keys.refreshToken] = credentials.refreshToken
        keychain[Keys.idToken] = credentials.idToken
    }

    private func clearCredentials() {
        try? keychain.remove(Keys.accessToken)
        try? keychain.remove(Keys.refreshToken)
        try? keychain.remove(Keys.idToken)
        UserDefaults.standard.removeObject(forKey: Keys.userProfile)
    }

    private func isTokenExpired(_ token: String) -> Bool {
        // Decode JWT payload to check exp
        let parts = token.split(separator: ".")
        guard parts.count == 3,
              let data = Data(base64URLEncoded: String(parts[1])),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let exp = json["exp"] as? TimeInterval else {
            return true
        }

        // Consider expired 60s before actual expiry
        return Date(timeIntervalSince1970: exp).addingTimeInterval(-60) < Date()
    }

    private func cacheUser(_ user: LocalUser) {
        if let data = try? JSONEncoder().encode(user) {
            UserDefaults.standard.set(data, forKey: Keys.userProfile)
        }
    }

    private func loadCachedUser() -> LocalUser? {
        guard let data = UserDefaults.standard.data(forKey: Keys.userProfile) else { return nil }
        return try? JSONDecoder().decode(LocalUser.self, from: data)
    }
}

// MARK: - Supporting Types

enum BiometricType {
    case faceID, touchID, opticID, none

    var displayName: String {
        switch self {
        case .faceID: "Face ID"
        case .touchID: "Touch ID"
        case .opticID: "Optic ID"
        case .none: "Biometrics"
        }
    }

    var systemImage: String {
        switch self {
        case .faceID: "faceid"
        case .touchID: "touchid"
        case .opticID: "opticid"
        case .none: "lock.shield"
        }
    }
}

enum AuthError: Error, LocalizedError {
    case loginFailed(String)
    case noRefreshToken
    case tokenRefreshFailed(String)
    case networkError(String)

    var errorDescription: String? {
        switch self {
        case .loginFailed(let msg): "Login failed: \(msg)"
        case .noRefreshToken: "Session expired. Please log in again."
        case .tokenRefreshFailed(let msg): "Token refresh failed: \(msg)"
        case .networkError(let msg): "Network error: \(msg)"
        }
    }
}

// MARK: - Base64URL Decoding

extension Data {
    init?(base64URLEncoded string: String) {
        var base64 = string
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")

        let remainder = base64.count % 4
        if remainder > 0 {
            base64.append(String(repeating: "=", count: 4 - remainder))
        }

        self.init(base64Encoded: base64)
    }
}
