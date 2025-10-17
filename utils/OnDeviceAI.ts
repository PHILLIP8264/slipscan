

export interface OnDeviceReceiptData {
  merchant: string;
  total: string;
  date: string;
  items: OnDeviceReceiptItem[];
  rawText: string;
  confidence: number;
  parseMethod: "on-device-ai";
  category?: string;
  tax?: string;
  subtotal?: string;
}

export interface OnDeviceReceiptItem {
  name: string;
  price: string;
  quantity?: string;
  category?: string;
}

class OnDeviceAI {
  // Smart merchant detection patterns
  private merchantPatterns = [
    // Major retailers
    /\b(walmart|target|costco|kroger|safeway|publix|whole foods|trader joe)\b/i,
    // Restaurants
    /\b(mcdonalds|burger king|subway|starbucks|pizza hut|dominos|taco bell)\b/i,
    // Gas stations
    /\b(shell|exxon|bp|chevron|texaco|mobil|sunoco|marathon)\b/i,
    // Pharmacies
    /\b(cvs|walgreens|rite aid|pharmacy)\b/i,
    // General business patterns
    /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:store|shop|market|deli|cafe|restaurant|inc|llc|corp)\b/i,
  ];

  // Common receipt keywords for context
  private receiptKeywords = [
    "receipt",
    "invoice",
    "store",
    "purchase",
    "transaction",
    "total",
    "subtotal",
    "tax",
    "amount",
    "balance",
  ];

  // Item patterns - things that look like products
  private itemPatterns = [
    // Food items
    /\b(milk|bread|eggs|butter|cheese|chicken|beef|fish|rice|pasta|cereal|fruit|vegetable)\b/i,
    // Household
    /\b(soap|shampoo|detergent|tissue|paper|towel|cleaner)\b/i,
    // Generic product patterns
    /\b[A-Z][a-zA-Z\s]{2,30}\s+\$?[0-9]+\.[0-9]{2}\b/,
  ];

  async parseReceipt(rawText: string): Promise<OnDeviceReceiptData> {
    const startTime = Date.now();
    console.log(
      "🤖 ON-DEVICE AI PARSER: Starting intelligent receipt parsing..."
    );
    console.log(
      "📱 PARSING METHOD: On-Device AI (Local Pattern Matching + Heuristics)"
    );
    console.log(
      "🔒 PRIVACY: Data processing locally - never leaves your device"
    );
    console.log("📝 INPUT TEXT LENGTH:", rawText.length, "characters");

    const lines = this.preprocessText(rawText);
    console.log("📋 PREPROCESSED LINES:", lines.length);

    const merchant = this.extractMerchant(lines);
    const total = this.extractTotal(lines);
    const date = this.extractDate(lines);
    const items = this.extractItems(lines);
    const tax = this.extractTax(lines);
    const subtotal = this.extractSubtotal(lines);
    const category = this.predictCategory(lines);
    const confidence = this.calculateConfidence(lines);

    const processingTime = Date.now() - startTime;

    console.log("✅ ON-DEVICE AI RESULTS:");
    console.log("🏪 Merchant:", merchant);
    console.log("💰 Total:", total);
    console.log("📅 Date:", date);
    console.log("🛒 Items Found:", items.length);
    console.log("🏷️ Category:", category);
    console.log("🎯 Confidence:", (confidence * 100).toFixed(1) + "%");
    console.log("⚡ Processing Time:", processingTime + "ms");
    console.log("🤖 PARSER: On-Device AI (Local/Offline)");

    return {
      merchant,
      total,
      date,
      items,
      tax,
      subtotal,
      category,
      rawText,
      confidence,
      parseMethod: "on-device-ai",
    };
  }

  private preprocessText(text: string): string[] {
    // Smart text preprocessing
    return (
      text
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        // Remove common noise
        .filter((line) => !this.isNoiseLine(line))
        // Normalize spacing
        .map((line) => line.replace(/\s+/g, " "))
    );
  }

  private isNoiseLine(line: string): boolean {
    const noisePatterns = [
      /^[\*\-\=\s]+$/, // Lines with only symbols
      /^\d{10,}$/, // Long number sequences (barcodes)
      /^thank you/i,
      /^have a/i,
      /^visit us/i,
      /^www\./i,
      /^\d{1,3}\/\d{1,3}$/, // Page numbers
    ];

    return noisePatterns.some((pattern) => pattern.test(line));
  }

  private extractMerchant(lines: string[]): string {
    // Look for merchant in first few lines
    const candidateLines = lines.slice(0, 5);

    for (const line of candidateLines) {
      // Check against known merchant patterns
      for (const pattern of this.merchantPatterns) {
        const match = line.match(pattern);
        if (match) {
          return this.cleanMerchantName(line);
        }
      }

      // Check for business-like patterns
      if (this.looksLikeBusiness(line)) {
        return this.cleanMerchantName(line);
      }
    }

    // Fallback to first substantial line
    const firstLine = candidateLines.find(
      (line) => line.length > 3 && !/\$/.test(line) && !/\d{4}/.test(line)
    );

    return firstLine ? this.cleanMerchantName(firstLine) : "Unknown Merchant";
  }

  private looksLikeBusiness(line: string): boolean {
    // Business name heuristics
    const businessIndicators = [
      /\b(store|shop|market|deli|cafe|restaurant|inc|llc|corp|co\.)\b/i,
      /^[A-Z][A-Z\s&]{3,30}$/, // ALL CAPS business names
      /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}$/, // Title Case names
    ];

    return (
      businessIndicators.some((pattern) => pattern.test(line)) &&
      line.length >= 4 &&
      line.length <= 40 &&
      !line.includes("$") &&
      !/\d{4,}/.test(line)
    );
  }

  private cleanMerchantName(line: string): string {
    return line
      .replace(/[#*]+/g, "") // Remove symbols
      .replace(/\s+/g, " ") // Normalize spaces
      .trim()
      .toUpperCase();
  }

  private extractTotal(lines: string[]): string {
    // Enhanced total detection with context awareness
    const totalPatterns = [
      {
        pattern:
          /(?:total|amount due|balance|amount)\s*:?\s*\$?([0-9]+\.?[0-9]{0,2})/i,
        priority: 10,
      },
      { pattern: /(?:grand\s+)?total\s*\$?([0-9]+\.[0-9]{2})/i, priority: 9 },
      { pattern: /^total\s+([0-9]+\.[0-9]{2})$/i, priority: 8 },
      { pattern: /\btotal\b.*\$([0-9]+\.[0-9]{2})/i, priority: 7 },
    ];

    let bestMatch = { amount: "0.00", priority: 0 };

    for (const line of lines.slice(-10)) {
      // Look in last 10 lines
      for (const { pattern, priority } of totalPatterns) {
        const match = line.match(pattern);
        if (match && priority > bestMatch.priority) {
          const amount = parseFloat(match[1]);
          if (amount > 0 && amount < 10000) {
            // Reasonable range
            bestMatch = { amount: amount.toFixed(2), priority };
          }
        }
      }
    }

    // Fallback: find largest monetary amount
    if (bestMatch.priority === 0) {
      const amounts = this.extractAllAmounts(lines);
      const largest = Math.max(...amounts.filter((a) => a > 0 && a < 10000));
      if (largest > 0) {
        bestMatch.amount = largest.toFixed(2);
      }
    }

    return bestMatch.amount;
  }

  private extractAllAmounts(lines: string[]): number[] {
    const amounts: number[] = [];
    const amountPattern = /\$?([0-9]+\.[0-9]{2})\b/g;

    for (const line of lines) {
      let match;
      while ((match = amountPattern.exec(line)) !== null) {
        amounts.push(parseFloat(match[1]));
      }
    }

    return amounts;
  }

  private extractTax(lines: string[]): string {
    const taxPatterns = [
      /(?:tax|sales\s+tax)\s*:?\s*\$?([0-9]+\.[0-9]{2})/i,
      /\btax\b.*\$([0-9]+\.[0-9]{2})/i,
    ];

    for (const line of lines) {
      for (const pattern of taxPatterns) {
        const match = line.match(pattern);
        if (match) {
          return parseFloat(match[1]).toFixed(2);
        }
      }
    }

    return "0.00";
  }

  private extractSubtotal(lines: string[]): string {
    const subtotalPatterns = [
      /(?:subtotal|sub\s+total)\s*:?\s*\$?([0-9]+\.[0-9]{2})/i,
      /\bsubtotal\b.*\$([0-9]+\.[0-9]{2})/i,
    ];

    for (const line of lines) {
      for (const pattern of subtotalPatterns) {
        const match = line.match(pattern);
        if (match) {
          return parseFloat(match[1]).toFixed(2);
        }
      }
    }

    return "0.00";
  }

  private extractDate(lines: string[]): string {
    const datePatterns = [
      /\b(\d{1,2}\/\d{1,2}\/\d{2,4})\b/,
      /\b(\d{1,2}-\d{1,2}-\d{2,4})\b/,
      /\b(\d{4}-\d{1,2}-\d{1,2})\b/,
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+\d{1,2},?\s+\d{4}/i,
    ];

    for (const line of lines) {
      for (const pattern of datePatterns) {
        const match = line.match(pattern);
        if (match) {
          return this.normalizeDate(match[1] || match[0]);
        }
      }
    }

    return new Date().toLocaleDateString();
  }

  private normalizeDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString();
    } catch {
      return dateStr;
    }
  }

  private extractItems(lines: string[]): OnDeviceReceiptItem[] {
    const items: OnDeviceReceiptItem[] = [];

    for (const line of lines) {
      const item = this.parseItemLine(line);
      if (item) {
        items.push(item);
      }
    }

    // Smart filtering and deduplication
    return this.filterAndCleanItems(items);
  }

  private parseItemLine(line: string): OnDeviceReceiptItem | null {
    // Multiple item parsing patterns
    const itemPatterns = [
      // "ITEM NAME $5.99"
      /^([A-Za-z][A-Za-z0-9\s\/\-\.]{2,30})\s+\$?([0-9]+\.[0-9]{2})$/,
      // "ITEM NAME 5.99"
      /^([A-Za-z][A-Za-z0-9\s\/\-\.]{2,30})\s+([0-9]+\.[0-9]{2})$/,
      // "2 ITEM NAME $5.99"
      /^(\d+)\s+([A-Za-z][A-Za-z0-9\s\/\-\.]{2,30})\s+\$?([0-9]+\.[0-9]{2})$/,
      // "ITEM NAME QTY 2 $5.99"
      /^([A-Za-z][A-Za-z0-9\s\/\-\.]{2,30})\s+(?:qty|x)\s*(\d+)\s+\$?([0-9]+\.[0-9]{2})$/i,
    ];

    for (const pattern of itemPatterns) {
      const match = line.match(pattern);
      if (match) {
        const hasQuantity = match.length === 4;

        if (hasQuantity) {
          return {
            name: this.cleanItemName(match[2]),
            price: parseFloat(match[3]).toFixed(2),
            quantity: match[1],
            category: this.categorizeItem(match[2]),
          };
        } else {
          return {
            name: this.cleanItemName(match[1]),
            price: parseFloat(match[2]).toFixed(2),
            quantity: "1",
            category: this.categorizeItem(match[1]),
          };
        }
      }
    }

    return null;
  }

  private cleanItemName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[^A-Za-z0-9\s\-\/\.]/g, "") // Remove special chars
      .toUpperCase();
  }

  private categorizeItem(itemName: string): string {
    const categories = {
      Food: [
        "milk",
        "bread",
        "egg",
        "meat",
        "chicken",
        "beef",
        "fish",
        "fruit",
        "vegetable",
      ],
      Household: ["soap", "detergent", "tissue", "paper", "towel", "cleaner"],
      Health: ["medicine", "vitamin", "soap", "shampoo", "toothpaste"],
      Beverages: ["water", "soda", "juice", "coffee", "tea", "beer", "wine"],
      Snacks: ["chips", "candy", "cookie", "cracker", "nuts"],
    };

    const lowerName = itemName.toLowerCase();

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => lowerName.includes(keyword))) {
        return category;
      }
    }

    return "Other";
  }

  private filterAndCleanItems(
    items: OnDeviceReceiptItem[]
  ): OnDeviceReceiptItem[] {
    return items
      .filter((item) => this.isValidItem(item))
      .filter((item, index, arr) => {
        // Remove duplicates based on name similarity
        return !arr
          .slice(0, index)
          .some((existing) => this.itemsSimilar(item.name, existing.name));
      })
      .slice(0, 20); // Limit to reasonable number
  }

  private isValidItem(item: OnDeviceReceiptItem): boolean {
    const price = parseFloat(item.price);
    return (
      item.name.length >= 2 &&
      item.name.length <= 50 &&
      price > 0 &&
      price < 1000 &&
      !this.isReceiptMetadata(item.name)
    );
  }

  private isReceiptMetadata(name: string): boolean {
    const metadataPatterns = [
      /total|subtotal|tax|change|balance|amount/i,
      /receipt|invoice|#\d+|store|copy/i,
      /thank|welcome|visit/i,
    ];

    return metadataPatterns.some((pattern) => pattern.test(name));
  }

  private itemsSimilar(name1: string, name2: string): boolean {
    const similarity = this.calculateStringSimilarity(name1, name2);
    return similarity > 0.8;
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) return 1.0;

    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1)
      .fill(null)
      .map(() => Array(str1.length + 1).fill(null));

    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[str2.length][str1.length];
  }

  private predictCategory(lines: string[]): string {
    const text = lines.join(" ").toLowerCase();

    const categoryKeywords = {
      groceries: [
        "grocery",
        "market",
        "food",
        "supermarket",
        "walmart",
        "kroger",
        "safeway",
      ],
      restaurant: [
        "restaurant",
        "cafe",
        "diner",
        "grill",
        "pizza",
        "burger",
        "starbucks",
      ],
      gas: ["gas", "fuel", "shell", "exxon", "bp", "chevron", "station"],
      pharmacy: ["pharmacy", "cvs", "walgreens", "medicine", "prescription"],
      retail: ["store", "shop", "target", "mall", "clothing", "electronics"],
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some((keyword) => text.includes(keyword))) {
        return category;
      }
    }

    return "other";
  }

  private calculateConfidence(lines: string[]): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence based on receipt indicators
    const text = lines.join(" ").toLowerCase();

    // Has receipt-like keywords
    const receiptIndicators = this.receiptKeywords.filter((keyword) =>
      text.includes(keyword)
    ).length;
    confidence += Math.min(receiptIndicators * 0.1, 0.3);

    // Has monetary amounts
    const amounts = this.extractAllAmounts(lines);
    if (amounts.length > 0) confidence += 0.1;
    if (amounts.length > 2) confidence += 0.1;

    // Has date
    if (this.extractDate(lines) !== new Date().toLocaleDateString()) {
      confidence += 0.1;
    }

    // Has items
    const items = this.extractItems(lines);
    confidence += Math.min(items.length * 0.05, 0.2);

    return Math.min(confidence, 1.0);
  }
}

export default new OnDeviceAI();
