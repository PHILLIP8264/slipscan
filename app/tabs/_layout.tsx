import { Ionicons } from "@expo/vector-icons";
import { Redirect, Tabs, useRouter } from "expo-router";
import { TouchableOpacity } from "react-native";
import { useAuth } from "../contexts/AuthContext";

export default function Layout() {
  const router = useRouter();
  const { authState, isLocked } = useAuth();


  // Redirect to index if app is locked (will show BiometricLock)
  if (isLocked) {
    return <Redirect href="/" />;
  }

  const SettingsButton = ({ color = "#000" }: { color?: string }) => (
    <TouchableOpacity
      onPress={() => router.push('/SettingsPage')}
      style={{ paddingHorizontal: 16 }}
    >
      <Ionicons name="settings-outline" size={24} color={color} />
    </TouchableOpacity>
  );

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "home";

          if (route.name === "index") {
            iconName = "home";
          } else if (route.name === "budget") {
            iconName = "wallet";
          } else if (route.name === "search") {
            iconName = "search";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "#007AFF",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          headerStyle: { backgroundColor: "white" },
          headerTitleStyle: {
            color: "black",
            fontWeight: "regular",
            fontSize: 30,
          },
          headerTintColor: "white",
          headerShadowVisible: false,
          headerRight: () => <SettingsButton color="#000" />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search Receipts",
          headerStyle: { backgroundColor: "#28a745" },
          headerTitleStyle: { color: "#fff", fontWeight: "bold" },
          headerTintColor: "#fff",
          headerRight: () => <SettingsButton color="#fff" />,
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: "Budget Manager",
          headerStyle: { backgroundColor: "#007AFF" },
          headerTitleStyle: { color: "#fff", fontWeight: "bold" },
          headerTintColor: "#fff",
          headerRight: () => <SettingsButton color="#fff" />,
        }}
      />
    </Tabs>
  );
}
