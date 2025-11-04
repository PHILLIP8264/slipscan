// ML Kit Document Scanner with auto edge detection and modern receipt processing
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Platform } from "react-native";
import receiptProcessingService from "../services/ReceiptProcessingService";
import { ProcessedReceipt } from "../types/receipt";
import DocumentScannerNative from "../utils/DocumentScannerNative";
import OCRModule, { ReceiptData } from "../utils/OCRModule";

// Legacy GoogleVisionService compatibility
type GoogleVisionReceiptData = ReceiptData; // For backward compatibility

// Legacy Google Vision Service compatibility layer
const GoogleVisionService = {
  processReceiptImage: async (imageUri: string): Promise<GoogleVisionReceiptData> => {
    // This will call the modern service internally but return legacy format
    const modernResult = await receiptProcessingService.processReceipt(imageUri);
    
    if (modernResult.success && modernResult.receipt) {
      return convertToLegacyFormat(modernResult.receipt);
    } else {
      throw new Error('Google Vision processing failed: ' + modernResult.error);
    }
  }
};

export type ScannerOptions = {
  pageLimit?: number; // Default: 1 (scan only one document)
  allowGalleryImport?: boolean;
  jpeg?: boolean;
  pdf?: boolean;
  scannerMode?: "base" | "full";
  useGoogleVision?: boolean;
  userId?: string;
  useModernProcessing?: boolean; // Flag to use new workflow
};

export type Page = { imageUri?: string };

export type ScanResult = {
  pages: Page[];
  pdfUri?: string;
  pdfPageCount?: number;
  receiptData?: ReceiptData | GoogleVisionReceiptData;
  // New fields for modern processing
  processedReceipt?: ProcessedReceipt;
  processingResult?: any;
  // Cancellation status
  canceled?: boolean;
};

const processDocumentImage = async (imageUri: string): Promise<string> => {
  try {
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 1200 } }],
      { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
    );
    return manipulatedImage.uri;
  } catch (error) {
    console.warn("Image processing failed, using original:", error);
    return imageUri;
  }
};

/**
 * Process receipt using the modern 5-step workflow
 * 
 * This provides the new comprehensive processing pipeline while maintaining 
 * backward compatibility with the legacy interface.
 */
const processReceiptModern = async (
  imageUri: string,
  opts?: ScannerOptions
): Promise<{ receiptData?: ReceiptData | GoogleVisionReceiptData; processedReceipt?: ProcessedReceipt; processingResult?: any }> => {
  try {
    console.log('🚀 Using modern receipt processing workflow...');
    
    // Process with the new comprehensive workflow
    const processingResult = await receiptProcessingService.processReceipt(imageUri, opts?.userId);
    
    if (processingResult.success && processingResult.receipt) {
      console.log('✅ Modern processing successful');
      
      // Convert to legacy format for backward compatibility
      const legacyReceiptData = convertToLegacyFormat(processingResult.receipt);
      
      return {
        receiptData: legacyReceiptData,
        processedReceipt: processingResult.receipt,
        processingResult,
      };
    } else {
      console.warn('⚠️ Modern processing failed, falling back to legacy processing');
      throw new Error(processingResult.error || 'Processing failed');
    }
  } catch (error) {
    console.warn('❌ Modern processing error, falling back to legacy:', error);
    throw error;
  }
};

/**
 * Convert ProcessedReceipt to legacy ReceiptData format for backward compatibility
 */
