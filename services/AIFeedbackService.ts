/**
 * AI Feedback Service
 * 
 * Integrates with Google Gemini AI to provide personalized spending 
 * analysis and financial advice based on monthly data
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { getConfig } from '../config/environment';
import { AIFeedbackRequest, AIFeedbackResponse } from '../types/receipt';
import MonthlyDataAggregator from '../utils/MonthlyDataAggregator';

class AIFeedbackService {
  private genAI: GoogleGenerativeAI | null = null;
  private model: any = null;

  constructor() {
    // Initialize Gemini AI using configuration
    try {
      const config = getConfig();
      
      if (config.llm.provider === 'gemini' && config.llm.apiKey) {
        this.genAI = new GoogleGenerativeAI(config.llm.apiKey);
        this.model = this.genAI.getGenerativeModel({ model: config.llm.model });
        console.log('✅ Gemini AI initialized successfully');
      } else {
        console.warn('⚠️ Gemini API key not configured. AI feedback will use mock responses.');
        console.info('💡 To enable real AI feedback:');
        console.info('1. Get a Gemini API key from Google AI Studio');
        console.info('2. Add GEMINI_API_KEY to your environment variables');
        console.info('3. Set LLM_PROVIDER=gemini in environment');
      }
    } catch (error) {
      console.error('Error initializing Gemini AI:', error);
    }
  }

  /**
   * Generate AI feedback for monthly spending data
   */
  async generateFeedback(request: AIFeedbackRequest): Promise<AIFeedbackResponse> {
    try {
      console.log(`🤖 Generating AI feedback for month: ${request.monthlyData.month}`);

      // If no AI model available, return mock response
      if (!this.model) {
        return this.generateMockFeedback(request);
      }

      const prompt = this.buildAnalysisPrompt(request);
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const analysisText = response.text();

      // Parse AI response into structured format
      const parsedResponse = this.parseAIResponse(analysisText);

      console.log('✅ AI feedback generated successfully');
      
      return parsedResponse;

    } catch (error) {
      console.error('Error generating AI feedback:', error);
      
      // Fallback to mock response on error
      return this.generateMockFeedback(request);
    }
  }

  /**
   * Build comprehensive prompt for AI analysis
   */
  private buildAnalysisPrompt(request: AIFeedbackRequest): string {
    const { monthlyData, previousMonthData } = request;
    
    let prompt = `
You are a financial advisor AI analyzing spending patterns. Provide helpful, actionable advice.

SPENDING DATA FOR ${monthlyData.month}:
- Total Spent: R${monthlyData.totalSpent.toFixed(2)}
- Total Transactions: ${monthlyData.totalTransactions}
- Average per Transaction: R${monthlyData.averageTransactionAmount.toFixed(2)}

CATEGORY BREAKDOWN:
${Object.entries(monthlyData.categoryBreakdown)
  .map(([category, amount]) => `- ${category}: R${(amount as number).toFixed(2)}`)
  .join('\n')}

TOP MERCHANTS:
${Object.entries(monthlyData.merchantBreakdown)
  .sort(([,a], [,b]) => (b as number) - (a as number))
  .slice(0, 5)
  .map(([merchant, amount]) => `- ${merchant}: R${(amount as number).toFixed(2)}`)
  .join('\n')}`;

    // Add budget comparison if available
    if (monthlyData.budgetData) {
      const budgetTotal = monthlyData.budgetData.categoryBudgets.reduce((sum, categoryBudget) => sum + categoryBudget.budgetAmount, 0);
      const overUnder = monthlyData.totalSpent - budgetTotal;
      
      prompt += `
BUDGET COMPARISON:
- Budget Total: R${budgetTotal.toFixed(2)}
- Actual Spending: R${monthlyData.totalSpent.toFixed(2)}
- ${overUnder >= 0 ? 'Over Budget' : 'Under Budget'}: R${Math.abs(overUnder).toFixed(2)}

BUDGET CATEGORIES:
${monthlyData.budgetData.categoryBudgets
  .map((categoryBudget) => {
    const actualAmount = monthlyData.categoryBreakdown[categoryBudget.categoryName] || 0;
    const difference = actualAmount - categoryBudget.budgetAmount;
    return `- ${categoryBudget.categoryName}: Budget R${categoryBudget.budgetAmount.toFixed(2)}, Spent R${actualAmount.toFixed(2)} (${difference >= 0 ? '+' : ''}${difference.toFixed(2)})`;
  })
  .join('\n')}`;
    }

    // Add previous month comparison if available
    if (previousMonthData) {
      const spendingChange = monthlyData.totalSpent - previousMonthData.totalSpent;
      const changePercent = previousMonthData.totalSpent > 0 
        ? ((spendingChange / previousMonthData.totalSpent) * 100) 
        : 0;

      prompt += `
MONTH-TO-MONTH COMPARISON:
- Previous Month Spending: R${previousMonthData.totalSpent.toFixed(2)}
- Current Month Spending: R${monthlyData.totalSpent.toFixed(2)}
- Change: ${spendingChange >= 0 ? '+' : ''}R${spendingChange.toFixed(2)} (${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(1)}%)
`;
    }

    prompt += `
Please provide analysis in this EXACT JSON format (no additional text outside JSON):
{
  "summary": "Brief 2-3 sentence summary of spending patterns",
  "insights": [
    "Key insight 1 about spending behavior",
    "Key insight 2 about category patterns"
  ],
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2"
  ],
  "actionItems": [
    "Action item 1",
    "Action item 2"
  ]
}

Make recommendations practical and specific to the spending data shown.`;

    return prompt;
  }

  /**
   * Parse AI response into structured format
   */
  private parseAIResponse(aiText: string): AIFeedbackResponse {
    try {
      // Extract JSON from AI response
      const jsonMatch = aiText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        return {
          success: true,
          feedback: {
            summary: parsed.summary || 'Analysis completed for your monthly spending.',
            insights: parsed.insights || ['Spending data processed successfully'],
            recommendations: parsed.recommendations || ['Continue tracking your expenses'],
            actionItems: parsed.actionItems || ['Review your spending patterns']
          },
          processingTime: Date.now()
        };
      }
    } catch (parseError) {
      console.warn('Could not parse AI JSON response, using fallback');
    }

    // Fallback parsing if JSON extraction fails
    return {
      success: false,
      error: 'Could not parse AI response',
      processingTime: Date.now()
    };
  }

  /**
   * Generate mock feedback when AI is unavailable
   */
  private generateMockFeedback(request: AIFeedbackRequest): AIFeedbackResponse {
    const { monthlyData } = request;
    
    // Calculate some basic insights
    const topCategory = Object.entries(monthlyData.categoryBreakdown)
      .sort(([,a], [,b]) => (b as number) - (a as number))[0];
    
    const topCategoryName = topCategory ? topCategory[0] : 'N/A';
    const topCategoryAmount = topCategory ? topCategory[1] as number : 0;
    const topCategoryPercent = monthlyData.totalSpent > 0 
      ? ((topCategoryAmount / monthlyData.totalSpent) * 100).toFixed(1)
      : '0';

    let budgetAnalysis = undefined;
    if (monthlyData.budgetData) {
      const budgetTotal = monthlyData.budgetData.categoryBudgets.reduce((sum, categoryBudget) => sum + categoryBudget.budgetAmount, 0);
      const utilizationPercent = budgetTotal > 0 ? (monthlyData.totalSpent / budgetTotal) * 100 : 0;
      
      const overspentCategories: string[] = [];
      const underspentCategories: string[] = [];
      
      monthlyData.budgetData.categoryBudgets.forEach(categoryBudget => {
        const actualAmount = monthlyData.categoryBreakdown[categoryBudget.categoryName] || 0;
        if (actualAmount > categoryBudget.budgetAmount) {
          overspentCategories.push(categoryBudget.categoryName);
        } else if (actualAmount < categoryBudget.budgetAmount * 0.8) {
          underspentCategories.push(categoryBudget.categoryName);
        }
      });
      
      budgetAnalysis = {
        overspentCategories,
        underspentCategories,
        budgetUtilization: Math.round(utilizationPercent)
      };
    }

    let trends = undefined;
    if (request.previousMonthData) {
      const spendingChange = monthlyData.totalSpent - request.previousMonthData.totalSpent;
      trends = {
        comparedToPrevious: `Your spending ${spendingChange >= 0 ? 'increased' : 'decreased'} by R${Math.abs(spendingChange).toFixed(2)} compared to last month`
      };
    }

    return {
      success: true,
      feedback: {
        summary: `You spent R${monthlyData.totalSpent.toFixed(2)} across ${monthlyData.totalTransactions} transactions this month. Your highest spending category was ${topCategoryName} at ${topCategoryPercent}% of total spending.`,
        insights: [
          `${topCategoryName} accounts for ${topCategoryPercent}% of your monthly spending`,
          `Your average transaction amount is R${monthlyData.averageTransactionAmount.toFixed(2)}`
        ],
        recommendations: [
          `Monitor your ${topCategoryName} spending more closely`,
          'Set up budget alerts for your top spending categories'
        ],
        budgetAnalysis,
        trends,
        actionItems: [
          'Review transactions weekly to stay on track',
          'Consider setting spending limits for top categories'
        ]
      },
      processingTime: Date.now()
    };
  }

  /**
   * Quick analysis for month selection (lighter processing)
   */
  async getQuickAnalysis(monthKey: string): Promise<{
    summary: string;
    totalSpent: number;
    transactionCount: number;
    topCategory: string;
  }> {
    try {
      const summary = await MonthlyDataAggregator.getMonthSummary(monthKey);
      
      return {
        summary: `${summary.totalReceipts} receipts totaling R${summary.totalSpent.toFixed(2)}`,
        totalSpent: summary.totalSpent,
        transactionCount: summary.totalReceipts,
        topCategory: summary.topCategory
      };
    } catch (error) {
      console.error('Error getting quick analysis:', error);
      return {
        summary: 'Analysis unavailable',
        totalSpent: 0,
        transactionCount: 0,
        topCategory: 'Unknown'
      };
    }
  }
}

export default new AIFeedbackService();