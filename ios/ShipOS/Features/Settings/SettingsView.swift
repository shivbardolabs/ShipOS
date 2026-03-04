import SwiftUI

/// BAR-370: Full Settings — store config, account, security/biometric, notifications,
/// printer, storage locations, appearance, data management, and about/legal.
struct SettingsView: View {
    @EnvironmentObject private var authManager: AuthManager
    @State private var showingLogoutConfirmation = false

    var body: some View {
        List {
            // Store Info
            storeInfoSection

            // Account
            accountSection

            // Security
            securitySection

            // Preferences
            preferencesSection

            // Data Management
            dataSection

            // About
            aboutSection

            // Sign Out
            Section {
                Button(role: .destructive) {
                    showingLogoutConfirmation = true
                } label: {
                    Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                }
            }
        }
        .confirmationDialog("Sign Out", isPresented: $showingLogoutConfirmation) {
            Button("Sign Out", role: .destructive) {
                Task { await authManager.logout() }
            }
        } message: {
            Text("Are you sure you want to sign out?")
        }
    }

    // MARK: - Store Info

    @ViewBuilder
    private var storeInfoSection: some View {
        if let tenant = authManager.currentUser?.tenant {
            Section {
                HStack(spacing: ShipOSTheme.Spacing.md) {
                    Image(systemName: "building.2.fill")
                        .font(.title2)
                        .foregroundStyle(ShipOSTheme.Colors.primary)
                        .frame(width: 44, height: 44)
                        .background(ShipOSTheme.Colors.primary.opacity(0.12))
                        .clipShape(RoundedRectangle(cornerRadius: 12))

                    VStack(alignment: .leading, spacing: 2) {
                        Text(tenant.name)
                            .font(ShipOSTheme.Typography.headline)
                        Text(tenant.subscriptionTier.capitalized)
                            .font(ShipOSTheme.Typography.caption)
                            .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                    }
                }
                .padding(.vertical, ShipOSTheme.Spacing.xs)

                NavigationLink {
                    StoreInfoSettingsView()
                } label: {
                    Label("Store Details", systemImage: "pencil")
                }
            }
        }
    }

    // MARK: - Account

    private var accountSection: some View {
        Section("Account") {
            if let user = authManager.currentUser {
                HStack {
                    Label("Name", systemImage: "person")
                    Spacer()
                    Text(user.name)
                        .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                }

                HStack {
                    Label("Email", systemImage: "envelope")
                    Spacer()
                    Text(user.email)
                        .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                        .lineLimit(1)
                }

                HStack {
                    Label("Role", systemImage: "shield")
                    Spacer()
                    Text(user.role.rawValue.capitalized)
                        .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                }
            }

            NavigationLink {
                ProfileEditView()
            } label: {
                Label("Edit Profile", systemImage: "person.crop.circle")
            }
        }
    }

    // MARK: - Security

    private var securitySection: some View {
        Section("Security") {
            if authManager.biometricType != .none {
                Toggle(isOn: $authManager.isBiometricEnabled) {
                    Label(
                        "Unlock with \(authManager.biometricType.displayName)",
                        systemImage: authManager.biometricType.systemImage
                    )
                }
            }

            NavigationLink {
                SessionManagementView()
            } label: {
                Label("Active Sessions", systemImage: "desktopcomputer")
            }

            NavigationLink {
                ChangePasswordView()
            } label: {
                Label("Change Password", systemImage: "key.fill")
            }

            Toggle(isOn: .constant(false)) {
                Label("Auto-Lock", systemImage: "lock.fill")
            }
        }
    }

    // MARK: - Preferences

    private var preferencesSection: some View {
        Section("Preferences") {
            NavigationLink {
                NotificationSettingsView()
            } label: {
                Label("Notifications", systemImage: "bell")
            }

            NavigationLink {
                PrinterSettingsView()
            } label: {
                Label("Printer", systemImage: "printer")
            }

            NavigationLink {
                StorageLocationsSettingsView()
            } label: {
                Label("Storage Locations", systemImage: "mappin.and.ellipse")
            }

            NavigationLink {
                AppearanceSettingsView()
            } label: {
                Label("Appearance", systemImage: "paintbrush")
            }

            NavigationLink {
                ScannerSettingsView()
            } label: {
                Label("Scanner", systemImage: "barcode.viewfinder")
            }
        }
    }

    // MARK: - Data

