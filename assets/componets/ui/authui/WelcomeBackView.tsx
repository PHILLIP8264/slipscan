import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { LastLoggedInUser } from "../../../../utils/userPersistence";

interface WelcomeBackViewProps {
  user: LastLoggedInUser;
  loading: boolean;
  biometricsInfo: {
    available: boolean;
    type: string;
  };
  onBiometricLogin: () => void;
  onPasswordLogin: () => void;
  onSwitchUser: () => void;
  getGreeting: () => string;
  formatLastLogin: (dateString: string) => string;
}

export default function WelcomeBackView({
  user,
  loading,
  biometricsInfo,
  onBiometricLogin,
  onPasswordLogin,
  onSwitchUser,
  getGreeting,
  formatLastLogin,
}: WelcomeBackViewProps) {
  return (
    <View style={styles.container}>
      {/* Header with Switch User */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.switchUserButton}
          onPress={onSwitchUser}
        >
          <Ionicons name="person-add" size={20} color="#007AFF" />
          <Text style={styles.switchUserText}>Switch User</Text>
        </TouchableOpacity>
      </View>

      {/* Welcome Content */}
      <View style={styles.content}>
        {/* Avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </Text>
          </View>
        </View>

        {/* Greeting */}
        <Text style={styles.greeting}>{getGreeting()},</Text>
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.lastLogin}>
          Last login: {formatLastLogin(user.loginDate)}
        </Text>

        {/* Biometric Login Button */}
        {biometricsInfo.available && (
          <TouchableOpacity
            style={[styles.biometricButton, loading && styles.buttonDisabled]}
            onPress={onBiometricLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons
                  name={
                    biometricsInfo.type === "Face ID"
                      ? "scan"
                      : biometricsInfo.type === "Fingerprint"
                      ? "finger-print"
                      : "shield-checkmark"
                  }
                  size={20}
                  color="#fff"
                  style={styles.biometricIcon}
                />
                <Text style={styles.biometricButtonText}>
                  Login with {biometricsInfo.type}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Alternative Options */}
        <TouchableOpacity
          style={styles.alternativeButton}
          onPress={onPasswordLogin}
        >
          <Text style={styles.alternativeText}>Use Password Instead</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>SlipScan</Text>
        <Text style={styles.footerSubtext}>Secure expense tracking</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
  },
  switchUserButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
  },
  switchUserText: {
    color: "#007AFF",
    marginLeft: 6,
    fontSize: 14,
    fontWeight: "500",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  avatarContainer: {
    marginBottom: 30,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarText: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "600",
  },
  greeting: {
    fontSize: 24,
    color: "#666",
    marginBottom: 8,
  },
  userName: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 12,
    textAlign: "center",
  },
  lastLogin: {
    fontSize: 14,
    color: "#666",
    marginBottom: 40,
  },
  biometricButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#007AFF",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#007AFF",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    minWidth: 200,
    justifyContent: "center",
    marginBottom: 20,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  biometricIcon: {
    marginRight: 10,
  },
  biometricButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  alternativeButton: {
    padding: 12,
  },
  alternativeText: {
    color: "#007AFF",
    fontSize: 14,
    textAlign: "center",
  },
  footer: {
    alignItems: "center",
    paddingBottom: 40,
  },
  footerText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#007AFF",
  },
  footerSubtext: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
});
