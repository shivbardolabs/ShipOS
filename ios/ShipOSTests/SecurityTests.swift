import XCTest
import CryptoKit
@testable import ShipOS

// MARK: - BAR-378: Testing Suite (Part 1 — Security Tests)

final class SecurityTests: XCTestCase {

    // MARK: - Encryption Tests

    func testEncryptDecryptRoundTrip() throws {
        let key = DataEncryption.generateKey()
        let originalData = "Sensitive customer data: PMB 101".data(using: .utf8)!

        let encrypted = try DataEncryption.encrypt(originalData, using: key)
        let decrypted = try DataEncryption.decrypt(encrypted, using: key)

        XCTAssertEqual(decrypted, originalData)
        XCTAssertNotEqual(encrypted, originalData)
    }

    func testEncryptedDataDiffers() throws {
        let key = DataEncryption.generateKey()
        let data = "Same data".data(using: .utf8)!

        let encrypted1 = try DataEncryption.encrypt(data, using: key)
        let encrypted2 = try DataEncryption.encrypt(data, using: key)

        // AES-GCM uses random nonce, so same plaintext → different ciphertext
        XCTAssertNotEqual(encrypted1, encrypted2)
    }

    func testDecryptWithWrongKeyFails() throws {
        let key1 = DataEncryption.generateKey()
        let key2 = DataEncryption.generateKey()
        let data = "Secret".data(using: .utf8)!

        let encrypted = try DataEncryption.encrypt(data, using: key1)

        XCTAssertThrowsError(try DataEncryption.decrypt(encrypted, using: key2))
    }

    func testSHA256Hash() {
        let data = "hello world".data(using: .utf8)!
        let hash = DataEncryption.sha256(data)

        // Known SHA256 of "hello world"
        XCTAssertEqual(hash, "b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9")
        XCTAssertEqual(hash.count, 64) // 32 bytes hex
    }

    func testKeyDerivation() {
        let salt = Data("test-salt".utf8)
        let key1 = DataEncryption.deriveKey(from: "password123", salt: salt)
        let key2 = DataEncryption.deriveKey(from: "password123", salt: salt)
        let key3 = DataEncryption.deriveKey(from: "different", salt: salt)

        // Same input → same key
        XCTAssertEqual(
            key1.withUnsafeBytes { Data(Array($0)) },
            key2.withUnsafeBytes { Data(Array($0)) }
        )

        // Different input → different key
        XCTAssertNotEqual(
            key1.withUnsafeBytes { Data(Array($0)) },
            key3.withUnsafeBytes { Data(Array($0)) }
        )
    }

    func testLargeDataEncryption() throws {
        let key = DataEncryption.generateKey()
        // 1 MB of random data
        let largeData = Data((0..<(1024 * 1024)).map { _ in UInt8.random(in: 0...255) })

        let encrypted = try DataEncryption.encrypt(largeData, using: key)
        let decrypted = try DataEncryption.decrypt(encrypted, using: key)

        XCTAssertEqual(decrypted, largeData)
    }
}
