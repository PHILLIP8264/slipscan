/**
 * LLM Service for Receipt Parsing Only
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
   * Parse receipt structure only (no categorization)
   */
  async parseReceipt(rawText: string, context?: { imageUri?: string }): Promise<ProcessingResult<any>> {
    const startTime = Date.now();
    
    try {
      // Validate configuration
      if (!this.config.llm.apiKey) {
        if (this.config.app.enableMockData) {
          return this.generateMockParseResult(rawText);
        }
        throw new Error('LLM API key not configured');
      }

      // Rate limiting
      await this.enforceRateLimit();

      // Build parsing prompt
      const prompt = this.buildParsePrompt(rawText, context);
      
      // Make LLM request
      const response = await this.callGeminiForParsing(prompt);
      
      const processingTime = Date.now() - startTime;
      
      if (this.config.app.enableLogging) {
        console.log(`✅ Gemini parsing completed in ${processingTime}ms`);
      }

      return {
        success: true,
        data: response,
        processingTime,
        confidence: 0.85,
      };
      
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error(' LLM parsing failed:', error);
      
      // Return mock data as fallback
      if (this.config.app.enableMockData) {
        return this.generateMockParseResult(rawText);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      };
    }
  }

  /**
   * Build prompt for parsing only (no categorization)
   */
  private buildParsePrompt(rawText: string, context?: { imageUri?: string }): string {
    return `You are an expert receipt parser. Given the raw OCR text from a receipt, extract structured data.

RAW TEXT:
${rawText}

CRITICAL INSTRUCTIONS:
- Respond with ONLY valid JSON
- No markdown, no code blocks, no explanatory text
- Must start with { and end with }
- All property names MUST be in double quotes
- All string values MUST be in double quotes
- Numbers should NOT be quoted

JSON Response (copy this exact structure):

{
  "merchantInfo": {
    "name": "merchant name",
    "phone_number": "123-456-7890",
    "address": "merchant address",
    "confidence": 0.9
  },
  "transactionInfo": {
    "date": "2024-01-01T00:00:00Z",
    "confidence": 0.8
  },
  "lineItems": [
    {
      "name": "item name",
      "itemprice": 5.99,
      "linetotal": 5.99,
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
    "locale": "en-ZA",
    "processingDate": "${new Date().toISOString()}",
    "imageUri": "${context?.imageUri || ''}",
    "documentType": "receipt"
  },
  "rawFields": { "rawText": "${rawText.replace(/"/g, '\\"')}" }
}

Focus on accuracy and provide confidence scores based on how clear the text extraction is.`;
  }

  /**
   * Call Gemini for parsing
   */
  private async callGeminiForParsing(prompt: string): Promise<any> {
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
   * Generate mock data for parsing (development/fallback)
   */
  private generateMockParseResult(rawText: string): ProcessingResult<any> {
    const mockData = {
      merchantInfo: { name: "Mock Store", phone_number: "011-123-4567", address: "123 Mock Street, Johannesburg", confidence: 0.8 },
      transactionInfo: { date: new Date().toISOString(), confidence: 0.7 },
      lineItems: [
        { name: "Mock Item 1", itemprice: 5.99, linetotal: 5.99, quantity: 1, confidence: 0.8 },
        { name: "Mock Item 2", itemprice: 3.50, linetotal: 7.00, quantity: 2, confidence: 0.75 }
      ],
      totals: { total: 12.99, tax: 1.04, confidence: 0.9 },
      paymentInfo: { method: "credit_card", confidence: 0.6 },
      metadata: {
        currency: "ZAR",
        locale: "en-ZA", 
        processingDate: new Date().toISOString(),
        imageUri: "",
        documentType: "receipt"
      },
      rawFields: { rawText }
    };

    return {
      success: true,
      data: mockData,
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
}

// Export singleton instance
const llmService = new LLMService();
export default llmService;