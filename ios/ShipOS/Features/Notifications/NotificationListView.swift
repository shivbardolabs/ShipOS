import SwiftUI

/// Notification center — history, status, and send.
struct NotificationListView: View {
    @StateObject private var viewModel = NotificationListViewModel()

    var body: some View {
        Group {
            if viewModel.notifications.isEmpty && !viewModel.isLoading {
                SOEmptyState(
                    icon: "bell.slash",
                    title: "No Notifications",
                    message: "Sent notifications will appear here."
                )
            } else {
                List {
                    ForEach(viewModel.notifications, id: \.id) { notification in
                        NotificationRow(notification: notification)
                    }

                    if viewModel.hasMore {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .onAppear {
                                Task { await viewModel.loadMore() }
                            }
                    }
                }
                .listStyle(.plain)
                .refreshable { await viewModel.refresh() }
            }
        }
        .task { await viewModel.load() }
    }
}

// MARK: - Notification Row

struct NotificationRow: View {
    let notification: AppNotification

    var body: some View {
        HStack(spacing: ShipOSTheme.Spacing.md) {
            // Channel icon
            Image(systemName: channelIcon)
                .font(.body)
                .foregroundStyle(channelColor)
                .frame(width: 36, height: 36)
                .background(channelColor.opacity(0.12))
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.xxs) {
                HStack {
                    Text(notification.recipientName ?? "Unknown")
                        .font(ShipOSTheme.Typography.subheadline)
                        .foregroundStyle(ShipOSTheme.Colors.textPrimary)

                    Spacer()

                    SOStatusBadge(statusText, color: statusColor)
                }

                Text(notification.message)
                    .font(ShipOSTheme.Typography.caption)
                    .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                    .lineLimit(2)

                Text(notification.createdAt.relativeFormatted)
                    .font(ShipOSTheme.Typography.caption)
                    .foregroundStyle(ShipOSTheme.Colors.textTertiary)
            }
        }
        .padding(.vertical, ShipOSTheme.Spacing.xs)
    }

    private var channelIcon: String {
        switch notification.type {
        case "sms": "message.fill"
        case "email": "envelope.fill"
        case "push": "bell.fill"
        default: "paperplane.fill"
        }
    }

    private var channelColor: Color {
        switch notification.type {
        case "sms": ShipOSTheme.Colors.success
        case "email": ShipOSTheme.Colors.info
        case "push": ShipOSTheme.Colors.warning
        default: ShipOSTheme.Colors.textSecondary
        }
    }

    private var statusText: String {
        notification.status.capitalized
    }

    private var statusColor: Color {
        switch notification.status {
        case "delivered": ShipOSTheme.Colors.success
        case "sent": ShipOSTheme.Colors.info
        case "failed": ShipOSTheme.Colors.error
        case "pending": ShipOSTheme.Colors.warning
        default: ShipOSTheme.Colors.textTertiary
        }
    }
}

// MARK: - View Model

@MainActor
final class NotificationListViewModel: ObservableObject {
    @Published var notifications: [AppNotification] = []
    @Published var isLoading = false
    @Published var hasMore = true

    private var currentPage = 1
    private let pageSize = 50

    func load() async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            let response: NotificationListResponse = try await APIClient.shared.request(
                API.Notifications.list(page: 1, limit: pageSize)
            )
            notifications = response.notifications.map { $0.toModel() }
            currentPage = 1
            hasMore = response.notifications.count >= pageSize
        } catch {
            print("[Notifications] Error: \(error)")
        }
    }

    func loadMore() async {
        guard hasMore, !isLoading else { return }
        isLoading = true
        defer { isLoading = false }

        let nextPage = currentPage + 1
        do {
            let response: NotificationListResponse = try await APIClient.shared.request(
                API.Notifications.list(page: nextPage, limit: pageSize)
            )
            notifications.append(contentsOf: response.notifications.map { $0.toModel() })
            currentPage = nextPage
            hasMore = response.notifications.count >= pageSize
        } catch {
            print("[Notifications] Load more error: \(error)")
        }
    }

    func refresh() async {
        currentPage = 1
        await load()
    }
}

#Preview {
    NavigationStack {
        NotificationListView()
            .navigationTitle("Notifications")
    }
}
