import SwiftUI

// MARK: - BAR-375: iPad Pro Optimizations
// Enhanced sidebar, keyboard shortcuts, multi-column layouts,
// pointer/trackpad hover effects, and drag-and-drop support.

// MARK: - Enhanced iPad Sidebar

/// An upgraded sidebar for iPad with additional sections,
/// quick stats footer, and drag-drop zone targets.
struct EnhancedIPadSidebar: View {
    @EnvironmentObject private var appState: AppState
    @EnvironmentObject private var authManager: AuthManager
    @ObservedObject private var networkMonitor = NetworkMonitor.shared
    @ObservedObject private var syncEngine = SyncEngine.shared

    var body: some View {
        List(selection: $appState.selectedTab) {
            Section("Operations") {
                sidebarItem(.dashboard, badge: nil)
                sidebarItem(.packages, badge: appState.packagesBadge)
                sidebarItem(.mail, badge: appState.mailBadge)
                sidebarItem(.customers, badge: nil)
            }

            Section("Tools") {
                sidebarActionButton(
                    title: "Check In",
                    icon: "arrow.down.circle.fill",
                    color: ShipOSTheme.Colors.success
                ) {
                    appState.isShowingCheckIn = true
                }

                sidebarActionButton(
                    title: "Check Out",
                    icon: "checkmark.circle.fill",
                    color: ShipOSTheme.Colors.info
                ) {
                    appState.isShowingCheckOut = true
                }

                sidebarActionButton(
                    title: "Scan",
                    icon: "barcode.viewfinder",
                    color: ShipOSTheme.Colors.primary
                ) {
                    appState.isShowingScanner = true
                }

                sidebarActionButton(
                    title: "Smart Intake",
                    icon: "camera.viewfinder",
                    color: Color(hex: "#06b6d4")
                ) {
                    appState.isShowingSmartIntake = true
                }

                sidebarActionButton(
                    title: "Ship",
                    icon: "paperplane.fill",
                    color: Color(hex: "#8b5cf6")
                ) {
                    appState.isShowingShipping = true
                }
            }

            Section("Communication") {
                sidebarItem(.notifications, badge: appState.notificationsBadge)
            }

            Section("System") {
                sidebarItem(.settings, badge: nil)
            }
        }
        .navigationTitle("ShipOS")
        .listStyle(.sidebar)
        .toolbar {
            ToolbarItem(placement: .bottomBar) {
                sidebarFooter
            }
        }
    }

    // MARK: - Sidebar Items

    private func sidebarItem(_ tab: AppTab, badge: Int?) -> some View {
        HStack {
            Label(tab.title, systemImage: appState.selectedTab == tab ? tab.selectedIcon : tab.icon)
                .tag(tab)

            Spacer()

            if let badge, badge > 0 {
                Text("\(badge)")
                    .font(.system(.caption2, weight: .bold, design: .rounded))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(ShipOSTheme.Colors.primary)
                    .clipShape(Capsule())
            }
        }
    }

    private func sidebarActionButton(title: String, icon: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Label(title, systemImage: icon)
                .foregroundStyle(color)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Footer

    private var sidebarFooter: some View {
        HStack(spacing: ShipOSTheme.Spacing.md) {
            // Connection status dot
            Circle()
                .fill(networkMonitor.isOnline ? ShipOSTheme.Colors.success : ShipOSTheme.Colors.error)
                .frame(width: 8, height: 8)

            if let user = authManager.currentUser {
                Text(user.name)
                    .font(ShipOSTheme.Typography.caption)
                    .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                    .lineLimit(1)
            }

            Spacer()

            if case .syncing = syncEngine.syncState {
                ProgressView()
                    .scaleEffect(0.7)
            }
        }
    }
}

// MARK: - Keyboard Shortcuts

/// Global keyboard shortcuts for iPad (and Mac Catalyst).
struct KeyboardShortcutsModifier: ViewModifier {
    @EnvironmentObject private var appState: AppState

