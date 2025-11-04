import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DocumentScanner from "../utils/DocumentScanner";

export default function ScanReceipt() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);

  const onScan = async () => {
    setIsScanning(true);
    console.log("Starting scan...");

    try {
      console.log("Calling DocumentScanner.startScanner...");

      // Use Google Vision for best accuracy, with OCR fallback
      const result = await DocumentScanner.startScanner({
        pageLimit: 1, // Scan only one document per session
        allowGalleryImport: true,
        jpeg: true,
        pdf: true,
        scannerMode: "full",
        useGoogleVision: true, // Enable Google Vision for best accuracy
      });

      console.log("ML Kit scan result:", result);
      
      // Check if user cancelled the scan
      if (result.canceled) {
        console.log("User cancelled scanning");
        return;
      }
      
      console.log("Scan successful, pages:", result.pages?.length || 0);
      setScanResult(result);

      // Navigate immediately to EditReceiptModern with the scanned image
      if (result.pages && result.pages.length > 0) {
        try {
          const receiptDataParam = result.receiptData 
            ? encodeURIComponent(JSON.stringify(result.receiptData))
            : encodeURIComponent(JSON.stringify({}));
          const imageUriParam = encodeURIComponent(result.pages[0].imageUri || "");
          
          // Navigate immediately - processing will happen on EditReceiptModern page
          router.push(`./EditReceiptModern?receiptData=${receiptDataParam}&imageUri=${imageUriParam}`);
        } catch (err) {
          console.error('Failed to navigate to EditReceiptModern:', err);
          router.push('./EditReceiptModern');
        }
      } else {
        Alert.alert(
          "Scan Failed",
          "No pages were scanned successfully. Please try again.",
          [{ text: "Try Again", onPress: () => setScanResult(null) }]
        );
      }
    } catch (e: any) {
      console.error("Scan failed:", e);
      console.error("Stack trace:", e.stack);

      let errorMessage = "Unknown error occurred";
      if (e.message) {
        errorMessage = e.message;
      } else if (typeof e === "string") {
        errorMessage = e;
      }

      Alert.alert(
        "Scan Failed",
        `Error: ${errorMessage}\n\nPlease try again or check app permissions.`,
        [
          { text: "Try Again", onPress: onScan },
          { text: "Cancel", style: "cancel" },
        ]
      );
    } finally {
      setIsScanning(false);
    }
  };

  const processReceipt = async (result: any) => {
    try {
      let receiptData = result.receiptData;

      // If receipt data not available, try to extract it now
      if (!receiptData && result.pages.length > 0) {
        Alert.alert("Processing", "Analyzing receipt with Google Vision...");
        receiptData = await DocumentScanner.parseReceipt(
          result.pages[0].imageUri,
          true   // Use Google Vision for best results
        );
      }

      if (receiptData) {
        // Navigate to modern edit screen with the extracted data
        try {
          const receiptDataParam = encodeURIComponent(JSON.stringify(receiptData));
          const imageUriParam = encodeURIComponent(result.pages[0].imageUri);
          router.push(`./EditReceiptModern?receiptData=${receiptDataParam}&imageUri=${imageUriParam}`);
        } catch (err) {
          console.error('Failed to serialize receipt data:', err);
          router.push('./EditReceiptModern');
        }
      } else {
        Alert.alert(
          "Processing Failed",
          "Could not extract receipt data. Please try scanning again with better lighting.",
          [{ text: "Try Again", onPress: () => setScanResult(null) }]
        );
      }
    } catch (error: any) {
      console.error("Receipt processing error:", error);
      console.error("Processing stack trace:", error.stack);

      Alert.alert(
        "Processing Error",
        `Failed to process receipt: ${
          error.message || "Unknown error"
        }\n\nYou can still save the scanned image manually.`,
        [
          { text: "Try Again", onPress: () => setScanResult(null) },
          {
            text: "Save Image Only",
            onPress: () => {
              // Navigate to modern edit screen with minimal data
              try {
                const minimalData = {
                  merchant: "Unknown",
                  total: "0.00",
                  date: new Date().toLocaleDateString(),
                  items: [],
                  rawText: "Processing failed",
                  confidence: 0.1,
                };
                const receiptDataParam = encodeURIComponent(JSON.stringify(minimalData));
                const imageUriParam = encodeURIComponent(result.pages[0]?.imageUri || "");
                router.push(`./EditReceiptModern?receiptData=${receiptDataParam}&imageUri=${imageUriParam}`);
              } catch (err) {
                console.error('Failed to navigate to EditReceiptModern:', err);
                router.push('./EditReceiptModern');
              }
            },
          },
        ]
      );
    }
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
        <Text style={styles.headerTitle}>Scan Receipt</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Ionicons name="document-text" size={48} color="#007AFF" />
        <Text style={styles.instructionsTitle}>
          {Platform.OS === "android"
            ? "ML Kit Document Scanner"
            : "Camera Scanner"}
        </Text>
        <Text style={styles.instructionsText}>
          {Platform.OS === "android"
            ? "Use Google's advanced document scanner with intelligent receipt processing for superior accuracy and understanding."
            : "Take a photo of your receipt using the camera."}
        </Text>

        {Platform.OS === "android" && (
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>Features:</Text>
            <Text style={styles.featureItem}>
              • Intelligent document understanding
            </Text>
            <Text style={styles.featureItem}>
              • Intelligent text recognition
            </Text>
            <Text style={styles.featureItem}>• Smart categorization</Text>
            <Text style={styles.featureItem}>• Automatic edge detection</Text>
            <Text style={styles.featureItem}>
              • Multi-page scanning & PDF generation
            </Text>
          </View>
        )}
      </View>

      {/* Scan Button */}
      <View style={styles.scanButtonContainer}>
        <TouchableOpacity
          style={[styles.scanButton, isScanning && styles.scanButtonDisabled]}
          onPress={onScan}
          disabled={isScanning}
        >
          <Ionicons
            name={isScanning ? "hourglass" : "camera"}
            size={24}
            color="white"
          />
          <Text style={styles.scanButtonText}>
            {isScanning ? "Scanning..." : "Scan Receipt"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Scan Results */}
      {scanResult && (
        <View style={styles.resultsContainer}>
          <Text style={styles.resultsTitle}>Scan Results</Text>

          <View style={styles.resultStats}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{scanResult.pages.length}</Text>
              <Text style={styles.statLabel}>Pages</Text>
            </View>
            {scanResult.pdfUri && (
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>PDF</Text>
                <Text style={styles.statLabel}>Generated</Text>
              </View>
            )}
          </View>

          {/* Show scanned images */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.imagesScroll}
          >
            {scanResult.pages.map((page: any, index: number) => (
              <View key={index} style={styles.imageContainer}>
                <Image
                  source={{ uri: page.imageUri }}
                  style={styles.scannedImage}
                />
                <Text style={styles.imageLabel}>Page {index + 1}</Text>
              </View>
            ))}
          </ScrollView>

          {/* Processing Data Display */}
          {scanResult.receiptData && (
            <View style={styles.ocrContainer}>
              <Text style={styles.ocrTitle}>
                {"processingMethod" in scanResult.receiptData 
                  ? scanResult.receiptData.processingMethod === "google-vision"
                    ? "Google Vision"
                    : "Processed"
                  : "OCR"}{" "}
                Receipt Data
              </Text>
              <View style={styles.ocrRow}>
                <Text style={styles.ocrLabel}>Merchant:</Text>
                <Text style={styles.ocrValue}>
                  {scanResult.receiptData.merchant}
                </Text>
              </View>
              <View style={styles.ocrRow}>
                <Text style={styles.ocrLabel}>Total:</Text>
                <Text style={styles.ocrValue}>
                  ${scanResult.receiptData.total}
                </Text>
              </View>
              <View style={styles.ocrRow}>
                <Text style={styles.ocrLabel}>Date:</Text>
                <Text style={styles.ocrValue}>
                  {scanResult.receiptData.date || "Not found"}
                </Text>
              </View>
              <View style={styles.ocrRow}>
                <Text style={styles.ocrLabel}>Confidence:</Text>
                <Text style={styles.ocrValue}>
                  {Math.round(scanResult.receiptData.confidence * 100)}%
                </Text>
              </View>

              {/* Processing Method Display */}
              {"processingMethod" in scanResult.receiptData && (
                <>
                  <View style={styles.ocrRow}>
                    <Text style={styles.ocrLabel}>Processing Method:</Text>
                    <Text style={styles.ocrValue}>
                      {scanResult.receiptData.processingMethod === "google-vision" 
                        ? "Google Vision API" 
                        : scanResult.receiptData.processingMethod}
                    </Text>
                  </View>
                  {"category" in scanResult.receiptData && (
                    <View style={styles.ocrRow}>
                      <Text style={styles.ocrLabel}>Auto Category:</Text>
                      <Text style={styles.ocrValue}>
                        {scanResult.receiptData.category}
                      </Text>
                    </View>
                  )}
                </>
              )}
              
              {/* Additional metadata can be displayed here */}
              {scanResult.receiptData.items.length > 0 && (
                <View>
                  <Text style={styles.ocrLabel}>
                    Items ({scanResult.receiptData.items.length}):
                  </Text>
                  {scanResult.receiptData.items
                    .slice(0, 3)
                    .map((item: any, index: number) => (
                      <Text key={index} style={styles.itemText}>
                        • {item.name}: ${item.price}
                      </Text>
                    ))}
                  {scanResult.receiptData.items.length > 3 && (
                    <Text style={styles.itemText}>
                      ... and {scanResult.receiptData.items.length - 3} more
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            style={styles.processButton}
            onPress={() => processReceipt(scanResult)}
          >
            <Text style={styles.processButtonText}>
              {scanResult.receiptData ? "Edit & Save" : "Edit Receipt"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Tips */}
      <View style={styles.tipsContainer}>
        <Text style={styles.tipsTitle}>Scanning Tips:</Text>
        <Text style={styles.tipItem}>• Ensure good lighting</Text>
        <Text style={styles.tipItem}>• Place receipt on flat surface</Text>
        <Text style={styles.tipItem}>• Avoid shadows and glare</Text>
        <Text style={styles.tipItem}>• Keep the entire receipt visible</Text>
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
  placeholder: {
    width: 40,
  },
  instructionsContainer: {
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  instructionsTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    textAlign: "center",
  },
  instructionsText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 22,
  },
  featuresContainer: {
    marginTop: 16,
    alignSelf: "stretch",
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  featureItem: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  scanButtonContainer: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  scanButton: {
    backgroundColor: "#007AFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  scanButtonDisabled: {
    backgroundColor: "#999",
  },
  scanButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
  },
  resultsContainer: {
    backgroundColor: "#fff",
    margin: 16,
    borderRadius: 12,
    padding: 16,
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
  },
  resultStats: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 16,
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
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  imagesScroll: {
    marginVertical: 16,
  },
  imageContainer: {
    alignItems: "center",
    marginRight: 16,
  },
  scannedImage: {
    width: 120,
    height: 160,
    borderRadius: 8,
    backgroundColor: "#f0f0f0",
  },
  imageLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 8,
  },
  processButton: {
    backgroundColor: "#34C759",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  processButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  tipsContainer: {
    backgroundColor: "#fff",
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    padding: 16,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  tipItem: {
    fontSize: 14,
    color: "#666",
    marginBottom: 6,
  },
  ocrContainer: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#e1e5e9",
  },
  ocrTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
  },
  ocrRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  ocrLabel: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  ocrValue: {
    fontSize: 14,
    color: "#333",
    fontWeight: "600",
  },
  itemText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 12,
    marginBottom: 4,
  },
});
