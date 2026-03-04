import SwiftUI

/// Settings — store config, notifications, account, and app info.
struct SettingsView: View {
    @EnvironmentObject private var authManager: AuthManager
    @State private var showingLogoutConfirmation = false

    var body: some View {
        List {
            // Store Info
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
                }
            }

            // Account
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
            }

            // Security
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
                    Text("Session Management")
                } label: {
                    Label("Active Sessions", systemImage: "desktopcomputer")
                }
            }

            // Preferences
            Section("Preferences") {
                NavigationLink {
                    Text("Notification Settings")
                } label: {
                    Label("Notifications", systemImage: "bell")
                }

                NavigationLink {
                    Text("Printer Configuration")
                } label: {
                    Label("Printer", systemImage: "printer")
                }

                NavigationLink {
                    Text("Storage Locations")
                } label: {
                    Label("Storage Locations", systemImage: "mappin.and.ellipse")
                }
            }

            // App Info
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
                    Text("Legal / Terms")
                } label: {
                    Label("Legal", systemImage: "doc.text")
                }
            }

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

    private var appVersion: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0.0"
    }

    private var buildNumber: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? "1"
    }
}

#Preview {
    NavigationStack {
        SettingsView()
            .navigationTitle("Settings")
    }
    .environmentObject(AuthManager.shared)
}
