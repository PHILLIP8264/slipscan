/**
 * Clean Receipt Data Types for SlipScan with Categorization
 * 
 * This file defines TypeScript interfaces for receipt processing with item categorization.
 */

// Import types for AI feedback functionality
import type { Budget, Receipt } from '../utils/localdb';

// Base interfaces for receipt processing workflow
export interface ProcessingResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  confidence?: number;
  processingTime?: number;
  metadata?: Record<string, any>;
}

// Raw text extraction from OCR
export interface TextExtractionResult {
  rawText: string;
  confidence: number;
  language?: string;
  processingMethod: 'google-vision' | 'mlkit' | 'tesseract';
  textBlocks?: TextBlock[];
}

export interface TextBlock {
  text: string;
  confidence: number;
  boundingBox?: BoundingBox;
}

export interface BoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

// Structured receipt data from Document AI
export interface DocumentAIResult {
  merchantInfo: MerchantInfo;
  transactionInfo: TransactionInfo;
  lineItems: ReceiptLineItem[];
  totals: ReceiptTotals;
  paymentInfo: PaymentInfo;
  metadata: ReceiptMetadata;
  rawFields: Record<string, any>;
}

export interface MerchantInfo {
  name: string;
  address?: Address | string; // Support both structured and flat address
  phone?: string;
  phone_number?: string; // LLM output format
  email?: string;
  website?: string;
  taxId?: string;
  storeNumber?: string;
  confidence: number;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface TransactionInfo {
  receiptNumber?: string;
  transactionId?: string;
  date: string; // ISO date string
  time?: string;
  cashier?: string;
  register?: string;
  confidence: number;
}

export interface ReceiptLineItem {
  name: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice: number;
  // LLM output format fields
  itemprice?: number;
  linetotal?: number;
  description?: string;
  sku?: string;
  taxable?: boolean;
  confidence: number;
  // Category fields
  category?: string;
  categoryConfidence?: number;
}

export interface ReceiptTotals {
  subtotal?: number;
  tax: number;
  tip?: number;
  discount?: number;
  total: number;
  confidence: number;
}

export interface PaymentInfo {
  method: PaymentMethod;
  cardType?: string;
  cardLastFour?: string;
  change?: number;
  amountTendered?: number;
  confidence: number;
}

export enum PaymentMethod {
  CASH = 'cash',
  CREDIT_CARD = 'credit_card',
  DEBIT_CARD = 'debit_card',
  DIGITAL_WALLET = 'digital_wallet',
  CHECK = 'check',
  GIFT_CARD = 'gift_card',
  OTHER = 'other',
}

export interface ReceiptMetadata {
  currency: string;
  locale: string;
  processingDate: string;
  imageUri: string;
  pdfUri?: string;
  documentType: 'receipt' | 'invoice' | 'bill';
}

// Complete processed receipt ready for database storage (no categorization)
export interface ProcessedReceipt {
  id: string;
  
  // Raw data
  originalImageUri: string;
  rawText: string;
  
  // Structured data from Document AI
  merchant: MerchantInfo;
  transaction: TransactionInfo;
  items: ReceiptLineItem[];
  totals: ReceiptTotals;
  payment: PaymentInfo;
  
  // Processing metadata
  processingSteps: ProcessingStep[];
  confidence: ProcessingConfidence;
  
  // Raw processing data preservation
  rawFields?: Record<string, any>;
  metadata?: ReceiptMetadata;
  
  // Database fields
  createdAt: string;
  updatedAt: string;
  userId?: string;
  tags: string[];
  notes?: string;
}

/**
 * Processing step information
 */
export interface ProcessingStep {
  step: 'text_extraction' | 'document_parsing' | 'validation' | 'database_storage';
  status: 'success' | 'failed' | 'in_progress';
  confidence: number;
  processingTime: number;
  error?: string;
  details?: { [key: string]: any };
}

export interface ProcessingConfidence {
  overall: number;
  textExtraction: number;
  documentParsing: number;
  dataQuality: 'high' | 'medium' | 'low';
}

// Error handling types
export interface ProcessingError {
  step: string;
  error: string;
  details?: any;
  timestamp: string;
  recoverable: boolean;
}

// Export utility type for partial updates
export type PartialReceipt = Partial<ProcessedReceipt>;
export type CreateReceiptData = Omit<ProcessedReceipt, 'id' | 'createdAt' | 'updatedAt'>;

// Legacy compatibility types (for gradual migration)
export interface LegacyReceiptData {
  merchant: string;
  total: string;
  date: string;
  items: Array<{
    name: string;
    price: string;
    quantity?: string;
  }>;
  rawText: string;
  confidence: number;
}

// Conversion utilities
export function convertLegacyToProcessed(legacy: LegacyReceiptData): Partial<ProcessedReceipt> {
  return {
    merchant: {
      name: legacy.merchant,
      confidence: legacy.confidence,
    },
    transaction: {
      date: legacy.date,
      confidence: legacy.confidence,
    },
    items: legacy.items.map(item => ({
      name: item.name,
      totalPrice: parseFloat(item.price) || 0,
      quantity: item.quantity ? parseInt(item.quantity) : 1,
      confidence: legacy.confidence,
    })),
    totals: {
      total: parseFloat(legacy.total) || 0,
      tax: 0,
      confidence: legacy.confidence,
    },
    rawText: legacy.rawText,
    confidence: {
      overall: legacy.confidence,
      textExtraction: legacy.confidence,
      documentParsing: 0.5,
      dataQuality: legacy.confidence > 0.8 ? 'high' : legacy.confidence > 0.5 ? 'medium' : 'low',
    },
  };
}

// AI Feedback Types
export interface MonthlySpendingData {
  month: string; // Format: "YYYY-MM" (e.g., "2025-10")
  receipts: Receipt[];
  budgetData?: Budget;
  totalSpent: number;
  categoryBreakdown: { [category: string]: number };
  merchantBreakdown: { [merchant: string]: number };
  averageTransactionAmount: number;
  totalTransactions: number;
}

export interface AIFeedbackRequest {
  monthlyData: MonthlySpendingData;
  previousMonthData?: MonthlySpendingData; // For comparison
  userContext?: {
    currency: string;
    locale: string;
    preferences?: string[];
  };
}

export interface AIFeedbackResponse {
  success: boolean;
  feedback?: {
    summary: string;
    insights: string[];
    recommendations: string[];
    budgetAnalysis?: {
      overspentCategories: string[];
      underspentCategories: string[];
      budgetUtilization: number; // Percentage
    };
    trends?: {
      comparedToPrevious?: string;
      seasonalNotes?: string;
    };
    actionItems: string[];
  };
  error?: string;
  processingTime?: number;
}

export interface MonthOption {
  label: string; // "October 2025"
  value: string; // "2025-10"
  year: number;
  month: number;
}