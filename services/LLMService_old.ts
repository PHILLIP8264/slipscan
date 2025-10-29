/**
 * LLM Service for Receipt Parsing
 * 
 * This service handles receipt parsing using Gemini AI (no categorization)
 */

import getConfig from '../config/environment';
import { ProcessingResult } from '../types/receipt';

// Gemini API Response Type
interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
    finishReason: string;
  }>;
}

/**
 * LLM Service for Receipt Parsing Only
 * 
 * Uses AI language models to parse receipt structure
 */
class LLMService {
  private config = getConfig();
  private rateLimitDelay = 1000;
  private lastRequestTime = 0;

  constructor() {
    if (this.config.app.enableLogging) {
      console.log(`🤖 LLMService initialized with ${this.config.llm.provider} provider`);
    }
  }



  /**
   * Parse receipt structure AND categorize items using Gemini (combined step)
   * This replaces both Document AI and categorization steps
   */
  async parseAndCategorizeReceipt(rawText: string, context?: { imageUri?: string }): Promise<ProcessingResult<{ documentData: any; categoryResult: CategoryResult }>> {
    const startTime = Date.now();
    
    try {
      // Validate configuration
      if (!this.config.llm.apiKey) {
        if (this.config.app.enableMockData) {
          return this.generateMockParseAndCategoryResult(rawText);
        }
        throw new Error('LLM API key not configured');
      }

      // Rate limiting
      await this.enforceRateLimit();

      // Build comprehensive prompt for structure parsing + categorization
      const prompt = this.buildParseAndCategorizePrompt(rawText, context);
      
      // Make LLM request
      const response = await this.callGeminiForParsing(prompt);
      
      const processingTime = Date.now() - startTime;
      
      if (this.config.app.enableLogging) {
        console.log(`✅ Gemini parse+categorize completed in ${processingTime}ms`);
      }

      return {
        success: true,
        data: response,
        processingTime,
        confidence: 0.85, // Good confidence for combined processing
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ LLM parse+categorize failed:', error);
      
      // Return mock data as fallback
      if (this.config.app.enableMockData) {
        return this.generateMockParseAndCategoryResult(rawText);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      };
    }
  }

  /**
   * Build prompt for combined parsing and categorization
   */
  private buildParseAndCategorizePrompt(rawText: string, context?: { imageUri?: string }): string {
    return `You are an expert receipt parser and categorizer. Given the raw OCR text from a receipt, extract structured data AND categorize all items.

RAW TEXT:
${rawText}

CRITICAL INSTRUCTIONS:
- Respond with ONLY valid JSON
- No markdown, no code blocks, no explanatory text
- Must start with { and end with }
- All property names MUST be in double quotes
- All string values MUST be in double quotes
- Numbers should NOT be quoted
- Use proper comma separation between properties
- Ensure all braces and brackets are properly closed

JSON Response (copy this exact structure):

{
  "documentData": {
    "merchantInfo": {
      "name": "merchant name",
      "confidence": 0.9
    },
    "transactionInfo": {
      "date": "2024-01-01T00:00:00Z",
      "confidence": 0.8
    },
    "lineItems": [
      {
        "name": "item name",
        "totalPrice": 5.99,
        "quantity": 1,
        "confidence": 0.85
      }
    ],
    "totals": {
      "total": 25.99,
      "tax": 2.08,
      "confidence": 0.9
    },
    "paymentInfo": {
      "method": "credit_card",
      "confidence": 0.7
    },
    "metadata": {
      "currency": "ZAR",
      "locale": "eu-ZA",
      "processingDate": "${new Date().toISOString()}",
      "imageUri": "${context?.imageUri || ''}",
      "documentType": "receipt"
    },
    "rawFields": { "rawText": "${rawText.replace(/"/g, '\\"')}" }
  },
  "categoryResult": {
    "items": [
      {
        "name": "item name",
        "category": "GROCERIES",
        "quantity": 1,
        "price": 5.99,
        "confidence": 0.85,
        "reasoning": "Food item purchased at grocery store"
      }
    ],
    "merchantCategory": "merchant name",
    "merchantCategoryConfidence": 0.8,
    "overallCategory": "GROCERIES",
    "processingNotes": "Combined parsing and categorization"
  }
}

Available categories: ${Object.values(ItemCategory).join(', ')}

Focus on accuracy and provide confidence scores based on how clear the text extraction is.`;
  }

  /**
   * Call Gemini for parsing and categorization
   */
  private async callGeminiForParsing(prompt: string): Promise<{ documentData: any; categoryResult: CategoryResult }> {
    const response = await fetch(`${this.config.llm.apiUrl}/models/${this.config.llm.model}:generateContent?key=${this.config.llm.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048,
          responseMimeType: "application/json"
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const result: GeminiResponse = await response.json();
    
    if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error('No response from Gemini API');
    }

    return JSON.parse(result.candidates[0].content.parts[0].text);
  }



  /**
   * Generate mock data for parse+categorize (development/fallback)
   */
  private generateMockParseAndCategoryResult(rawText: string): ProcessingResult<{ documentData: any; categoryResult: CategoryResult }> {
    const mockDocumentData = {
      merchantInfo: { name: "Mock Store", confidence: 0.8 },
      transactionInfo: { date: new Date().toISOString(), confidence: 0.7 },
      lineItems: [
        { name: "Mock Item 1", totalPrice: 5.99, quantity: 1, confidence: 0.8 },
        { name: "Mock Item 2", totalPrice: 3.50, quantity: 2, confidence: 0.75 }
      ],
      totals: { total: 12.99, tax: 1.04, confidence: 0.9 },
      paymentInfo: { method: "credit_card", confidence: 0.6 },
      metadata: {
        currency: "ZAR",
        locale: "eu-ZA", 
        processingDate: new Date().toISOString(),
        imageUri: "",
        documentType: "receipt"
      },
      rawFields: { rawText }
    };

    const mockCategoryResult: CategoryResult = {
      items: [
        {
          name: "Mock Item 1",
          category: ItemCategory.GROCERIES,
          quantity: 1,
          price: 5.99,
          confidence: 0.8,
          reasoning: "Mock categorization"
        },
        {
          name: "Mock Item 2", 
          category: ItemCategory.GROCERIES,
          quantity: 2,
          price: 3.50,
          confidence: 0.75,
          reasoning: "Mock categorization"
        }
      ],
      merchantCategory: "Mock Store",
      merchantCategoryConfidence: 0.8,
      overallCategory: ItemCategory.GROCERIES,
      processingNotes: "Mock data - no API key configured"
    };

    return {
      success: true,
      data: { documentData: mockDocumentData, categoryResult: mockCategoryResult },
      processingTime: 100,
      confidence: 0.8,
    };
  }

  /**
   * Enforce rate limiting
   */
  private async enforceRateLimit(): Promise<void> {
    const timeSinceLastRequest = Date.now() - this.lastRequestTime;
    if (timeSinceLastRequest < this.rateLimitDelay) {
      await new Promise(resolve => setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest));
    }
    this.lastRequestTime = Date.now();
  }



  /**
   * Map category string to ItemCategory enum
   */
  private mapToCategory(categoryString: string): ItemCategory {
    const normalized = categoryString.toLowerCase().replace(/[^a-z]/g, '');
    return this.categoryMappings.get(normalized) || ItemCategory.OTHER;
  }

  /**
   * Fallback rule-based categorization when LLM fails
   */
  private fallbackCategorization(merchantName: string, items: ReceiptLineItem[]): CategoryResult {
    const merchantLower = merchantName.toLowerCase();
    const merchantCategory = this.getMerchantCategory(merchantLower);

    const categorizedItems: CategorizedLineItem[] = items.map(item => ({
      name: item.name,
      category: this.getItemCategory(item.name.toLowerCase(), merchantCategory),
      quantity: item.quantity || 1,
      price: item.totalPrice,
      confidence: 0.6,
      reasoning: 'Rule-based fallback',
    }));

    return {
      items: categorizedItems,
      merchantCategory: merchantName,
      merchantCategoryConfidence: 0.6,
      overallCategory: merchantCategory,
      processingNotes: 'Rule-based fallback',
    };
  }

  private getMerchantCategory(merchantLower: string): ItemCategory {
    if (merchantLower.includes('grocery') || merchantLower.includes('market')) return ItemCategory.GROCERIES;
    if (merchantLower.includes('coffee') || merchantLower.includes('cafe')) return ItemCategory.COFFEE;
    if (merchantLower.includes('hardware')) return ItemCategory.HARDWARE;
    if (merchantLower.includes('gas') || merchantLower.includes('fuel')) return ItemCategory.AUTOMOTIVE;
    return ItemCategory.OTHER;
  }

  private getItemCategory(itemLower: string, defaultCategory: ItemCategory): ItemCategory {
    if (itemLower.includes('bread') || itemLower.includes('milk')) return ItemCategory.GROCERIES;
    if (itemLower.includes('coffee') || itemLower.includes('latte')) return ItemCategory.COFFEE;
    if (itemLower.includes('tool') || itemLower.includes('screw')) return ItemCategory.HARDWARE;
    return defaultCategory;
  }


}

// Export singleton instance
const llmService = new LLMService();
export default llmService;

// Export types for use in other modules
export type { CategorizedLineItem, CategoryResult, LLMCategorizationRequest, LLMCategorizationResponse };