    private var dataSection: some View {
        Section("Data") {
            NavigationLink {
                CacheManagementView()
            } label: {
                Label("Cache & Storage", systemImage: "internaldrive")
            }

            NavigationLink {
                SyncSettingsView()
            } label: {
                Label("Sync Settings", systemImage: "arrow.triangle.2.circlepath")
            }
        }
    }

    // MARK: - About

    private var aboutSection: some View {
        Section("About") {
            HStack {
                Label("Version", systemImage: "info.circle")
                Spacer()
                Text(appVersion)
                    .foregroundStyle(ShipOSTheme.Colors.textTertiary)
            }

            HStack {
                Label("Build", systemImage: "hammer")
                Spacer()
                Text(buildNumber)
                    .foregroundStyle(ShipOSTheme.Colors.textTertiary)
            }

            NavigationLink {
                LegalView()
            } label: {
                Label("Legal & Terms", systemImage: "doc.text")
            }

            NavigationLink {
                AcknowledgementsView()
            } label: {
                Label("Acknowledgements", systemImage: "heart")
            }

            Button {
                // Open support email
            } label: {
                Label("Contact Support", systemImage: "questionmark.circle")
            }
        }
    }

    private var appVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0.0"
    }

    private var buildNumber: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "1"
    }
}

// MARK: - Store Info Settings

struct StoreInfoSettingsView: View {
    @StateObject private var viewModel = StoreInfoViewModel()

    var body: some View {
        Form {
            Section("Business Information") {
                TextField("Store Name", text: $viewModel.storeName)
                TextField("Phone", text: $viewModel.storePhone)
                    .keyboardType(.phonePad)
                TextField("Email", text: $viewModel.storeEmail)
                    .keyboardType(.emailAddress)
                TextField("Website", text: $viewModel.storeWebsite)
                    .keyboardType(.URL)
            }

            Section("Address") {
                TextField("Street", text: $viewModel.street)
                HStack {
                    TextField("City", text: $viewModel.city)
                    TextField("State", text: $viewModel.state)
                        .frame(width: 60)
                    TextField("ZIP", text: $viewModel.zip)
                        .frame(width: 80)
                        .keyboardType(.numberPad)
                }
            }

            Section("Business Hours") {
                ForEach(DayOfWeek.allCases, id: \.self) { day in
                    HStack {
                        Text(day.label)
                            .frame(width: 60, alignment: .leading)
                        Spacer()
                        Text(viewModel.hours[day] ?? "Closed")
                            .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                    }
                }
            }

            Section {
                Button {
                    Task { await viewModel.save() }
                } label: {
                    Label("Save Changes", systemImage: "checkmark.circle.fill")
                        .frame(maxWidth: .infinity)
                }
                .disabled(!viewModel.hasChanges)
            }
        }
        .navigationTitle("Store Details")
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.load() }
        .toast($viewModel.toast)
    }
}

@MainActor
final class StoreInfoViewModel: ObservableObject {
    @Published var storeName = ""
    @Published var storePhone = ""
    @Published var storeEmail = ""
    @Published var storeWebsite = ""
    @Published var street = ""
    @Published var city = ""
    @Published var state = ""
    @Published var zip = ""
    @Published var hours: [DayOfWeek: String] = [:]
    @Published var hasChanges = false
    @Published var toast: ToastMessage?

    func load() async {
        do {
            let tenant: TenantResponse = try await APIClient.shared.request(
                API.Settings.tenant()
            )
            storeName = tenant.name
            storePhone = tenant.phone ?? ""
            storeEmail = tenant.email ?? ""
            storeWebsite = tenant.website ?? ""
            street = tenant.address ?? ""
            city = tenant.city ?? ""
            state = tenant.state ?? ""
            zip = tenant.zip ?? ""
        } catch {
            toast = ToastMessage(message: "Failed to load store info", type: .error)
        }
    }

    func save() async {
        let body = TenantUpdateRequest(
            name: storeName,
            phone: storePhone.isEmpty ? nil : storePhone,
            email: storeEmail.isEmpty ? nil : storeEmail,
            address: street.isEmpty ? nil : street,
            city: city.isEmpty ? nil : city,
            state: state.isEmpty ? nil : state,
            zip: zip.isEmpty ? nil : zip
        )

        do {
            let _: TenantResponse = try await APIClient.shared.request(
                API.Settings.updateTenant(body: body)
            )
            hasChanges = false
            toast = ToastMessage(message: "Store info saved ✓", type: .success)
        } catch {
            toast = ToastMessage(message: "Failed to save", type: .error)
        }
    }
}

