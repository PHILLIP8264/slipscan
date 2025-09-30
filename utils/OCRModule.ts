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
}

export interface ReceiptItem {
  name: string;
  price: string;
}

interface OCRModuleType {
  extractText(imageUri: string): Promise<OCRResult>;
  parseReceipt(imageUri: string): Promise<ReceiptData>;
}

const { OCRModule } = NativeModules;

export default OCRModule as OCRModuleType;
