import SwiftUI

/// Auth0 login screen with branding and biometric unlock option.
struct LoginView: View {
    @EnvironmentObject private var authManager: AuthManager
    @State private var isLoggingIn = false

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient(
                colors: [
                    ShipOSTheme.Colors.primary.opacity(0.1),
                    ShipOSTheme.Colors.background,
                    ShipOSTheme.Colors.background
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 48) {
                Spacer()

                // Logo & branding
                VStack(spacing: 16) {
                    Image(systemName: "shippingbox.fill")
                        .font(.system(size: 80))
                        .foregroundStyle(ShipOSTheme.Colors.primary)

                    Text("ShipOS")
                        .font(ShipOSTheme.Typography.largeTitle)
                        .foregroundStyle(ShipOSTheme.Colors.textPrimary)

                    Text("Package Management, Simplified")
                        .font(ShipOSTheme.Typography.body)
                        .foregroundStyle(ShipOSTheme.Colors.textSecondary)
                }

                Spacer()

                // Login actions
                VStack(spacing: 16) {
                    // Primary login button
                    Button {
                        Task { await performLogin() }
                    } label: {
                        HStack(spacing: 12) {
                            if isLoggingIn {
                                ProgressView()
                                    .tint(.white)
                            }
                            Text(isLoggingIn ? "Signing in…" : "Sign In")
                                .font(ShipOSTheme.Typography.headline)
                        }
                        .frame(maxWidth: .infinity, minHeight: 56)
                        .background(ShipOSTheme.Colors.primary)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 16))
                    }
                    .disabled(isLoggingIn)

                    // Biometric unlock (if available and previously enabled)
                    if authManager.biometricType != .none && authManager.isBiometricEnabled {
                        Button {
                            Task { await authManager.unlockWithBiometrics() }
                        } label: {
                            HStack(spacing: 8) {
                                Image(systemName: authManager.biometricType.systemImage)
                                Text("Unlock with \(authManager.biometricType.displayName)")
                            }
                            .font(ShipOSTheme.Typography.subheadline)
                            .frame(maxWidth: .infinity, minHeight: 48)
                            .background(ShipOSTheme.Colors.surfaceSecondary)
                            .foregroundStyle(ShipOSTheme.Colors.textPrimary)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }
                    }

                    // Error display
                    if let error = authManager.error {
                        Text(error.localizedDescription)
                            .font(ShipOSTheme.Typography.caption)
                            .foregroundStyle(ShipOSTheme.Colors.error)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }
                }
                .padding(.horizontal, 32)

                // Footer
                Text("Bardo Labs © 2026")
                    .font(ShipOSTheme.Typography.caption)
                    .foregroundStyle(ShipOSTheme.Colors.textTertiary)
                    .padding(.bottom, 24)
            }
        }
    }

    private func performLogin() async {
        isLoggingIn = true
        await authManager.login()
        isLoggingIn = false
    }
}

#Preview {
    LoginView()
        .environmentObject(AuthManager.shared)
}
