# ShipOS iOS App

Native iOS companion to ShipOS — the mailroom management platform.

## Requirements

- Xcode 15.0+
- iOS 17.0+
- Swift 5.9+

## Project Setup

This project uses [XcodeGen](https://github.com/yonaskolb/XcodeGen) for project generation:

```bash
# Install XcodeGen
brew install xcodegen

# Generate .xcodeproj
cd ios/
xcodegen generate

# Open in Xcode
open ShipOS.xcodeproj
```

## Architecture

```
ios/ShipOS/
├── App/                    # App entry, navigation, config
├── Core/
│   ├── Auth/               # Auth0 PKCE + Keychain + biometrics
│   ├── API/                # Type-safe URLSession client
│   ├── Models/             # SwiftData models (Package, Customer, etc.)
│   ├── Persistence/        # SwiftData container + offline sync
│   └── DesignSystem/       # Theme, components, typography
├── Features/
│   ├── Dashboard/          # Real-time stats + quick actions
│   ├── Packages/           # Package list, check-in, check-out
│   ├── Customers/          # Customer list + detail
│   ├── Notifications/      # Notification center
│   ├── Settings/           # Store config + account
│   └── Mail/               # Mail management
└── Shared/                 # Extensions, utilities
```

### Key Patterns

- **SwiftUI + SwiftData** — declarative UI with automatic persistence
- **Swift Concurrency** — async/await for all network calls
- **MVVM** — `@StateObject` view models, `@Published` state
- **Actor-based API client** — thread-safe network layer with retry logic
- **Adaptive layout** — TabView on iPhone, NavigationSplitView on iPad

## Phase Roadmap

| Phase | Status | Description |
|-------|--------|-------------|
| 1. Foundation | ✅ | App shell, auth, API client, design system, data models |
| 2. Core Ops | 🔲 | Dashboard, check-in/out, customer management, notifications |
| 3. Advanced | 🔲 | Smart Intake AI, mail, batch ops, enhanced scanner |
| 4. Full Platform | 🔲 | Shipping, compliance, reports, settings |
| 5. iOS-Exclusive | 🔲 | Offline mode, push, widgets, iPad Pro layout |
| 6. Quality | 🔲 | Security, performance, testing, CI/CD, App Store |

## Configuration

1. Create `ios/ShipOS/App/Auth0.plist` with your Auth0 credentials:
   ```xml
   <dict>
       <key>ClientId</key>
       <string>YOUR_CLIENT_ID</string>
       <key>Domain</key>
       <string>YOUR_DOMAIN.auth0.com</string>
   </dict>
   ```

2. Set the API URL in `AppConfiguration.swift`

3. Add your URL scheme to `project.yml` under URL Types

## Dependencies

- [Auth0.swift](https://github.com/auth0/Auth0.swift) — Authentication
- [KeychainAccess](https://github.com/kishikawakatsumi/KeychainAccess) — Secure token storage
