import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useWindowDimensions } from 'react-native';
import { colors, fontSize } from '../lib/theme';

// Screens
import DashboardScreen from '../screens/DashboardScreen';
import PackageCheckInScreen from '../screens/PackageCheckInScreen';
import PackageCheckOutScreen from '../screens/PackageCheckOutScreen';
import CustomerListScreen from '../screens/CustomerListScreen';
import CustomerDetailScreen from '../screens/CustomerDetailScreen';
import ScannerScreen from '../screens/ScannerScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SettingsScreen from '../screens/SettingsScreen';

// ── Types ──────────────────────────────────────────────────────────

type RootTabParamList = {
  DashboardTab: undefined;
  PackagesTab: undefined;
  ScanTab: undefined;
  CustomersTab: undefined;
  MoreTab: undefined;
};

type PackageStackParamList = {
  PackageCheckIn: { barcode?: string } | undefined;
  PackageCheckOut: undefined;
  Scanner: { returnTo?: string } | undefined;
};

type CustomerStackParamList = {
  CustomerList: undefined;
  CustomerDetail: { customerId: string };
};

type MoreStackParamList = {
  Notifications: undefined;
  Settings: undefined;
};

// ── Stack Navigators ───────────────────────────────────────────────

const PackageStack = createNativeStackNavigator<PackageStackParamList>();
const CustomerStack = createNativeStackNavigator<CustomerStackParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();
const Tab = createBottomTabNavigator<RootTabParamList>();

const screenOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.textPrimary,
  headerTitleStyle: { fontWeight: '600' as const },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.background },
};

function PackageNavigator() {
  return (
    <PackageStack.Navigator screenOptions={screenOptions}>
      <PackageStack.Screen
        name="PackageCheckIn"
        component={PackageCheckInScreen}
        options={{ title: 'Check In Package' }}
      />
      <PackageStack.Screen
        name="PackageCheckOut"
        component={PackageCheckOutScreen}
        options={{ title: 'Check Out Package' }}
      />
      <PackageStack.Screen
        name="Scanner"
        component={ScannerScreen}
        options={{ headerShown: false, presentation: 'fullScreenModal' }}
      />
    </PackageStack.Navigator>
  );
}

function CustomerNavigator() {
  return (
    <CustomerStack.Navigator screenOptions={screenOptions}>
      <CustomerStack.Screen
        name="CustomerList"
        component={CustomerListScreen}
        options={{ title: 'Customers' }}
      />
      <CustomerStack.Screen
        name="CustomerDetail"
        component={CustomerDetailScreen}
        options={{ title: 'Customer' }}
      />
    </CustomerStack.Navigator>
  );
}

function MoreNavigator({ onLogout }: { onLogout: () => void }) {
  return (
    <MoreStack.Navigator screenOptions={screenOptions}>
      <MoreStack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: 'Notifications' }}
      />
      <MoreStack.Screen name="Settings" options={{ title: 'Settings' }}>
        {() => <SettingsScreen onLogout={onLogout} />}
      </MoreStack.Screen>
    </MoreStack.Navigator>
  );
}

// ── Tab Navigator ──────────────────────────────────────────────────

interface Props {
  onLogout: () => void;
}

export default function AppNavigator({ onLogout }: Props) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <NavigationContainer
      theme={{
        dark: true,
        colors: {
          primary: colors.primary,
          background: colors.background,
          card: colors.surface,
          text: colors.textPrimary,
          border: colors.border,
          notification: colors.error,
        },
      }}
    >
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            switch (route.name) {
              case 'DashboardTab':
                iconName = focused ? 'grid' : 'grid-outline';
                break;
              case 'PackagesTab':
                iconName = focused ? 'cube' : 'cube-outline';
                break;
              case 'ScanTab':
                iconName = focused ? 'scan-circle' : 'scan-circle-outline';
                break;
              case 'CustomersTab':
                iconName = focused ? 'people' : 'people-outline';
                break;
              case 'MoreTab':
                iconName = focused ? 'ellipsis-horizontal-circle' : 'ellipsis-horizontal-circle-outline';
                break;
              default:
                iconName = 'help-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            paddingBottom: isTablet ? 8 : undefined,
          },
          tabBarLabelStyle: {
            fontSize: fontSize.xs,
            fontWeight: '500',
          },
          headerShown: false,
        })}
      >
        <Tab.Screen
          name="DashboardTab"
          component={DashboardScreen}
          options={{ tabBarLabel: 'Dashboard' }}
        />
        <Tab.Screen
          name="PackagesTab"
          component={PackageNavigator}
          options={{ tabBarLabel: 'Packages' }}
        />
        <Tab.Screen
          name="ScanTab"
          component={ScannerScreen}
          options={{
            tabBarLabel: 'Scan',
            tabBarIconStyle: { marginTop: -2 },
          }}
        />
        <Tab.Screen
          name="CustomersTab"
          component={CustomerNavigator}
          options={{ tabBarLabel: 'Customers' }}
        />
        <Tab.Screen name="MoreTab" options={{ tabBarLabel: 'More' }}>
          {() => <MoreNavigator onLogout={onLogout} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
