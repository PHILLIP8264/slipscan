/**
 * Refactored Google Cloud Vision API Service
 * 
 * This service handles step 1 of the receipt processing workflow:
 * Extract raw text from receipt images using Google Cloud Vision API
 */

import { getConfig } from '../config/environment';
import { BoundingBox, ProcessingResult, TextBlock, TextExtractionResult } from '../types/receipt';

interface VisionAPIResponse {
  responses: Array<{
    textAnnotations?: Array<{
      description: string;
      locale?: string;
      boundingPoly?: {
        vertices: Array<{ x: number; y: number }>;
      };
    }>;
    error?: {
      code: number;
      message: string;
    };
  }>;
}

interface ServiceAccountCredentials {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

// Custom error class for Vision API
class VisionError extends Error {
  constructor(message: string, public code?: number) {
    super(message);
    this.name = 'VisionError';
  }
}interface TextAnnotation {
  description: string;
  boundingPoly?: {
    vertices: Array<{ x?: number; y?: number }>;
  };
  locale?: string;
}

interface Page {
  width: number;
  height: number;
  blocks: Block[];
}

interface Block {
  boundingBox: {
    vertices: Array<{ x: number; y: number }>;
  };
  paragraphs: Paragraph[];
}

interface Paragraph {
  boundingBox: {
    vertices: Array<{ x: number; y: number }>;
  };
  words: Word[];
}

interface Word {
  boundingBox: {
    vertices: Array<{ x: number; y: number }>;
  };
  symbols: Symbol[];
}

interface Symbol {
  text: string;
  boundingBox: {
    vertices: Array<{ x: number; y: number }>;
  };
  confidence?: number;
}

/**
 * Google Cloud Vision Service for Text Extraction
 */
class GoogleVisionService {
  private config = getConfig();
  private rateLimitDelay = 1000; // 1 second between requests
  private lastRequestTime = 0;

  constructor() {
    if (this.config.app.enableLogging) {
      console.log('🔍 GoogleVisionService initialized');
    }
  }

  /**
   * Note: Service account authentication with JWT signing requires Node.js crypto APIs
   * that are not available in React Native. For production, use API keys or
   * implement server-side proxy for service account authentication.
   */

  /**
   * Extract text from receipt image using Google Cloud Vision API
   */
  async extractText(imageUri: string): Promise<ProcessingResult<TextExtractionResult>> {
    const startTime = Date.now();
    
    try {
      // Check if we should use mock data
      if (this.config.app.enableMockData) {
        return this.generateMockTextExtraction();
      }

      // Validate configuration - need API key for React Native
      if (!this.config.googleCloud.apiKey) {
        throw new Error('Google Cloud Vision API key not configured');
      }

      // Rate limiting
      await this.enforceRateLimit();

      // Convert image to base64
      const base64Image = await this.convertImageToBase64(imageUri);
      
      // Make API request
      const visionResponse = await this.callVisionAPI(base64Image);
      
      // Process response
      const textBlocks = this.extractTextBlocks(visionResponse);
      const rawText = this.extractFullText(visionResponse);
      
      if (!rawText) {
        throw new Error('No text detected in image');
      }

      const result: TextExtractionResult = {
        rawText,
        confidence: this.calculateOverallConfidence(textBlocks),
        language: this.detectLanguage(visionResponse),
        processingMethod: 'google-vision',
        textBlocks,
      };

      const processingTime = Date.now() - startTime;
      
      if (this.config.app.enableLogging) {
        console.log(`✅ Vision API text extraction completed in ${processingTime}ms`);
        console.log(`📊 Extracted ${rawText.length} characters with ${result.confidence.toFixed(2)} confidence`);
      }

      return {
        success: true,
        data: result,
        processingTime,
        confidence: result.confidence,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ Google Vision text extraction failed:', error);
      
      // Enhanced error logging for API issues
      if (error instanceof Error) {
        console.error('❌ Vision API Error details:', {
          name: error.name,
          message: error.message,
          hasApiKey: !!this.config.googleCloud.apiKey,
          apiKeyLength: this.config.googleCloud.apiKey?.length || 0,
          visionApiUrl: this.config.googleCloud.visionApiUrl
        });
      }
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      };
    }
  }

  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  private async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      // Use the legacy API directly since the warning suggests it's still available
      const { readAsStringAsync } = require('expo-file-system/legacy');
      const base64 = await readAsStringAsync(imageUri, {
        encoding: 'base64',
      });
      
