import Homepie from "@/assets/componets/ui/homeui/Homepiechart";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function Index() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeTitle}>Welcome to SlipScan!</Text>
        <Text style={styles.welcomeSubtitle}>
          Scan receipts with{" "}
          {Platform.OS === "android" ? "ML Kit's advanced" : "camera-based"}{" "}
          document scanner
        </Text>
      </View>

      {/* Quick Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.primaryAction]}
          onPress={() => router.push("/DocumentScannerDemo")}
        >
          <Ionicons name="scan" size={32} color="white" />
          <Text style={styles.primaryActionText}>ML Kit Scanner</Text>
          <Text style={styles.actionSubtext}>
            {Platform.OS === "android"
              ? "Advanced document scanner"
              : "Camera fallback"}
          </Text>
        </TouchableOpacity>

        <View style={styles.secondaryActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryAction]}
            onPress={() => router.push("/ScanReceipt")}
          >
            <Ionicons name="camera-outline" size={24} color="#007AFF" />
            <Text style={styles.secondaryActionText}>Basic Scan</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryAction]}
            onPress={() => router.push("/profile")}
          >
            <Ionicons name="settings-outline" size={24} color="#007AFF" />
            <Text style={styles.secondaryActionText}>Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryAction]}
            onPress={() => router.push("/tabs/budget")}
          >
            <Ionicons name="wallet-outline" size={24} color="#007AFF" />
            <Text style={styles.secondaryActionText}>Budget</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Spending Overview */}
      <View style={styles.chartSection}>
        <Text style={styles.chartTitle}>Spending Overview</Text>
        <Homepie />
      </View>

      {/* Features Info */}
      {Platform.OS === "android" && (
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>ML Kit Features</Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Ionicons name="scan" size={20} color="#34C759" />
              <Text style={styles.featureText}>Automatic edge detection</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="crop" size={20} color="#34C759" />
              <Text style={styles.featureText}>Perspective correction</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="sparkles" size={20} color="#34C759" />
              <Text style={styles.featureText}>Image enhancement</Text>
            </View>
            <View style={styles.featureItem}>
              <Ionicons name="documents" size={20} color="#34C759" />
              <Text style={styles.featureText}>Multi-page scanning</Text>
            </View>
          </View>
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
  welcomeSection: {
    backgroundColor: "#fff",
    padding: 24,
    alignItems: "center",
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    textAlign: "center",
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  actionsContainer: {
    padding: 16,
  },
  actionButton: {
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryAction: {
    backgroundColor: "#007AFF",
    marginBottom: 16,
  },
  primaryActionText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 12,
  },
  actionSubtext: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 14,
    marginTop: 4,
  },
  secondaryActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  secondaryAction: {
    backgroundColor: "#fff",
    minWidth: "30%",
    flex: 1,
  },
  secondaryActionText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
  },
  chartSection: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  featuresSection: {
    backgroundColor: "#fff",
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 20,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  featureText: {
    fontSize: 16,
    color: "#666",
    marginLeft: 12,
  },
});
