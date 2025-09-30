import { NativeModules } from "react-native";

export interface DocumentScannerOptions {
  pageLimit?: number;
  allowGalleryImport?: boolean;
  scannerMode?: "base" | "full";
  resultFormat?: "jpeg" | "pdf";
}

export interface ScannedPage {
  imageUri: string;
}

export interface ScanResult {
  success: boolean;
  pages: ScannedPage[];
  pdfUri?: string;
  pdfPageCount?: number;
}

interface DocumentScannerModuleType {
  startScanning(options: DocumentScannerOptions): Promise<ScanResult>;
}

const { DocumentScannerModule } = NativeModules;

export default DocumentScannerModule as DocumentScannerModuleType;