const convertToLegacyFormat = (processedReceipt: ProcessedReceipt): ReceiptData => {
  return {
    merchant: processedReceipt.merchant.name,
    total: processedReceipt.totals.total.toFixed(2),
    date: new Date(processedReceipt.transaction.date).toLocaleDateString(),
    items: processedReceipt.items.map(item => ({
      name: item.name,
      price: item.totalPrice.toFixed(2),
      quantity: item.quantity?.toString() || '1',
      category: 'other',
    })),
    rawText: processedReceipt.rawText,
    confidence: processedReceipt.confidence.overall,
    storeDetails: {
      name: processedReceipt.merchant.name,
      address: '', // Not available in new format
      phone: '', // Not available in new format
    },
    taxInfo: {
      taxAmount: processedReceipt.totals.tax?.toFixed(2) || '0.00',
      subtotal: (processedReceipt.totals.total - (processedReceipt.totals.tax || 0)).toFixed(2),
    },
    paymentInfo: {
      paymentMethod: processedReceipt.payment.method?.toString() || 'unknown',
    },
    receiptMetadata: {
      currency: 'USD', // Default for now
      locale: 'en-US', // Default for now
    },
  };
};

const fallbackCameraScanner = async (opts?: ScannerOptions): Promise<ScanResult> => {
  try {
    console.log('Using fallback camera scanner...');
    
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      throw new Error("Camera permission denied");
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (result.canceled) {
      // Return a cancelled result instead of throwing an error
      return {
        pages: [],
        canceled: true
      };
    }

    const processedImage = await processDocumentImage(result.assets[0].uri);

    const scanResult: ScanResult = {
      pages: [{ imageUri: processedImage }],
      pdfUri: undefined,
      pdfPageCount: undefined,
    };

    // Process receipt data if enabled
    try {
      // Try modern processing first if enabled
      if (opts?.useModernProcessing) {
        try {
          const modernResult = await processReceiptModern(processedImage, opts);
          return { ...scanResult, ...modernResult };
        } catch (modernError) {
          console.warn("Modern processing failed, falling back to legacy:", modernError);
        }
      }

      // Legacy processing
      let receiptData: ReceiptData | GoogleVisionReceiptData;

      if (opts?.useGoogleVision) {
        try {
          receiptData = await GoogleVisionService.processReceiptImage(processedImage);
          console.log("Google Vision processing successful");
        } catch (visionError) {
          console.warn("Google Vision failed, falling back to OCR:", visionError);
          if (Platform.OS === "android") {
            receiptData = await OCRModule.parseReceipt(processedImage);
          } else {
            receiptData = {
              merchant: "Unknown Merchant",
              total: "0.00",
              date: new Date().toLocaleDateString(),
              items: [],
              rawText: "Camera scan - processing not available on iOS",
              confidence: 0.5,
              storeDetails: { name: "Unknown Merchant", address: "", phone: "" },
              taxInfo: { taxAmount: "0.00", subtotal: "0.00" },
              paymentInfo: {},
              receiptMetadata: { currency: "ZAR", locale: "en-ZA" }
            } as ReceiptData;
          }
        }
      } else {
        if (Platform.OS === "android") {
          receiptData = await OCRModule.parseReceipt(processedImage);
        } else {
          receiptData = {
            merchant: "Camera Scan",
            total: "0.00",
            date: new Date().toLocaleDateString(),
            items: [],
            rawText: "Camera scan - manual entry required",
            confidence: 0.3,
            storeDetails: { name: "Camera Scan", address: "", phone: "" },
            taxInfo: { taxAmount: "0.00", subtotal: "0.00" },
            paymentInfo: {},
            receiptMetadata: { currency: "ZAR", locale: "en-ZA" }
          } as ReceiptData;
        }
      }

      return { ...scanResult, receiptData };
    } catch (processingError) {
      console.warn("Receipt processing failed:", processingError);
      return scanResult;
    }
  } catch (error) {
    console.error("Fallback scanner error:", error);
    throw error;
  }
};

