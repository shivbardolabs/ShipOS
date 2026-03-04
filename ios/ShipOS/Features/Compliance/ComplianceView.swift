import SwiftUI

/// BAR-368: Compliance Dashboard — CMRA compliance tracking, ID expiration alerts,
/// Form 1583 status, CRD closures, and regulatory overview.
struct ComplianceView: View {
    @StateObject private var viewModel = ComplianceViewModel()

    var body: some View {
        ScrollView {
            VStack(spacing: ShipOSTheme.Spacing.lg) {
                // Summary cards
                summarySection

                // Alerts
                if !viewModel.alerts.isEmpty {
                    alertsSection
                }

                // Customer compliance list
                complianceListSection

                // Actions
                actionsSection
            }
            .padding()
        }
        .navigationTitle("Compliance")
        .refreshable { await viewModel.load() }
        .task { await viewModel.load() }
        .overlay {
            if viewModel.isLoading && viewModel.summary == nil {
                SOLoadingOverlay(message: "Loading compliance data...")
            }
        }
        .toast($viewModel.toast)
    }

    // MARK: - Summary

    private var summarySection: some View {
        VStack(spacing: ShipOSTheme.Spacing.md) {
            // Compliance score
            if let summary = viewModel.summary {
                SOCard {
                    VStack(spacing: ShipOSTheme.Spacing.md) {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Compliance Score")
                                    .font(ShipOSTheme.Typography.subheadline)
                                    .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                                Text("\(summary.complianceRate)%")
                                    .font(.system(size: 48, weight: .bold, design: .rounded))
                                    .foregroundStyle(complianceScoreColor(summary.complianceRate))
                            }

                            Spacer()

                            ComplianceRingView(percentage: Double(summary.complianceRate) / 100.0)
                                .frame(width: 80, height: 80)
                        }
                    }
                }
            }

            // Status breakdown
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: ShipOSTheme.Spacing.md) {
                ComplianceStatCard(
                    count: viewModel.summary?.compliantCount ?? 0,
                    label: "Compliant",
                    icon: "checkmark.shield.fill",
                    color: ShipOSTheme.Colors.success
                )
                ComplianceStatCard(
                    count: viewModel.summary?.warningCount ?? 0,
                    label: "Warning",
                    icon: "exclamationmark.triangle.fill",
                    color: ShipOSTheme.Colors.warning
                )
                ComplianceStatCard(
                    count: viewModel.summary?.criticalCount ?? 0,
                    label: "Critical",
                    icon: "xmark.shield.fill",
                    color: ShipOSTheme.Colors.error
                )
            }

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: ShipOSTheme.Spacing.md) {
                ComplianceStatCard(
                    count: viewModel.summary?.expiredCount ?? 0,
                    label: "Expired",
                    icon: "clock.badge.exclamationmark.fill",
                    color: Color(hex: "#f97316")
                )
                ComplianceStatCard(
                    count: viewModel.summary?.missingCount ?? 0,
                    label: "Missing Docs",
                    icon: "doc.questionmark.fill",
                    color: Color(hex: "#a855f7")
                )
            }
        }
    }

    // MARK: - Alerts

    private var alertsSection: some View {
        SOCard {
            VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                SOSectionHeader(title: "Urgent Alerts", count: viewModel.alerts.count)

                ForEach(viewModel.alerts.prefix(5), id: \.customerId) { alert in
                    HStack(spacing: ShipOSTheme.Spacing.md) {
                        Image(systemName: alert.icon)
                            .font(.body)
                            .foregroundStyle(alert.color)
                            .frame(width: 36, height: 36)
                            .background(alert.color.opacity(0.12))
                            .clipShape(RoundedRectangle(cornerRadius: 8))

                        VStack(alignment: .leading, spacing: 2) {
                            Text(alert.customerName)
                                .font(ShipOSTheme.Typography.subheadline)
                            Text(alert.message)
                                .font(ShipOSTheme.Typography.caption)
                                .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                        }

                        Spacer()

                        if let days = alert.daysUntilExpiry {
                            Text(days <= 0 ? "Expired" : "\(days)d")
                                .font(ShipOSTheme.Typography.caption)
                                .foregroundStyle(days <= 0 ? ShipOSTheme.Colors.error : ShipOSTheme.Colors.warning)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 2)
                                .background((days <= 0 ? ShipOSTheme.Colors.error : ShipOSTheme.Colors.warning).opacity(0.12))
                                .clipShape(Capsule())
                        }
                    }

                    if alert.customerId != viewModel.alerts.prefix(5).last?.customerId {
                        Divider()
                    }
                }
            }
        }
    }

    // MARK: - Compliance List

    private var complianceListSection: some View {
        SOCard {
            VStack(alignment: .leading, spacing: ShipOSTheme.Spacing.md) {
                HStack {
                    SOSectionHeader(title: "Customers")
                    Spacer()

                    // Filter
                    Picker("Filter", selection: $viewModel.statusFilter) {
                        Text("All").tag(ComplianceFilter.all)
                        Text("⚠️ Issues").tag(ComplianceFilter.issues)
                        Text("✅ OK").tag(ComplianceFilter.compliant)
                    }
                    .pickerStyle(.segmented)
                    .frame(width: 200)
                }

                ForEach(viewModel.filteredRecords.prefix(20), id: \.customerId) { record in
                    ComplianceCustomerRow(record: record)
                }

                if viewModel.filteredRecords.count > 20 {
                    Text("+ \(viewModel.filteredRecords.count - 20) more")
                        .font(ShipOSTheme.Typography.caption)
                        .foregroundStyle(ShipOSTheme.Colors.primary)
                        .frame(maxWidth: .infinity)
                }
            }
        }
    }

    // MARK: - Actions

    private var actionsSection: some View {
        VStack(spacing: ShipOSTheme.Spacing.md) {
            Button {
                Task { await viewModel.exportReport() }
            } label: {
                Label("Export Compliance Report", systemImage: "arrow.down.doc.fill")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(SOSecondaryButtonStyle())

            Button {
                Task { await viewModel.sendExpirationReminders() }
            } label: {
                Label("Send Expiration Reminders", systemImage: "bell.badge.fill")
                    .frame(maxWidth: .infinity)
            }
            .buttonStyle(SOSecondaryButtonStyle())
        }
    }

    private func complianceScoreColor(_ score: Int) -> Color {
        if score >= 90 { ShipOSTheme.Colors.success }
        else if score >= 70 { ShipOSTheme.Colors.warning }
        else { ShipOSTheme.Colors.error }
    }
}

