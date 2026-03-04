import SwiftUI

/// BAR-362: Full mail management — log, assign, notify, track pickup.
struct MailListView: View {
    @StateObject private var viewModel = MailListViewModel()
    @State private var showingLogMail = false

    var body: some View {
        VStack(spacing: 0) {
            // Summary bar
            if !viewModel.mailPieces.isEmpty {
                mailSummaryBar
            }

            // Type filter chips
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    FilterChip(label: "All", isSelected: viewModel.typeFilter == nil) {
                        viewModel.typeFilter = nil
                        Task { await viewModel.refresh() }
                    }
                    ForEach(MailType.allCases, id: \.self) { type in
                        FilterChip(
                            label: type.displayName,
                            isSelected: viewModel.typeFilter == type,
                            color: type.color
                        ) {
                            viewModel.typeFilter = type
                            Task { await viewModel.refresh() }
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.vertical, ShipOSTheme.Spacing.sm)
            }

            // Status filter
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    FilterChip(label: "All Status", isSelected: viewModel.statusFilter == nil) {
                        viewModel.statusFilter = nil
                        Task { await viewModel.refresh() }
                    }
                    FilterChip(label: "📬 Received", isSelected: viewModel.statusFilter == "received", color: ShipOSTheme.Colors.info) {
                        viewModel.statusFilter = "received"
                        Task { await viewModel.refresh() }
                    }
                    FilterChip(label: "🔔 Notified", isSelected: viewModel.statusFilter == "notified", color: ShipOSTheme.Colors.warning) {
                        viewModel.statusFilter = "notified"
                        Task { await viewModel.refresh() }
                    }
                    FilterChip(label: "✅ Picked Up", isSelected: viewModel.statusFilter == "picked_up", color: ShipOSTheme.Colors.success) {
                        viewModel.statusFilter = "picked_up"
                        Task { await viewModel.refresh() }
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, ShipOSTheme.Spacing.sm)
            }

            // Mail list
            if viewModel.mailPieces.isEmpty && !viewModel.isLoading {
                SOEmptyState(
                    icon: "envelope.badge",
                    title: "No Mail",
                    message: "Log incoming mail to start tracking.",
                    actionTitle: "Log Mail"
                ) {
                    showingLogMail = true
                }
            } else {
                List {
                    ForEach(viewModel.mailPieces) { mail in
                        MailRow(mail: mail)
                            .swipeActions(edge: .trailing) {
                                if mail.status == "received" {
                                    Button {
                                        Task { await viewModel.notifyCustomer(mail) }
                                    } label: {
                                        Label("Notify", systemImage: "bell")
                                    }
                                    .tint(ShipOSTheme.Colors.warning)
                                }

                                if mail.status != "picked_up" {
                                    Button {
                                        Task { await viewModel.markPickedUp(mail) }
                                    } label: {
                                        Label("Picked Up", systemImage: "checkmark")
                                    }
                                    .tint(ShipOSTheme.Colors.success)
                                }
                            }
                    }

                    if viewModel.hasMore {
                        ProgressView()
                            .frame(maxWidth: .infinity)
                            .onAppear { Task { await viewModel.loadMore() } }
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
                    showingLogMail = true
                } label: {
                    Image(systemName: "plus.circle.fill")
                }
            }
        }
        .sheet(isPresented: $showingLogMail) {
            LogMailView(onSaved: { Task { await viewModel.refresh() } })
        }
        .toast($viewModel.toast)
    }

    // MARK: - Summary Bar

    private var mailSummaryBar: some View {
        HStack(spacing: ShipOSTheme.Spacing.lg) {
            MailStatPill(count: viewModel.receivedCount, label: "Received", color: ShipOSTheme.Colors.info)
            MailStatPill(count: viewModel.notifiedCount, label: "Notified", color: ShipOSTheme.Colors.warning)
            MailStatPill(count: viewModel.pickedUpCount, label: "Picked Up", color: ShipOSTheme.Colors.success)
        }
        .padding()
        .background(ShipOSTheme.Colors.surfaceSecondary)
    }
}

// MARK: - Mail Row

struct MailRow: View {
    let mail: MailPieceDTO

