/**
 * LLM Service for Receipt Parsing with Categorization
 * This service handles receipt parsing and item categorization using Gemini AI
 */

import getConfig from '../config/environment';
import { ProcessingResult } from '../types/receipt';

// --- Strongly Typed Receipt Structure ---

// Define the available categories as a type for full type safety
export type ReceiptCategory =
  | 'Groceries'
  | 'Restaurant'
  | 'Transport'
  | 'Entertainment'
  | 'Utilities'
  | 'Hardware'
  | 'Fuel'
  | 'Insurance'
  | 'Subscriptions'
  | 'Other'; // Added 'Other' for flexibility

export interface LineItem {
  name: string;
  itemprice: number;
  linetotal: number;
  quantity: number;
  category: ReceiptCategory;
  categoryConfidence: number;
  confidence: number;
}

export interface ReceiptStructure {
  merchantInfo: {
    name: string;
    phone_number: string;
    address: string;
    confidence: number;
  };
  transactionInfo: {
    date: string;
    confidence: number;
  };
  lineItems: LineItem[];
  totals: {
    subtotal: number; // <-- ADD THIS
    tax: number;
    tip: number;
    total: number;     // This is the GRAND total
    confidence: number;
  };
  paymentInfo: {
    method: string; // e.g., 'cash_or_card_or_other'
    confidence: number;
  };
  metadata: {
    currency: string;
    locale: string;
    processingDate: string;
    imageUri: string;
    documentType: string;
  };
  rawFields: {
    rawText: string;
  };
}

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
   * Parse receipt structure with item categorization
   */
  async parseReceipt(
    rawText: string,
    context?: { imageUri?: string }
  ): Promise<ProcessingResult<ReceiptStructure>> {
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
        confidence: 0.85, // This could be an average of the response confidences
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
   * Build prompt for parsing with categorization
   */
  private buildParsePrompt(
    rawText: string,
    context?: { imageUri?: string }
  ): string {
    if (!rawText || rawText.trim().length === 0) {
      throw new Error('Raw text is empty or undefined');
    }

    console.log('Raw OCR Text:', rawText.substring(0, 200) + '...'); // Log snippet

    const currentISO = new Date().toISOString();
    const imageUri = context?.imageUri || '';

    // !!CRITICAL BUG FIX!!
    // We do NOT put the full escapedRawText into the example structure.
    // The prompt was becoming enormous and malformed.
    // We just use a placeholder in the example.
    const rawTextPlaceholder =
      "The full, original raw OCR text provided above...";

    return `You are an expert receipt parser and categorizer. Extract structured data from the OCR text below and categorize each item.

RAW TEXT:
${rawText}

CRITICAL INSTRUCTIONS:
- Return ONLY valid, complete JSON - nothing else
- NO markdown, NO code blocks, NO explanatory text before or after
- Must start with { and end with }
- ALL property names must be in double quotes
- ALL string values must be in double quotes
- Numbers should NOT be quoted (e.g., 5.99 not "5.99")
- Do NOT add trailing commas
- Ensure JSON is complete - don't cut off mid-way
- Extract merchant name, date, items, and all total fields (subtotal, tax, tip, and grand total).
- Extract any "Tip" or "Gratuity" and place it in "totals.tip". If none, use 0.00.
- Place the total *before* tax/tip into "totals.subtotal".
- Place the final, grand total (what the customer paid) into "totals.total".
- **CRITICAL**: "totals.total" MUST be the final amount paid, *including* all items, tax, and tip.
- Categorize each item using the available categories below
- If a category is not obvious, use "Other"
- Provide confidence scores (0.0 to 1.0)
- The date will appear as dd/mm/yy (e.g., "30/10/24")
- Convert any date found on receipt to dd/mm/yy format
- **CRITICAL:** Place the complete, original, un-escaped RAW TEXT (provided at the top) into the "rawFields.rawText" key.

AVAILABLE CATEGORIES (use exact names):
- Groceries (food items, beverages, household consumables)
- Restaurant (prepared food, dining out)
- Transport (fuel, public transport, taxi, uber)
- Entertainment (movies, games, streaming)
- Utilities (electricity, water, internet, phone bills)
- Hardware (tools, building materials, DIY)
- Fuel (petrol, diesel for vehicles)
- Insurance (any insurance payments)
- Subscriptions (monthly/yearly services)
- Other (use for anything that doesn't fit)

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
      "category": "Groceries",
      "categoryConfidence": 0.8,
      "confidence": 0.85
    }
  ],
  "totals": {
    "subtotal": 0.00, // <-- ADD THIS (Total before tax/tip)
    "tax": 0.00,
    "tip": 0.00,
    "total": 0.00,     // <-- This is now clearly the GRAND total
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
  "rawFields": { "rawText": "${rawTextPlaceholder}" }
}

IMPORTANT: Return the complete JSON structure above with actual data. Ensure it ends with } and is valid JSON:`;
  }

  /**
   * Simple date formatter to dd/mm/yy
   * This is defensive, in case the LLM provides an ISO date.
   */
  private formatDate(dateStr: string): string {
    // Check if it's already in the correct format (e.g., "30/10/24")
    // This simple regex check helps avoid parsing errors for dd/mm/yy
    if (/^\d{2}\/\d{2}\/\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return dateStr; // Return original if unparseable
    }

    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);

    return `${day}/${month}/${year}`;
  }

  /**
   * Utility function to create a delay.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Call Gemini for parsing with exponential backoff and retry logic.
   * Retries on 503 (Service Unavailable) and 429 (Too Many Requests).
   */
  private async callGeminiForParsing(
    prompt: string
  ): Promise<ReceiptStructure> {
    const url = `${this.config.llm.apiUrl}/models/${this.config.llm.model}:generateContent?key=${this.config.llm.apiKey}`;
    const options: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 2048, // Increased for larger receipts
          responseMimeType: 'application/json',
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

          console.log('Raw Gemini Response:', responseText);

          // Remove markdown code blocks if present (though responseMimeType should prevent this)
          if (responseText.startsWith('```json')) {
            responseText = responseText
              .replace(/^```json\s*/, '')
              .replace(/\s*```$/, '');
          } else if (responseText.startsWith('```')) {
            responseText = responseText
              .replace(/^```\s*/, '')
              .replace(/\s*```$/, '');
          }

          responseText = responseText.trim();

          // Try to repair incomplete JSON
          responseText = this.repairJSON(responseText);

          console.log('Cleaned Response:', responseText);

          let parsedResult: unknown;
          try {
            parsedResult = JSON.parse(responseText);
          } catch (parseError) {
            console.error('JSON Parse Error:', parseError);
            console.error('Problematic Response:', responseText);
            throw new Error(
              `Failed to parse JSON response: ${
                parseError instanceof Error ? parseError.message : 'Unknown error'
              }`
            );
          }

          // Validate required structure
          if (!this.validateResponseStructure(parsedResult)) {
            console.warn(
              'Response structure validation failed, using fallback'
            );
            throw new Error('Invalid response structure from Gemini');
          }

          // At this point, TypeScript knows parsedResult is ReceiptStructure
          // thanks to the type guard

          // Format date to dd/mm/yy if present
          if (parsedResult.transactionInfo?.date) {
            parsedResult.transactionInfo.date = this.formatDate(
              parsedResult.transactionInfo.date
            );
          }

          return parsedResult; // This is now type-safe
        }

        // --- 2. TRANSIENT ERROR PATH (Retryable: 503 or 429) ---
        if (response.status === 503 || response.status === 429) {
          if (retryCount < this.MAX_RETRIES) {
            const waitTime = this.INITIAL_DELAY_MS * Math.pow(2, retryCount);
            console.warn(
              `[API Retry] Status ${response.status}. Retrying in ${waitTime}ms... (Attempt ${
                retryCount + 1
              } of ${this.MAX_RETRIES})`
            );
            await this.delay(waitTime);
            continue;
          }
        }

        // --- 3. PERMANENT ERROR PATH (Non-retryable or retries exhausted) ---
        const errorText = await response.text();
        throw new Error(`Gemini API error (Status ${response.status}): ${errorText}`);
      } catch (error) {
        // --- 4. NETWORK ERROR PATH (fetch failed completely) ---
        if (retryCount < this.MAX_RETRIES) {
          const waitTime = this.INITIAL_DELAY_MS * Math.pow(2, retryCount);
          console.warn(
            `[Network Retry] Failed with error: ${
              error instanceof Error ? error.message : 'Unknown Network Error'
            }. Retrying in ${waitTime}ms... (Attempt ${retryCount + 1} of ${
              this.MAX_RETRIES
            })`
          );
          await this.delay(waitTime);
          continue;
        }

        // Retries exhausted, re-throw the original error
        throw error;
      }
    }

    // Fallback if the loop somehow exits without returning a result
    throw new Error(
      `Failed to process request after ${this.MAX_RETRIES + 1} attempts.`
    );
  }

  /**
   * Attempt to repair incomplete or malformed JSON
   */
  private repairJSON(jsonStr: string): string {
    // Remove any trailing commas before closing braces/brackets
    let repaired = jsonStr.replace(/,(\s*[}\]])/g, '$1');

    // If JSON is incomplete (doesn't end with }), try to complete it
    if (!repaired.trim().endsWith('}')) {
      const openBraces = (repaired.match(/\{/g) || []).length;
      const closeBraces = (repaired.match(/\}/g) || []).length;
      const missingBraces = openBraces - closeBraces;

      if (missingBraces > 0) {
        repaired += '}'.repeat(missingBraces);
      }
    }

    return repaired;
  }

  /**
   * Validate that the response has the required structure using a Type Guard
   */
  private validateResponseStructure(obj: unknown): obj is ReceiptStructure {
    if (typeof obj !== 'object' || obj === null) {
      return false;
    }

    // A more robust check for the main keys
    return (
      'merchantInfo' in obj &&
      'transactionInfo' in obj &&
      'lineItems' in obj &&
      Array.isArray((obj as ReceiptStructure).lineItems) &&
      'totals' in obj &&
      'paymentInfo' in obj &&
      'metadata' in obj &&
      'rawFields' in obj
    );
  }

  /**
   * Create a basic fallback structure from raw text when JSON parsing fails
   * This is now typed to return ReceiptStructure
   */
  private createFallbackStructure(
    responseText: string
  ): ReceiptStructure | null {
    try {
      const merchantMatch = responseText.match(/"name":\s*"([^"]+)"/);
      const totalMatch = responseText.match(/"total":\s*([\d.]+)/);
      const currentISO = new Date().toISOString();
      const total = totalMatch ? parseFloat(totalMatch[1]) : 0.0;

      return {
        merchantInfo: {
          name: merchantMatch ? merchantMatch[1] : 'Unknown Merchant',
          phone_number: '',
          address: '',
          confidence: 0.3,
        },
        transactionInfo: {
          date: this.formatDate(currentISO),
          confidence: 0.3,
        },
        lineItems: [
          {
            name: 'Item (parsing failed)',
            itemprice: total,
            linetotal: total,
            quantity: 1,
            category: 'Other', // Use a valid category
            categoryConfidence: 0.3,
            confidence: 0.3,
          },
        ],
        totals: {
          subtotal: total, // <-- ADD THIS
          tax: 0.0,
          tip: 0.0,
          total: total,
          confidence: 0.3,
        },
        paymentInfo: {
          method: 'unknown',
          confidence: 0.3,
        },
        metadata: {
          currency: 'ZAR',
          locale: 'en-ZA',
          processingDate: currentISO,
          imageUri: '',
          documentType: 'receipt',
        },
        rawFields: { rawText: responseText.slice(0, 500) }, // Truncate
      };
    } catch (error) {
      console.error('Failed to create fallback structure:', error);
      return null;
    }
  }

  /**
   * Generate mock data for parsing (development/fallback)
   */
  private generateMockParseResult(
    rawText: string
  ): ProcessingResult<ReceiptStructure> {
    const mockData: ReceiptStructure = {
      merchantInfo: {
        name: 'Mock Store',
        phone_number: '011-123-4567',
        address: '123 Mock Street, Johannesburg',
        confidence: 0.8,
      },
      transactionInfo: {
        date: this.formatDate(new Date().toISOString()),
        confidence: 0.7,
      },
      lineItems: [
        {
          name: 'Mock Item 1',
          itemprice: 5.99,
          linetotal: 5.99,
          quantity: 1,
          category: 'Groceries',
          categoryConfidence: 0.8,
          confidence: 0.8,
        },
        {
          name: 'Mock Item 2',
          itemprice: 3.5,
          linetotal: 7.0,
          quantity: 2,
          category: 'Groceries',
          categoryConfidence: 0.75,
          confidence: 0.75,
        },
      ],
      // (Mock subtotal is 5.99 + 7.00 = 12.99)
      // (Mock total is 12.99 subtotal + 1.04 tax + 2.00 tip = 16.03)
      totals: { subtotal: 12.99, tax: 1.04, tip: 2.00, total: 16.03, confidence: 0.9 },
      paymentInfo: { method: 'credit_card', confidence: 0.6 },
      metadata: {
        currency: 'ZAR',
        locale: 'en-ZA',
        processingDate: new Date().toISOString(),
        imageUri: '',
        documentType: 'receipt',
      },
      rawFields: { rawText },
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
      await new Promise((resolve) =>
        setTimeout(resolve, this.rateLimitDelay - timeSinceLastRequest)
      );
    }
    this.lastRequestTime = Date.now();
  }
}

// Export singleton instance
const llmService = new LLMService();
export default llmService;