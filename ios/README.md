# ShipOS iOS App 📱

The ShipOS mobile companion app for iPad and iPhone, built with React Native (Expo).

Designed primarily for iPad use at the store counter, with full iPhone support for on-the-go management.

---

## Features

- **Package Check-In** — Scan barcodes with the device camera, auto-detect carrier, and check in packages with a tap
- **Package Check-Out** — PMB lookup, fee display, and package release
- **Barcode Scanner** — Native camera integration for fast barcode/QR scanning
- **Customer Lookup** — Search and view customer profiles, package history, compliance status
- **Dashboard** — At-a-glance stats: packages held, checked in today, pending pickups
- **Notifications** — View and manage customer notification history
- **Dark Theme** — Matches the ShipOS web app design language

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native (Expo SDK 52) |
| Language | TypeScript |
| Navigation | React Navigation 7 |
| Icons | Expo Vector Icons |
| Camera | expo-camera / expo-barcode-scanner |
| Storage | AsyncStorage |
| HTTP | Axios |

---

## Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- Xcode 15+ (for iOS simulator and builds)
- iOS device or simulator (iPad recommended)

---

## Getting Started

### 1. Install Dependencies

```bash
cd ios
npm install
```

### 2. Configure API Endpoint

Edit `src/lib/api.ts` and set `API_BASE_URL` to your ShipOS backend:

```typescript
// Development (local)
const API_BASE_URL = 'http://localhost:3000/api';

// Production
const API_BASE_URL = 'https://app.yourdomain.com/api';
```

### 3. Start Development

```bash
# Start Expo dev server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on connected device
npx expo start --device
```

### 4. iPad-Specific Testing

To test iPad layouts in the simulator:
1. Open Xcode → Window → Devices and Simulators
2. Add an iPad simulator (iPad Pro 12.9" recommended)
3. Run `npx expo start --ios` and select the iPad simulator

---

## Project Structure

```
ios/
├── App.tsx                     # Entry point
├── app.json                    # Expo configuration
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
└── src/
    ├── screens/                # App screens
    │   ├── LoginScreen.tsx
    │   ├── DashboardScreen.tsx
    │   ├── PackageCheckInScreen.tsx
    │   ├── PackageCheckOutScreen.tsx
    │   ├── CustomerListScreen.tsx
    │   ├── CustomerDetailScreen.tsx
    │   ├── ScannerScreen.tsx
    │   ├── NotificationsScreen.tsx
    │   └── SettingsScreen.tsx
    ├── navigation/
    │   └── AppNavigator.tsx    # Tab + stack navigation
    ├── components/             # Reusable UI components
    │   ├── Card.tsx
    │   ├── Badge.tsx
    │   ├── Button.tsx
    │   ├── Header.tsx
    │   └── StatCard.tsx
    └── lib/
        ├── api.ts              # API client
        ├── theme.ts            # Dark theme colors
        └── types.ts            # Shared TypeScript types
```

---

## Building for Production

### Development Build (TestFlight)

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios --profile preview

# Submit to TestFlight
eas submit --platform ios
```

### Production Build (App Store)

```bash
# Build production binary
eas build --platform ios --profile production

# Submit to App Store Connect
eas submit --platform ios --latest
```

---

## Configuration

### app.json Key Settings

| Setting | Value | Notes |
|---------|-------|-------|
| `supportsTablet` | `true` | iPad support |
| `requireFullScreen` | `false` | Slide Over / Split View |
| `userInterfaceStyle` | `dark` | Force dark mode |
| `bundleIdentifier` | `com.bardolabs.shipos` | Change for your org |

### Environment Variables

The app reads its API endpoint from `src/lib/api.ts`. For different environments, you can use Expo's `app.config.js` with environment variables:

```bash
API_URL=https://staging.yourdomain.com npx expo start
```

---

## License

Proprietary — Bardo Labs © 2026