    func body(content: Content) -> some View {
        content
            // Tab navigation
            .keyboardShortcut("1", modifiers: .command, title: "Dashboard") {
                appState.selectedTab = .dashboard
            }
            .keyboardShortcut("2", modifiers: .command, title: "Packages") {
                appState.selectedTab = .packages
            }
            .keyboardShortcut("3", modifiers: .command, title: "Mail") {
                appState.selectedTab = .mail
            }
            .keyboardShortcut("4", modifiers: .command, title: "Customers") {
                appState.selectedTab = .customers
            }
            .keyboardShortcut("5", modifiers: .command, title: "Notifications") {
                appState.selectedTab = .notifications
            }
            // Quick actions
            .keyboardShortcut("i", modifiers: .command, title: "Check In") {
                appState.isShowingCheckIn = true
            }
            .keyboardShortcut("o", modifiers: .command, title: "Check Out") {
                appState.isShowingCheckOut = true
            }
            .keyboardShortcut("b", modifiers: .command, title: "Scan Barcode") {
                appState.isShowingScanner = true
            }
            .keyboardShortcut("n", modifiers: [.command, .shift], title: "New Customer") {
                appState.isShowingOnboarding = true
            }
            .keyboardShortcut("s", modifiers: [.command, .shift], title: "Ship Package") {
                appState.isShowingShipping = true
            }
            .keyboardShortcut("e", modifiers: [.command, .shift], title: "End of Day") {
                appState.isShowingEndOfDay = true
            }
            .keyboardShortcut(",", modifiers: .command, title: "Settings") {
                appState.selectedTab = .settings
            }
    }
}

/// Custom keyboardShortcut helper that executes an action.
extension View {
    func keyboardShortcut(
        _ key: KeyEquivalent,
        modifiers: EventModifiers = .command,
        title: String,
        action: @escaping () -> Void
    ) -> some View {
        background(
            Button(title) { action() }
                .keyboardShortcut(key, modifiers: modifiers)
                .hidden()
                .allowsHitTesting(false)
        )
    }
}

// MARK: - Pointer Hover Effect

/// Adds pointer hover effects for trackpad/mouse on iPad.
struct PointerHoverModifier: ViewModifier {
    let cornerRadius: CGFloat

    func body(content: Content) -> some View {
        content
            .contentShape(RoundedRectangle(cornerRadius: cornerRadius))
            .hoverEffect(.lift)
    }
}

extension View {
    /// Add a pointer hover lift effect for iPad trackpad.
    func pointerHover(cornerRadius: CGFloat = ShipOSTheme.CornerRadius.medium) -> some View {
        modifier(PointerHoverModifier(cornerRadius: cornerRadius))
    }
}

// MARK: - Multi-Column Detail Layout

/// A three-column layout for iPad Pro detail views (e.g., Customer Detail on 12.9").
struct MultiColumnDetailLayout<Primary: View, Secondary: View, Tertiary: View>: View {
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    let primary: Primary
    let secondary: Secondary
    let tertiary: Tertiary

    init(
        @ViewBuilder primary: () -> Primary,
        @ViewBuilder secondary: () -> Secondary,
        @ViewBuilder tertiary: () -> Tertiary
    ) {
        self.primary = primary()
        self.secondary = secondary()
        self.tertiary = tertiary()
    }

    var body: some View {
        GeometryReader { geometry in
            if geometry.size.width > 1100 {
                // iPad Pro landscape — 3 columns
                HStack(alignment: .top, spacing: ShipOSTheme.Spacing.lg) {
                    ScrollView { primary }
                        .frame(width: geometry.size.width * 0.35)

                    ScrollView { secondary }
                        .frame(width: geometry.size.width * 0.35)

                    ScrollView { tertiary }
                        .frame(maxWidth: .infinity)
                }
            } else if geometry.size.width > 700 {
                // iPad portrait — 2 columns
                HStack(alignment: .top, spacing: ShipOSTheme.Spacing.lg) {
                    ScrollView { primary }
                        .frame(width: geometry.size.width * 0.5)

                    ScrollView {
                        VStack(spacing: ShipOSTheme.Spacing.lg) {
                            secondary
                            tertiary
                        }
                    }
                    .frame(maxWidth: .infinity)
                }
            } else {
                // iPhone or compact — single column
                ScrollView {
                    VStack(spacing: ShipOSTheme.Spacing.lg) {
                        primary
                        secondary
                        tertiary
                    }
                }
            }
        }
    }
}

// MARK: - Drag & Drop Support

/// Package drag data for iPad drag-and-drop between sections.
struct PackageDragData: Codable, Transferable {
    let packageId: String
    let trackingNumber: String
    let status: String

    static var transferRepresentation: some TransferRepresentation {
        CodableRepresentation(contentType: .json)
    }
}

/// A drop zone overlay that appears when dragging packages.
struct PackageDropZone: View {
    let title: String
    let icon: String
    let targetStatus: String
    let onDrop: (String) -> Void

