// ML Kit Document Scanner with auto edge detection
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import DocumentScannerNative from "../utils/DocumentScannerNative";
import OCRModule, { ReceiptData } from "../utils/OCRModule";

export type ScannerOptions = {
  pageLimit?: number;
  allowGalleryImport?: boolean;
  jpeg?: boolean;
  pdf?: boolean;
  scannerMode?: "base" | "full";
};

export type Page = { imageUri?: string };
export type ScanResult = {
  pages: Page[];
  pdfUri?: string;
  pdfPageCount?: number;
  receiptData?: ReceiptData; // OCR processed receipt data
};

const startScanner = async (opts?: ScannerOptions): Promise<ScanResult> => {
  try {
    // Use ML Kit Document Scanner on Android
    if (Platform.OS === "android") {
      const options = {
        pageLimit: opts?.pageLimit || 6,
        allowGalleryImport: opts?.allowGalleryImport ?? true,
        scannerMode: (opts?.scannerMode || "full") as "base" | "full",
        resultFormat: (opts?.pdf ? "pdf" : "jpeg") as "pdf" | "jpeg",
      };

      const result = await DocumentScannerNative.startScanning(options);

      // Transform native result to match expected format
      const scanResult = {
        pages: result.pages.map((page) => ({ imageUri: page.imageUri })),
        pdfUri: result.pdfUri,
        pdfPageCount: result.pdfPageCount,
      };

      // Process first page with OCR if available
      if (result.pages.length > 0 && result.pages[0].imageUri) {
        try {
          const receiptData = await OCRModule.parseReceipt(
            result.pages[0].imageUri
          );
          return { ...scanResult, receiptData };
        } catch (ocrError) {
          console.warn("OCR processing failed:", ocrError);
          // Return scan result without OCR data
          return scanResult;
        }
      }

      return scanResult;
    } else {
      // Fallback to camera-based scanning for iOS
      return await fallbackCameraScanner(opts);
    }
  } catch (error) {
    console.error("ML Kit Scanner error:", error);
    // Fallback to camera scanner if ML Kit fails
    return await fallbackCameraScanner(opts);
  }
};

// Fallback camera scanner for iOS or when ML Kit fails
const fallbackCameraScanner = async (
  opts?: ScannerOptions
): Promise<ScanResult> => {
  try {
    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      throw new Error("Camera permission denied");
    }

    // Launch camera with document-optimized settings
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4], // Document-like aspect ratio
      quality: 0.8,
    });

    if (result.canceled) {
      throw new Error("User canceled scanning");
    }

    // Process the image for document scanning
    const processedImage = await processDocumentImage(result.assets[0].uri);

    return {
      pages: [{ imageUri: processedImage }],
      pdfUri: undefined,
      pdfPageCount: undefined,
    };
  } catch (error) {
    console.error("Fallback scanner error:", error);
    throw error;
  }
};

const processDocumentImage = async (imageUri: string): Promise<string> => {
  try {
    // Apply document enhancement
    const manipulated = await ImageManipulator.manipulateAsync(
      imageUri,
      [
        { resize: { width: 2048 } }, // Standardize size
      ],
      {
        compress: 0.8,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return manipulated.uri;
  } catch (error) {
    console.error("Image processing error:", error);
    return imageUri; // Return original if processing fails
  }
};

// OCR functions for manual processing
const extractText = async (imageUri: string) => {
  if (Platform.OS === "android") {
    try {
      return await OCRModule.extractText(imageUri);
    } catch (error) {
      console.error("Text extraction failed:", error);
      throw error;
    }
  } else {
    throw new Error("OCR is only available on Android");
  }
};

const parseReceipt = async (imageUri: string) => {
  if (Platform.OS === "android") {
    try {
      return await OCRModule.parseReceipt(imageUri);
    } catch (error) {
      console.error("Receipt parsing failed:", error);
      throw error;
    }
  } else {
    throw new Error("Receipt parsing is only available on Android");
  }
};

export default { startScanner, extractText, parseReceipt };
