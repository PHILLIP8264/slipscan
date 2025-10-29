/**
 * Receipt Processing Service - Main Orchestration
 * 
 * This service coordinates the simplified receipt processing workflow:
 * 1. Extract Text (Google Vision API)
 * 2. Parse Structure + Categorize Items (Gemini LLM)
 * 3. Store Data (Database)
 * 
 * Note: Insights generation is now manual via the home page button
 */

import getConfig from '../config/environment';
import { CategoryResult, DocumentAIResult, ItemCategory, ProcessedReceipt, ProcessingConfidence, ProcessingResult, ProcessingStep, TextExtractionResult } from '../types/receipt';

// Import all the services
import databaseService from './DatabaseService';
import googleVisionService from './GoogleVisionService';
import insightsService from './InsightsService';
import llmService from './LLMService';

/**
 * Complete Receipt Processing Result
 */
interface ReceiptProcessingResult {
  success: boolean;
  receipt?: ProcessedReceipt;
  error?: string;
  processingSteps: ProcessingStep[];
  totalProcessingTime: number;
  confidence: ProcessingConfidence;
}

/**
 * Receipt Processing Service - Main Orchestrator
 * 
 * Coordinates the entire receipt processing workflow with proper error handling,
 * fallbacks, and comprehensive logging.
 */
class ReceiptProcessingService {
  private config = getConfig();

  constructor() {
    if (this.config.app.enableLogging) {
      console.log('🔄 ReceiptProcessingService initialized');
    }
  }

