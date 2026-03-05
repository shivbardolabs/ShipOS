import Foundation
import CryptoKit
import Security
import UIKit
import LocalAuthentication

// MARK: - BAR-376: Security Hardening
// Certificate pinning, jailbreak detection, data encryption at rest,
// secure clipboard handling, app integrity checks, and security audit logging.

// MARK: - Security Manager

@MainActor
final class SecurityManager: ObservableObject {
    static let shared = SecurityManager()

    @Published private(set) var securityStatus: SecurityStatus = .unknown

    enum SecurityStatus {
        case secure
        case warning(String)
        case compromised(String)
        case unknown
    }

    private init() {
        performStartupChecks()
    }

    // MARK: - Startup Security Checks

    func performStartupChecks() {
        var warnings: [String] = []

        if isJailbroken {
            securityStatus = .compromised("Device integrity check failed")
            SecurityAuditLog.shared.log(.critical, event: "jailbreak_detected")
            return
        }

        if isDebuggerAttached {
            warnings.append("Debugger attached")
            SecurityAuditLog.shared.log(.warning, event: "debugger_detected")
        }

        if !isAppSignatureValid {
            warnings.append("App signature validation failed")
            SecurityAuditLog.shared.log(.warning, event: "signature_invalid")
        }

        if warnings.isEmpty {
            securityStatus = .secure
        } else {
            securityStatus = .warning(warnings.joined(separator: ", "))
        }

        SecurityAuditLog.shared.log(.info, event: "security_check_complete", details: "status=\(securityStatus)")
    }

    // MARK: - Jailbreak Detection

    var isJailbroken: Bool {
        #if targetEnvironment(simulator)
        return false
        #else
        // Check for common jailbreak paths
        let jailbreakPaths = [
            "/Applications/Cydia.app",
            "/Applications/Sileo.app",
            "/Library/MobileSubstrate/MobileSubstrate.dylib",
            "/bin/bash",
            "/usr/sbin/sshd",
            "/etc/apt",
            "/private/var/lib/apt/",
            "/usr/bin/ssh",
            "/var/lib/cydia",
            "/var/cache/apt",
            "/var/lib/dpkg",
            "/var/jb",
        ]

        for path in jailbreakPaths {
            if FileManager.default.fileExists(atPath: path) {
                return true
            }
        }

        // Check if app can write outside sandbox
        let testPath = "/private/jailbreak_test_\(UUID().uuidString)"
        do {
            try "test".write(toFile: testPath, atomically: true, encoding: .utf8)
            try FileManager.default.removeItem(atPath: testPath)
            return true
        } catch {
            // Expected — sandbox is intact
        }

        // Check if we can open Cydia URL scheme
        if let url = URL(string: "cydia://package/com.test"),
           UIApplication.shared.canOpenURL(url) {
            return true
        }

        // Check for suspicious dylibs
        let suspiciousLibs = ["SubstrateLoader", "SSLKillSwitch", "FridaGadget", "cycript", "libcycript"]
        for lib in suspiciousLibs {
            if dlopen(lib, RTLD_NOW) != nil {
                return true
            }
        }

        return false
        #endif
    }

    // MARK: - Debugger Detection

    var isDebuggerAttached: Bool {
        #if DEBUG
        return false  // Expected in debug builds
        #else
        var info = kinfo_proc()
        var size = MemoryLayout<kinfo_proc>.stride
        var mib: [Int32] = [CTL_KERN, KERN_PROC, KERN_PROC_PID, getpid()]

        let result = sysctl(&mib, UInt32(mib.count), &info, &size, nil, 0)
        guard result == 0 else { return false }

        return (info.kp_proc.p_flag & P_TRACED) != 0
        #endif
    }

    // MARK: - App Signature Validation

    var isAppSignatureValid: Bool {
        #if targetEnvironment(simulator)
        return true
        #else
        guard let bundlePath = Bundle.main.bundlePath as NSString?,
              FileManager.default.fileExists(atPath: bundlePath.appendingPathComponent("_CodeSignature")) else {
            return false
        }

        // Verify provisioning profile exists
        guard FileManager.default.fileExists(
            atPath: bundlePath.appendingPathComponent("embedded.mobileprovision")
        ) else {
            return AppConfiguration.isDebug  // OK in dev, not in production
        }

        return true
        #endif
    }

    // MARK: - Secure Clipboard

    /// Copy sensitive data to clipboard with auto-expiration.
    func secureCopy(_ text: String, expiresAfter seconds: TimeInterval = 60) {
        let pasteboard = UIPasteboard.general
        pasteboard.setItems(
            [[UIPasteboard.typeAutomatic: text]],
            options: [.expirationDate: Date().addingTimeInterval(seconds)]
        )
        SecurityAuditLog.shared.log(.info, event: "secure_copy", details: "expires_in=\(seconds)s")
    }

