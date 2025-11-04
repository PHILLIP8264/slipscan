import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function DocumentScannerDemo() {
  const router = useRouter();
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [demoResults, setDemoResults] = useState<any>(null);

  const simulateMLKitScan = () => {
    // Simulate ML Kit scanning with mock data
    setTimeout(() => {
      const mockResult = {
        success: true,
        pages: [
          { imageUri: "mock://receipt-1.jpg" },
        ],
        pdfUri: "mock://scanned-receipt.pdf",
        pdfPageCount: 1,
      };

      setDemoResults(mockResult);

      Alert.alert(
        "🎉 ML Kit Scan Complete!",
        `Successfully scanned ${mockResult.pages.length} page with:\n\n✅ Auto edge detection\n✅ Perspective correction\n✅ Image enhancement\n✅ PDF generation`,
        [
          { text: "View Results", onPress: () => {} },
          { text: "Scan Another", onPress: () => setDemoResults(null) },
        ]
      );
    }, 2000); // Simulate 2 second scanning
  };

  const showMLKitFeatures = () => {
    Alert.alert(
      "🔬 ML Kit Document Scanner Features",
      "This implementation includes:\n\n" +
        "📱 Native Android Module Integration\n" +
        "🎯 Automatic Edge Detection\n" +
        "📐 Perspective Correction\n" +
        "✨ Image Enhancement & Filtering\n" +
        "📄 Multi-page Scanning (up to 6 pages)\n" +
        "📁 PDF Generation\n" +
        "🖼️ Gallery Import Support\n" +
        "🎨 Customizable Scanner UI\n\n" +
        "The native module uses Google's play-services-mlkit-document-scanner for professional-grade document scanning.",
      [{ text: "Awesome!" }]
    );
  };

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
        <Text style={styles.headerTitle}>ML Kit Document Scanner</Text>
        <TouchableOpacity onPress={showMLKitFeatures}>
          <Ionicons
            name="information-circle-outline"
            size={24}
            color="#007AFF"
          />
        </TouchableOpacity>
      </View>

      {/* Status Banner */}
      <View style={styles.statusBanner}>
        <Ionicons name="construct" size={20} color="#FF9500" />
        <Text style={styles.statusText}>
          {Platform.OS === "android"
            ? "Native ML Kit module ready! (Requires development build)"
            : "iOS fallback camera scanner available"}
        </Text>
      </View>

      {/* Main Feature Card */}
      <View style={styles.featureCard}>
        <View style={styles.featureHeader}>
          <Ionicons name="scan" size={40} color="#007AFF" />
          <Text style={styles.featureTitle}>Advanced Document Scanning</Text>
          <Text style={styles.featureSubtitle}>
            Google ML Kit powered document scanner with professional-grade
            features
          </Text>
        </View>

        {/* Demo Button */}
        <TouchableOpacity style={styles.demoButton} onPress={simulateMLKitScan}>
          <Ionicons name="play-circle" size={24} color="white" />
          <Text style={styles.demoButtonText}>Run Demo Scan</Text>
        </TouchableOpacity>
      </View>

      {/* Features Grid */}
      <View style={styles.featuresGrid}>
        <Text style={styles.sectionTitle}>Built-in Features</Text>

        <View style={styles.featuresRow}>
          <View style={styles.featureItem}>
            <Ionicons name="scan-outline" size={24} color="#34C759" />
            <Text style={styles.featureItemTitle}>Auto Detection</Text>
            <Text style={styles.featureItemText}>
              Automatically detects document edges
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="crop" size={24} color="#007AFF" />
            <Text style={styles.featureItemTitle}>Perspective Fix</Text>
            <Text style={styles.featureItemText}>
              Corrects perspective distortion
            </Text>
          </View>
        </View>

        <View style={styles.featuresRow}>
          <View style={styles.featureItem}>
            <Ionicons name="sparkles" size={24} color="#FF9500" />
            <Text style={styles.featureItemTitle}>Enhancement</Text>
            <Text style={styles.featureItemText}>
              Improves clarity and contrast
            </Text>
          </View>

          <View style={styles.featureItem}>
            <Ionicons name="document" size={24} color="#FF3B30" />
            <Text style={styles.featureItemTitle}>PDF Export</Text>
            <Text style={styles.featureItemText}>
              Generates searchable PDFs
            </Text>
          </View>
        </View>
      </View>

      {/* Demo Results */}
      {demoResults && (
        <View style={styles.resultsCard}>
          <Text style={styles.resultsTitle}>Demo Scan Results</Text>

          <View style={styles.resultStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{demoResults.pages.length}</Text>
              <Text style={styles.statLabel}>Pages Scanned</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle" size={32} color="#34C759" />
              <Text style={styles.statLabel}>Success</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>PDF</Text>
              <Text style={styles.statLabel}>Generated</Text>
            </View>
          </View>

          <View style={styles.mockImages}>
            <Text style={styles.mockImagesTitle}>Scanned Pages:</Text>
            <View style={styles.mockImageGrid}>
              {demoResults.pages.map((page: any, index: number) => (
                <View key={index} style={styles.mockImageContainer}>
                  <View style={styles.mockImage}>
                    <Ionicons name="document-text" size={32} color="#666" />
                  </View>
                  <Text style={styles.mockImageLabel}>Page {index + 1}</Text>
                </View>
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.resetButton}
            onPress={() => setDemoResults(null)}
          >
            <Text style={styles.resetButtonText}>Reset Demo</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Implementation Details */}
      <View style={styles.implementationCard}>
        <Text style={styles.implementationTitle}>Implementation Details</Text>

        <View style={styles.codeBlock}>
          <Text style={styles.codeTitle}>Native Android Module:</Text>
          <Text style={styles.codeText}>DocumentScannerModule.java</Text>
          <Text style={styles.codeText}>+ ML Kit Document Scanner API</Text>
          <Text style={styles.codeText}>+ React Native Bridge</Text>
        </View>

        <View style={styles.codeBlock}>
          <Text style={styles.codeTitle}>Features Included:</Text>
          <Text style={styles.codeText}>• GmsDocumentScanner integration</Text>
          <Text style={styles.codeText}>• Multi-page scanning support</Text>
          <Text style={styles.codeText}>• PDF generation capability</Text>
          <Text style={styles.codeText}>• Gallery import functionality</Text>
          <Text style={styles.codeText}>• Automatic image enhancement</Text>
        </View>

        <View style={styles.buildNote}>
          <Ionicons name="warning" size={20} color="#FF9500" />
          <Text style={styles.buildNoteText}>
            To test the native ML Kit scanner, build a development build with:
          </Text>
        </View>
        <View style={styles.commandBlock}>
          <Text style={styles.commandText}>npx expo run:android</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    marginTop: 40,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF3CD",
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9500",
  },
  statusText: {
    fontSize: 14,
    color: "#856404",
    marginLeft: 8,
    flex: 1,
  },
  featureCard: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  featureHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  featureTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginTop: 16,
    textAlign: "center",
  },
  featureSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  demoButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  demoButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 16,
  },
  featuresGrid: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
    padding: 20,
  },
  featuresRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  featureItem: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    marginHorizontal: 4,
    backgroundColor: "#f8f9fa",
    borderRadius: 12,
  },
  featureItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginTop: 8,
    textAlign: "center",
  },
  featureItemText: {
    fontSize: 12,
    color: "#666",
    textAlign: "center",
    marginTop: 4,
  },
  resultsCard: {
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
  resultsTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
    textAlign: "center",
  },
  resultStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#007AFF",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  mockImages: {
    marginBottom: 20,
  },
  mockImagesTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  mockImageGrid: {
    flexDirection: "row",
    justifyContent: "center",
  },
  mockImageContainer: {
    alignItems: "center",
    marginHorizontal: 16,
  },
  mockImage: {
    width: 80,
    height: 100,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#34C759",
    borderStyle: "dashed",
  },
  mockImageLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
  },
  resetButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  resetButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  implementationCard: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
    padding: 20,
  },
  implementationTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  codeBlock: {
    backgroundColor: "#f8f9fa",
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  codeTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  codeText: {
    fontSize: 12,
    color: "#666",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    marginBottom: 2,
  },
  buildNote: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  buildNoteText: {
    fontSize: 14,
    color: "#856404",
    marginLeft: 8,
    flex: 1,
  },
  commandBlock: {
    backgroundColor: "#1a1a1a",
    padding: 12,
    borderRadius: 6,
  },
  commandText: {
    color: "#00ff00",
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 14,
  },
});