  /**
   * Process a receipt image through the complete workflow
   * 
   * This is the main entry point that coordinates all processing steps
   */
  async processReceipt(imageUri: string, userId?: string): Promise<ReceiptProcessingResult> {
    const overallStartTime = Date.now();
    const processingSteps: ProcessingStep[] = [];
    
    if (this.config.app.enableLogging) {
      console.log('🚀 Starting complete receipt processing workflow');
      console.log(`📷 Processing image: ${imageUri}`);
    }

    try {
      // Step 1: Extract Text using Google Vision API
      const textResult = await this.executeStep(
        'text_extraction',
        () => googleVisionService.extractText(imageUri),
        processingSteps
      );

      if (!textResult.success || !textResult.data) {
        throw new Error('Text extraction failed: ' + textResult.error);
      }

      const textData = textResult.data;

      // Step 2: Parse Structure + Categorize using Gemini (combined step)
      const parseResult = await this.executeStep(
        'categorization',
        () => llmService.parseAndCategorizeReceipt(textData.rawText, {
            imageUri: imageUri
          }
        ),
        processingSteps
      );

      if (!parseResult.success || !parseResult.data) {
        // Fallback: Create basic structure from text
        console.warn('⚠️ Gemini parsing failed, creating fallback structure');
        const fallbackDocument = this.createFallbackDocument(textData, imageUri);
        const fallbackCategory = this.createFallbackCategorization(fallbackDocument);
        parseResult.data = { documentData: fallbackDocument, categoryResult: fallbackCategory };
        parseResult.success = true;
      }

      const { documentData, categoryResult: categoryData } = parseResult.data;

      // Step 3: Create ProcessedReceipt object
      const processedReceipt = this.createProcessedReceipt(
        textData,
        documentData,
        categoryData,
        imageUri,
        processingSteps,
        userId
      );

      // Step 4: Store in Database
      const storeResult = await this.executeStep(
        'database_storage',
        () => databaseService.storeReceipt(processedReceipt),
        processingSteps
      );

      if (!storeResult.success) {
        console.error('❌ Failed to store receipt:', storeResult.error);
        // Continue anyway, as we have the processed data
      } else {
        processedReceipt.id = storeResult.data?.id || processedReceipt.id;
      }

      // Calculate final confidence and processing time
      const totalProcessingTime = Date.now() - overallStartTime;
      const confidence = this.calculateOverallConfidence(processingSteps);

      if (this.config.app.enableLogging) {
        console.log(`✅ Receipt processing completed in ${totalProcessingTime}ms`);
        console.log(`📊 Overall confidence: ${confidence.overall.toFixed(2)}`);
        console.log(`🏪 Merchant: ${processedReceipt.merchant.name}`);
        console.log(`💰 Total: $${processedReceipt.totals.total.toFixed(2)}`);
        console.log(`📂 Category: ${processedReceipt.overallCategory}`);
        console.log(`📝 Items: ${processedReceipt.items.length}`);
      }

            // Note: Insights generation is now manual via the home page button
      // Removed automatic insights generation from receipt processing flow

      return {
        success: true,
        receipt: processedReceipt,
        processingSteps,
        totalProcessingTime,
        confidence,
      };

    } catch (error) {
      const totalProcessingTime = Date.now() - overallStartTime;
      console.error('❌ Receipt processing failed:', error);
      
      // Enhanced error logging
      if (error instanceof Error) {
        console.error('❌ Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      
      // Log processing steps to see where it failed
      console.error('📊 Processing steps completed:', processingSteps.map(step => ({
        step: step.step,
        status: step.status,
        error: step.error,
        confidence: step.confidence
      })));

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingSteps,
        totalProcessingTime,
        confidence: this.calculateOverallConfidence(processingSteps),
      };
    }
  }

  /**
   * Execute a processing step with error handling and logging
   */
  private async executeStep<T>(
    stepName: 'text_extraction' | 'document_parsing' | 'categorization' | 'validation' | 'database_storage',
    stepFunction: () => Promise<ProcessingResult<T>>,
    processingSteps: ProcessingStep[]
  ): Promise<ProcessingResult<T>> {
    const startTime = Date.now();
    
    try {
      if (this.config.app.enableLogging) {
        console.log(`🔄 Starting ${stepName}...`);
      }

      const result = await this.retryWithBackoff(stepFunction, this.config.app.maxRetries);
      const processingTime = Date.now() - startTime;

      const step: ProcessingStep = {
        step: stepName,
        status: result.success ? 'success' : 'failed',
        confidence: result.confidence || 0,
        processingTime,
        error: result.error,
        details: {
          ...result.metadata,
          dataReceived: !!result.data,
        },
      };

      processingSteps.push(step);

      if (this.config.app.enableLogging) {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} ${stepName} completed in ${processingTime}ms (confidence: ${(result.confidence || 0).toFixed(2)})`);
      }

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      const step: ProcessingStep = {
        step: stepName,
        status: 'failed',
        confidence: 0,
        processingTime,
        error: errorMessage,
        details: {
          retries: this.config.app.maxRetries,
        },
      };

      processingSteps.push(step);

      if (this.config.app.enableLogging) {
        console.error(`❌ ${stepName} failed after ${processingTime}ms:`, errorMessage);
      }

      return {
        success: false,
        error: errorMessage,
        processingTime,
      };
    }
  }

  /**
   * Retry a function with exponential backoff
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt === maxRetries) {
          break;
        }

        const delay = baseDelay * Math.pow(2, attempt);
        if (this.config.app.enableLogging) {
          console.log(`⏳ Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        }
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  /**
   * Create fallback document structure when Document AI fails
   */
  private createFallbackDocument(textData: TextExtractionResult, imageUri: string): DocumentAIResult {
    // Parse basic info from raw text using regex patterns
    const rawText = textData.rawText;
    
    // Extract merchant name (usually first line)
    const lines = rawText.split('\n').filter(line => line.trim());
    const merchantName = lines[0] || 'Unknown Merchant';
    
    // Extract total using regex
    const totalMatch = rawText.match(/total[:\s]*\$?(\d+\.?\d*)/i);
    const total = totalMatch ? parseFloat(totalMatch[1]) : 0;
    
    // Extract date using regex
    const dateMatch = rawText.match(/(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/);
    let date: string;
    try {
      if (dateMatch) {
        const parsedDate = new Date(dateMatch[1]);
        date = isNaN(parsedDate.getTime()) ? new Date().toISOString() : parsedDate.toISOString();
      } else {
        date = new Date().toISOString();
      }
    } catch (error) {
      date = new Date().toISOString();
    }

    // Extract line items (basic pattern matching)
    const lineItems = this.extractBasicLineItems(rawText);

    return {
      merchantInfo: {
        name: merchantName,
        confidence: 0.6,
      },
      transactionInfo: {
        date,
        confidence: dateMatch ? 0.7 : 0.3,
      },
      lineItems,
      totals: {
        total,
        tax: 0,
        confidence: totalMatch ? 0.8 : 0.2,
      },
      paymentInfo: {
        method: 'other' as any,
        confidence: 0.1,
      },
      metadata: {
        currency: 'ZAR',
        locale: 'eu-ZA',
        processingDate: new Date().toISOString(),
        imageUri,
        documentType: 'receipt',
      },
      rawFields: { rawText },
    };
  }

  /**
   * Extract basic line items from raw text
   */
  private extractBasicLineItems(rawText: string): any[] {
    const lines = rawText.split('\n');
    const items: any[] = [];
    
    // Look for lines with price patterns
    for (const line of lines) {
      const priceMatch = line.match(/(.+?)\s+\$?(\d+\.?\d*)\s*$/);
      if (priceMatch && priceMatch[2]) {
        const name = priceMatch[1].trim();
        const price = parseFloat(priceMatch[2]);
        
        if (name.length > 2 && price > 0 && price < 1000) { // Basic validation
          items.push({
            name,
            totalPrice: price,
            quantity: 1,
            confidence: 0.5,
          });
        }
      }
    }
    
    return items;
  }

  /**
   * Create fallback categorization when LLM fails
   */
  private createFallbackCategorization(documentData: DocumentAIResult): CategoryResult {
    const merchantName = documentData.merchantInfo.name.toLowerCase();
    let overallCategory = ItemCategory.OTHER;
    
    // Basic merchant categorization
    if (merchantName.includes('grocery') || merchantName.includes('market')) {
      overallCategory = ItemCategory.GROCERIES;
    } else if (merchantName.includes('coffee') || merchantName.includes('cafe')) {
      overallCategory = ItemCategory.COFFEE;
    } else if (merchantName.includes('restaurant') || merchantName.includes('food')) {
      overallCategory = ItemCategory.RESTAURANT;
    } else if (merchantName.includes('hardware') || merchantName.includes('tool')) {
      overallCategory = ItemCategory.HARDWARE;
    }

    const categorizedItems = documentData.lineItems.map(item => ({
      name: item.name,
      category: overallCategory,
      quantity: item.quantity || 1,
      price: item.totalPrice,
      confidence: 0.6,
      reasoning: 'Fallback categorization based on merchant name',
    }));

    return {
      items: categorizedItems,
      merchantCategory: documentData.merchantInfo.name,
      merchantCategoryConfidence: 0.6,
      overallCategory,
      processingNotes: 'Fallback categorization used (LLM unavailable)',
    };
  }

  /**
   * Create the final ProcessedReceipt object
   */
  private createProcessedReceipt(
    textData: TextExtractionResult,
    documentData: DocumentAIResult,
    categoryData: CategoryResult,
    imageUri: string,
    processingSteps: ProcessingStep[],
    userId?: string
  ): ProcessedReceipt {
    return {
      id: this.generateReceiptId(),
      originalImageUri: imageUri,
      rawText: textData.rawText,
      
      merchant: documentData.merchantInfo,
      transaction: documentData.transactionInfo,
      items: categoryData.items,
      totals: documentData.totals,
      payment: documentData.paymentInfo,
      
      overallCategory: categoryData.overallCategory,
      merchantCategory: categoryData.merchantCategory,
      
      processingSteps,
      confidence: this.calculateOverallConfidence(processingSteps),
      
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      userId,
      tags: [],
      notes: categoryData.processingNotes,
    };
  }

  /**
   * Calculate overall processing confidence
   */
  private calculateOverallConfidence(processingSteps: ProcessingStep[]): ProcessingConfidence {
    const successfulSteps = processingSteps.filter(s => s.status === 'success');
    const totalSteps = processingSteps.length;
    
    if (totalSteps === 0) {
      return {
        overall: 0,
        textExtraction: 0,
        documentParsing: 0,
        categorization: 0,
        dataQuality: 'low',
      };
    }

    const textStep = processingSteps.find(s => s.step === 'text_extraction');
    const docStep = processingSteps.find(s => s.step === 'document_parsing');
    const catStep = processingSteps.find(s => s.step === 'categorization');

    const textConfidence = textStep?.confidence || 0;
    const docConfidence = docStep?.confidence || 0;
    const catConfidence = catStep?.confidence || 0;
    
    const overall = (textConfidence * 0.3) + (docConfidence * 0.4) + (catConfidence * 0.3);
    
    return {
      overall,
      textExtraction: textConfidence,
      documentParsing: docConfidence,
      categorization: catConfidence,
      dataQuality: overall > 0.8 ? 'high' : overall > 0.5 ? 'medium' : 'low',
    };
  }

  /**
   * Manually trigger insights generation (called from home page button)
   */
  public async generateInsightsForUser(userId: string): Promise<void> {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    try {
      if (this.config.app.enableLogging) {
        console.log(`🔍 Manually generating insights for month ${currentMonth}`);
      }
      
      await insightsService.generateMonthlyInsights(currentMonth, userId);
      
      if (this.config.app.enableLogging) {
        console.log(`✅ Manual insights generation completed for month ${currentMonth}`);
      }
    } catch (error) {
      console.error('❌ Failed to generate insights:', error);
      throw error; // Re-throw so the UI can handle the error
    }
  }

  /**
   * Generate unique receipt ID
   */
  private generateReceiptId(): string {
    return `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get processing status for a receipt
   */
  async getProcessingStatus(receiptId: string): Promise<ProcessingResult<ProcessedReceipt>> {
    return databaseService.getReceipt(receiptId);
  }

  /**
   * Reprocess a receipt (for testing or when services improve)
   */
  async reprocessReceipt(receiptId: string): Promise<ReceiptProcessingResult> {
    try {
      const receiptResult = await databaseService.getReceipt(receiptId);
      
      if (!receiptResult.success || !receiptResult.data) {
        return {
          success: false,
          error: 'Receipt not found',
          processingSteps: [],
          totalProcessingTime: 0,
          confidence: { overall: 0, textExtraction: 0, documentParsing: 0, categorization: 0, dataQuality: 'low' },
        };
      }

      const receipt = receiptResult.data;
      return this.processReceipt(receipt.originalImageUri, receipt.userId);

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingSteps: [],
        totalProcessingTime: 0,
        confidence: { overall: 0, textExtraction: 0, documentParsing: 0, categorization: 0, dataQuality: 'low' },
      };
    }
  }
}

// Export singleton instance
const receiptProcessingService = new ReceiptProcessingService();
export default receiptProcessingService;

// Export types for use in other modules
export type { ReceiptProcessingResult };
