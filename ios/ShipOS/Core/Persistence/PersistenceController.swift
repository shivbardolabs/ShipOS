import Foundation
import SwiftData

// MARK: - Persistence Controller

/// Manages SwiftData model container and provides offline caching.
@MainActor
final class PersistenceController {
    static let shared = PersistenceController()

    let container: ModelContainer

    private init() {
        let schema = Schema([
            Package.self,
            Customer.self,
            AppNotification.self,
        ])

        let config = ModelConfiguration(
            "ShipOS",
            schema: schema,
            isStoredInMemoryOnly: false,
            allowsSave: true
        )

        do {
            container = try ModelContainer(for: schema, configurations: config)
        } catch {
            fatalError("Failed to initialize SwiftData: \(error)")
        }
    }

    /// Preview / test container (in-memory).
    static var preview: PersistenceController {
        let controller = PersistenceController(inMemory: true)
        // Seed with sample data
        let context = controller.container.mainContext

        let customer = Customer.preview
        context.insert(customer)

        let pkg = Package.preview
        context.insert(pkg)

        return controller
    }

    private init(inMemory: Bool) {
        let schema = Schema([
            Package.self,
            Customer.self,
            AppNotification.self,
        ])

        let config = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: inMemory
        )

        do {
            container = try ModelContainer(for: schema, configurations: config)
        } catch {
            fatalError("Failed to initialize in-memory SwiftData: \(error)")
        }
    }
}

// MARK: - Sync Helpers

extension PersistenceController {
    /// Upsert packages from API response into SwiftData.
    /// Uses batch fetch + dictionary for O(1) lookups instead of N individual queries.
    func syncPackages(_ dtos: [PackageDTO], context: ModelContext) throws {
        let descriptor = FetchDescriptor<Package>()
        let existingPackages = try context.fetch(descriptor)
        let existingById = Dictionary(
            existingPackages.map { ($0.id, $0) },
            uniquingKeysWith: { first, _ in first }
        )

        for dto in dtos {
            if let existing = existingById[dto.id] {
                // Update existing
                existing.trackingNumber = dto.trackingNumber
                existing.carrier = dto.carrier
                existing.status = dto.status
                existing.senderName = dto.senderName
                existing.storageLocation = dto.storageLocation
                existing.notes = dto.notes
                existing.checkedInAt = dto.checkedInAt
                existing.notifiedAt = dto.notifiedAt
                existing.releasedAt = dto.releasedAt
                existing.updatedAt = dto.updatedAt
                existing.customer = dto.customer
            } else {
                // Insert new
                context.insert(dto.toModel())
            }
        }

        try context.save()
    }

    /// Upsert customers from API response.
    /// Uses batch fetch + dictionary for O(1) lookups instead of N individual queries.
    func syncCustomers(_ dtos: [CustomerDTO], context: ModelContext) throws {
        let descriptor = FetchDescriptor<Customer>()
        let existingCustomers = try context.fetch(descriptor)
        let existingById = Dictionary(
            existingCustomers.map { ($0.id, $0) },
            uniquingKeysWith: { first, _ in first }
        )

        for dto in dtos {
            if let existing = existingById[dto.id] {
                existing.firstName = dto.firstName
                existing.lastName = dto.lastName
                existing.email = dto.email
                existing.phone = dto.phone
                existing.pmbNumber = dto.pmbNumber
                existing.status = dto.status
                existing.complianceStatus = dto.complianceStatus
                existing.updatedAt = dto.updatedAt
            } else {
                context.insert(dto.toModel())
            }
        }

        try context.save()
    }
}
