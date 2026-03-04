import SwiftUI

/// BAR-364: End of Day — daily closeout report with carrier pickups, held items, stats, PDF export.
struct EndOfDayView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var viewModel = EndOfDayViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: ShipOSTheme.Spacing.lg) {
                    // Header
                    headerSection

                    // Today's stats
                    statsSection

                    // Carrier pickups
                    carrierPickupsSection

                    // Unclaimed packages
                    unclaimedSection

                    // Held packages
                    heldSection

                    // Storage utilization
                    storageSection

                    // Notes
                    notesSection

                    // Actions
                    actionsSection
                }
                .padding()
            }
            .navigationTitle("End of Day")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
            .task { await viewModel.load() }
            .overlay {
                if viewModel.isLoading {
                    SOLoadingOverlay(message: "Loading report...")
                }
                if viewModel.isSubmitting {
                    SOLoadingOverlay(message: "Generating report...")
                }
            }
            .toast($viewModel.toast)
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(spacing: ShipOSTheme.Spacing.sm) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Daily Closeout Report")
                        .font(ShipOSTheme.Typography.title2)
                    Text(Date().formatted(date: .complete, time: .omitted))
                        .font(ShipOSTheme.Typography.subheadline)
                        .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                }
                Spacer()

                SOStatusBadge(
                    viewModel.isSubmitted ? "Submitted" : "Draft",
                    color: viewModel.isSubmitted ? ShipOSTheme.Colors.success : ShipOSTheme.Colors.warning
                )
            }
        }
    }

    // MARK: - Stats

    private var statsSection: some View {
        SOCard {
            VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                SOSectionHeader(title: "Today's Activity")

                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: ShipOSTheme.Spacing.md) {
                    EODStat(value: "\(viewModel.checkedInToday)", label: "Checked In", icon: "arrow.down.circle", color: ShipOSTheme.Colors.info)
                    EODStat(value: "\(viewModel.checkedOutToday)", label: "Checked Out", icon: "checkmark.circle", color: ShipOSTheme.Colors.success)
                    EODStat(value: "\(viewModel.notifiedToday)", label: "Notified", icon: "bell", color: ShipOSTheme.Colors.warning)
                }

                Divider()

                LazyVGrid(columns: [
                    GridItem(.flexible()),
                    GridItem(.flexible()),
                    GridItem(.flexible())
                ], spacing: ShipOSTheme.Spacing.md) {
                    EODStat(value: "\(viewModel.totalHeld)", label: "Total Held", icon: "tray.full", color: Color(hex: "#a855f7"))
                    EODStat(value: "\(viewModel.unclaimedCount)", label: "Unclaimed", icon: "exclamationmark.triangle", color: ShipOSTheme.Colors.error)
                    EODStat(value: "\(viewModel.mailReceived)", label: "Mail", icon: "envelope", color: Color(hex: "#06b6d4"))
                }
            }
        }
    }

    // MARK: - Carrier Pickups

    private var carrierPickupsSection: some View {
        SOCard {
            VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                SOSectionHeader(title: "Carrier Pickups")

                ForEach(viewModel.carriers, id: \.name) { carrier in
                    HStack(spacing: ShipOSTheme.Spacing.md) {
                        Button {
                            viewModel.toggleCarrierPickup(carrier.name)
                        } label: {
                            Image(systemName: viewModel.confirmedPickups.contains(carrier.name) ? "checkmark.square.fill" : "square")
                                .font(.title3)
                                .foregroundStyle(viewModel.confirmedPickups.contains(carrier.name) ? ShipOSTheme.Colors.success : ShipOSTheme.Colors.textTertiary)
                        }
                        .buttonStyle(.plain)

                        Image(systemName: "shippingbox.fill")
                            .foregroundStyle(carrier.color)

                        Text(carrier.name)
                            .font(ShipOSTheme.Typography.body)

                        Spacer()

                        if let time = carrier.scheduledTime {
                            Text(time)
                                .font(ShipOSTheme.Typography.caption)
                                .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                        }

                        Text("\(carrier.outgoingCount) outgoing")
                            .font(ShipOSTheme.Typography.caption)
                            .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                    }
                    .padding(.vertical, ShipOSTheme.Spacing.xs)

                    if carrier.name != viewModel.carriers.last?.name {
                        Divider()
                    }
                }
            }
        }
    }

    // MARK: - Unclaimed Packages

    private var unclaimedSection: some View {
        SOCard {
            VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                SOSectionHeader(title: "Unclaimed Packages", count: viewModel.unclaimedPackages.count)

                if viewModel.unclaimedPackages.isEmpty {
                    HStack {
                        Image(systemName: "checkmark.seal.fill")
                            .foregroundStyle(ShipOSTheme.Colors.success)
                        Text("No unclaimed packages!")
                            .font(ShipOSTheme.Typography.body)
                            .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                    }
                } else {
                    ForEach(viewModel.unclaimedPackages.prefix(10), id: \.id) { pkg in
                        HStack(spacing: ShipOSTheme.Spacing.md) {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(pkg.trackingNumber)
                                    .font(ShipOSTheme.Typography.monoSmall)
                                    .lineLimit(1)
                                if let carrier = pkg.carrier {
                                    Text(carrier)
                                        .font(ShipOSTheme.Typography.caption)
                                        .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                                }
                            }

                            Spacer()

                            if let days = pkg.daysHeld {
                                Text("\(days)d")
                                    .font(ShipOSTheme.Typography.caption)
                                    .foregroundStyle(days > 14 ? ShipOSTheme.Colors.error : ShipOSTheme.Colors.warning)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 2)
                                    .background((days > 14 ? ShipOSTheme.Colors.error : ShipOSTheme.Colors.warning).opacity(0.12))
                                    .clipShape(Capsule())
                            }
                        }

                        if pkg.id != viewModel.unclaimedPackages.prefix(10).last?.id {
                            Divider()
                        }
                    }

                    if viewModel.unclaimedPackages.count > 10 {
                        Text("+ \(viewModel.unclaimedPackages.count - 10) more")
                            .font(ShipOSTheme.Typography.caption)
                            .foregroundStyle(ShipOSTheme.Colors.primary)
                    }
                }
            }
        }
    }

    // MARK: - Held Packages

    private var heldSection: some View {
        SOCard {
            VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                SOSectionHeader(title: "Held Packages", count: viewModel.heldPackages.count)

                if viewModel.heldPackages.isEmpty {
                    Text("No packages on hold")
                        .font(ShipOSTheme.Typography.body)
                        .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                } else {
                    ForEach(viewModel.heldPackages.prefix(5), id: \.id) { pkg in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(pkg.trackingNumber)
                                    .font(ShipOSTheme.Typography.monoSmall)
                                    .lineLimit(1)
                                if let deadline = pkg.holdDeadline {
                                    Text("Deadline: \(deadline.shortFormatted)")
                                        .font(ShipOSTheme.Typography.caption)
                                        .foregroundStyle(deadline < Date() ? ShipOSTheme.Colors.error : ShipOSTheme.Colors.textTertiary)
                                }
                            }
                            Spacer()
                            SOStatusBadge("Held", color: Color(hex: "#a855f7"))
                        }
                    }
                }
            }
        }
    }

    // MARK: - Storage

    private var storageSection: some View {
        SOCard {
            VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                SOSectionHeader(title: "Storage Overview")

                ForEach(viewModel.storageLocations, id: \.name) { location in
                    VStack(spacing: ShipOSTheme.Spacing.xs) {
                        HStack {
                            Text(location.name)
                                .font(ShipOSTheme.Typography.subheadline)
                            Spacer()
                            Text("\(location.count)")
                                .font(ShipOSTheme.Typography.subheadline)
                                .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                        }

                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(ShipOSTheme.Colors.surfaceSecondary)
                                RoundedRectangle(cornerRadius: 4)
                                    .fill(location.utilization > 0.8 ? ShipOSTheme.Colors.error :
                                            location.utilization > 0.6 ? ShipOSTheme.Colors.warning :
                                            ShipOSTheme.Colors.success)
                                    .frame(width: geo.size.width * CGFloat(location.utilization))
                            }
                        }
                        .frame(height: 8)
                    }
                }
            }
        }
    }

    // MARK: - Notes

    private var notesSection: some View {
        SOCard {
            VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                SOSectionHeader(title: "Closing Notes")
                TextField("Any notes for tomorrow's shift...", text: $viewModel.notes, axis: .vertical)
                    .lineLimit(3...6)
                    .font(ShipOSTheme.Typography.body)
            }
        }
    }

    // MARK: - Actions

    private var actionsSection: some View {
        VStack(spacing: ShipOSTheme.Spacing.md) {
            Button {
                Task { await viewModel.submitReport() }
            } label: {
                Label("Submit End of Day Report", systemImage: "checkmark.seal.fill")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(SOPrimaryButtonStyle())
            .disabled(viewModel.isSubmitted)

            HStack(spacing: ShipOSTheme.Spacing.md) {
                Button {
                    Task { await viewModel.exportPDF() }
                } label: {
                    Label("Export PDF", systemImage: "doc.fill")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SOSecondaryButtonStyle())

                Button {
                    viewModel.shareReport()
                } label: {
                    Label("Share", systemImage: "square.and.arrow.up")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(SOSecondaryButtonStyle())
            }
        }
    }
}

// MARK: - EOD Stat

struct EODStat: View {
    let value: String
    let label: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(color)
            Text(value)
                .font(ShipOSTheme.Typography.headline)
            Text(label)
                .font(ShipOSTheme.Typography.caption2)
                .foregroundStyle(ShipOSTheme.Colors.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Supporting Types

struct CarrierPickup: Identifiable {
    let id = UUID()
    let name: String
    let color: Color
    let scheduledTime: String?
    let outgoingCount: Int
}

struct UnclaimedPackage: Identifiable {
    let id: String
    let trackingNumber: String
    let carrier: String?
    let daysHeld: Int?
}

struct StorageLocationStat: Identifiable {
    let id = UUID()
    let name: String
    let count: Int
    let capacity: Int
    var utilization: Double { capacity > 0 ? Double(count) / Double(capacity) : 0 }
}

// MARK: - View Model

@MainActor
final class EndOfDayViewModel: ObservableObject {
    @Published var isLoading = false
    @Published var isSubmitting = false
    @Published var isSubmitted = false
    @Published var toast: ToastMessage?

    // Stats
    @Published var checkedInToday = 0
    @Published var checkedOutToday = 0
    @Published var notifiedToday = 0
    @Published var totalHeld = 0
    @Published var unclaimedCount = 0
    @Published var mailReceived = 0

    // Sections
    @Published var carriers: [CarrierPickup] = []
    @Published var confirmedPickups: Set<String> = []
    @Published var unclaimedPackages: [UnclaimedPackage] = []
    @Published var heldPackages: [Package] = []
    @Published var storageLocations: [StorageLocationStat] = []
    @Published var notes = ""

    func load() async {
        isLoading = true
        defer { isLoading = false }

        // Load dashboard stats
        do {
            let stats: DashboardStats = try await APIClient.shared.request(
                API.Dashboard.stats()
            )
            checkedInToday = stats.overview.checkedInToday
            checkedOutToday = stats.overview.releasedToday
            notifiedToday = stats.overview.pendingNotification
            totalHeld = stats.overview.packagesHeld
            unclaimedCount = stats.overview.storageAlerts
            mailReceived = 0 // From mail endpoint
        } catch {
            print("[EOD] Stats error: \(error)")
        }

        // Load held packages
        do {
            let response: PackageListResponse = try await APIClient.shared.request(
                API.Packages.list(status: .held, page: 1, limit: 20)
            )
            heldPackages = response.packages.map { $0.toModel() }
        } catch {
            print("[EOD] Held packages error: \(error)")
        }

        // Load unclaimed (checked in > 3 days)
        do {
            let response: PackageListResponse = try await APIClient.shared.request(
                API.Packages.list(status: .checkedIn, page: 1, limit: 50)
            )
            let threeDaysAgo = Date().addingTimeInterval(-3 * 86400)
            unclaimedPackages = response.packages
                .filter { ($0.checkedInAt ?? $0.createdAt) < threeDaysAgo }
                .map { dto in
                    let days = Calendar.current.dateComponents([.day], from: dto.checkedInAt ?? dto.createdAt, to: Date()).day ?? 0
                    return UnclaimedPackage(
                        id: dto.id,
                        trackingNumber: dto.trackingNumber,
                        carrier: dto.carrier,
                        daysHeld: days
                    )
                }
                .sorted { ($0.daysHeld ?? 0) > ($1.daysHeld ?? 0) }
            unclaimedCount = unclaimedPackages.count
        } catch {
            print("[EOD] Unclaimed error: \(error)")
        }

        // Populate carriers
        carriers = [
            CarrierPickup(name: "USPS", color: .blue, scheduledTime: "3:00 PM", outgoingCount: 0),
            CarrierPickup(name: "UPS", color: Color(hex: "#421B01"), scheduledTime: "5:30 PM", outgoingCount: 0),
            CarrierPickup(name: "FedEx", color: Color(hex: "#4D148C"), scheduledTime: "4:00 PM", outgoingCount: 0),
            CarrierPickup(name: "DHL", color: Color(hex: "#D40511"), scheduledTime: nil, outgoingCount: 0),
        ]

        // Storage locations (mock until API provides capacity data)
        storageLocations = [
            StorageLocationStat(name: "Shelf A", count: 12, capacity: 20),
            StorageLocationStat(name: "Shelf B", count: 18, capacity: 20),
            StorageLocationStat(name: "Shelf C", count: 5, capacity: 20),
            StorageLocationStat(name: "Back Room", count: 8, capacity: 30),
            StorageLocationStat(name: "Overflow", count: 3, capacity: 50),
        ]
    }

    func toggleCarrierPickup(_ name: String) {
        if confirmedPickups.contains(name) {
            confirmedPickups.remove(name)
        } else {
            confirmedPickups.insert(name)
        }
        UISelectionFeedbackGenerator().selectionChanged()
    }

    func submitReport() async {
        isSubmitting = true
        defer { isSubmitting = false }

        let body = EndOfDayRequest(
            notes: notes.isEmpty ? nil : notes,
            carrierPickups: Array(confirmedPickups)
        )

        do {
            let _: [String: String] = try await APIClient.shared.request(
                API.EndOfDay.create(body: body)
            )
            isSubmitted = true
            UINotificationFeedbackGenerator().notificationOccurred(.success)
            toast = ToastMessage(message: "End of day report submitted ✓", type: .success)
        } catch {
            toast = ToastMessage(message: "Failed to submit report", type: .error)
        }
    }

    func exportPDF() async {
        toast = ToastMessage(message: "PDF export coming soon", type: .info)
    }

    func shareReport() {
        toast = ToastMessage(message: "Share coming soon", type: .info)
    }
}

#Preview {
    EndOfDayView()
}