    @State private var isTargeted = false

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.large)
                .stroke(
                    isTargeted ? ShipOSTheme.Colors.primary : ShipOSTheme.Colors.border,
                    style: StrokeStyle(lineWidth: 2, dash: [8, 4])
                )
                .background(
                    RoundedRectangle(cornerRadius: ShipOSTheme.CornerRadius.large)
                        .fill(isTargeted ? ShipOSTheme.Colors.primary.opacity(0.08) : Color.clear)
                )

            VStack(spacing: ShipOSTheme.Spacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: 28))
                    .foregroundStyle(isTargeted ? ShipOSTheme.Colors.primary : ShipOSTheme.Colors.textTertiary)

                Text(title)
                    .font(ShipOSTheme.Typography.subheadline)
                    .foregroundStyle(isTargeted ? ShipOSTheme.Colors.primary : ShipOSTheme.Colors.textSecondary)
            }
        }
        .frame(height: 120)
        .dropDestination(for: PackageDragData.self) { items, _ in
            for item in items {
                onDrop(item.packageId)
            }
            return true
        } isTargeted: { targeted in
            withAnimation(.easeInOut(duration: 0.2)) {
                isTargeted = targeted
            }
        }
    }
}

// MARK: - iPad Dashboard Grid

/// An adaptive grid that uses wider columns on iPad Pro.
struct AdaptiveGrid<Content: View>: View {
    @Environment(\.horizontalSizeClass) private var sizeClass
    let content: Content

    init(@ViewBuilder content: () -> Content) {
        self.content = content()
    }

    var body: some View {
        LazyVGrid(columns: columns, spacing: ShipOSTheme.Spacing.md) {
            content
        }
    }

    private var columns: [GridItem] {
        if sizeClass == .regular {
            // iPad: 3-4 columns
            return Array(repeating: GridItem(.flexible(), spacing: ShipOSTheme.Spacing.md), count: 4)
        } else {
            // iPhone: 2 columns
            return Array(repeating: GridItem(.flexible(), spacing: ShipOSTheme.Spacing.md), count: 2)
        }
    }
}

// MARK: - iPad Context Menu

/// A richer context menu for iPad with pointer/secondary click support.
struct iPadContextMenu: ViewModifier {
    let packageId: String
    @EnvironmentObject private var appState: AppState

    func body(content: Content) -> some View {
        content
            .contextMenu {
                Button {
                    // View details
                } label: {
                    Label("View Details", systemImage: "info.circle")
                }

                Button {
                    appState.isShowingCheckOut = true
                } label: {
                    Label("Check Out", systemImage: "checkmark.circle")
                }

                Button {
                    // Notify customer
                } label: {
                    Label("Notify Customer", systemImage: "bell.badge")
                }

                Divider()

                Button {
                    UIPasteboard.general.string = packageId
                    HapticsManager.shared.success()
                } label: {
                    Label("Copy Tracking #", systemImage: "doc.on.doc")
                }

                Divider()

                Button(role: .destructive) {
                    // Return package
                } label: {
                    Label("Return Package", systemImage: "arrow.uturn.left")
                }
            }
    }
}

extension View {
    /// Add iPad-optimized context menu with common package actions.
    func iPadPackageContextMenu(packageId: String) -> some View {
        modifier(iPadContextMenu(packageId: packageId))
    }
}

// MARK: - Scene Delegate Additions for Multi-Window

/// Handles iPad multi-window scene configuration.
/// Add to ShipOSApp to support multiple windows on iPad.
struct MultiWindowSupport: ViewModifier {
    @Environment(\.supportsMultipleWindows) private var supportsMultipleWindows

    func body(content: Content) -> some View {
        content
            .handlesExternalEvents(preferring: ["shipos"], allowing: ["shipos"])
    }
}

// MARK: - AppState Extensions for iPad

extension AppState {
    /// Badge counts for sidebar (computed from cache).
    var packagesBadge: Int? {
        let count = UserDefaults.standard.integer(forKey: "widget_checked_in")
        return count > 0 ? count : nil
    }

    var mailBadge: Int? {
        let count = UserDefaults.standard.integer(forKey: "widget_mail_unread")
        return count > 0 ? count : nil
    }

    var notificationsBadge: Int? {
        let count = UserDefaults.standard.integer(forKey: "widget_notifications_unread")
        return count > 0 ? count : nil
    }
}
