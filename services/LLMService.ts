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
      console.log(' LLM parsing failed:', error);
      
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
    // Properly escape the raw text for JSON
    const escapedRawText = rawText.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
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

Required JSON structure:
{
  "merchantInfo": {
    "name": "store name from receipt",
    "phone_number": "phone if found",
    "address": "address if found", 
    "confidence": 0.9
  },
  "transactionInfo": {
    "date": "ISO date string if found",
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
      console.log('❌ Gemini API error details:', errorText);
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const result: GeminiResponse = await response.json();
    
    if (this.config.app.enableLogging) {
      console.log('📡 Gemini API raw response:', JSON.stringify(result, null, 2));
    }
    
    if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
      console.log('❌ No response text from Gemini API:', result);
      throw new Error('No response from Gemini API');
    }

    const responseText = result.candidates[0].content.parts[0].text;
    
    if (this.config.app.enableLogging) {
      console.log('📄 Gemini response text:', responseText);
    }

    // Clean up potential markdown formatting
    let cleanedResponse = responseText.trim();
    
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
    }

    try {
      return JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.log('❌ JSON Parse Error:', parseError);
      console.log('❌ Failed to parse response:', cleanedResponse);
      
      // Try to provide more specific error information
      if (!cleanedResponse.startsWith('{')) {
        throw new Error(`Invalid JSON response: doesn't start with '{'. Starts with: "${cleanedResponse.substring(0, 20)}"`);
      }
      if (!cleanedResponse.endsWith('}')) {
        throw new Error(`Invalid JSON response: doesn't end with '}'. Ends with: "${cleanedResponse.substring(-20)}"`);
      }
      
      throw new Error(`JSON parse failed: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`);
    }
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