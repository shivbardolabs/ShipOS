import SwiftUI

/// Root view that switches between auth flow and main app.
struct RootView: View {
    @EnvironmentObject private var authManager: AuthManager

    var body: some View {
        Group {
            switch authManager.state {
            case .loading:
                LaunchScreen()
            case .unauthenticated:
                LoginView()
            case .authenticated:
                AdaptiveNavigationView()
            }
        }
        .animation(.easeInOut(duration: 0.3), value: authManager.state)
    }
}

/// Splash / launch screen shown during initial auth check.
struct LaunchScreen: View {
    @State private var isAnimating = false

    var body: some View {
        ZStack {
            ShipOSTheme.Colors.background
                .ignoresSafeArea()

            VStack(spacing: 24) {
                Image(systemName: "shippingbox.fill")
                    .font(.system(size: 72))
                    .foregroundStyle(ShipOSTheme.Colors.primary)
                    .scaleEffect(isAnimating ? 1.05 : 0.95)
                    .animation(
                        .easeInOut(duration: 1.0).repeatForever(autoreverses: true),
                        value: isAnimating
                    )

                Text("ShipOS")
                    .font(ShipOSTheme.Typography.largeTitle)
                    .foregroundStyle(ShipOSTheme.Colors.textPrimary)

                ProgressView()
                    .tint(ShipOSTheme.Colors.primary)
            }
        }
        .onAppear { isAnimating = true }
    }
}

#Preview {
    RootView()
        .environmentObject(AuthManager.shared)
        .environmentObject(AppState())
}
