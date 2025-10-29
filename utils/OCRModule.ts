import { NativeModules } from "react-native";

export interface OCRResult {
  text: string;
  blocks: TextBlock[];
}

export interface TextBlock {
  text: string;
  boundingBox?: {
    left: number;
    top: number;
    right: number;
    bottom: number;
  };
}

export interface ReceiptData {
  merchant: string;
  total: string;
  date: string;
  items: ReceiptItem[];
  rawText: string;
  confidence: number;
  // Enhanced fields for comprehensive data extraction
  storeDetails: StoreDetails;
  taxInfo: TaxInfo;
  paymentInfo: PaymentInfo;
  receiptMetadata: ReceiptMetadata;
}

export interface ReceiptItem {
  name: string;
  price: string;
  quantity?: string;
  category?: string;
  subcategory?: string;
  categoryConfidence?: number;
}

export interface StoreDetails {
  name: string;
  address: string;
  phone: string;
  email?: string;
  website?: string;
  storeId?: string;
  cashierName?: string;
  registerNumber?: string;
}

export interface TaxInfo {
  taxAmount: string;
  taxRate?: string;
  vatAmount?: string;
  vatRate?: string;
  subtotal: string;
  taxableAmount?: string;
  exemptAmount?: string;
}

export interface PaymentInfo {
  paymentMethod?: string;
  cardType?: string;
  cardLast4?: string;
  changeAmount?: string;
  tenderedAmount?: string;
}

export interface ReceiptMetadata {
  receiptNumber?: string;
  transactionId?: string;
  batchNumber?: string;
  timestamp?: string;
  currency?: string;
  locale?: string;
}

interface OCRModuleType {
  extractText(imageUri: string): Promise<OCRResult>;
  parseReceipt(imageUri: string): Promise<ReceiptData>;
}

const { OCRModule } = NativeModules;

export default OCRModule as OCRModuleType;