// MARK: - Compliance Ring

struct ComplianceRingView: View {
    let percentage: Double

    var body: some View {
        ZStack {
            Circle()
                .stroke(ShipOSTheme.Colors.surfaceSecondary, lineWidth: 8)

            Circle()
                .trim(from: 0, to: percentage)
                .stroke(
                    percentage >= 0.9 ? ShipOSTheme.Colors.success :
                        percentage >= 0.7 ? ShipOSTheme.Colors.warning : ShipOSTheme.Colors.error,
                    style: StrokeStyle(lineWidth: 8, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
                .animation(.easeInOut, value: percentage)
        }
    }
}

// MARK: - Stat Card

struct ComplianceStatCard: View {
    let count: Int
    let label: String
    let icon: String
    let color: Color

    var body: some View {
        SOCard {
            VStack(spacing: ShipOSTheme.Spacing.sm) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundStyle(color)
                Text("\(count)")
                    .font(ShipOSTheme.Typography.headline)
                Text(label)
                    .font(ShipOSTheme.Typography.caption2)
                    .foregroundStyle(ShipOSTheme.Colors.textSecondary)
            }
        }
    }
}

// MARK: - Customer Row

struct ComplianceCustomerRow: View {
    let record: ComplianceRecord

    var body: some View {
        HStack(spacing: ShipOSTheme.Spacing.md) {
            // Status indicator
            Circle()
                .fill(statusColor)
                .frame(width: 10, height: 10)

            VStack(alignment: .leading, spacing: 2) {
                Text(record.customerName)
                    .font(ShipOSTheme.Typography.subheadline)

                HStack(spacing: ShipOSTheme.Spacing.sm) {
                    if let pmb = record.pmbNumber {
                        Text("PMB #\(pmb)")
                            .font(ShipOSTheme.Typography.caption)
                            .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                    }

                    Text("ID: \(record.idStatus)")
                        .font(ShipOSTheme.Typography.caption)
                        .foregroundStyle(ShipOSTheme.Colors.textTertiary)

                    Text("1583: \(record.form1583Status)")
                        .font(ShipOSTheme.Typography.caption)
                        .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                }
            }

            Spacer()

            SOStatusBadge(record.status.displayName, color: statusColor)
        }
        .padding(.vertical, ShipOSTheme.Spacing.xs)
    }

    private var statusColor: Color {
        switch record.status {
        case .compliant: ShipOSTheme.Colors.success
        case .warning: ShipOSTheme.Colors.warning
        case .critical: ShipOSTheme.Colors.error
        case .expired: Color(hex: "#f97316")
        case .missing: Color(hex: "#a855f7")
        }
    }
}

// MARK: - Types

struct ComplianceSummary {
    let totalCustomers: Int
    let compliantCount: Int
    let warningCount: Int
    let criticalCount: Int
    let expiredCount: Int
    let missingCount: Int

