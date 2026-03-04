import Foundation

// MARK: - API Client

/// Type-safe HTTP client using URLSession + Swift Concurrency.
/// Handles auth token injection, error mapping, and retry logic.
actor APIClient {
    static let shared = APIClient()

    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private init() {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = AppConfiguration.requestTimeout
        config.timeoutIntervalForResource = AppConfiguration.uploadTimeout
        config.waitsForConnectivity = true

        self.session = URLSession(configuration: config)

        self.decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .custom { decoder in
            let container = try decoder.singleValueContainer()
            let dateString = try container.decode(String.self)

            // Try ISO 8601 with fractional seconds first
            if let date = ISO8601DateFormatter.withFractionalSeconds.date(from: dateString) {
                return date
            }
            // Then without
            if let date = ISO8601DateFormatter.standard.date(from: dateString) {
                return date
            }
            throw DecodingError.dataCorruptedError(
                in: container,
                debugDescription: "Cannot decode date: \(dateString)"
            )
        }
        decoder.keyDecodingStrategy = .convertFromSnakeCase

        self.encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.keyEncodingStrategy = .convertToSnakeCase
    }

    // MARK: - Public API

    /// Perform a type-safe API request.
    func request<T: Decodable>(
        _ endpoint: Endpoint,
        as type: T.Type = T.self
    ) async throws -> T {
        let data = try await performRequest(endpoint)
        return try decoder.decode(T.self, from: data)
    }

    /// Perform a request that returns no body (e.g., DELETE).
    func request(_ endpoint: Endpoint) async throws {
        _ = try await performRequest(endpoint)
    }

    /// Fetch current user profile from /api/users/me
    func fetchCurrentUser(token: String) async throws -> LocalUser {
        let endpoint = Endpoint(
            path: "/api/users/me",
            method: .get,
            authToken: token
        )
        let response: UserMeResponse = try await request(endpoint)
        return response.user
    }

    // MARK: - Core Request Execution

    private func performRequest(
        _ endpoint: Endpoint,
        retryCount: Int = 0
    ) async throws -> Data {
        var request = try endpoint.urlRequest(baseURL: AppConfiguration.apiBaseURL)

        // Inject auth token if not already set
        if request.value(forHTTPHeaderField: "Authorization") == nil {
            let token = try await AuthManager.shared.getAccessToken()
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        // Log in debug
        #if DEBUG
        logRequest(request, response: httpResponse, data: data)
        #endif

        switch httpResponse.statusCode {
        case 200...299:
            return data

        case 401:
            // Token expired — try refresh once
            if retryCount == 0 {
                _ = try await AuthManager.shared.getAccessToken()
                return try await performRequest(endpoint, retryCount: retryCount + 1)
            }
            throw APIError.unauthorized

        case 403:
            throw APIError.forbidden

        case 404:
            throw APIError.notFound

        case 422:
            let errorResponse = try? decoder.decode(ValidationErrorResponse.self, from: data)
            throw APIError.validationError(errorResponse?.errors ?? [])

        case 429:
            // Rate limited — retry with exponential backoff
            if retryCount < AppConfiguration.maxRetryAttempts {
                let delay = AppConfiguration.retryDelay * pow(2.0, Double(retryCount))
                try await Task.sleep(for: .seconds(delay))
                return try await performRequest(endpoint, retryCount: retryCount + 1)
            }
            throw APIError.rateLimited

        case 500...599:
            if retryCount < AppConfiguration.maxRetryAttempts {
                let delay = AppConfiguration.retryDelay * pow(2.0, Double(retryCount))
                try await Task.sleep(for: .seconds(delay))
                return try await performRequest(endpoint, retryCount: retryCount + 1)
            }
            let message = (try? decoder.decode(ErrorResponse.self, from: data))?.error
            throw APIError.serverError(httpResponse.statusCode, message)

        default:
            throw APIError.httpError(httpResponse.statusCode)
        }
    }

    // MARK: - Debug Logging

    #if DEBUG
    private func logRequest(_ request: URLRequest, response: HTTPURLResponse, data: Data) {
        let method = request.httpMethod ?? "?"
        let path = request.url?.path ?? "?"
        let status = response.statusCode
        let size = ByteCountFormatter.string(fromByteCount: Int64(data.count), countStyle: .memory)
        print("[\(method)] \(path) → \(status) (\(size))")
    }
    #endif
}

// MARK: - Endpoint

struct Endpoint {
    let path: String
    let method: HTTPMethod
    let queryItems: [URLQueryItem]?
    let body: Encodable?
    let authToken: String?
    let contentType: String

    init(
        path: String,
        method: HTTPMethod = .get,
        queryItems: [URLQueryItem]? = nil,
        body: Encodable? = nil,
        authToken: String? = nil,
        contentType: String = "application/json"
    ) {
        self.path = path
        self.method = method
        self.queryItems = queryItems
        self.body = body
        self.authToken = authToken
        self.contentType = contentType
    }

    func urlRequest(baseURL: URL) throws -> URLRequest {
        var components = URLComponents(url: baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: true)!
        components.queryItems = queryItems

        guard let url = components.url else {
            throw APIError.invalidURL(path)
        }

        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue(contentType, forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("ShipOS-iOS/1.0", forHTTPHeaderField: "User-Agent")

        if let token = authToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        if let body = body {
            let encoder = JSONEncoder()
            encoder.keyEncodingStrategy = .convertToSnakeCase
            encoder.dateEncodingStrategy = .iso8601
            request.httpBody = try encoder.encode(AnyEncodable(body))
        }

        return request
    }
}

enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case put = "PUT"
    case patch = "PATCH"
    case delete = "DELETE"
}

// MARK: - Type Erasure for Encodable

struct AnyEncodable: Encodable {
    private let encodeFunc: (Encoder) throws -> Void

    init(_ value: Encodable) {
        self.encodeFunc = value.encode
    }

    func encode(to encoder: Encoder) throws {
        try encodeFunc(encoder)
    }
}

// MARK: - ISO 8601 Formatters

extension ISO8601DateFormatter {
    static let withFractionalSeconds: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()

    static let standard: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime]
        return formatter
    }()
}
