import { Platform } from "react-native";
import OCRModule, { ReceiptData } from "./OCRModule";
import OnDeviceAI from "./OnDeviceAI";

export interface AIReceiptData {
  merchant: string;
  total: string;
  date: string;
  items: AIReceiptItem[];
  rawText: string;
  confidence: number;
  parseMethod: "ai-enhanced" | "ai-cloud" | "ai-on-device";
  category?: string;
  tax?: string;
  subtotal?: string;
  currency?: string;
  paymentMethod?: string;
  location?: string;
}

export interface AIReceiptItem {
  name: string;
  price: string;
  quantity?: string;
  category?: string;
  unitPrice?: string;
  tax?: string;
}

class AIReceiptProcessor {
  private static onDeviceAI = OnDeviceAI;

  /**
   * Process receipt using AI-powered analysis
   * Falls back to OCR + AI enhancement if cloud AI fails
   */
  static async processReceiptWithAI(imageUri: string): Promise<AIReceiptData> {
    try {
      // First try on-device AI processing
      const onDeviceResult = await this.processWithOnDeviceAI(imageUri);
      if (onDeviceResult) {
        return this.convertToAIReceiptData(onDeviceResult, "ai-on-device");
      }

      // Fallback: Use OCR + AI enhancement
      console.log("On-device AI failed, using OCR + AI enhancement");
      const ocrResult = await OCRModule.parseReceipt(imageUri);
      return await this.enhanceOCRWithAI(ocrResult.rawText, ocrResult);
    } catch (error) {
      console.error("AI receipt processing failed:", error);
      throw new Error(`AI processing failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Enhance OCR results with AI analysis
   */
  static async enhanceOCRWithAI(
    ocrText: string, 
    ocrData?: ReceiptData
  ): Promise<AIReceiptData> {
    try {
      // Use on-device AI to enhance OCR results
      const enhancedResult = await this.onDeviceAI.parseReceipt(ocrText);
      
      if (enhancedResult) {
        return this.convertToAIReceiptData(enhancedResult, "ai-enhanced", ocrData);
      }

      // If AI enhancement fails, convert OCR data to AI format
      if (ocrData) {
        return this.convertOCRToAIFormat(ocrData);
      }

      throw new Error("Both AI enhancement and OCR data unavailable");
    } catch (error) {
      console.error("OCR enhancement with AI failed:", error);
      throw error;
    }
  }

  /**
   * Process receipt using on-device AI
   */
  private static async processWithOnDeviceAI(imageUri: string): Promise<any> {
    try {
      if (Platform.OS === "android") {
        // First extract text using OCR, then process with on-device AI
        const ocrResult = await OCRModule.extractText(imageUri);
        return await this.onDeviceAI.parseReceipt(ocrResult.text);
      } else {
        throw new Error("On-device AI is only available on Android");
      }
    } catch (error) {
      console.error("On-device AI processing failed:", error);
      return null;
    }
  }

  /**
   * Convert on-device AI result to standardized AI receipt data format
   */
  private static convertToAIReceiptData(
    result: any,
    method: "ai-enhanced" | "ai-cloud" | "ai-on-device",
    ocrData?: ReceiptData
  ): AIReceiptData {
    return {
      merchant: result.merchant || "Unknown",
      total: result.total || "0.00",
      date: result.date || new Date().toISOString().split('T')[0],
      items: result.items?.map((item: any) => ({
        name: item.name || "Unknown Item",
        price: item.price || "0.00",
        quantity: item.quantity || "1",
        category: item.category,
        unitPrice: item.unitPrice,
        tax: item.tax,
      })) || [],
      rawText: result.rawText || ocrData?.rawText || "",
      confidence: result.confidence || 0.8,
      parseMethod: method,
      category: result.category || this.categorizeByMerchant(result.merchant),
      tax: result.tax,
      subtotal: result.subtotal,
      currency: result.currency || "USD",
      paymentMethod: result.paymentMethod,
      location: result.location,
    };
  }

  /**
   * Convert traditional OCR data to AI format for consistency
   */
  private static convertOCRToAIFormat(ocrData: ReceiptData): AIReceiptData {
    return {
      merchant: ocrData.merchant || "Unknown",
      total: ocrData.total || "0.00",
      date: ocrData.date || new Date().toISOString().split('T')[0],
      items: ocrData.items?.map(item => ({
        name: item.name || "Unknown Item",
        price: item.price || "0.00",
        quantity: "1", // OCR doesn't provide quantity
        category: undefined, // OCR doesn't provide category
      })) || [],
      rawText: ocrData.rawText || "",
      confidence: 0.6, // Lower confidence for non-AI processed data
      parseMethod: "ai-enhanced",
      category: this.categorizeByMerchant(ocrData.merchant),
      tax: "0.00", // OCR doesn't provide tax breakdown
      subtotal: "0.00", // OCR doesn't provide subtotal
      currency: "USD",
    };
  }

  /**
   * Categorize receipt by merchant name
   */
  private static categorizeByMerchant(merchant?: string): string {
    if (!merchant) return "Other";
    
    const merchantLower = merchant.toLowerCase();
    
    // Grocery stores
    if (/walmart|target|kroger|safeway|publix|whole foods|trader joe|costco/i.test(merchantLower)) {
      return "Grocery";
    }
    
    // Restaurants
    if (/restaurant|cafe|pizza|burger|taco|subway|starbucks|mcdonalds/i.test(merchantLower)) {
      return "Dining";
    }
    
    // Gas stations
    if (/shell|exxon|bp|chevron|texaco|mobil|gas|fuel/i.test(merchantLower)) {
      return "Gas";
    }
    
    // Pharmacies
    if (/cvs|walgreens|pharmacy|rite aid/i.test(merchantLower)) {
      return "Healthcare";
    }
    
    return "Other";
  }

  /**
   * Validate AI processing results
   */
  private static validateAIResult(result: any): boolean {
    return (
      result &&
      typeof result === "object" &&
      (result.merchant || result.total || result.items?.length > 0)
    );
  }
}

export default AIReceiptProcessor;