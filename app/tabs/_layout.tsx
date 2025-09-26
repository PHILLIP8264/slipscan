import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function Layout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "home";

          if (route.name === "index") {
            iconName = "home";
          } else if (route.name === "settings") {
            iconName = "settings";
          } else if (route.name === "budget") {
            iconName = "wallet";
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
          headerStyle: { backgroundColor: "#007AFF" },
          headerTitleStyle: { color: "#fff", fontWeight: "bold" },
          headerTintColor: "#fff",
        }}
      />
      <Tabs.Screen
        name="budget"
        options={{
          title: "Budget",
          headerStyle: { backgroundColor: "#007AFF" },
          headerTitleStyle: { color: "#fff", fontWeight: "bold" },
          headerTintColor: "#fff",
        }}
      />

      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