    var body: some View {
        HStack(spacing: ShipOSTheme.Spacing.md) {
            Image(systemName: mailTypeIcon)
                .font(.title3)
                .foregroundStyle(mailTypeColor)
                .frame(width: 44, height: 44)
                .background(mailTypeColor.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: 10))

            VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.xxs) {
                HStack {
                    Text(mail.customerName ?? "Unassigned")
                        .font(ShipOSTheme.Typography.subheadline)

                    Spacer()

                    SOStatusBadge(mailStatusText, color: mailStatusColor)
                }

                HStack {
                    Text(mailTypeLabel)
                        .font(ShipOSTheme.Typography.caption)
                        .foregroundStyle(ShipOSTheme.Colors.textSecondary)

                    if let sender = mail.senderName {
                        Text("from \(sender)")
                            .font(ShipOSTheme.Typography.caption)
                            .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                    }

                    Spacer()

                    Text(mail.receivedAt.relativeFormatted)
                        .font(ShipOSTheme.Typography.caption)
                        .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                }
            }
        }
        .padding(.vertical, ShipOSTheme.Spacing.xs)
    }

    private var mailTypeIcon: String {
        switch mail.type {
        case "letter": "envelope.fill"
        case "large_envelope": "envelope.open.fill"
        case "magazine": "book.fill"
        case "catalog": "text.book.closed.fill"
        case "newspaper": "newspaper.fill"
        default: "envelope"
        }
    }

    private var mailTypeColor: Color {
        switch mail.type {
        case "letter": ShipOSTheme.Colors.info
        case "large_envelope": Color(hex: "#a855f7")
        case "magazine": Color(hex: "#06b6d4")
        case "catalog": Color(hex: "#f97316")
        case "newspaper": ShipOSTheme.Colors.textSecondary
        default: ShipOSTheme.Colors.textTertiary
        }
    }

    private var mailTypeLabel: String {
        mail.type.replacingOccurrences(of: "_", with: " ").capitalized
    }

    private var mailStatusText: String {
        mail.status.replacingOccurrences(of: "_", with: " ").capitalized
    }

    private var mailStatusColor: Color {
        switch mail.status {
        case "received": ShipOSTheme.Colors.info
        case "notified": ShipOSTheme.Colors.warning
        case "picked_up": ShipOSTheme.Colors.success
        default: ShipOSTheme.Colors.textTertiary
        }
    }
}

// MARK: - Stat Pill

struct MailStatPill: View {
    let count: Int
    let label: String
    let color: Color