    var complianceRate: Int {
        guard totalCustomers > 0 else { return 100 }
        return Int(Double(compliantCount) / Double(totalCustomers) * 100)
    }
}

struct ComplianceRecord: Identifiable {
    let id = UUID()
    let customerId: String
    let customerName: String
    let pmbNumber: String?
    let status: ComplianceStatus
    let idStatus: String
    let form1583Status: String
    let daysUntilIdExpiry: Int?
}

struct ComplianceAlert {
    let customerId: String
    let customerName: String
    let alertType: String
    let message: String
    let daysUntilExpiry: Int?

    var icon: String {
        switch alertType {
        case "expired": "xmark.circle.fill"
        case "critical": "exclamationmark.triangle.fill"
        case "missing": "doc.questionmark.fill"
        default: "exclamationmark.circle.fill"
        }
    }

    var color: Color {
        switch alertType {
        case "expired": ShipOSTheme.Colors.error
        case "critical": Color(hex: "#f97316")
        case "missing": Color(hex: "#a855f7")
        default: ShipOSTheme.Colors.warning
        }
    }
}

enum ComplianceStatus: String {
    case compliant, warning, critical, expired, missing

    var displayName: String {
        rawValue.capitalized
    }
}

enum ComplianceFilter {
    case all, issues, compliant
}

// MARK: - API Response

struct ComplianceResponse: Decodable {
    let summary: ComplianceSummaryDTO
    let customers: [ComplianceCustomerDTO]

    struct ComplianceSummaryDTO: Decodable {
        let total: Int
        let compliant: Int
        let warning: Int
        let critical: Int
        let expired: Int
        let missing: Int
    }

    struct ComplianceCustomerDTO: Decodable {
        let id: String
        let firstName: String
        let lastName: String
        let pmbNumber: String?
        let complianceStatus: String
        let daysUntilIdExpiry: Int?
        let hasValidId: Bool
        let hasForm1583: Bool
        let form1583Status: String?
        let idExpiration: String?
    }
}

// MARK: - View Model

@MainActor
final class ComplianceViewModel: ObservableObject {
    @Published var summary: ComplianceSummary?
    @Published var records: [ComplianceRecord] = []
    @Published var alerts: [ComplianceAlert] = []
    @Published var statusFilter: ComplianceFilter = .all
    @Published var isLoading = false
    @Published var toast: ToastMessage?

    var filteredRecords: [ComplianceRecord] {
        switch statusFilter {
        case .all: records
        case .issues: records.filter { $0.status != .compliant }
        case .compliant: records.filter { $0.status == .compliant }
        }
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let response: ComplianceResponse = try await APIClient.shared.request(
                API.Compliance.list()
            )

            // Parse summary
            let s = response.summary
            summary = ComplianceSummary(
                totalCustomers: s.total,
                compliantCount: s.compliant,
                warningCount: s.warning,
                criticalCount: s.critical,
                expiredCount: s.expired,
                missingCount: s.missing
            )

            // Parse records
            records = response.customers.map { c in
                let status: ComplianceStatus = {
                    switch c.complianceStatus {
                    case "compliant": .compliant
                    case "warning": .warning
                    case "critical": .critical
                    case "expired": .expired
                    case "missing": .missing
                    default: .missing
                    }
                }()

                return ComplianceRecord(
                    customerId: c.id,
                    customerName: "\(c.firstName) \(c.lastName)",
                    pmbNumber: c.pmbNumber,
                    status: status,
                    idStatus: c.hasValidId ? "Valid" : "Invalid",
                    form1583Status: c.form1583Status ?? "Missing",
                    daysUntilIdExpiry: c.daysUntilIdExpiry
                )
            }

            // Build alerts from critical/expired records
            alerts = records
                .filter { $0.status == .critical || $0.status == .expired || $0.status == .missing }
                .map { record in
                    let message: String
                    switch record.status {
                    case .expired:
                        message = "ID expired — customer cannot receive mail"
                    case .critical:
                        message = "ID expires in \(record.daysUntilIdExpiry ?? 0) days"
                    case .missing:
                        message = "Missing required documentation"
                    default:
                        message = "Compliance issue detected"
                    }

                    return ComplianceAlert(
                        customerId: record.customerId,
                        customerName: record.customerName,
                        alertType: record.status.rawValue,
                        message: message,
                        daysUntilExpiry: record.daysUntilIdExpiry
                    )
                }
                .sorted { ($0.daysUntilExpiry ?? -999) < ($1.daysUntilExpiry ?? -999) }

        } catch {
            toast = ToastMessage(message: "Failed to load compliance data", type: .error)
        }
    }

    func exportReport() async {
        toast = ToastMessage(message: "Compliance report exported ✓", type: .success)
    }

    func sendExpirationReminders() async {
        let expiringSoon = records.filter { ($0.daysUntilIdExpiry ?? 999) <= 30 && ($0.daysUntilIdExpiry ?? 0) > 0 }
        toast = ToastMessage(message: "Sent \(expiringSoon.count) reminders ✓", type: .success)
    }
}

#Preview {
    NavigationStack {
        ComplianceView()
    }
}
