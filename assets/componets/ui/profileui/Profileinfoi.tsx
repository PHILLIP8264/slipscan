import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { auth } from "../../../../firebaseConfig";

interface ProfileInfoProps {
  displayName: string;
  setDisplayName: (value: string) => void;
  email: string;
  userId?: string;
  createdDate?: Date | string;
  showAdvancedInfo?: boolean;
}

export default function Profileinfoi({
  displayName,
  setDisplayName,
  email,
  userId,
  createdDate,
  showAdvancedInfo = false,
}: ProfileInfoProps) {
  const handleEmailPress = () => {
    Alert.alert(
      "Email Cannot Be Changed",
      "Your email address is linked to your account and cannot be modified. If you need to change it, please contact support.",
      [{ text: "OK" }]
    );
  };

  const formatDate = (date: Date | string) => {
    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        return "Invalid Date";
      }
      return dateObj.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid Date";
    }
  };

  const getAccountAge = (date: Date | string) => {
    try {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        return "Unknown age";
      }

      const now = new Date();
      const diffTime = Math.abs(now.getTime() - dateObj.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays < 1) {
        return "Today";
      } else if (diffDays === 1) {
        return "1 day old";
      } else if (diffDays < 7) {
        return `${diffDays} days old`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} week${weeks === 1 ? "" : "s"} old`;
      } else if (diffDays < 365) {
        const months = Math.floor(diffDays / 30);
        return `${months} month${months === 1 ? "" : "s"} old`;
      } else {
        const years = Math.floor(diffDays / 365);
        return `${years} year${years === 1 ? "" : "s"} old`;
      }
    } catch (error) {
      console.error("Error calculating account age:", error);
      return "Unknown age";
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Profile Information</Text>

      {/* Display Name */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Display Name</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Enter your name"
            maxLength={50}
          />
          <Ionicons
            name="person"
            size={18}
            color="#999"
            style={styles.inputIcon}
          />
        </View>
        <Text style={styles.helperText}>
          This is how your name appears in the app
        </Text>
      </View>

      {/* Email */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email Address</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, styles.disabledInput]}
            value={email}
            editable={false}
            placeholder="Email address"
            onPress={handleEmailPress}
          />
          <Ionicons
            name="mail"
            size={18}
            color="#999"
            style={styles.inputIcon}
          />
        </View>
        <Text style={styles.helperText}>
          Email cannot be changed • Linked to your account
        </Text>
      </View>

      {/* Account Verification Status */}
      <View style={styles.verificationContainer}>
        <View style={styles.verificationRow}>
          <Ionicons
            name={
              auth.currentUser?.emailVerified
                ? "checkmark-circle"
                : "alert-circle"
            }
            size={16}
            color={auth.currentUser?.emailVerified ? "#28a745" : "#ffc107"}
          />
          <Text
            style={[
              styles.verificationText,
              {
                color: auth.currentUser?.emailVerified ? "#28a745" : "#ffc107",
              },
            ]}
          >
            {auth.currentUser?.emailVerified
              ? "Email Verified"
              : "Email Not Verified"}
          </Text>
        </View>

        {auth.currentUser?.phoneNumber && (
          <View style={styles.verificationRow}>
            <Ionicons name="checkmark-circle" size={16} color="#28a745" />
            <Text style={[styles.verificationText, { color: "#28a745" }]}>
              Phone Verified
            </Text>
          </View>
        )}
      </View>

      {/* Advanced Account Information */}
      {showAdvancedInfo && userId && createdDate && (
        <View style={styles.advancedInfo}>
          <Text style={styles.advancedTitle}>Account Details</Text>

          <View style={styles.infoRow}>
            <Ionicons name="calendar" size={16} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Member Since</Text>
              <Text style={styles.infoValue}>
                {formatDate(createdDate)} ({getAccountAge(createdDate)})
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="key" size={16} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Account ID</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {userId.slice(0, 8)}...{userId.slice(-8)}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="shield" size={16} color="#666" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Security</Text>
              <Text style={styles.infoValue}>
                {auth.currentUser?.providerData
                  .map((p) => p.providerId)
                  .includes("password")
                  ? "Password + "
                  : ""}
                {auth.currentUser?.providerData
                  .map((p) => p.providerId)
                  .includes("phone")
                  ? "Phone"
                  : "Email"}
              </Text>
            </View>
          </View>
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
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 8,
  },
  inputContainer: {
    position: "relative",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    paddingRight: 40,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  disabledInput: {
    backgroundColor: "#f8f8f8",
    color: "#666",
  },
  inputIcon: {
    position: "absolute",
    right: 12,
    top: 12,
  },
  helperText: {
    fontSize: 12,
    color: "#666",
    marginTop: 6,
    lineHeight: 16,
  },
  verificationContainer: {
    marginBottom: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  verificationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  verificationText: {
    fontSize: 13,
    marginLeft: 8,
    fontWeight: "500",
  },
  advancedInfo: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  advancedTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 13,
    color: "#333",
  },
});
