/**
 * LLM Service for Receipt Parsing Only
 * * This service handles receipt parsing using Gemini AI (no categorization)
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
  
  // --- Exponential Backoff Configuration ---
  private MAX_RETRIES = 3; // Maximum retry attempts after the initial request
  private INITIAL_DELAY_MS = 1000; // Starting delay (1 second)

  constructor() {
    // Service ready
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
      
      // Make LLM request with retry logic
      const response = await this.callGeminiForParsing(prompt);
      
      return {
        success: true,
        data: response,
        processingTime: Date.now() - startTime,
        confidence: 0.85,
      };
      
    } catch (error) {
      console.error('LLM parsing failed:', error);
      
      if (this.config.app.enableMockData) {
        return this.generateMockParseResult(rawText);
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime: Date.now() - startTime,
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

    console.log('Raw OCR Text:', rawText);

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
    "name": "store name",
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
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);
    
    return `${day}/${month}/${year}`;
  }
  
  /**
   * Utility function to create a delay.
   */
  private delay(ms: number): Promise<void> {
      return new Promise(resolve => setTimeout(resolve, ms));
  }


  /**
   * Call Gemini for parsing with exponential backoff and retry logic.
   * Retries on 503 (Service Unavailable) and 429 (Too Many Requests).
   */
  private async callGeminiForParsing(prompt: string): Promise<any> {
    const url = `${this.config.llm.apiUrl}/models/${this.config.llm.model}:generateContent?key=${this.config.llm.apiKey}`;
    const options: RequestInit = {
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
    };
      
    // Loop for initial attempt (retryCount=0) plus MAX_RETRIES attempts
    for (let retryCount = 0; retryCount <= this.MAX_RETRIES; retryCount++) {
        try {
            const response = await fetch(url, options);

            // --- 1. SUCCESS PATH ---
            if (response.ok) {
                const result: GeminiResponse = await response.json();
                
                if (!result.candidates?.[0]?.content?.parts?.[0]?.text) {
                    throw new Error('No response from Gemini API');
                }

                let responseText = result.candidates[0].content.parts[0].text.trim();
                
                // Remove markdown code blocks if present
                if (responseText.startsWith('```json')) {
                    responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                } else if (responseText.startsWith('```')) {
                    responseText = responseText.replace(/^```\s*/, '').replace(/\s*```$/, '');
                }
                
                responseText = responseText.trim();

                try {
                    const parsedResult = JSON.parse(responseText);
                    
                    // Format date to dd/mm/yy if present
                    if (parsedResult.transactionInfo?.date) {
                        parsedResult.transactionInfo.date = this.formatDate(parsedResult.transactionInfo.date);
                    }
                    
                    return parsedResult;
                } catch (parseError) {
                    throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
                }
            }

            // --- 2. TRANSIENT ERROR PATH (Retryable: 503 or 429) ---
            if (response.status === 503 || response.status === 429) {
                if (retryCount < this.MAX_RETRIES) {
                    // Calculate exponential backoff delay (1s, 2s, 4s, ...)
                    const waitTime = this.INITIAL_DELAY_MS * Math.pow(2, retryCount);
                    
                    // Log the retry attempt
                    console.warn(`[API Retry] Status ${response.status}. Retrying in ${waitTime}ms... (Attempt ${retryCount + 1} of ${this.MAX_RETRIES})`);
                    
                    await this.delay(waitTime);
                    continue; // Skip the rest of the loop and try again
                }
            }
            
            // --- 3. PERMANENT ERROR PATH (Non-retryable or retries exhausted) ---
            const errorText = await response.text();
            throw new Error(`Gemini API error (Status ${response.status}): ${errorText}`);

        } catch (error) {
            // --- 4. NETWORK ERROR PATH (fetch failed completely) ---
            if (retryCount < this.MAX_RETRIES) {
                // Network errors can be transient too, so we retry
                const waitTime = this.INITIAL_DELAY_MS * Math.pow(2, retryCount);
                
                console.warn(`[Network Retry] Failed with error: ${error instanceof Error ? error.message : 'Unknown Network Error'}. Retrying in ${waitTime}ms... (Attempt ${retryCount + 1} of ${this.MAX_RETRIES})`);
                
                await this.delay(waitTime);
                continue; // Skip the rest of the loop and try again
            }
            
            // Retries exhausted, re-throw the original error
            throw error;
        }
    }
    
    // Fallback if the loop somehow exits without returning a result
    throw new Error(`Failed to process request after ${this.MAX_RETRIES + 1} attempts.`);
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
