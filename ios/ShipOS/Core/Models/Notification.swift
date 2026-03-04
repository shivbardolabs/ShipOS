import Foundation
import SwiftData

// MARK: - Notification

@Model
final class AppNotification: Identifiable {
    @Attribute(.unique) var id: String
    var type: String          // sms, email, push
    var channel: String?      // sms, email, in_app
    var recipientId: String?
    var recipientName: String?
    var recipientPhone: String?
    var recipientEmail: String?
    var subject: String?
    var message: String
    var status: String        // sent, delivered, failed, pending
    var packageId: String?
    var sentAt: Date?
    var deliveredAt: Date?
    var createdAt: Date
    var updatedAt: Date

    init(
        id: String = UUID().uuidString,
        type: String,
        channel: String? = nil,
        recipientId: String? = nil,
        recipientName: String? = nil,
        recipientPhone: String? = nil,
        recipientEmail: String? = nil,
        subject: String? = nil,
        message: String,
        status: String = "pending",
        packageId: String? = nil,
        sentAt: Date? = nil,
        deliveredAt: Date? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.type = type
        self.channel = channel
        self.recipientId = recipientId
        self.recipientName = recipientName
        self.recipientPhone = recipientPhone
        self.recipientEmail = recipientEmail
        self.subject = subject
        self.message = message
        self.status = status
        self.packageId = packageId
        self.sentAt = sentAt
        self.deliveredAt = deliveredAt
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

// MARK: - API Types

struct NotificationListResponse: Decodable {
    let notifications: [NotificationDTO]
    let total: Int
    let page: Int
    let limit: Int
}

struct NotificationDTO: Decodable, Identifiable {
    let id: String
    let type: String
    let channel: String?
    let recipientId: String?
    let recipientName: String?
    let recipientPhone: String?
    let recipientEmail: String?
    let subject: String?
    let message: String
    let status: String
    let packageId: String?
    let sentAt: Date?
    let deliveredAt: Date?
    let createdAt: Date
    let updatedAt: Date

    func toModel() -> AppNotification {
        AppNotification(
            id: id,
            type: type,
            channel: channel,
            recipientId: recipientId,
            recipientName: recipientName,
            recipientPhone: recipientPhone,
            recipientEmail: recipientEmail,
            subject: subject,
            message: message,
            status: status,
            packageId: packageId,
            sentAt: sentAt,
            deliveredAt: deliveredAt,
            createdAt: createdAt,
            updatedAt: updatedAt
        )
    }
}

struct NotificationSendRequest: Encodable {
    let customerId: String
    let packageId: String?
    let type: String         // sms, email
    let message: String?
    let templateId: String?
}