      console.log('✅ Successfully converted image to base64 using legacy API');
      return base64;
    } catch (error) {
      console.error('Failed to convert image to base64 with legacy API:', error);
      
      // Try alternative approach using fetch for local files
      try {
        console.log('🔄 Trying fetch approach for base64 conversion...');
        const response = await fetch(imageUri);
        const blob = await response.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(blob)));
        console.log('✅ Successfully converted image to base64 using fetch');
        return base64;
      } catch (fetchError) {
        console.error('Fetch approach also failed:', fetchError);
        throw new Error('Failed to process image file');
      }
    }
  }

  private async callVisionAPI(base64Image: string): Promise<VisionAPIResponse> {
    // Note: Service account authentication requires server-side implementation in React Native
    // For now, we'll use API key authentication only
    if (!this.config.googleCloud.apiKey) {
      throw new Error('Google Cloud Vision API key not configured. Service account auth requires server-side proxy in React Native.');
    }

    const url = `${this.config.googleCloud.visionApiUrl}/images:annotate?key=${this.config.googleCloud.apiKey}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image,
          },
          features: [
            {
              type: 'TEXT_DETECTION',
              maxResults: 1,
            },
            {
              type: 'DOCUMENT_TEXT_DETECTION',
              maxResults: 1,
            },
          ],
          imageContext: {
            languageHints: ['en', 'es', 'fr'],
          },
        },
      ],
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Vision API request failed: ${response.status} ${errorText}`);
    }

    const result: VisionAPIResponse = await response.json();
    
    if (result.responses?.[0]?.error) {
      const error = result.responses[0].error;
      throw new Error(`Vision API error: ${error.message} (Code: ${error.code})`);
    }

    return result;
  }

  private extractFullText(response: VisionAPIResponse): string {
    const textAnnotations = response.responses?.[0]?.textAnnotations;
    if (!textAnnotations || textAnnotations.length === 0) {
      return '';
    }
    
    return textAnnotations[0].description || '';
  }

  private extractTextBlocks(response: VisionAPIResponse): TextBlock[] {
    const textAnnotations = response.responses?.[0]?.textAnnotations;
    if (!textAnnotations || textAnnotations.length <= 1) {
      return [];
    }
    
    return textAnnotations.slice(1).map(annotation => ({
      text: annotation.description,
      confidence: 0.9,
      boundingBox: this.convertBoundingPoly(annotation.boundingPoly),
    }));
  }

  private convertBoundingPoly(boundingPoly?: { vertices: Array<{ x?: number; y?: number }> }): BoundingBox | undefined {
    if (!boundingPoly?.vertices || boundingPoly.vertices.length < 4) {
      return undefined;
    }
    
    const vertices = boundingPoly.vertices;
    const xs = vertices.map(v => v.x || 0);
    const ys = vertices.map(v => v.y || 0);
    
    const left = Math.min(...xs);
    const top = Math.min(...ys);
    const right = Math.max(...xs);
    const bottom = Math.max(...ys);
    
    return {
      left,
      top,
      width: right - left,
      height: bottom - top,
    };
  }

  private calculateOverallConfidence(textBlocks: TextBlock[]): number {
    if (textBlocks.length === 0) {
      return 0.5;
    }
    
    const totalConfidence = textBlocks.reduce((sum, block) => sum + block.confidence, 0);
    return totalConfidence / textBlocks.length;
  }

  private detectLanguage(response: VisionAPIResponse): string {
    const textAnnotations = response.responses?.[0]?.textAnnotations;
    if (!textAnnotations || textAnnotations.length === 0) {
      return 'en';
    }
    
    return textAnnotations[0].locale || 'en';
  }

  private generateMockTextExtraction(): ProcessingResult<TextExtractionResult> {
    const mockTexts = [
      `GROCERY STORE
123 Main St
City, ST 12345
Tel: (555) 123-4567

Receipt #: 12345
Cashier: Jane
Register: 1

BANANAS           2.99
BREAD             3.49
MILK              4.99
EGGS              3.99

Subtotal:        15.46
Tax:              1.24
Total:           16.70

VISA ****1234
Amount:          16.70
Thank you!`,
      
      `Coffee Corner Café
456 Coffee St
Seattle, WA 98101

Order #: 789
Date: ${new Date().toLocaleDateString()}

Large Latte       5.50
Blueberry Muffin  4.25

Subtotal:         9.75
Tax:              0.78
Total:           10.53

Cash Payment
Change:           0.47
Thank you for visiting!`,
    ];

    const randomText = mockTexts[Math.floor(Math.random() * mockTexts.length)];
    
    return {
      success: true,
      data: {
        rawText: randomText,
        confidence: 0.95,
        language: 'en',
        processingMethod: 'google-vision',
        textBlocks: this.generateMockTextBlocks(randomText),
      },
      processingTime: 1500,
      confidence: 0.95,
    };
  }

  private generateMockTextBlocks(text: string): TextBlock[] {
    const lines = text.split('\n').filter(line => line.trim());
    
    return lines.map((line, index) => ({
      text: line.trim(),
      confidence: 0.9 + Math.random() * 0.1,
      boundingBox: {
        left: 10,
        top: index * 20,
        width: line.length * 8,
        height: 16,
      },
    }));
  }
}

// Export singleton instance
const googleVisionService = new GoogleVisionService();
export default googleVisionService;

// Export types for use in other modules
export type { BoundingBox, ProcessingResult, TextBlock, TextExtractionResult };
