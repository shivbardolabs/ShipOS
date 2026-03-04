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
    func syncPackages(_ dtos: [PackageDTO], context: ModelContext) throws {
        for dto in dtos {
            let descriptor = FetchDescriptor<Package>(
                predicate: #Predicate { $0.id == dto.id }
            )

            if let existing = try context.fetch(descriptor).first {
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
    func syncCustomers(_ dtos: [CustomerDTO], context: ModelContext) throws {
        for dto in dtos {
            let descriptor = FetchDescriptor<Customer>(
                predicate: #Predicate { $0.id == dto.id }
            )

            if let existing = try context.fetch(descriptor).first {
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
