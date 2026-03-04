import Foundation

// MARK: - API Endpoint Definitions

/// Centralized endpoint definitions matching the ShipOS Next.js API routes.
/// Each static method returns a configured `Endpoint` struct.
enum API {

    // MARK: - Auth / Users

    enum Users {
        static func me() -> Endpoint {
            Endpoint(path: "/api/users/me")
        }

        static func list(page: Int = 1, limit: Int = 50) -> Endpoint {
            Endpoint(
                path: "/api/users",
                queryItems: [
                    URLQueryItem(name: "page", value: "\(page)"),
                    URLQueryItem(name: "limit", value: "\(limit)")
                ]
            )
        }
    }

    // MARK: - Dashboard

    enum Dashboard {
        static func stats() -> Endpoint {
            Endpoint(path: "/api/dashboard")
        }
    }

    // MARK: - Packages

    enum Packages {
        static func list(
            search: String? = nil,
            status: PackageStatus? = nil,
            carrier: String? = nil,
            page: Int = 1,
            limit: Int = 50
        ) -> Endpoint {
            var items: [URLQueryItem] = [
                URLQueryItem(name: "page", value: "\(page)"),
                URLQueryItem(name: "limit", value: "\(limit)")
            ]
            if let search, !search.isEmpty {
                items.append(URLQueryItem(name: "search", value: search))
            }
            if let status {
                items.append(URLQueryItem(name: "status", value: status.rawValue))
            }
            if let carrier, !carrier.isEmpty {
                items.append(URLQueryItem(name: "carrier", value: carrier))
            }

            return Endpoint(path: "/api/packages", queryItems: items)
        }

        static func get(id: String) -> Endpoint {
            Endpoint(path: "/api/packages/\(id)")
        }

        static func checkIn(body: PackageCheckInRequest) -> Endpoint {
            Endpoint(path: "/api/packages", method: .post, body: body)
        }

        static func update(id: String, body: PackageUpdateRequest) -> Endpoint {
            Endpoint(path: "/api/packages/\(id)", method: .patch, body: body)
        }

        static func checkOut(id: String, body: PackageCheckOutRequest) -> Endpoint {
            Endpoint(path: "/api/packages/\(id)", method: .patch, body: body)
        }
    }

    // MARK: - Customers

    enum Customers {
        static func list(
            search: String? = nil,
            status: String? = nil,
            page: Int = 1,
            limit: Int = 50
        ) -> Endpoint {
            var items: [URLQueryItem] = [
                URLQueryItem(name: "page", value: "\(page)"),
                URLQueryItem(name: "limit", value: "\(limit)")
            ]
            if let search, !search.isEmpty {
                items.append(URLQueryItem(name: "search", value: search))
            }
            if let status {
                items.append(URLQueryItem(name: "status", value: status))
            }

            return Endpoint(path: "/api/customers", queryItems: items)
        }

        static func get(id: String) -> Endpoint {
            Endpoint(path: "/api/customers/\(id)")
        }

        static func create(body: CustomerCreateRequest) -> Endpoint {
            Endpoint(path: "/api/customers", method: .post, body: body)
        }

        static func update(id: String, body: CustomerUpdateRequest) -> Endpoint {
            Endpoint(path: "/api/customers/\(id)", method: .patch, body: body)
        }
    }

    // MARK: - Notifications

    enum Notifications {
        static func list(page: Int = 1, limit: Int = 50) -> Endpoint {
            Endpoint(
                path: "/api/notifications",
                queryItems: [
                    URLQueryItem(name: "page", value: "\(page)"),
                    URLQueryItem(name: "limit", value: "\(limit)")
                ]
            )
        }

        static func send(body: NotificationSendRequest) -> Endpoint {
            Endpoint(path: "/api/notifications/send", method: .post, body: body)
        }

        static func batchNotify() -> Endpoint {
            Endpoint(path: "/api/notifications/batch", method: .post)
        }
    }

    // MARK: - Mail

    enum Mail {
        static func list(
            customerId: String? = nil,
            page: Int = 1,
            limit: Int = 50
        ) -> Endpoint {
            var items: [URLQueryItem] = [
                URLQueryItem(name: "page", value: "\(page)"),
                URLQueryItem(name: "limit", value: "\(limit)")
            ]
            if let customerId {
                items.append(URLQueryItem(name: "customerId", value: customerId))
            }
            return Endpoint(path: "/api/mail", queryItems: items)
        }

