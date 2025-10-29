/**
 * Insights Service for Monthly Spending Analysis
 * 
 * This service handles step 5 of the receipt processing workflow:
 * Generate monthly insights and spending advice using LLM analysis
 */

import getConfig from '../config/environment';
import { CategorySpending, GeneratedInsight, ItemCategory, MerchantSpending, MonthlyInsights, ProcessedReceipt, ProcessingResult, SpendingTrend } from '../types/receipt';
import databaseService from './DatabaseService';

// LLM Response for insights generation
interface InsightsLLMResponse {
  insights: Array<{
    type: 'spending_pattern' | 'budget_alert' | 'savings_opportunity' | 'category_trend';
    title: string;
    description: string;
    actionable: boolean;
    priority: 'high' | 'medium' | 'low';
    category?: string;
    amount?: number;
  }>;
  recommendations: string[];
  summary: string;
}

/**
 * Insights Service for Monthly Spending Analysis
 * 
 * Generates comprehensive spending insights and recommendations using AI
 * This is step 5 of the receipt processing workflow.
 */
class InsightsService {
  private config = getConfig();
  private rateLimitDelay = 2000; // 2 seconds between requests for insights
  private lastRequestTime = 0;

  constructor() {
    if (this.config.app.enableLogging) {
      console.log('📊 InsightsService initialized');
    }
  }

