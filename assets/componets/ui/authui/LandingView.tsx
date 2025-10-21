import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type LandingState = "first-time" | "returning";

interface LastLoggedInUser {
  email: string;
  name: string;
  userId: string;
  loginMethod: "email" | "phone";
  loginDate: string;
}

interface LandingViewProps {
  state: LandingState;
  onLogin: () => void;
  onBiometricLogin?: () => void;
  onSignup: () => void;
  lastUser?: LastLoggedInUser | null;
  canUseBiometrics?: boolean;
  biometricsType?: string;
}

export default function LandingView({
  state,
  onLogin,
  onBiometricLogin,
  onSignup,
  lastUser,
  canUseBiometrics = false,
  biometricsType = "Biometrics",
}: LandingViewProps) {
  const handleLoginPress = () => {
    if (state === "returning" && lastUser && canUseBiometrics && onBiometricLogin) {
      // Use biometric login for returning users with biometrics enabled
      onBiometricLogin();
    } else {
      // Use regular login form
      onLogin();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {state === "returning" && lastUser ? `Welcome back, ${lastUser.name}!` : "Welcome to SlipScan"}
        </Text>
        <Text style={styles.subtitle}>
          {state === "returning" && lastUser 
            ? `Continue as ${lastUser.email}` 
            : "Secure expense tracking"}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleLoginPress}
        >
          {state === "returning" && lastUser && canUseBiometrics ? (
            <View style={styles.buttonContent}>
              <Ionicons 
                name="finger-print" 
                size={24} 
                color="white" 
                style={styles.buttonIcon} 
              />
              <Text style={styles.primaryButtonText}>
                Login with {biometricsType}
              </Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>Login</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            state === "first-time"
              ? styles.primaryButton
              : styles.secondaryButton,
          ]}
          onPress={onSignup}
        >
          <Text
            style={
              state === "first-time"
                ? styles.primaryButtonText
                : styles.secondaryButtonText
            }
          >
            {state === "first-time" ? "Get Started" : "Create New Account"}
          </Text>
        </TouchableOpacity>
      </View>

      {state === "returning" && (
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Welcome back! Please sign in to continue.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 20,
  },
  header: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#000",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
  buttonContainer: {
    paddingHorizontal: 20,
    gap: 16,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
  },
  primaryButton: {
    backgroundColor: "#007AFF",
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  secondaryButton: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: "#007AFF",
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  secondaryButtonText: {
    color: "#007AFF",
    fontSize: 18,
    fontWeight: "600",
  },
  footer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonIcon: {
    marginRight: 8,
  },
});