        static func create(body: MailCreateRequest) -> Endpoint {
            Endpoint(path: "/api/mail", method: .post, body: body)
        }
    }

    // MARK: - Settings

    enum Settings {
        static func tenant() -> Endpoint {
            Endpoint(path: "/api/tenant")
        }

        static func updateTenant(body: TenantUpdateRequest) -> Endpoint {
            Endpoint(path: "/api/tenant", method: .patch, body: body)
        }

        static func storageLocations() -> Endpoint {
            Endpoint(path: "/api/settings/storage-locations")
        }

        static func printerConfig() -> Endpoint {
            Endpoint(path: "/api/settings/printer")
        }
    }

    // MARK: - Reports

    enum Reports {
        static func export(type: String = "packages", format: String = "csv") -> Endpoint {
            Endpoint(
                path: "/api/reports/export",
                queryItems: [
                    URLQueryItem(name: "type", value: type),
                    URLQueryItem(name: "format", value: format)
                ]
            )
        }
    }

    // MARK: - Shipments

    enum Shipments {
        static func list(
            search: String? = nil,
            status: String? = nil,
            page: Int = 1,
            limit: Int = 50
        ) -> Endpoint {
            var items: [URLQueryItem] = [
                URLQueryItem(name: "page", value: "\(page)"),
                URLQueryItem(name: "limit", value: "\(limit)")
            ]
            if let search, !search.isEmpty {
                items.append(URLQueryItem(name: "search", value: search))
            }
            if let status {
                items.append(URLQueryItem(name: "status", value: status))
            }
            return Endpoint(path: "/api/shipments", queryItems: items)
        }

        static func get(id: String) -> Endpoint {
            Endpoint(path: "/api/shipments/\(id)")
        }

        static func rates(body: ShipmentRateRequest) -> Endpoint {
            Endpoint(path: "/api/shipments/rates", method: .post, body: body)
        }

        static func create(body: ShipmentCreateRequest) -> Endpoint {
            Endpoint(path: "/api/shipments", method: .post, body: body)
        }
    }

    // MARK: - Compliance

    enum Compliance {
        static func list(filter: String? = nil) -> Endpoint {
            var items: [URLQueryItem] = []
            if let filter {
                items.append(URLQueryItem(name: "filter", value: filter))
            }
            return Endpoint(path: "/api/compliance", queryItems: items)
        }

        static func closures() -> Endpoint {
            Endpoint(path: "/api/compliance/closures")
        }

        static func form1583(customerId: String) -> Endpoint {
            Endpoint(path: "/api/customers/\(customerId)/form1583")
        }
    }

    // MARK: - Smart Intake

    enum SmartIntake {
        static func analyze(imageData: Data) -> Endpoint {
            Endpoint(path: "/api/packages/smart-intake", method: .post)
        }
    }

    // MARK: - Batch Operations

    enum Batch {
        static func checkOut(packageIds: [String]) -> Endpoint {
            Endpoint(path: "/api/packages/batch/checkout", method: .post, body: BatchCheckOutRequest(packageIds: packageIds))
        }

        static func notify(packageIds: [String]) -> Endpoint {
            Endpoint(path: "/api/packages/batch/notify", method: .post, body: BatchNotifyRequest(packageIds: packageIds))
        }

        static func updateStatus(packageIds: [String], status: String) -> Endpoint {
            Endpoint(path: "/api/packages/batch/status", method: .post, body: BatchStatusRequest(packageIds: packageIds, status: status))
        }

        static func moveStorage(packageIds: [String], location: String) -> Endpoint {
            Endpoint(path: "/api/packages/batch/move", method: .post, body: BatchMoveRequest(packageIds: packageIds, storageLocation: location))
        }
    }

    // MARK: - End of Day

    enum EndOfDay {
        static func list() -> Endpoint {
            Endpoint(path: "/api/end-of-day")
        }

        static func create(body: EndOfDayRequest) -> Endpoint {
            Endpoint(path: "/api/end-of-day", method: .post, body: body)
        }
    }
}