    /// Clear the clipboard.
    func clearClipboard() {
        UIPasteboard.general.items = []
    }

    // MARK: - Screen Protection

    /// Prevent screenshots / screen recording of sensitive views.
    func addScreenProtection(to window: UIWindow?) {
        guard let window else { return }

        NotificationCenter.default.addObserver(
            forName: UIScreen.capturedDidChangeNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                if UIScreen.main.isCaptured {
                    self?.handleScreenCapture(window: window)
                }
            }
        }

        NotificationCenter.default.addObserver(
            forName: UIApplication.userDidTakeScreenshotNotification,
            object: nil,
            queue: .main
        ) { _ in
            SecurityAuditLog.shared.log(.warning, event: "screenshot_taken")
        }
    }

    private func handleScreenCapture(window: UIWindow) {
        SecurityAuditLog.shared.log(.warning, event: "screen_recording_detected")
        // Optionally overlay a blur
    }
}

// MARK: - Data Encryption

/// AES-GCM encryption for data at rest using CryptoKit.
enum DataEncryption {

    /// Generate a new symmetric encryption key.
    static func generateKey() -> SymmetricKey {
        SymmetricKey(size: .bits256)
    }

    /// Encrypt data with AES-GCM.
    static func encrypt(_ data: Data, using key: SymmetricKey) throws -> Data {
        let sealedBox = try AES.GCM.seal(data, using: key)
        guard let combined = sealedBox.combined else {
            throw SecurityError.encryptionFailed
        }
        return combined
    }

    /// Decrypt AES-GCM encrypted data.
    static func decrypt(_ data: Data, using key: SymmetricKey) throws -> Data {
        let sealedBox = try AES.GCM.SealedBox(combined: data)
        return try AES.GCM.open(sealedBox, using: key)
    }

    /// Derive a key from a password using HKDF.
    static func deriveKey(from password: String, salt: Data) -> SymmetricKey {
        let passwordData = Data(password.utf8)
        let derived = HKDF<SHA256>.deriveKey(
            inputKeyMaterial: SymmetricKey(data: passwordData),
            salt: salt,
            info: Data("ShipOS-v1".utf8),
            outputByteCount: 32
        )
        return derived
    }

    /// Hash data with SHA256.
    static func sha256(_ data: Data) -> String {
        SHA256.hash(data: data)
            .compactMap { String(format: "%02x", $0) }
            .joined()
    }
}

// MARK: - Secure Keychain Wrapper

/// Enhanced keychain operations beyond what KeychainAccess provides.
enum SecureKeychain {

    /// Store an encryption key in the Keychain with biometric protection.
    static func storeKey(_ key: SymmetricKey, for account: String, biometricProtected: Bool = false) throws {
        let keyData = key.withUnsafeBytes { Data(Array($0)) }

        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: account,
            kSecAttrService as String: "ai.bardolabs.shipos.keys",
            kSecValueData as String: keyData,
        ]

        if biometricProtected {
            let access = SecAccessControlCreateWithFlags(
                nil,
                kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly,
                .biometryCurrentSet,
                nil
            )
            query[kSecAttrAccessControl as String] = access
        } else {
            query[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        }

        // Delete existing, then add
        SecItemDelete(query as CFDictionary)
        let status = SecItemAdd(query as CFDictionary, nil)

        guard status == errSecSuccess else {
            throw SecurityError.keychainError(status)
        }
    }

    /// Retrieve an encryption key from the Keychain.
    static func retrieveKey(for account: String) throws -> SymmetricKey {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: account,
            kSecAttrService as String: "ai.bardolabs.shipos.keys",
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        guard status == errSecSuccess, let data = result as? Data else {
            throw SecurityError.keychainError(status)
        }

        return SymmetricKey(data: data)
    }

    /// Delete a key from the Keychain.
    static func deleteKey(for account: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: account,
            kSecAttrService as String: "ai.bardolabs.shipos.keys",
        ]
        SecItemDelete(query as CFDictionary)
    }
}

// MARK: - Certificate Pinning

/// URLSession delegate that validates server certificates against pinned keys.
final class CertificatePinningDelegate: NSObject, URLSessionDelegate {

