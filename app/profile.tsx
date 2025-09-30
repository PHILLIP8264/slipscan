import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Preferencesui from "../assets/componets/ui/profileui/Preferencesui";
import Profileinfoi from "../assets/componets/ui/profileui/Profileinfoi";
import { auth } from "../firebaseConfig";
import { getUserByEmail, updateUser } from "../utils/CRUD/usercrud";
import { User } from "../utils/localdb";
import {
  clearLastLoggedInUser,
  getLastLoggedInUser,
} from "../utils/userPersistence";

export default function ProfileSettings() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form states
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(false);

  useEffect(() => {
    loadUserFromPersistence();
  }, []);

  const loadUserFromPersistence = async () => {
    try {
      // First, get the last logged-in user from persistence
      const lastLoggedInUser = await getLastLoggedInUser();
      console.log(
        "Profile - Last logged-in user from persistence:",
        lastLoggedInUser
      );

      if (lastLoggedInUser) {
        // Find the full user record in NoSQL database using email
        const localUser = await getUserByEmail(lastLoggedInUser.email);
        console.log("Profile - Found full user record:", localUser);

        if (localUser) {
          setUser(localUser);
          setDisplayName(localUser.name);
          setEmail(localUser.email);
          console.log(
            "Profile - Set user data from persistence:",
            localUser.name,
            localUser.email
          );

          // Parse settings if they exist
          if (localUser.settings) {
            try {
              const settings = JSON.parse(localUser.settings);
              console.log("Profile - Parsed settings:", settings);
              setNotifications(settings.notifications ?? true);
              setDarkMode(settings.theme === "dark");
              setBiometricsEnabled(settings.biometricsEnabled ?? false);
            } catch (e) {
              console.log("Could not parse user settings:", e);
            }
          }
        } else {
          console.log("Profile - User not found in local database");
          // Fallback: use persistence data directly
          setDisplayName(lastLoggedInUser.name);
          setEmail(lastLoggedInUser.email);
        }
      } else {
        console.log(
          "Profile - No persisted user found, trying Firebase fallback"
        );
        // Fallback to Firebase if no persistence (shouldn't happen in normal flow)
        await loadUserFromFirebase();
      }
    } catch (error) {
      console.error("Error loading user from persistence:", error);
      Alert.alert("Error", "Could not load user data");
    } finally {
      setLoading(false);
    }
  };

  const loadUserFromFirebase = async () => {
    try {
      const firebaseUser = auth.currentUser;
      console.log(
        "Profile - Firebase fallback user:",
        firebaseUser?.uid,
        firebaseUser?.email
      );

      if (firebaseUser) {
        const localUser = await getUserByEmail(firebaseUser.email || "");
        console.log("Profile - Firebase fallback found local user:", localUser);

        if (localUser) {
          setUser(localUser);
          setDisplayName(localUser.name);
          setEmail(localUser.email);
        } else {
          setDisplayName(firebaseUser.displayName || "");
          setEmail(firebaseUser.email || "");
        }
      }
    } catch (error) {
      console.error("Error in Firebase fallback:", error);
    }
  };

  const handleSave = async () => {
    if (!user) {
      Alert.alert("Error", "No user data found");
      return;
    }

    setSaving(true);
    try {
      const settings = {
        notifications,
        theme: darkMode ? "dark" : "light",
        biometricsEnabled,
        firebaseUid: auth.currentUser?.uid,
        updatedAt: new Date().toISOString(),
      };

      const updatedUser = await updateUser(user._id, {
        name: displayName,
        settings: JSON.stringify(settings),
      });

      if (updatedUser) {
        setUser(updatedUser);
        Alert.alert("Success", "Profile updated successfully!");
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      Alert.alert("Error", "Could not save profile changes");
    } finally {
      setSaving(false);
    }
  };

  const handleSoftSignOut = async () => {
    try {
      // Only sign out from Firebase, keep user persistence for testing
      await signOut(auth);
      router.replace("/");
    } catch (error) {
      console.error("Soft sign out error:", error);
      Alert.alert("Error", "Could not sign out");
    }
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out Options", "Choose how you want to sign out:", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Soft Logout (Keep Welcome Back)",
        onPress: handleSoftSignOut,
      },
      {
        text: "Full Logout (Clear All Data)",
        style: "destructive",
        onPress: async () => {
          try {
            // Clear user persistence data
            await clearLastLoggedInUser();
            await signOut(auth);
            router.replace("/");
          } catch (error) {
            console.error("Sign out error:", error);
            Alert.alert("Error", "Could not sign out");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile Settings</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={[styles.saveButtonText, saving && styles.disabledText]}>
            {saving ? "Saving..." : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Profile Section */}
      <Profileinfoi
        displayName={displayName}
        setDisplayName={setDisplayName}
        email={email}
        userId={user?._id}
        createdDate={user?.createdAt}
        showAdvancedInfo={__DEV__}
      />

      {/* Preferences Section */}
      <Preferencesui
        notifications={notifications}
        setNotifications={setNotifications}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        biometricsEnabled={biometricsEnabled}
        setBiometricsEnabled={setBiometricsEnabled}
      />

      {/* Account Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity style={styles.actionButton} onPress={handleSignOut}>
          <Ionicons name="log-out" size={20} color="#ff3b30" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      {/* Debug Info (remove in production) */}
      {__DEV__ && user && (
        <View style={styles.debugSection}>
          <Text style={styles.debugTitle}>Debug Info</Text>
          <Text style={styles.debugText}>User ID: {user._id}</Text>
          <Text style={styles.debugText}>
            Created: {new Date(user.createdAt).toLocaleDateString()}
          </Text>
          <Text style={styles.debugText}>
            Updated: {new Date(user.updatedAt).toLocaleDateString()}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
    marginTop: 40, // Account for status bar
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    color: "#007AFF",
    fontWeight: "600",
  },
  disabledText: {
    color: "#999",
  },
  section: {
    backgroundColor: "#fff",
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  signOutText: {
    fontSize: 16,
    color: "#ff3b30",
    marginLeft: 12,
    fontWeight: "500",
  },
  debugSection: {
    backgroundColor: "#fff",
    marginTop: 20,
    paddingHorizontal: 16,
    paddingVertical: 20,
    marginBottom: 40,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginBottom: 8,
  },
  debugText: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
});
