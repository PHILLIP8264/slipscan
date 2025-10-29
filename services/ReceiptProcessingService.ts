/**
 * Receipt Processing Service - Main Orchestration (No Categorization)
 * 
 * This service coordinates the simplified receipt processing workflow:
 * 1. Extract Text (Google Vision API)
 * 2. Parse Structure (Gemini LLM - parsing only)
 * 3. Store Data (Database)
 */

import getConfig from '../config/environment';
import { DocumentAIResult, ProcessedReceipt, ProcessingConfidence, ProcessingResult, ProcessingStep, TextExtractionResult } from '../types/receipt';

// Import all the services
import databaseService from './DatabaseService';
import googleVisionService from './GoogleVisionService';
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
 * Receipt Processing Service - Main Orchestrator (No Categorization)
 */
class ReceiptProcessingService {
  private config = getConfig();

  constructor() {
    if (this.config.app.enableLogging) {
      console.log('🔄 ReceiptProcessingService initialized (parsing only)');
    }
  }

  /**
   * Process a receipt image through the complete workflow (no categorization)
   */
  async processReceipt(imageUri: string, userId?: string): Promise<ReceiptProcessingResult> {
    const overallStartTime = Date.now();
    const processingSteps: ProcessingStep[] = [];
    
    if (this.config.app.enableLogging) {
      console.log('🚀 Starting receipt processing workflow (parsing only)');
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

      // Step 2: Parse Structure using Gemini (parsing only)
      const parseResult = await this.executeStep(
        'document_parsing',
        () => llmService.parseReceipt(textData.rawText, {
            imageUri: imageUri
          }
        ),
        processingSteps
      );

      let documentData: DocumentAIResult;
      if (!parseResult.success || !parseResult.data) {
        // Fallback: Create basic structure from text
        console.warn('⚠️ Gemini parsing failed, creating fallback structure');
        documentData = this.createFallbackDocument(textData, imageUri);
      } else {
        documentData = parseResult.data as DocumentAIResult;
      }

      // Step 3: Create ProcessedReceipt object
      const processedReceipt = this.createProcessedReceipt(
        textData,
        documentData,
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
        console.log(`📝 Items: ${processedReceipt.items.length}`);
      }

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
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown processing error',
        processingSteps,
        totalProcessingTime,
        confidence: {
          overall: 0,
          textExtraction: 0,
          documentParsing: 0,
          dataQuality: 'low',
        },
      };
    }
  }

  /**
   * Execute a processing step with error handling and timing
   */
  private async executeStep<T>(
    stepName: ProcessingStep['step'],
    operation: () => Promise<ProcessingResult<T>>,
    processingSteps: ProcessingStep[]
  ): Promise<ProcessingResult<T>> {
    const startTime = Date.now();
    
    try {
      if (this.config.app.enableLogging) {
        console.log(`🔄 Executing step: ${stepName}`);
      }

      const result = await operation();
      const processingTime = Date.now() - startTime;

      processingSteps.push({
        step: stepName,
        status: result.success ? 'success' : 'failed',
        confidence: result.confidence || 0,
        processingTime,
        error: result.error,
        details: result.metadata || {}
      });

      if (this.config.app.enableLogging) {
        const status = result.success ? '✅' : '❌';
        console.log(`${status} Step ${stepName} completed in ${processingTime}ms`);
        if (result.confidence) {
          console.log(`📊 Confidence: ${result.confidence.toFixed(2)}`);
        }
      }

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      processingSteps.push({
        step: stepName,
        status: 'failed',
        confidence: 0,
        processingTime,
        error: errorMessage,
      });

      console.error(`❌ Step ${stepName} failed:`, error);

      return {
        success: false,
        error: errorMessage,
        processingTime,
      };
    }
  }

  /**
   * Create fallback document structure when LLM parsing fails
   */
  private createFallbackDocument(textData: TextExtractionResult, imageUri: string): DocumentAIResult {
    const lines = textData.rawText.split('\n').filter(line => line.trim());
    
    // Try to extract basic info
    let merchantName = 'Unknown Merchant';
    let total = 0;
    
    // Look for merchant name (usually first few lines)
    if (lines.length > 0) {
      merchantName = lines[0].trim();
    }
    
    // Look for total (lines containing $ and numbers)
    for (const line of lines.reverse()) {
      const totalMatch = line.match(/\$?(\d+\.?\d*)/);
      if (totalMatch) {
        total = parseFloat(totalMatch[1]) || 0;
        break;
      }
    }

    return {
      merchantInfo: {
        name: merchantName,
        confidence: 0.3,
      },
      transactionInfo: {
        date: new Date().toISOString(),
        confidence: 0.2,
      },
      lineItems: [{
        name: 'Unable to parse items',
        totalPrice: total,
        confidence: 0.1,
      }],
      totals: {
        total,
        tax: 0,
        confidence: 0.3,
      },
      paymentInfo: {
        method: 'other' as any,
        confidence: 0.1,
      },
      metadata: {
        currency: 'ZAR',
        locale: 'en-ZA',
        processingDate: new Date().toISOString(),
        imageUri,
        documentType: 'receipt' as const,
      },
      rawFields: {
        rawText: textData.rawText,
      },
    };
  }

  /**
   * Create processed receipt object (no categorization)
   */
  private createProcessedReceipt(
    textData: TextExtractionResult,
    documentData: DocumentAIResult,
    imageUri: string,
    processingSteps: ProcessingStep[],
    userId?: string
  ): ProcessedReceipt {
    const receiptId = `receipt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    return {
      id: receiptId,
      originalImageUri: imageUri,
      rawText: textData.rawText,
      merchant: documentData.merchantInfo,
      transaction: documentData.transactionInfo,
      items: documentData.lineItems,
      totals: documentData.totals,
      payment: documentData.paymentInfo,
      processingSteps,
      confidence: this.calculateOverallConfidence(processingSteps),
      createdAt: now,
      updatedAt: now,
      userId,
      tags: [],
    };
  }

  /**
   * Calculate overall confidence from processing steps
   */
  private calculateOverallConfidence(steps: ProcessingStep[]): ProcessingConfidence {
    const successfulSteps = steps.filter(step => step.status === 'success');
    const avgConfidence = successfulSteps.length > 0 
      ? successfulSteps.reduce((sum, step) => sum + step.confidence, 0) / successfulSteps.length
      : 0;

    const textExtractionStep = steps.find(step => step.step === 'text_extraction');
    const documentParsingStep = steps.find(step => step.step === 'document_parsing');

    return {
      overall: avgConfidence,
      textExtraction: textExtractionStep?.confidence || 0,
      documentParsing: documentParsingStep?.confidence || 0,
      dataQuality: avgConfidence > 0.8 ? 'high' : avgConfidence > 0.5 ? 'medium' : 'low',
    };
  }
}

// Export singleton instance
const receiptProcessingService = new ReceiptProcessingService();
export default receiptProcessingService;