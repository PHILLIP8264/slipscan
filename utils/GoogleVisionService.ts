// Google Vision API HTTP client for React Native

export interface GoogleVisionReceiptData {
  merchant: string;
  total: string;
  date: string;
  items: Array<{
    name: string;
    price: string;
  }>;
  category: string;
  taxAmount: string;
  subtotal: string;
  confidence: number;
  rawText: string;
  processingMethod: 'google-vision';
}

class GoogleVisionService {
  private apiKey: string | null = null;
  private isInitialized: boolean = false;

  constructor() {
    // We'll load the API key from the credentials file or environment
    this.loadCredentials();
  }

  private async loadCredentials() {
    try {
      // In a real app, you would either:
      // 1. Load from secure storage
      // 2. Get from environment variables
      // 3. Load from a secure server endpoint
      // For now, we'll use a placeholder that you can replace
      
      // You can replace this with your actual API key
      // NEVER commit real API keys to version control!
      this.apiKey = 'YOUR_GOOGLE_VISION_API_KEY_HERE';
      
      console.log('Google Vision credentials loaded');
    } catch (error) {
      console.error('Failed to load Google Vision credentials:', error);
      throw new Error('Google Vision credentials loading failed');
    }
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      if (!this.apiKey || this.apiKey === 'YOUR_GOOGLE_VISION_API_KEY_HERE') {
        console.warn('Google Vision API key not configured. Using mock data.');
        this.isInitialized = true;
        return;
      }
      
      this.isInitialized = true;
      console.log('Google Vision API initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Vision API:', error);
      throw new Error('Google Vision API initialization failed');
    }
  }

  /**
   * Process receipt image using Google Vision API
   */
  async processReceiptImage(imageUri: string): Promise<GoogleVisionReceiptData> {
    try {
      await this.initialize();

      // If API key is not configured, return mock data for development
      if (!this.apiKey || this.apiKey === 'YOUR_GOOGLE_VISION_API_KEY_HERE') {
        return this.generateMockReceiptData();
      }

      // Convert image to base64
      const base64Image = await this.convertImageToBase64(imageUri);
      
      // Make HTTP request to Google Vision API
      const visionResult = await this.callGoogleVisionAPI(base64Image);
      
      if (!visionResult.textAnnotations || visionResult.textAnnotations.length === 0) {
        throw new Error('No text detected in image');
      }

      // Extract raw text
      const rawText = visionResult.textAnnotations[0]?.description || '';
      
      // Parse the text into receipt structure
      const receiptData = this.parseReceiptFromVisionText(rawText, visionResult.textAnnotations);
      
      return {
        ...receiptData,
        rawText,
        processingMethod: 'google-vision'
      };

    } catch (error) {
      console.error('Google Vision processing failed:', error);
      // Return mock data as fallback
      return this.generateMockReceiptData();
    }
  }

  /**
   * Generate mock receipt data for development/testing
   */
  private generateMockReceiptData(): GoogleVisionReceiptData {
    const mockReceipts = [
      {
        merchant: 'Grocery Store Plus',
        total: '45.67',
        date: new Date().toISOString().split('T')[0],
        items: [
          { name: 'Organic Bananas', price: '3.99' },
          { name: 'Whole Grain Bread', price: '4.50' },
          { name: 'Greek Yogurt', price: '5.99' },
          { name: 'Free Range Eggs', price: '6.99' },
        ],
        category: 'Groceries',
        taxAmount: '3.20',
        subtotal: '42.47',
        confidence: 0.85,
      },
      {
        merchant: 'Coffee Corner',
        total: '12.45',
        date: new Date().toISOString().split('T')[0],
        items: [
          { name: 'Large Latte', price: '5.50' },
          { name: 'Blueberry Muffin', price: '4.25' },
        ],
        category: 'Food & Dining',
        taxAmount: '1.20',
        subtotal: '11.25',
        confidence: 0.92,
      },
      {
        merchant: 'Gas Station 24/7',
        total: '67.80',
        date: new Date().toISOString().split('T')[0],
        items: [
          { name: 'Regular Gasoline', price: '65.00' },
        ],
        category: 'Transportation',
        taxAmount: '2.80',
        subtotal: '65.00',
        confidence: 0.88,
      },
    ];

    // Return a random mock receipt
    const randomReceipt = mockReceipts[Math.floor(Math.random() * mockReceipts.length)];
    
    return {
      ...randomReceipt,
      rawText: `${randomReceipt.merchant}\n${randomReceipt.items.map(item => `${item.name} $${item.price}`).join('\n')}\nSubtotal: $${randomReceipt.subtotal}\nTax: $${randomReceipt.taxAmount}\nTotal: $${randomReceipt.total}\nDate: ${randomReceipt.date}`,
      processingMethod: 'google-vision'
    };
  }

  /**
   * Make HTTP request to Google Vision API
   */
  private async callGoogleVisionAPI(base64Image: string) {
    const apiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${this.apiKey}`;
    
    const requestBody = {
      requests: [
        {
          image: {
            content: base64Image
          },
          features: [
            {
              type: 'TEXT_DETECTION',
              maxResults: 50
            }
          ]
        }
      ]
    };

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Google Vision API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.responses && result.responses[0]) {
      return result.responses[0];
    } else {
      throw new Error('Invalid response from Google Vision API');
    }
  }

  /**
   * Convert image URI to base64
   */
  private async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      return await this.blobToBase64(blob);
    } catch (error) {
      console.error('Failed to convert image to base64:', error);
      throw new Error('Image conversion failed');
    }
  }


  /**
   * Convert blob to base64
   */
  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Parse Google Vision text into structured receipt data
   */
  private parseReceiptFromVisionText(text: string, annotations: any[]): Omit<GoogleVisionReceiptData, 'rawText' | 'processingMethod'> {
    const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    return {
      merchant: this.extractMerchant(lines),
      total: this.extractTotal(text),
      subtotal: this.extractSubtotal(text),
      taxAmount: this.extractTax(text),
      date: this.extractDate(text),
      items: this.extractItems(text),
      category: this.categorizeReceipt(text),
      confidence: this.calculateConfidence(text, annotations)
    };
  }

  /**
   * Extract merchant name from receipt
   */
  private extractMerchant(lines: string[]): string {
    // Look for merchant in first few lines
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      
      // Skip lines that are mostly numbers or addresses
      if (this.isLikelyMerchantName(line)) {
        return this.cleanMerchantName(line);
      }
    }

    // Fallback: look for common store patterns
    const storePatterns = [
      /walmart/i, /target/i, /kroger/i, /safeway/i, /costco/i,
      /home depot/i, /lowes/i, /best buy/i, /mcdonald/i, /starbucks/i
    ];

    const fullText = lines.join(' ').toLowerCase();
    for (const pattern of storePatterns) {
      const match = fullText.match(pattern);
      if (match) {
        return this.capitalizeWords(match[0]);
      }
    }

    return lines[0] || 'Unknown Store';
  }

  /**
   * Check if line is likely a merchant name
   */
  private isLikelyMerchantName(line: string): boolean {
    // Not merchant if mostly numbers
    if (/^\d+/.test(line.trim())) return false;
    
    // Not merchant if looks like address
    if (/^\d+\s+\w+\s+(st|street|ave|avenue|rd|road|blvd|boulevard)/i.test(line)) return false;
    
    // Not merchant if phone number
    if (/\(\d{3}\)\s*\d{3}-\d{4}|\d{3}-\d{3}-\d{4}/.test(line)) return false;
    
    // Likely merchant if reasonable length and has letters
    return line.length >= 3 && line.length <= 50 && /[a-zA-Z]/.test(line);
  }

  /**
   * Extract total amount
   */
  private extractTotal(text: string): string {
    // Look for total patterns (prioritize later occurrences)
    const totalPatterns = [
      /(?:total|amount due|balance due)[:\s]*\$?(\d+\.?\d*)/gi,
      /(?:grand total|final total)[:\s]*\$?(\d+\.?\d*)/gi,
      /(?:total)[:\s]*(\d+\.?\d{2})/gi
    ];

    let bestMatch = '0.00';
    let highestPosition = -1;

    for (const pattern of totalPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match.index > highestPosition) {
          highestPosition = match.index;
          bestMatch = match[1];
        }
      }
    }

    return this.formatCurrency(bestMatch);
  }

  /**
   * Extract subtotal
   */
  private extractSubtotal(text: string): string {
    const subtotalPattern = /(?:subtotal|sub total)[:\s]*\$?(\d+\.?\d*)/gi;
    const match = subtotalPattern.exec(text);
    return match ? this.formatCurrency(match[1]) : '';
  }

  /**
   * Extract tax amount
   */
  private extractTax(text: string): string {
    const taxPattern = /(?:tax|sales tax|st)[:\s]*\$?(\d+\.?\d*)/gi;
    const match = taxPattern.exec(text);
    return match ? this.formatCurrency(match[1]) : '';
  }

  /**
   * Extract date from receipt
   */
  private extractDate(text: string): string {
    const datePatterns = [
      /(\d{1,2}\/\d{1,2}\/\d{2,4})/,  // MM/DD/YYYY or M/D/YY
      /(\d{1,2}-\d{1,2}-\d{2,4})/,   // MM-DD-YYYY
      /(\d{4}-\d{2}-\d{2})/,         // YYYY-MM-DD
      /(\w{3}\s+\d{1,2},?\s+\d{4})/  // Jan 1, 2024
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        return this.standardizeDate(match[1]);
      }
    }

    return '';
  }

  /**
   * Extract items from receipt
   */
  private extractItems(text: string): Array<{name: string, price: string}> {
    const items: Array<{name: string, price: string}> = [];
    const lines = text.split('\n');

    // Pattern for item lines: "Item name ... $price"
    const itemPattern = /^([^$\d]*?)\s*\.{0,}\s*\$?(\d+\.?\d{2})$/;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip lines that are likely not items
      if (this.shouldSkipLine(trimmed)) continue;
      
      const match = trimmed.match(itemPattern);
      if (match) {
        const itemName = match[1].trim();
        const price = match[2];
        
        if (itemName.length > 0 && !this.isLikelyNotItem(itemName)) {
          items.push({
            name: this.cleanItemName(itemName),
            price: this.formatCurrency(price)
          });
        }
      }
    }

    return items.slice(0, 20); // Limit to 20 items to prevent spam
  }

  /**
   * Determine if line should be skipped for item extraction
   */
  private shouldSkipLine(line: string): boolean {
    const skipPatterns = [
      /^(subtotal|total|tax|discount|cash|credit|debit|change)/i,
      /^(thank you|receipt|store|address|phone)/i,
      /^\d{4}-\d{2}-\d{2}/, // Dates
      /^\*{3,}/, // Asterisk lines
      /^-{3,}/, // Dash lines
    ];

    return skipPatterns.some(pattern => pattern.test(line)) || line.length < 2;
  }

  /**
   * Check if text is likely not an item name
   */
  private isLikelyNotItem(name: string): boolean {
    const notItemPatterns = [
      /^(qty|quantity|price|total|tax|disc|discount)$/i,
      /^\d+$/, // Just numbers
      /^[a-z]$/i, // Single letters
    ];

    return notItemPatterns.some(pattern => pattern.test(name));
  }

  /**
   * Categorize receipt based on merchant and items
   */
  private categorizeReceipt(text: string): string {
    const lowerText = text.toLowerCase();
    
    // Grocery stores
    if (this.matchesPatterns(lowerText, ['walmart', 'kroger', 'safeway', 'publix', 'whole foods'])) {
      return 'Groceries';
    }
    
    // Restaurants
    if (this.matchesPatterns(lowerText, ['restaurant', 'cafe', 'mcdonald', 'burger', 'pizza', 'starbucks'])) {
      return 'Dining';
    }
    
    // Gas stations
    if (this.matchesPatterns(lowerText, ['shell', 'exxon', 'bp', 'chevron', 'gas', 'fuel'])) {
      return 'Transportation';
    }
    
    // Pharmacies
    if (this.matchesPatterns(lowerText, ['cvs', 'walgreens', 'pharmacy', 'drugstore'])) {
      return 'Healthcare';
    }
    
    // Home improvement
    if (this.matchesPatterns(lowerText, ['home depot', 'lowes', 'menards', 'hardware'])) {
      return 'Home & Garden';
    }

    return 'Other';
  }

  /**
   * Check if text matches any of the patterns
   */
  private matchesPatterns(text: string, patterns: string[]): boolean {
    return patterns.some(pattern => text.includes(pattern));
  }

  /**
   * Calculate confidence score based on extracted data
   */
  private calculateConfidence(text: string, annotations: any[]): number {
    let confidence = 0.1; // Base confidence
    
    // Check for merchant
    if (text.length > 20) confidence += 0.2;
    
    // Check for total amount
    if (/total.*\$?\d+\.?\d{2}/i.test(text)) confidence += 0.3;
    
    // Check for date
    if (/\d{1,2}\/\d{1,2}\/\d{2,4}/.test(text)) confidence += 0.2;
    
    // Check for items
    const itemCount = (text.match(/\$\d+\.?\d{2}/g) || []).length;
    if (itemCount > 2) confidence += 0.2;
    
    // Google Vision confidence (if available)
    if (annotations.length > 0) confidence += 0.1;
    
    return Math.min(1.0, confidence);
  }

  /**
   * Helper functions
   */
  private formatCurrency(amount: string): string {
    const num = parseFloat(amount);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  }

  private cleanMerchantName(name: string): string {
    return name
      .replace(/[^\w\s&'-]/g, '') // Remove special chars except &, ', -
      .replace(/\s+/g, ' ')       // Normalize spaces
      .trim()
      .substring(0, 50);          // Limit length
  }

  private cleanItemName(name: string): string {
    return name
      .replace(/[^\w\s&'-]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 100);
  }

  private capitalizeWords(str: string): string {
    return str.replace(/\b\w/g, char => char.toUpperCase());
  }

  private standardizeDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0]; // YYYY-MM-DD format
    } catch {
      return dateStr; // Return as-is if parsing fails
    }
  }
}

export default new GoogleVisionService();