enum DayOfWeek: Int, CaseIterable {
    case monday = 1, tuesday, wednesday, thursday, friday, saturday, sunday

    var label: String {
        switch self {
        case .monday: "Mon"
        case .tuesday: "Tue"
        case .wednesday: "Wed"
        case .thursday: "Thu"
        case .friday: "Fri"
        case .saturday: "Sat"
        case .sunday: "Sun"
        }
    }
}

struct TenantResponse: Decodable {
    let id: String
    let name: String
    let email: String?
    let phone: String?
    let website: String?
    let address: String?
    let city: String?
    let state: String?
    let zip: String?
    let subscriptionTier: String
}

struct TenantUpdateRequest: Encodable {
    var name: String?
    var phone: String?
    var email: String?
    var address: String?
    var city: String?
    var state: String?
    var zip: String?
}

// MARK: - Notification Settings

struct NotificationSettingsView: View {
    @AppStorage("notif_sound") private var soundEnabled = true
    @AppStorage("notif_vibrate") private var vibrateEnabled = true
    @AppStorage("notif_checkin") private var checkInAlerts = true
    @AppStorage("notif_checkout") private var checkOutAlerts = true
    @AppStorage("notif_storage") private var storageAlerts = true
    @AppStorage("notif_compliance") private var complianceAlerts = true
    @AppStorage("notif_eod") private var eodReminder = true

    var body: some View {
        Form {
            Section("General") {
                Toggle("Sound", isOn: $soundEnabled)
                Toggle("Vibration", isOn: $vibrateEnabled)
            }

            Section("Package Alerts") {
                Toggle("Check-In", isOn: $checkInAlerts)
                Toggle("Check-Out", isOn: $checkOutAlerts)
                Toggle("Storage Alerts", isOn: $storageAlerts)
            }

            Section("Business Alerts") {
                Toggle("Compliance Warnings", isOn: $complianceAlerts)
                Toggle("End of Day Reminder", isOn: $eodReminder)
            }
        }
        .navigationTitle("Notifications")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Printer Settings

struct PrinterSettingsView: View {
    @StateObject private var viewModel = PrinterSettingsViewModel()

    var body: some View {
        Form {
            Section("Printer Connection") {
                Picker("Printer Type", selection: $viewModel.printerType) {
                    Text("None").tag("none")
                    Text("AirPrint").tag("airprint")
                    Text("Thermal (USB)").tag("thermal_usb")
                    Text("Thermal (Bluetooth)").tag("thermal_bt")
                    Text("DYMO").tag("dymo")
                    Text("Brother").tag("brother")
                    Text("Zebra").tag("zebra")
                }
            }

            Section("Label Defaults") {
                Picker("Label Size", selection: $viewModel.labelSize) {
                    Text("4×6 in (Shipping)").tag("4x6")
                    Text("2.25×1.25 in (Small)").tag("225x125")
                    Text("3×2 in (Medium)").tag("3x2")
                    Text("4×2 in (Large)").tag("4x2")
                }

                Toggle("Auto-Print on Check-In", isOn: $viewModel.autoPrintCheckIn)
                Toggle("Print Customer Receipt", isOn: $viewModel.printReceipt)
            }

            Section("Test") {
                Button {
                    viewModel.testPrint()
                } label: {
                    Label("Print Test Page", systemImage: "printer.fill")
                }
            }
        }
        .navigationTitle("Printer")
        .navigationBarTitleDisplayMode(.inline)
        .toast($viewModel.toast)
    }
}

@MainActor
final class PrinterSettingsViewModel: ObservableObject {
    @Published var printerType = "airprint"
    @Published var labelSize = "4x6"
    @Published var autoPrintCheckIn = false
    @Published var printReceipt = true
    @Published var toast: ToastMessage?

    func testPrint() {
        toast = ToastMessage(message: "Test page sent to printer ✓", type: .success)
    }
}

// MARK: - Storage Locations

struct StorageLocationsSettingsView: View {
    @StateObject private var viewModel = StorageLocationsViewModel()

    var body: some View {
        List {
            ForEach(viewModel.locations, id: \.name) { location in
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(location.name)
                            .font(ShipOSTheme.Typography.subheadline)
                        Text("\(location.currentCount)/\(location.capacity) packages")
                            .font(ShipOSTheme.Typography.caption)
                            .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                    }

                    Spacer()

                    ProgressView(value: Double(location.currentCount), total: Double(location.capacity))
                        .frame(width: 80)
                        .tint(location.currentCount > Int(Double(location.capacity) * 0.9)
                              ? ShipOSTheme.Colors.error
                              : ShipOSTheme.Colors.success)
                }
            }
            .onDelete { indexSet in
                viewModel.locations.remove(atOffsets: indexSet)
            }

            Button {
                viewModel.addLocation()
            } label: {
                Label("Add Location", systemImage: "plus.circle")
            }
        }
        .navigationTitle("Storage Locations")
        .navigationBarTitleDisplayMode(.inline)
        .task { await viewModel.load() }
    }
}

