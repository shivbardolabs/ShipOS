import SwiftUI

/// BAR-359: Notification center — history, send, batch notify, filter by channel/status.
struct NotificationListView: View {
    @StateObject private var viewModel = NotificationListViewModel()
    @State private var showingSendSheet = false

    var body: some View {
        VStack(spacing: 0) {
            // Channel filter
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    FilterChip(label: "All", isSelected: viewModel.channelFilter == nil) {
                        viewModel.channelFilter = nil
                        Task { await viewModel.refresh() }
                    }
                    FilterChip(label: "📱 SMS", isSelected: viewModel.channelFilter == "sms", color: ShipOSTheme.Colors.success) {
                        viewModel.channelFilter = "sms"
                        Task { await viewModel.refresh() }
                    }
                    FilterChip(label: "📧 Email", isSelected: viewModel.channelFilter == "email", color: ShipOSTheme.Colors.info) {
                        viewModel.channelFilter = "email"
                        Task { await viewModel.refresh() }
                    }
                    FilterChip(label: "🔔 Push", isSelected: viewModel.channelFilter == "push", color: ShipOSTheme.Colors.warning) {
                        viewModel.channelFilter = "push"
                        Task { await viewModel.refresh() }
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, ShipOSTheme.Spacing.sm)
            }

            // Batch notify banner
            if viewModel.pendingNotifyCount > 0 {
                batchNotifyBanner
            }

            // Notification list
            if viewModel.notifications.isEmpty && !viewModel.isLoading {
                SOEmptyState(
                    icon: "bell.slash",
                    title: "No Notifications",
                    message: "Sent notifications will appear here.",
                    actionTitle: "Send Notification"
                ) {
                    showingSendSheet = true
                }
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
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button {
                    showingSendSheet = true
                } label: {
                    Image(systemName: "paperplane.fill")
                }
            }
        }
        .sheet(isPresented: $showingSendSheet) {
            SendNotificationView(onSent: {
                Task { await viewModel.refresh() }
            })
        }
        .toast($viewModel.toast)
    }

    // MARK: - Batch Notify Banner

    private var batchNotifyBanner: some View {
        HStack(spacing: ShipOSTheme.Spacing.md) {
            Image(systemName: "bell.badge.fill")
                .foregroundStyle(ShipOSTheme.Colors.warning)

            VStack(alignment: .leading, spacing: 2) {
                Text("\(viewModel.pendingNotifyCount) packages awaiting notification")
                    .font(ShipOSTheme.Typography.subheadline)
                Text("Customers haven't been notified yet")
                    .font(ShipOSTheme.Typography.caption)
                    .foregroundStyle(ShipOSTheme.Colors.textSecondary)
            }

            Spacer()

            Button("Notify All") {
                Task { await viewModel.batchNotify() }
            }
            .buttonStyle(SOPillButtonStyle())
        }
        .padding()
        .background(ShipOSTheme.Colors.warning.opacity(0.08))
        .overlay(
            Rectangle()
                .frame(height: 1)
                .foregroundStyle(ShipOSTheme.Colors.warning.opacity(0.2)),
            alignment: .bottom
        )
    }
}

// MARK: - Notification Row

struct NotificationRow: View {
    let notification: AppNotification

    var body: some View {
        HStack(spacing: ShipOSTheme.Spacing.md) {
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
    @Published var channelFilter: String?
    @Published var pendingNotifyCount = 0
    @Published var toast: ToastMessage?

    private var currentPage = 1
    private let pageSize = 50

    func load() async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            async let notifTask: NotificationListResponse = APIClient.shared.request(
                API.Notifications.list(page: 1, limit: pageSize)
            )
            async let pendingTask: PackageListResponse = APIClient.shared.request(
                API.Packages.list(status: .checkedIn, page: 1, limit: 1)
            )

            let (notifResponse, pendingResponse) = try await (notifTask, pendingTask)
            notifications = notifResponse.notifications.map { $0.toModel() }
            pendingNotifyCount = pendingResponse.total ?? 0
            currentPage = 1
            hasMore = notifResponse.notifications.count >= pageSize
        } catch {
            toast = ToastMessage(message: "Failed to load notifications", type: .error)
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

    func batchNotify() async {
        do {
            let _: [String: Int] = try await APIClient.shared.request(
                API.Notifications.batchNotify()
            )
            toast = ToastMessage(message: "Batch notifications sent ✓", type: .success)
            pendingNotifyCount = 0
            await refresh()
        } catch {
            toast = ToastMessage(message: "Batch notify failed", type: .error)
        }
    }
}

// MARK: - Send Notification View

struct SendNotificationView: View {
    var onSent: (() -> Void)?
    @Environment(\.dismiss) private var dismiss
    @State private var selectedCustomer: Customer?
    @State private var channel = "sms"
    @State private var message = ""
    @State private var isSending = false
    @State private var toast: ToastMessage?

    var body: some View {
        NavigationStack {
            Form {
                Section("Recipient") {
                    if let customer = selectedCustomer {
                        HStack {
                            SOCustomerRow(customer: customer)
                            Spacer()
                            Button("Change") {
                                selectedCustomer = nil
                            }
                            .font(ShipOSTheme.Typography.caption)
                        }
                    } else {
                        NavigationLink {
                            CustomerPickerInline(selection: $selectedCustomer)
                        } label: {
                            Label("Select Customer", systemImage: "person.circle")
                        }
                    }
                }

                Section("Channel") {
                    Picker("Send via", selection: $channel) {
                        Label("SMS", systemImage: "message.fill").tag("sms")
                        Label("Email", systemImage: "envelope.fill").tag("email")
                    }
                    .pickerStyle(.segmented)
                }

                Section("Message") {
                    TextField("Custom message (optional)...", text: $message, axis: .vertical)
                        .lineLimit(4...)
                    Text("Leave blank to send the default notification template.")
                        .font(ShipOSTheme.Typography.caption)
                        .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                }
            }
            .navigationTitle("Send Notification")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Send") {
                        Task { await send() }
                    }
                    .disabled(selectedCustomer == nil || isSending)
                }
            }
            .overlay {
                if isSending { SOLoadingOverlay(message: "Sending...") }
            }
            .toast($toast)
        }
    }

    private func send() async {
        guard let customer = selectedCustomer else { return }
        isSending = true
        defer { isSending = false }

        let body = NotificationSendRequest(
            customerId: customer.id,
            packageId: nil,
            channel: channel,
            message: message.isEmpty ? nil : message
        )

        do {
            let _: NotificationDTO = try await APIClient.shared.request(
                API.Notifications.send(body: body)
            )
            onSent?()
            dismiss()
        } catch let error as APIError {
            toast = ToastMessage(message: error.userMessage, type: .error)
        } catch {
            toast = ToastMessage(message: "Send failed", type: .error)
        }
    }
}

// CustomerPickerInline is defined in CustomerPickerInline.swift

#Preview {
    NavigationStack {
        NotificationListView()
            .navigationTitle("Notifications")
    }
}
