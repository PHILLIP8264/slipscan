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
      console.log('❌ LLM parsing failed:', error);
      
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
    if (!rawText || rawText.trim().length === 0) {
      throw new Error('Raw text is empty or undefined');
    }

    // Properly escape the raw text for JSON with more robust escaping
    const escapedRawText = rawText
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
      .replace(/[\x00-\x1F\x7F-\x9F]/g, ''); // Remove control characters
    
    const currentISO = new Date().toISOString();
    const imageUri = context?.imageUri || '';
    

    
    return `You are an expert receipt parser. Extract structured data from the OCR text below.

RAW TEXT:
${rawText}

INSTRUCTIONS:
- Return ONLY valid JSON
- NO markdown formatting, NO code blocks, NO explanations
- Start with { and end with }
- Use double quotes for all strings
- Extract merchant name, date, items, totals, payment method
- Provide confidence scores (0.0 to 1.0)
- The date will appear as dd/mm/yy (e.g., "30/10/24")
- Convert any date found on receipt to dd/mm/yy format

Required JSON structure:
{
  "merchantInfo": {
    "name": "store name from receipt",
    "phone_number": "phone if found",
    "address": "address if found", 
    "confidence": 0.9
  },
  "transactionInfo": {
    "date": "dd/mm/yy",
    "confidence": 0.8
  },
  "lineItems": [
    {
      "name": "product name",
      "itemprice": 0.00,
      "linetotal": 0.00,
      "quantity": 1,
      "confidence": 0.85
    }
  ],
  "totals": {
    "total": 0.00,
    "tax": 0.00,
    "confidence": 0.9
  },
  "paymentInfo": {
    "method": "cash_or_card_or_other",
    "confidence": 0.7
  },
  "metadata": {
    "currency": "ZAR",
    "locale": "en-ZA",
    "processingDate": "${currentISO}",
    "imageUri": "${imageUri}",
    "documentType": "receipt"
  },
  "rawFields": { "rawText": "${escapedRawText}" }
}

Parse the receipt data now:`;
  }

  /**
   * Simple date formatter to dd/mm/yy
   */
  private formatDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString().slice(-2);
      
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  }

  /**
   * Call Gemini for parsing
   */
  private async callGeminiForParsing(prompt: string): Promise<any> {
    if (this.config.app.enableLogging) {
      console.log('🔍 Calling Gemini API with prompt length:', prompt.length);
    }

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
      const errorText = await response.text();
      console.log('❌ Gemini API error:', response.status, errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const result: GeminiResponse = await response.json();
    
    if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.log('❌ No response from Gemini API:', result);
      throw new Error('No response from Gemini API');
    }

    const responseText = result.candidates[0].content.parts[0].text;
    
    if (this.config.app.enableLogging) {
      console.log('📄 Gemini response text:', responseText);
    }

    // Clean up potential markdown formatting
    let cleanedResponse = responseText.trim();
    
    if (this.config.app.enableLogging) {
      console.log('📄 Raw Gemini response before cleaning:', JSON.stringify(responseText));
    }
    
    // Remove markdown code blocks if present
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    
    // Remove any leading/trailing whitespace again
    cleanedResponse = cleanedResponse.trim();
    
    if (this.config.app.enableLogging) {
      console.log('🧹 Cleaned response text:', cleanedResponse);
      console.log('🔍 Response length:', cleanedResponse.length);
      console.log('🔍 First 100 chars:', cleanedResponse.substring(0, 100));
      console.log('🔍 Last 100 chars:', cleanedResponse.substring(Math.max(0, cleanedResponse.length - 100)));
    }

    try {
      const parsedResult = JSON.parse(cleanedResponse);
      
      // Format date to dd/mm/yy if present
      if (parsedResult.transactionInfo?.date) {
        parsedResult.transactionInfo.date = this.formatDate(parsedResult.transactionInfo.date);
      }
      
      return parsedResult;
    } catch (parseError) {
      console.log('❌ JSON Parse Error:', parseError);
      console.log('❌ Response:', cleanedResponse.substring(0, 200) + '...');
      throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate mock data for parsing (development/fallback)
   */
  private generateMockParseResult(rawText: string): ProcessingResult<any> {
    const mockData = {
      merchantInfo: { name: "Mock Store", phone_number: "011-123-4567", address: "123 Mock Street, Johannesburg", confidence: 0.8 },
      transactionInfo: { date: this.formatDate(new Date().toISOString()), confidence: 0.7 },
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