const startScanner = async (opts?: ScannerOptions): Promise<ScanResult> => {
  console.log('Starting document scanner...');
  console.log('Platform:', Platform.OS);
  console.log('Scanner options:', opts);
  
  try {
    if (Platform.OS === "android") {
      console.log('Attempting ML Kit Document Scanner...');
      
      try {
        const options = {
          pageLimit: opts?.pageLimit || 1, // Changed from 6 to 1 - scan only one document
          allowGalleryImport: opts?.allowGalleryImport ?? true,
          scannerMode: (opts?.scannerMode || "full") as "base" | "full",
          resultFormat: (opts?.pdf ? "pdf" : "jpeg") as "pdf" | "jpeg",
        };

        console.log('Calling DocumentScannerNative.startScanning with options:', options);
        const result = await DocumentScannerNative.startScanning(options);
        console.log('DocumentScannerNative result type:', typeof result);
        console.log('DocumentScannerNative result:', result);

        if (!result || typeof result !== 'object') {
          console.warn('Invalid result from DocumentScannerNative, using fallback camera scanner');
          return await fallbackCameraScanner(opts);
        }

        if (typeof result === 'string') {
          console.log('ML Kit returned success message, falling back to camera scanner');
          return await fallbackCameraScanner(opts);
        }

        const pages = Array.isArray(result.pages) ? result.pages : [];
        
        if (pages.length === 0) {
          console.warn('No pages returned from ML Kit scanner, falling back to camera scanner');
          return await fallbackCameraScanner(opts);
        }

        const scanResult: ScanResult = {
          pages: pages.map((page: any) => {
            if (typeof page === 'string') {
              return { imageUri: page };
            }
            return { 
              imageUri: page?.imageUri || page?.uri || ''
            };
          }),
          pdfUri: result.pdfUri,
          pdfPageCount: result.pdfPageCount || pages.length,
        };

        console.log('ML Kit scan successful, pages:', scanResult.pages.length);

        if (scanResult.pages.length > 0 && scanResult.pages[0].imageUri) {
          try {
            // Try modern processing first if enabled
            if (opts?.useModernProcessing) {
              try {
                const modernResult = await processReceiptModern(scanResult.pages[0].imageUri, opts);
                return { ...scanResult, ...modernResult };
              } catch (modernError) {
                console.warn("Modern processing failed, falling back to legacy:", modernError);
              }
            }

            // Legacy processing
            let receiptData: ReceiptData | GoogleVisionReceiptData;

            if (opts?.useGoogleVision) {
              try {
                receiptData = await GoogleVisionService.processReceiptImage(
                  scanResult.pages[0].imageUri
                );
                console.log("Google Vision processing successful");
              } catch (visionError) {
                console.warn("Google Vision failed, falling back to OCR:", visionError);
                receiptData = await OCRModule.parseReceipt(scanResult.pages[0].imageUri);
              }
            } else {
              receiptData = await OCRModule.parseReceipt(scanResult.pages[0].imageUri);
            }

            return { ...scanResult, receiptData };
          } catch (processingError) {
            console.warn("All receipt processing methods failed:", processingError);
            return scanResult;
          }
        }

        return scanResult;
      } catch (mlkitError) {
        console.warn("ML Kit Scanner failed:", mlkitError);
        
        // Check if this is a user cancellation
        const errorCode = (mlkitError as any)?.code || '';
        const errorMessage = (mlkitError as any)?.message || String(mlkitError) || '';
        if (errorCode === 'USER_CANCELED' ||
            errorMessage.toLowerCase().includes('user canceled') || 
            errorMessage.toLowerCase().includes('cancel') || 
            errorMessage.toLowerCase().includes('abort')) {
          console.log("User cancelled ML Kit scanner");
          return {
            pages: [],
            canceled: true
          };
        }
        
        console.log("Falling back to camera scanner due to ML Kit error");
        return await fallbackCameraScanner(opts);
      }
    } else {
      console.log("Not Android platform, using fallback camera scanner");
      return await fallbackCameraScanner(opts);
    }
  } catch (error) {
    console.error("Document Scanner error:", error);
    
    // Check if this is a user cancellation
    const errorCode = (error as any)?.code || '';
    const errorMessage = (error as any)?.message || String(error) || '';
    if (errorCode === 'USER_CANCELED' ||
        errorMessage.toLowerCase().includes('user canceled') || 
        errorMessage.toLowerCase().includes('cancel') || 
        errorMessage.toLowerCase().includes('abort')) {
      console.log("User cancelled document scanner");
      return {
        pages: [],
        canceled: true
      };
    }
    
    console.log("Falling back to camera scanner due to general error");
    return await fallbackCameraScanner(opts);
  }
};