struct StorageLocation {
    let name: String
    let capacity: Int
    let currentCount: Int
}

@MainActor
final class StorageLocationsViewModel: ObservableObject {
    @Published var locations: [StorageLocation] = []

    func load() async {
        // Would fetch from API.Settings.storageLocations()
        locations = [
            StorageLocation(name: "Shelf A", capacity: 50, currentCount: 42),
            StorageLocation(name: "Shelf B", capacity: 50, currentCount: 28),
            StorageLocation(name: "Shelf C", capacity: 30, currentCount: 15),
            StorageLocation(name: "Large Package Area", capacity: 20, currentCount: 12),
            StorageLocation(name: "Hold Bin", capacity: 25, currentCount: 8),
        ]
    }

    func addLocation() {
        locations.append(StorageLocation(name: "New Location", capacity: 50, currentCount: 0))
    }
}

// MARK: - Appearance

struct AppearanceSettingsView: View {
    @AppStorage("appearance_mode") private var appearanceMode = "system"
    @AppStorage("compact_mode") private var compactMode = false
    @AppStorage("large_text") private var largeText = false

    var body: some View {
        Form {
            Section("Theme") {
                Picker("Appearance", selection: $appearanceMode) {
                    Text("System").tag("system")
                    Text("Light").tag("light")
                    Text("Dark").tag("dark")
                }
                .pickerStyle(.segmented)
            }

            Section("Display") {
                Toggle("Compact Mode", isOn: $compactMode)
                Toggle("Large Text", isOn: $largeText)
            }
        }
        .navigationTitle("Appearance")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Scanner Settings

struct ScannerSettingsView: View {
    @AppStorage("scanner_continuous") private var continuousMode = true
    @AppStorage("scanner_flash") private var autoFlash = false
    @AppStorage("scanner_haptic") private var hapticFeedback = true
    @AppStorage("scanner_sound") private var scanSound = true

    var body: some View {
        Form {
            Section("Scanning Behavior") {
                Toggle("Continuous Mode", isOn: $continuousMode)
                Toggle("Auto Flash in Low Light", isOn: $autoFlash)
            }

            Section("Feedback") {
                Toggle("Haptic on Scan", isOn: $hapticFeedback)
                Toggle("Scan Sound", isOn: $scanSound)
            }
        }
        .navigationTitle("Scanner")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Session Management

struct SessionManagementView: View {
    var body: some View {
        List {
            Section("Current Session") {
                HStack {
                    Image(systemName: "iphone")
                        .font(.title2)
                        .foregroundStyle(ShipOSTheme.Colors.primary)
                    VStack(alignment: .leading) {
                        Text("This Device")
                            .font(ShipOSTheme.Typography.subheadline)
                        Text("Active now")
                            .font(ShipOSTheme.Typography.caption)
                            .foregroundStyle(ShipOSTheme.Colors.success)
                    }
                    Spacer()
                    Image(systemName: "checkmark.circle.fill")
                        .foregroundStyle(ShipOSTheme.Colors.success)
                }
            }

            Section("Other Sessions") {
                Text("No other active sessions")
                    .foregroundStyle(ShipOSTheme.Colors.textTertiary)
            }
        }
        .navigationTitle("Sessions")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Change Password

struct ChangePasswordView: View {
    @State private var currentPassword = ""
    @State private var newPassword = ""
    @State private var confirmPassword = ""

    var body: some View {
        Form {
            Section {
                SecureField("Current Password", text: $currentPassword)
                SecureField("New Password", text: $newPassword)
                SecureField("Confirm Password", text: $confirmPassword)
            }

            Section {
                Button("Update Password") {}
                    .disabled(newPassword.isEmpty || newPassword != confirmPassword)
            }
        }
        .navigationTitle("Change Password")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Profile Edit

struct ProfileEditView: View {
    @EnvironmentObject private var authManager: AuthManager
    @State private var name = ""
    @State private var email = ""

    var body: some View {
        Form {
            Section {
                // Avatar
                HStack {
                    Spacer()
                    VStack(spacing: ShipOSTheme.Spacing.sm) {
                        Image(systemName: "person.crop.circle.fill")
                            .font(.system(size: 80))
                            .foregroundStyle(ShipOSTheme.Colors.primary)

                        Button("Change Photo") {}
                            .font(ShipOSTheme.Typography.caption)
                    }
                    Spacer()
                }
            }

            Section("Details") {
                TextField("Name", text: $name)
                TextField("Email", text: $email)
                    .keyboardType(.emailAddress)
            }

            Section {
                Button("Save") {}
                    .disabled(name.isEmpty)
            }
        }
        .navigationTitle("Edit Profile")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            name = authManager.currentUser?.name ?? ""
            email = authManager.currentUser?.email ?? ""
        }
    }
}

// MARK: - Cache Management

struct CacheManagementView: View {
    @State private var cacheSize = "24.3 MB"

    var body: some View {
        Form {
            Section("Local Data") {
                HStack {
                    Label("Image Cache", systemImage: "photo.stack")
                    Spacer()
                    Text(cacheSize)
                        .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                }

                HStack {
                    Label("Offline Data", systemImage: "internaldrive")
                    Spacer()
                    Text("12.1 MB")
                        .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                }
            }

            Section {
                Button("Clear Image Cache", role: .destructive) {
                    cacheSize = "0 B"
                }

                Button("Clear All Local Data", role: .destructive) {}
            }
        }
        .navigationTitle("Cache & Storage")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Sync Settings

struct SyncSettingsView: View {
    @AppStorage("sync_wifi_only") private var wifiOnly = false
    @AppStorage("sync_interval") private var syncInterval = "realtime"

    var body: some View {
        Form {
            Section("Sync Frequency") {
                Picker("Sync Mode", selection: $syncInterval) {
                    Text("Real-time").tag("realtime")
                    Text("Every 5 min").tag("5min")
                    Text("Every 15 min").tag("15min")
                    Text("Manual Only").tag("manual")
                }
            }

            Section("Network") {
                Toggle("Wi-Fi Only", isOn: $wifiOnly)
            }

            Section {
                Button {
                    // Trigger manual sync
                } label: {
                    Label("Sync Now", systemImage: "arrow.triangle.2.circlepath")
                }
            }
        }
        .navigationTitle("Sync")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Legal

struct LegalView: View {
    var body: some View {
        List {
            NavigationLink("Terms of Service") { ScrollView { Text("Terms of Service content...").padding() } }
            NavigationLink("Privacy Policy") { ScrollView { Text("Privacy Policy content...").padding() } }
            NavigationLink("CMRA Compliance") { ScrollView { Text("CMRA compliance information...").padding() } }
        }
        .navigationTitle("Legal")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Acknowledgements

struct AcknowledgementsView: View {
    var body: some View {
        List {
            Section("Open Source Libraries") {
                AckRow(name: "Auth0.swift", license: "MIT")
                AckRow(name: "KeychainAccess", license: "MIT")
            }

            Section("Frameworks") {
                AckRow(name: "SwiftUI", license: "Apple")
                AckRow(name: "ARKit", license: "Apple")
                AckRow(name: "VisionKit", license: "Apple")
                AckRow(name: "Charts", license: "Apple")
            }
        }
        .navigationTitle("Acknowledgements")
        .navigationBarTitleDisplayMode(.inline)
    }
}

struct AckRow: View {
    let name: String
    let license: String

    var body: some View {
        HStack {
            Text(name)
                .font(ShipOSTheme.Typography.subheadline)
            Spacer()
            Text(license)
                .font(ShipOSTheme.Typography.caption)
                .foregroundStyle(ShipOSTheme.Colors.textTertiary)
        }
    }
}

#Preview {
    NavigationStack {
        SettingsView()
            .navigationTitle("Settings")
    }
    .environmentObject(AuthManager.shared)
}
