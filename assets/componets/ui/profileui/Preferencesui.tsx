import { Ionicons } from "@expo/vector-icons";
import * as LocalAuthentication from "expo-local-authentication";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Switch, Text, View } from "react-native";
import {
  isBiometricsAvailable,
  isBiometricsEnabled,
  setBiometricsEnabled as saveBiometricsPreference,
} from "../../../../utils/biometrics";

interface PreferencesProps {
  notifications: boolean;
  setNotifications: (value: boolean) => void;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  biometricsEnabled: boolean;
  setBiometricsEnabled: (value: boolean) => void;
}

export default function Preferencesui({
  notifications,
  setNotifications,
  darkMode,
  setDarkMode,
  biometricsEnabled,
  setBiometricsEnabled,
}: PreferencesProps) {
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsType, setBiometricsType] = useState<string>("");
  const [localBiometricsEnabled, setLocalBiometricsEnabled] = useState(false);

  useEffect(() => {
    checkBiometricsAvailability();
    loadBiometricsPreference();
  }, []);

  const loadBiometricsPreference = async () => {
    try {
      const isEnabled = await isBiometricsEnabled();
      setLocalBiometricsEnabled(isEnabled);

      // Sync with parent component
      setBiometricsEnabled(isEnabled);
    } catch (error) {
      console.error("Error loading biometrics preference:", error);
      setLocalBiometricsEnabled(false);
    }
  };

  const saveBiometricsPreferenceLocal = async (enabled: boolean) => {
    try {
      await saveBiometricsPreference(enabled);
      setLocalBiometricsEnabled(enabled);
      setBiometricsEnabled(enabled);
    } catch (error) {
      console.error("Error saving biometrics preference:", error);
      Alert.alert("Error", "Could not save biometric preference");
    }
  };

  const checkBiometricsAvailability = async () => {
    try {
      const biometricsInfo = await isBiometricsAvailable();
      setBiometricsAvailable(biometricsInfo.available);
      setBiometricsType(biometricsInfo.type);
    } catch (error) {
      console.error("Error checking biometrics:", error);
      setBiometricsAvailable(false);
    }
  };

  const handleBiometricsToggle = async (value: boolean) => {
    if (value) {
      // Enabling biometrics - test authentication first
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: "Authenticate to enable biometric login",
          fallbackLabel: "Use passcode",
          cancelLabel: "Cancel",
        });

        if (result.success) {
          await saveBiometricsPreferenceLocal(true);
          Alert.alert("Success", "Biometric authentication enabled!");
        } else {
          Alert.alert(
            "Authentication Failed",
            "Could not verify your identity"
          );
        }
      } catch (error) {
        console.error("Biometric auth error:", error);
        Alert.alert("Error", "Could not enable biometric authentication");
      }
    } else {
      // Disabling biometrics
      Alert.alert(
        "Disable Biometrics",
        "Are you sure you want to disable biometric authentication?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Disable",
            style: "destructive",
            onPress: async () => {
              await saveBiometricsPreferenceLocal(false);
            },
          },
        ]
      );
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Preferences</Text>

      {/* Notifications */}
      <View style={styles.switchRow}>
        <View style={styles.switchLabel}>
          <Ionicons name="notifications" size={20} color="#666" />
          <View style={styles.switchTextContainer}>
            <Text style={styles.switchText}>Push Notifications</Text>
            <Text style={styles.switchSubtext}>
              Get notified about budget alerts
            </Text>
          </View>
        </View>
        <Switch
          value={notifications}
          onValueChange={setNotifications}
          trackColor={{ false: "#767577", true: "#007AFF" }}
          thumbColor={notifications ? "#fff" : "#f4f3f4"}
        />
      </View>

      {/* Dark Mode */}
      <View style={styles.switchRow}>
        <View style={styles.switchLabel}>
          <Ionicons name="moon" size={20} color="#666" />
          <View style={styles.switchTextContainer}>
            <Text style={styles.switchText}>Dark Mode</Text>
            <Text style={styles.switchSubtext}>
              Use dark theme throughout the app
            </Text>
          </View>
        </View>
        <Switch
          value={darkMode}
          onValueChange={setDarkMode}
          trackColor={{ false: "#767577", true: "#007AFF" }}
          thumbColor={darkMode ? "#fff" : "#f4f3f4"}
        />
      </View>

      {/* Biometrics */}
      <View style={styles.switchRow}>
        <View style={styles.switchLabel}>
          <Ionicons
            name={
              biometricsType === "Face ID"
                ? "scan"
                : biometricsType === "Fingerprint"
                ? "finger-print"
                : "shield-checkmark"
            }
            size={20}
            color="#666"
          />
          <View style={styles.switchTextContainer}>
            <Text style={styles.switchText}>
              {biometricsType || "Biometric Login"}
            </Text>
            <Text style={styles.switchSubtext}>
              {biometricsAvailable
                ? `Use ${biometricsType.toLowerCase()} to sign in quickly`
                : "Biometric authentication not available"}
            </Text>
          </View>
        </View>
        <Switch
          value={localBiometricsEnabled}
          onValueChange={handleBiometricsToggle}
          disabled={!biometricsAvailable}
          trackColor={{ false: "#767577", true: "#007AFF" }}
          thumbColor={localBiometricsEnabled ? "#fff" : "#f4f3f4"}
        />
      </View>

      {/* Security note */}
      {biometricsAvailable && (
        <View style={styles.securityNote}>
          <Ionicons name="information-circle" size={16} color="#666" />
          <Text style={styles.securityNoteText}>
            Biometric data is stored securely on your device and never shared
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    backgroundColor: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  switchLabel: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  switchTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  switchText: {
    fontSize: 16,
    color: "#000",
    fontWeight: "500",
  },
  switchSubtext: {
    fontSize: 13,
    color: "#666",
    marginTop: 2,
  },
  securityNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
  },
  securityNoteText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
});
