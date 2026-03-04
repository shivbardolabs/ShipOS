import Foundation

// MARK: - API Errors

/// Typed API errors for clean error handling throughout the app.
enum APIError: Error, LocalizedError {
    case invalidURL(String)
    case invalidResponse
    case unauthorized
    case forbidden
    case notFound
    case validationError([ValidationError])
    case rateLimited
    case serverError(Int, String?)
    case httpError(Int)
    case decodingError(String)
    case networkError(String)

    var errorDescription: String? {
        switch self {
        case .invalidURL(let path):
            "Invalid URL: \(path)"
        case .invalidResponse:
            "Invalid server response"
        case .unauthorized:
            "Session expired. Please log in again."
        case .forbidden:
            "You don't have permission to perform this action."
        case .notFound:
            "Resource not found."
        case .validationError(let errors):
            errors.map(\.message).joined(separator: "\n")
        case .rateLimited:
            "Too many requests. Please try again shortly."
        case .serverError(_, let message):
            message ?? "Server error. Please try again."
        case .httpError(let code):
            "Request failed (HTTP \(code))"
        case .decodingError(let detail):
            "Data parsing error: \(detail)"
        case .networkError(let message):
            message
        }
    }

    /// User-friendly short message for toast/banner display.
    var userMessage: String {
        switch self {
        case .unauthorized: "Please sign in again"
        case .forbidden: "Access denied"
        case .notFound: "Not found"
        case .rateLimited: "Slow down — try again in a moment"
        case .serverError: "Something went wrong"
        case .networkError: "No internet connection"
        case .validationError(let errors):
            errors.first?.message ?? "Invalid input"
        default: "Something went wrong"
        }
    }

    /// Whether this error should trigger a logout.
    var requiresReauth: Bool {
        if case .unauthorized = self { return true }
        return false
    }
}

// MARK: - Error Response Models

struct ErrorResponse: Decodable {
    let error: String?
    let message: String?
}

struct ValidationErrorResponse: Decodable {
    let errors: [ValidationError]
}

struct ValidationError: Decodable {
    let field: String
    let message: String
}