const pickFromGallery = async (opts?: ScannerOptions): Promise<ScanResult> => {
  try {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      throw new Error("Gallery permission denied");
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.8,
    });

    if (result.canceled) {
      // Return a cancelled result instead of throwing an error
      return {
        pages: [],
        canceled: true
      };
    }

    const processedImage = await processDocumentImage(result.assets[0].uri);

    const scanResult: ScanResult = {
      pages: [{ imageUri: processedImage }],
      pdfUri: undefined,
      pdfPageCount: undefined,
    };

    // Try modern processing first if enabled
    if (opts?.useModernProcessing) {
      try {
        const modernResult = await processReceiptModern(processedImage, opts);
        return { ...scanResult, ...modernResult };
      } catch (modernError) {
        console.warn("Modern processing failed for gallery image, falling back to legacy:", modernError);
      }
    }

    // Legacy processing
    if (opts?.useGoogleVision || Platform.OS === "android") {
      try {
        let receiptData: ReceiptData | GoogleVisionReceiptData | undefined;

        if (opts?.useGoogleVision) {
          try {
            receiptData = await GoogleVisionService.processReceiptImage(processedImage);
          } catch (visionError) {
            console.warn("Google Vision failed for gallery image:", visionError);
            if (Platform.OS === "android") {
              receiptData = await OCRModule.parseReceipt(processedImage);
            } else {
              throw visionError;
            }
          }
        } else if (Platform.OS === "android") {
          receiptData = await OCRModule.parseReceipt(processedImage);
        }

        if (receiptData) {
          return { ...scanResult, receiptData };
        }
      } catch (processingError) {
        console.warn("Receipt processing failed for gallery image:", processingError);
      }
    }

    return scanResult;
  } catch (error) {
    console.error("Gallery picker error:", error);
    throw error;
  }
};

/**
 * Parse receipt from image URI (compatibility method)
 * This method is called from ScanReceipt.tsx when processing scanned images
 */
const parseReceipt = async (
  imageUri: string, 
  useGoogleVision: boolean = true
): Promise<ReceiptData | GoogleVisionReceiptData> => {
  console.log('🔍 DocumentScanner.parseReceipt called with:', { imageUri, useGoogleVision });
  
  try {
    const opts: ScannerOptions = {
      useGoogleVision,
      useModernProcessing: true // Use modern processing by default
    };

    // Try modern processing first
    try {
      const modernResult = await processReceiptModern(imageUri, opts);
      if (modernResult.receiptData) {
        console.log('Modern processing successful in parseReceipt');
        return modernResult.receiptData;
      }
    } catch (modernError) {
      console.warn(' Modern processing failed in parseReceipt, falling back to legacy:', modernError);
    }

    // Fallback to legacy processing
    if (useGoogleVision) {
      try {
        const receiptData = await GoogleVisionService.processReceiptImage(imageUri);
        console.log(' Google Vision processing successful in parseReceipt');
        return receiptData;
      } catch (visionError) {
        console.warn(' Google Vision failed in parseReceipt, falling back to OCR:', visionError);
        if (Platform.OS === "android") {
          return await OCRModule.parseReceipt(imageUri);
        } else {
          throw visionError;
        }
      }
    } else {
      if (Platform.OS === "android") {
        return await OCRModule.parseReceipt(imageUri);
      } else {
        throw new Error('OCR processing not available on iOS');
      }
    }
  } catch (error) {
    console.error(' All parsing methods failed in parseReceipt:', error);
    throw error;
  }
};

export default {
  startScanner,
  pickFromGallery,
  processDocumentImage,
  parseReceipt, 
  
  processReceiptModern,
  convertToLegacyFormat,
};
