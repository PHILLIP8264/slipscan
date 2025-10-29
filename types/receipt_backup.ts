/**
 * Enhanced Receipt Data Types for SlipScan
 * 
 * This file defines comprehensive TypeScript interfaces for receipt processing,
 * categorization, and insights generation.
 */

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
  address?: Address;
  phone?: string;
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
  description?: string;
  sku?: string;
  taxable?: boolean;
  confidence: number;
  // Will be populated by LLM categorization
  category?: string;
  subcategory?: string;
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

// LLM categorization result
export interface CategoryResult {
  items: CategorizedLineItem[];
  merchantCategory: string;
  merchantCategoryConfidence: number;
  overallCategory: ItemCategory;
  processingNotes?: string;
}

export interface CategorizedLineItem {
  name: string;
  category: ItemCategory;
  subcategory?: string;
  quantity?: number;
  price: number;
  confidence: number;
  reasoning?: string;
}

// Predefined categories for consistent categorization
export enum ItemCategory {
  // Food & Dining
  GROCERIES = 'groceries',
  RESTAURANT = 'restaurant',
  FAST_FOOD = 'fast_food',
  COFFEE = 'coffee',
  ALCOHOL = 'alcohol',
  
  // Retail
  CLOTHING = 'clothing',
  ELECTRONICS = 'electronics',
  HOME_GOODS = 'home_goods',
  PERSONAL_CARE = 'personal_care',
  BOOKS_MEDIA = 'books_media',
  
  // Services
  AUTOMOTIVE = 'automotive',
  HEALTHCARE = 'healthcare',
  UTILITIES = 'utilities',
  INSURANCE = 'insurance',
  PROFESSIONAL_SERVICES = 'professional_services',
  
  // Entertainment
  ENTERTAINMENT = 'entertainment',
  SPORTS_RECREATION = 'sports_recreation',
  TRAVEL = 'travel',
  
  // Hardware & Tools
  HARDWARE = 'hardware',
  TOOLS = 'tools',
  GARDEN = 'garden',
  
  // Other
  EDUCATION = 'education',
  GIFTS_DONATIONS = 'gifts_donations',
  TAXES_FEES = 'taxes_fees',
  OTHER = 'other',
}

// Complete processed receipt ready for database storage
export interface ProcessedReceipt {
  id: string;
  
  // Raw data
  originalImageUri: string;
  rawText: string;
  
  // Structured data from Document AI
  merchant: MerchantInfo;
  transaction: TransactionInfo;
  items: CategorizedLineItem[];
  totals: ReceiptTotals;
  payment: PaymentInfo;
  
  // Categorization
  overallCategory: ItemCategory;
  merchantCategory: string;
  
  // Processing metadata
  processingSteps: ProcessingStep[];
  confidence: ProcessingConfidence;
  
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
  step: 'text_extraction' | 'document_parsing' | 'categorization' | 'validation' | 'database_storage';
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
  categorization: number;
  dataQuality: 'high' | 'medium' | 'low';
}

// Monthly insights and analytics
export interface MonthlyInsights {
  month: string; // YYYY-MM format
  totalSpent: number;
  transactionCount: number;
  categoryBreakdown: CategorySpending[];
  merchantBreakdown: MerchantSpending[];
  trends: SpendingTrend[];
  insights: GeneratedInsight[];
  recommendations: string[];
  generatedAt: string;
}

export interface CategorySpending {
  category: ItemCategory;
  amount: number;
  transactionCount: number;
  percentage: number;
  averagePerTransaction: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

export interface MerchantSpending {
  merchantName: string;
  amount: number;
  transactionCount: number;
  category: ItemCategory;
  averageSpent: number;
}

export interface SpendingTrend {
  category: ItemCategory;
  direction: 'up' | 'down' | 'stable';
  changePercent: number;
  significance: 'high' | 'medium' | 'low';
}

export interface GeneratedInsight {
  type: 'spending_pattern' | 'budget_alert' | 'savings_opportunity' | 'category_trend';
  title: string;
  description: string;
  actionable: boolean;
  priority: 'high' | 'medium' | 'low';
  category?: ItemCategory;
  amount?: number;
}

// Error handling types
export interface ProcessingError {
  step: string;
  error: string;
  details?: any;
  timestamp: string;
  recoverable: boolean;
}

// Configuration types for categorization
export interface CategorizationConfig {
  categories: ItemCategory[];
  customCategories: string[];
  merchantMappings: Record<string, ItemCategory>;
  keywordMappings: Record<string, ItemCategory>;
  confidenceThreshold: number;
}

// Types for the LLM categorization prompt
export interface LLMCategorizationRequest {
  merchantName: string;
  items: Array<{
    name: string;
    price: number;
    quantity?: number;
  }>;
  availableCategories: string[];
  context?: {
    location?: string;
    date?: string;
    totalAmount?: number;
  };
}

export interface LLMCategorizationResponse {
  items: Array<{
    name: string;
    category: string;
    subcategory?: string;
    confidence: number;
    reasoning?: string;
  }>;
  merchantCategory: string;
  overallCategory: string;
  confidence: number;
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
      price: parseFloat(item.price) || 0,
      quantity: item.quantity ? parseInt(item.quantity) : 1,
      confidence: legacy.confidence,
      category: ItemCategory.OTHER,
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
      categorization: 0,
      dataQuality: legacy.confidence > 0.8 ? 'high' : legacy.confidence > 0.5 ? 'medium' : 'low',
    },
  };
}