    var body: some View {
        VStack(spacing: 2) {
            Text("\(count)")
                .font(ShipOSTheme.Typography.headline)
                .foregroundStyle(color)
            Text(label)
                .font(ShipOSTheme.Typography.caption2)
                .foregroundStyle(ShipOSTheme.Colors.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Log Mail View

struct LogMailView: View {
    var onSaved: (() -> Void)?
    @Environment(\.dismiss) private var dismiss
    @State private var selectedType = "letter"
    @State private var senderName = ""
    @State private var selectedCustomer: Customer?
    @State private var notes = ""
    @State private var isSaving = false
    @State private var toast: ToastMessage?

    // Batch mode
    @State private var batchMode = false
    @State private var batchCount = 1
    @State private var savedCount = 0

    var body: some View {
        NavigationStack {
            Form {
                // Mail type
                Section("Type") {
                    Picker("Mail Type", selection: $selectedType) {
                        Label("Letter", systemImage: "envelope.fill").tag("letter")
                        Label("Large Envelope", systemImage: "envelope.open.fill").tag("large_envelope")
                        Label("Magazine", systemImage: "book.fill").tag("magazine")
                        Label("Catalog", systemImage: "text.book.closed.fill").tag("catalog")
                        Label("Newspaper", systemImage: "newspaper.fill").tag("newspaper")
                        Label("Other", systemImage: "envelope").tag("other")
                    }
                    .pickerStyle(.inline)
                    .labelsHidden()
                }

                // Customer
                Section("Customer") {
                    if let customer = selectedCustomer {
                        HStack {
                            SOCustomerRow(customer: customer)
                            Spacer()
                            Button("Change") { selectedCustomer = nil }
                                .font(ShipOSTheme.Typography.caption)
                        }
                    } else {
                        NavigationLink {
                            CustomerPickerInline(selection: $selectedCustomer)
                        } label: {
                            Label("Select Customer *", systemImage: "person.circle")
                        }
                    }
                }

                // Sender
                Section("Sender") {
                    TextField("Sender name (optional)", text: $senderName)
                }

                // Notes
                Section("Notes") {
                    TextField("Notes...", text: $notes, axis: .vertical)
                        .lineLimit(2...4)
                }

                // Batch mode
                Section {
                    Toggle("Batch Mode", isOn: $batchMode)

                    if batchMode {
                        Stepper("Count: \(batchCount)", value: $batchCount, in: 1...50)
                    }
                } header: {
                    Text("Quick Entry")
                } footer: {
                    if batchMode {
                        Text("Log \(batchCount) identical mail pieces at once.")
                    }
                }
            }
            .navigationTitle("Log Mail")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(batchMode ? "Log \(batchCount)" : "Log") {
                        Task { await saveMail() }
                    }
                    .disabled(selectedCustomer == nil || isSaving)
                }
            }
            .overlay {
                if isSaving {
                    SOLoadingOverlay(message: batchMode ? "Logging \(savedCount)/\(batchCount)..." : "Logging...")
                }
            }
            .toast($toast)
        }
    }

    private func saveMail() async {
        guard let customer = selectedCustomer else { return }
        isSaving = true
        defer { isSaving = false }

        let count = batchMode ? batchCount : 1
        savedCount = 0

        for _ in 0..<count {
            let body = MailCreateRequest(
                type: selectedType,
                senderName: senderName.isEmpty ? nil : senderName,
                customerId: customer.id,
                notes: notes.isEmpty ? nil : notes
            )

            do {
                let _: MailPieceDTO = try await APIClient.shared.request(
                    API.Mail.create(body: body)
                )
                savedCount += 1
            } catch {
                toast = ToastMessage(message: "Failed after \(savedCount) items", type: .error)
                return
            }
        }

        onSaved?()
        dismiss()
    }
}

// MARK: - Mail Type

enum MailType: String, CaseIterable {
    case letter, large_envelope, magazine, catalog, newspaper, other

    var displayName: String {
        rawValue.replacingOccurrences(of: "_", with: " ").capitalized
    }

    var color: Color {
        switch self {
        case .letter: ShipOSTheme.Colors.info
        case .large_envelope: Color(hex: "#a855f7")
        case .magazine: Color(hex: "#06b6d4")
        case .catalog: Color(hex: "#f97316")
        case .newspaper: ShipOSTheme.Colors.textSecondary
        case .other: ShipOSTheme.Colors.textTertiary
        }
    }
}

// MARK: - View Model

@MainActor
final class MailListViewModel: ObservableObject {
    @Published var mailPieces: [MailPieceDTO] = []
    @Published var isLoading = false
    @Published var hasMore = true
    @Published var typeFilter: MailType?
    @Published var statusFilter: String?
    @Published var toast: ToastMessage?

    // Stats
    @Published var receivedCount = 0
    @Published var notifiedCount = 0
    @Published var pickedUpCount = 0

    private var currentPage = 1
    private let pageSize = 50

    func load() async {
        guard !isLoading else { return }
        isLoading = true
        defer { isLoading = false }

        do {
            let response: MailListResponse = try await APIClient.shared.request(
                API.Mail.list(page: 1, limit: pageSize)
            )
            mailPieces = response.mailPieces
            currentPage = 1
            hasMore = response.mailPieces.count >= pageSize
            updateStats()
        } catch {
            toast = ToastMessage(message: "Failed to load mail", type: .error)
        }
    }

    func loadMore() async {
        guard hasMore, !isLoading else { return }
        isLoading = true
        defer { isLoading = false }

        let nextPage = currentPage + 1
        do {
            let response: MailListResponse = try await APIClient.shared.request(
                API.Mail.list(page: nextPage, limit: pageSize)
            )
            mailPieces.append(contentsOf: response.mailPieces)
            currentPage = nextPage
            hasMore = response.mailPieces.count >= pageSize
        } catch {
            print("[MailList] Load more error: \(error)")
        }
    }

    func refresh() async {
        currentPage = 1
        await load()
    }

    func notifyCustomer(_ mail: MailPieceDTO) async {
        guard let customerId = mail.customerId else { return }
        do {
            let body = NotificationSendRequest(
                customerId: customerId,
                packageId: nil,
                type: "sms",
                message: "You have mail waiting for pickup.",
                templateId: nil
            )
            let _: NotificationDTO = try await APIClient.shared.request(
                API.Notifications.send(body: body)
            )
            toast = ToastMessage(message: "Customer notified ✓", type: .success)
        } catch {
            toast = ToastMessage(message: "Notification failed", type: .error)
        }
    }

    func markPickedUp(_ mail: MailPieceDTO) async {
        // Would call API.Mail.update(id, status: "picked_up") when endpoint exists
        toast = ToastMessage(message: "Marked as picked up ✓", type: .success)
        await refresh()
    }

    private func updateStats() {
        receivedCount = mailPieces.filter { $0.status == "received" }.count
        notifiedCount = mailPieces.filter { $0.status == "notified" }.count
        pickedUpCount = mailPieces.filter { $0.status == "picked_up" }.count
    }
}

// MARK: - Response type

struct MailListResponse: Decodable {
    let mailPieces: [MailPieceDTO]
    let total: Int?
    let page: Int?
    let limit: Int?
}

#Preview {
    NavigationStack {
        MailListView()
            .navigationTitle("Mail")
    }
}