  /**
   * Generate monthly insights for a specific month
   */
  async generateMonthlyInsights(month: string, userId?: string): Promise<ProcessingResult<MonthlyInsights>> {
    const startTime = Date.now();
    
    try {
      // Get receipts for the month
      const monthStart = `${month}-01T00:00:00.000Z`;
      const monthEnd = this.getMonthEnd(month);
      
      const receiptsResult = await databaseService.getReceipts({
        dateFrom: monthStart,
        dateTo: monthEnd,
      });

      if (!receiptsResult.success || !receiptsResult.data) {
        throw new Error('Failed to retrieve receipts for analysis');
      }

      const receipts = receiptsResult.data;
      
      if (receipts.length === 0) {
        return this.generateEmptyMonthInsights(month);
      }

      // Calculate basic analytics
      const analytics = this.calculateBasicAnalytics(receipts);
      
      // Generate spending trends
      const trends = await this.calculateSpendingTrends(month, receipts);
      
      // Generate AI insights and recommendations
      const aiInsights = await this.generateAIInsights(month, receipts, analytics);
      
      const insights: MonthlyInsights = {
        month,
        totalSpent: analytics.totalSpent,
        transactionCount: analytics.transactionCount,
        categoryBreakdown: analytics.categoryBreakdown,
        merchantBreakdown: analytics.merchantBreakdown,
        trends,
        insights: aiInsights.insights,
        recommendations: aiInsights.recommendations,
        generatedAt: new Date().toISOString(),
      };

      // Store insights in database
      await databaseService.storeInsights(insights);

      const processingTime = Date.now() - startTime;
      
      if (this.config.app.enableLogging) {
        console.log(`✅ Monthly insights generated for ${month} in ${processingTime}ms`);
        console.log(`📊 Analyzed ${receipts.length} receipts totaling $${analytics.totalSpent.toFixed(2)}`);
      }

      return {
        success: true,
        data: insights,
        processingTime,
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('❌ Failed to generate monthly insights:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        processingTime,
      };
    }
  }

  /**
   * Calculate basic spending analytics
   */
  private calculateBasicAnalytics(receipts: ProcessedReceipt[]): {
    totalSpent: number;
    transactionCount: number;
    categoryBreakdown: CategorySpending[];
    merchantBreakdown: MerchantSpending[];
  } {
    const totalSpent = receipts.reduce((sum, r) => sum + r.totals.total, 0);
    const transactionCount = receipts.length;

    // Category breakdown
    const categoryMap = new Map<ItemCategory, { amount: number; count: number }>();
    receipts.forEach(receipt => {
      const existing = categoryMap.get(receipt.overallCategory) || { amount: 0, count: 0 };
      categoryMap.set(receipt.overallCategory, {
        amount: existing.amount + receipt.totals.total,
        count: existing.count + 1,
      });
    });

    const categoryBreakdown: CategorySpending[] = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      amount: data.amount,
      transactionCount: data.count,
      percentage: (data.amount / totalSpent) * 100,
      averagePerTransaction: data.amount / data.count,
      trend: 'stable', // Will be calculated in trends analysis
    }));

    // Merchant breakdown
    const merchantMap = new Map<string, { amount: number; count: number; category: ItemCategory }>();
    receipts.forEach(receipt => {
      const merchantName = receipt.merchant.name;
      const existing = merchantMap.get(merchantName) || { amount: 0, count: 0, category: receipt.overallCategory };
      merchantMap.set(merchantName, {
        amount: existing.amount + receipt.totals.total,
        count: existing.count + 1,
        category: receipt.overallCategory,
      });
    });

    const merchantBreakdown: MerchantSpending[] = Array.from(merchantMap.entries())
      .map(([merchantName, data]) => ({
        merchantName,
        amount: data.amount,
        transactionCount: data.count,
        category: data.category,
        averageSpent: data.amount / data.count,
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10); // Top 10 merchants

    return {
      totalSpent,
      transactionCount,
      categoryBreakdown,
      merchantBreakdown,
    };
  }

  /**
   * Calculate spending trends by comparing with previous months
   */
  private async calculateSpendingTrends(currentMonth: string, currentReceipts: ProcessedReceipt[]): Promise<SpendingTrend[]> {
    try {
      // Get previous month for comparison
      const previousMonth = this.getPreviousMonth(currentMonth);
      const prevMonthStart = `${previousMonth}-01T00:00:00.000Z`;
      const prevMonthEnd = this.getMonthEnd(previousMonth);
      
      const prevReceiptsResult = await databaseService.getReceipts({
        dateFrom: prevMonthStart,
        dateTo: prevMonthEnd,
      });

      if (!prevReceiptsResult.success || !prevReceiptsResult.data) {
        // No previous data, mark all as stable
        const categories = [...new Set(currentReceipts.map(r => r.overallCategory))];
        return categories.map(category => ({
          category,
          direction: 'stable' as const,
          changePercent: 0,
          significance: 'low' as const,
        }));
      }

      const prevReceipts = prevReceiptsResult.data;
      const currentByCategory = this.groupByCategory(currentReceipts);
      const prevByCategory = this.groupByCategory(prevReceipts);

      const trends: SpendingTrend[] = [];
      
      // Calculate trends for each category
      for (const [category, currentAmount] of currentByCategory.entries()) {
        const prevAmount = prevByCategory.get(category) || 0;
        
        if (prevAmount === 0) {
          trends.push({
            category,
            direction: 'up',
            changePercent: 100,
            significance: 'high',
          });
        } else {
          const changePercent = ((currentAmount - prevAmount) / prevAmount) * 100;
          const absChange = Math.abs(changePercent);
          
          trends.push({
            category,
            direction: changePercent > 5 ? 'up' : changePercent < -5 ? 'down' : 'stable',
            changePercent: Math.round(changePercent),
            significance: absChange > 30 ? 'high' : absChange > 10 ? 'medium' : 'low',
          });
        }
      }

      return trends;

    } catch (error) {
      console.error('Failed to calculate spending trends:', error);
      return [];
    }
  }

  /**
   * Generate AI-powered insights and recommendations
   */
  private async generateAIInsights(
    month: string,
    receipts: ProcessedReceipt[],
    analytics: { totalSpent: number; transactionCount: number; categoryBreakdown: CategorySpending[]; merchantBreakdown: MerchantSpending[] }
  ): Promise<{ insights: GeneratedInsight[]; recommendations: string[] }> {
    try {
      // If LLM is not configured, return rule-based insights
      if (!this.config.llm.apiKey) {
        return this.generateRuleBasedInsights(analytics);
      }

      // Rate limiting
      await this.enforceRateLimit();

      // Prepare data for LLM
      const prompt = this.buildInsightsPrompt(month, receipts, analytics);
      
      // Call LLM
      const llmResponse = await this.callLLMForInsights(prompt);
      
      // Process response
      const insights: GeneratedInsight[] = llmResponse.insights.map(insight => ({
        type: insight.type,
        title: insight.title,
        description: insight.description,
        actionable: insight.actionable,
        priority: insight.priority,
        category: insight.category as ItemCategory,
        amount: insight.amount,
      }));

      return {
        insights,
        recommendations: llmResponse.recommendations,
      };

    } catch (error) {
      console.error('Failed to generate AI insights:', error);
      return this.generateRuleBasedInsights(analytics);
    }
  }

  /**
   * Build prompt for LLM insights generation
   */
  private buildInsightsPrompt(
    month: string,
    receipts: ProcessedReceipt[],
    analytics: { totalSpent: number; transactionCount: number; categoryBreakdown: CategorySpending[]; merchantBreakdown: MerchantSpending[] }
  ): string {
    const categoryText = analytics.categoryBreakdown
      .map(cat => `${cat.category}: $${cat.amount.toFixed(2)} (${cat.percentage.toFixed(1)}%, ${cat.transactionCount} transactions)`)
      .join('\n');

    const merchantText = analytics.merchantBreakdown
      .slice(0, 5) // Top 5 merchants
      .map(m => `${m.merchantName}: $${m.amount.toFixed(2)} (${m.transactionCount} visits, avg $${m.averageSpent.toFixed(2)})`)
      .join('\n');

    return `You are a financial advisor analyzing spending patterns for the month of ${month}. Generate insights and recommendations based on the following spending data:

SUMMARY:
- Total Spent: $${analytics.totalSpent.toFixed(2)}
- Number of Transactions: ${analytics.transactionCount}

SPENDING BY CATEGORY:
${categoryText}

TOP MERCHANTS:
${merchantText}

Please provide a JSON response with the following structure:
{
  "insights": [
    {
      "type": "spending_pattern" | "budget_alert" | "savings_opportunity" | "category_trend",
      "title": "Brief insight title",
      "description": "Detailed explanation of the insight",
      "actionable": true/false,
      "priority": "high" | "medium" | "low",
      "category": "category name if applicable",
      "amount": 123.45 // if applicable
    }
  ],
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2",
    "Specific actionable recommendation 3"
  ],
  "summary": "Brief overall summary of spending patterns"
}

Guidelines:
1. Focus on actionable insights that can help reduce spending or improve financial habits
2. Identify unusual spending patterns or opportunities for optimization
3. Be specific with amounts and percentages where relevant
4. Prioritize insights that could have the biggest financial impact
5. Keep recommendations practical and achievable
6. Consider seasonal factors and typical spending patterns

Respond only with valid JSON, no additional text.`;
  }

  /**
   * Call LLM for insights generation
   */
  private async callLLMForInsights(prompt: string): Promise<InsightsLLMResponse> {
    switch (this.config.llm.provider) {
      case 'claude':
        return this.callClaudeForInsights(prompt);
      case 'gemini':
        return this.callGeminiForInsights(prompt);
      case 'openai':
        return this.callOpenAIForInsights(prompt);
      default:
        throw new Error(`Unsupported LLM provider: ${this.config.llm.provider}`);
    }
  }

  /**
   * Call Claude for insights
   */
  private async callClaudeForInsights(prompt: string): Promise<InsightsLLMResponse> {
    const response = await fetch(`${this.config.llm.apiUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.config.llm.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.config.llm.model,
        max_tokens: 3000,
        temperature: 0.2,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      throw new Error(`Claude API request failed: ${response.status}`);
    }

    const result = await response.json();
    const content = result.content[0]?.text;
    
    if (!content) {
      throw new Error('No content received from Claude API');
    }

    return this.parseInsightsJSON(content);
  }

  /**
   * Call Gemini for insights (similar pattern to Claude)
   */
  private async callGeminiForInsights(prompt: string): Promise<InsightsLLMResponse> {
    // Similar implementation to Claude but for Gemini API
    const response = await fetch(`${this.config.llm.apiUrl}/models/${this.config.llm.model}:generateContent?key=${this.config.llm.apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 3000 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API request failed: ${response.status}`);
    }

    const result = await response.json();
    const content = result.candidates[0]?.content?.parts[0]?.text;
    
    if (!content) {
      throw new Error('No content received from Gemini API');
    }

    return this.parseInsightsJSON(content);
  }

  /**
   * Call OpenAI for insights (similar pattern)
   */
  private async callOpenAIForInsights(prompt: string): Promise<InsightsLLMResponse> {
    const response = await fetch(`${this.config.llm.apiUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.llm.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.llm.model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API request failed: ${response.status}`);
    }

    const result = await response.json();
    const content = result.choices[0]?.message?.content;
    
    if (!content) {
      throw new Error('No content received from OpenAI API');
    }

    return this.parseInsightsJSON(content);
  }

  /**
   * Parse insights JSON response
   */
  private parseInsightsJSON(content: string): InsightsLLMResponse {
    try {
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(cleanContent);
    } catch (error) {
      console.error('Failed to parse insights JSON:', error);
      throw new Error('Failed to parse LLM insights response');
    }
  }

  /**
   * Generate rule-based insights when LLM is not available
   */
  private generateRuleBasedInsights(analytics: { totalSpent: number; categoryBreakdown: CategorySpending[]; merchantBreakdown: MerchantSpending[] }): {
    insights: GeneratedInsight[];
    recommendations: string[];
  } {
    const insights: GeneratedInsight[] = [];
    const recommendations: string[] = [];

    // High spending category alert
    const topCategory = analytics.categoryBreakdown[0];
    if (topCategory && topCategory.percentage > 40) {
      insights.push({
        type: 'spending_pattern',
        title: `High ${topCategory.category} Spending`,
        description: `${topCategory.category} accounts for ${topCategory.percentage.toFixed(1)}% of your spending this month ($${topCategory.amount.toFixed(2)}).`,
        actionable: true,
        priority: 'medium',
        category: topCategory.category,
        amount: topCategory.amount,
      });
      
      recommendations.push(`Consider reviewing your ${topCategory.category} expenses to identify potential savings opportunities.`);
    }

    // Frequent merchant alert
    const topMerchant = analytics.merchantBreakdown[0];
    if (topMerchant && topMerchant.transactionCount >= 10) {
      insights.push({
        type: 'spending_pattern',
        title: `Frequent ${topMerchant.merchantName} Visits`,
        description: `You visited ${topMerchant.merchantName} ${topMerchant.transactionCount} times, spending $${topMerchant.amount.toFixed(2)} total.`,
        actionable: true,
        priority: 'low',
        amount: topMerchant.amount,
      });
      
      recommendations.push(`Consider bulk purchasing or meal planning to reduce frequent trips to ${topMerchant.merchantName}.`);
    }

    // General recommendations
    recommendations.push(
      'Track your spending weekly to stay aware of your patterns.',
      'Set category budgets to better control your expenses.',
      'Look for subscription services you might not be using.'
    );

    return { insights, recommendations };
  }

  /**
   * Helper methods
   */
  private async enforceRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.rateLimitDelay) {
      const waitTime = this.rateLimitDelay - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTime = Date.now();
  }

  private getMonthEnd(month: string): string {
    const [year, monthNum] = month.split('-').map(Number);
    const nextMonth = monthNum === 12 ? 1 : monthNum + 1;
    const nextYear = monthNum === 12 ? year + 1 : year;
    const lastDay = new Date(nextYear, nextMonth - 1, 0).getDate();
    return `${month}-${lastDay.toString().padStart(2, '0')}T23:59:59.999Z`;
  }

  private getPreviousMonth(month: string): string {
    const [year, monthNum] = month.split('-').map(Number);
    const prevMonth = monthNum === 1 ? 12 : monthNum - 1;
    const prevYear = monthNum === 1 ? year - 1 : year;
    return `${prevYear}-${prevMonth.toString().padStart(2, '0')}`;
  }

  private groupByCategory(receipts: ProcessedReceipt[]): Map<ItemCategory, number> {
    const categoryMap = new Map<ItemCategory, number>();
    
    receipts.forEach(receipt => {
      const existing = categoryMap.get(receipt.overallCategory) || 0;
      categoryMap.set(receipt.overallCategory, existing + receipt.totals.total);
    });
    
    return categoryMap;
  }

  private generateEmptyMonthInsights(month: string): ProcessingResult<MonthlyInsights> {
    return {
      success: true,
      data: {
        month,
        totalSpent: 0,
        transactionCount: 0,
        categoryBreakdown: [],
        merchantBreakdown: [],
        trends: [],
        insights: [{
          type: 'spending_pattern',
          title: 'No Spending Data',
          description: 'No receipts found for this month.',
          actionable: false,
          priority: 'low',
        }],
        recommendations: ['Start scanning receipts to track your spending!'],
        generatedAt: new Date().toISOString(),
      },
    };
  }
}

// Export singleton instance
const insightsService = new InsightsService();
export default insightsService;

// Export types for use in other modules
export type { CategorySpending, GeneratedInsight, MerchantSpending, MonthlyInsights, SpendingTrend };