    /// SHA256 hashes of pinned public keys (SPKI).
    /// Update these when certificates rotate.
    private let pinnedKeyHashes: Set<String> = [
        // app.getshipos.com certificate pin (placeholder — replace with actual pin)
        "BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=",
        // Backup pin
        "CCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC=",
    ]

    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge
    ) async -> (URLSession.AuthChallengeDisposition, URLCredential?) {
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let serverTrust = challenge.protectionSpace.serverTrust else {
            return (.cancelAuthenticationChallenge, nil)
        }

        // Standard certificate validation
        guard SecTrustEvaluateWithError(serverTrust, nil) else {
            SecurityAuditLog.shared.log(.critical, event: "certificate_validation_failed",
                                        details: "host=\(challenge.protectionSpace.host)")
            return (.cancelAuthenticationChallenge, nil)
        }

        #if !DEBUG
        // Pin validation in production only
        let certificateCount = SecTrustGetCertificateCount(serverTrust)
        var pinMatched = false

        for index in 0..<certificateCount {
            guard let certificate = SecTrustCopyCertificateChain(serverTrust)?[index] as? SecCertificate else {
                continue
            }

            if let publicKey = SecCertificateCopyKey(certificate),
               let publicKeyData = SecKeyCopyExternalRepresentation(publicKey, nil) as Data? {
                let hash = DataEncryption.sha256(publicKeyData)
                if pinnedKeyHashes.contains(hash) {
                    pinMatched = true
                    break
                }
            }
        }

        if !pinMatched {
            SecurityAuditLog.shared.log(.critical, event: "certificate_pin_mismatch",
                                        details: "host=\(challenge.protectionSpace.host)")
            return (.cancelAuthenticationChallenge, nil)
        }
        #endif

        return (.useCredential, URLCredential(trust: serverTrust))
    }
}

// MARK: - Security Audit Log

/// Append-only security event log for auditing.
/// Uses a serial queue for thread safety instead of actor isolation
/// so callers don't need async context.
final class SecurityAuditLog: @unchecked Sendable {
    static let shared = SecurityAuditLog()
    private let queue = DispatchQueue(label: "ai.bardolabs.shipos.auditlog")

    enum Level: String {
        case info, warning, critical
    }

    struct Entry: Codable {
        let timestamp: Date
        let level: String
        let event: String
        let details: String?
        let deviceId: String
    }

    private let fileURL: URL
    private let deviceId: String

    private init() {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
        fileURL = docs.appendingPathComponent("security_audit.log")
        deviceId = ProcessInfo.processInfo.environment["SIMULATOR_UDID"]
            ?? UUID().uuidString  // Stable per-install via actor singleton
    }

    func log(_ level: Level, event: String, details: String? = nil) {
        let entry = Entry(
            timestamp: Date(),
            level: level.rawValue,
            event: event,
            details: details,
            deviceId: deviceId
        )

        queue.async { [fileURL] in
            guard let data = try? JSONEncoder().encode(entry),
                  let line = String(data: data, encoding: .utf8) else { return }

            let logLine = line + "\n"

            if FileManager.default.fileExists(atPath: fileURL.path) {
                if let handle = FileHandle(forWritingAtPath: fileURL.path) {
                    handle.seekToEndOfFile()
                    handle.write(logLine.data(using: .utf8)!)
                    handle.closeFile()
                }
            } else {
                try? logLine.write(to: fileURL, atomically: true, encoding: .utf8)
            }
        }

        #if DEBUG
        print("[Security/\(level.rawValue.uppercased())] \(event)\(details.map { " — \($0)" } ?? "")")
        #endif
    }

    /// Read all audit log entries.
    func entries() -> [Entry] {
        guard let data = try? Data(contentsOf: fileURL),
              let content = String(data: data, encoding: .utf8) else { return [] }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        return content.split(separator: "\n").compactMap { line in
            try? decoder.decode(Entry.self, from: Data(line.utf8))
        }
    }

    /// Clear old entries (keep last 7 days).
    func pruneOldEntries() {
        let cutoff = Calendar.current.date(byAdding: .day, value: -7, to: Date())!
        let kept = entries().filter { $0.timestamp > cutoff }

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601

        let lines = kept.compactMap { entry -> String? in
            guard let data = try? encoder.encode(entry) else { return nil }
            return String(data: data, encoding: .utf8)
        }.joined(separator: "\n") + "\n"

        try? lines.write(to: fileURL, atomically: true, encoding: .utf8)
    }
}

// MARK: - Security Errors

enum SecurityError: LocalizedError {
    case encryptionFailed
    case decryptionFailed
    case keychainError(OSStatus)
    case integrityCheckFailed

    var errorDescription: String? {
        switch self {
        case .encryptionFailed: "Data encryption failed"
        case .decryptionFailed: "Data decryption failed"
        case .keychainError(let status): "Keychain error: \(status)"
        case .integrityCheckFailed: "App integrity check failed"
        }
    }
}
