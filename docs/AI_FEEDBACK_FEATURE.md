# AI Spending Feedback Feature

This document describes the AI Spending Feedback feature that provides personalized financial insights using Google Gemini AI.

## Overview

The AI Spending Feedback feature analyzes your receipt data to provide:
- **Spending Insights**: Patterns and trends in your spending behavior
- **Budget Analysis**: How well you're sticking to your budget goals  
- **Personal Recommendations**: Tailored advice to improve financial habits
- **Action Items**: Specific steps you can take to optimize spending

## How It Works

### 1. Month Selection
- Users select which month they want analyzed
- The system shows available months with receipt data
- Quick preview shows total spending, receipt count, and top category

### 2. Data Aggregation
- Collects all receipts for the selected month
- Retrieves budget data if available
- Calculates spending breakdowns by category and merchant
- Compares with previous month data for trends

### 3. AI Analysis
- Sends structured data to Google Gemini AI
- AI analyzes spending patterns and behavior
- Generates personalized insights and recommendations
- Returns actionable advice in structured format

### 4. Results Display
- Shows AI analysis in visually appealing format
- Categorizes feedback into insights, recommendations, and action items
- Includes budget analysis and trend information
- Allows sharing of insights via standard sharing options

## File Structure

```
📁 AI Feedback System
├── 🔧 services/
│   └── AIFeedbackService.ts          # Main AI service with Gemini integration
├── 🧮 utils/
│   └── MonthlyDataAggregator.ts      # Aggregates receipts and budget data
├── 📱 app/
│   ├── AIFeedbackScreen.tsx          # Main AI feedback screen
│   └── components/
│       ├── MonthPickerModal.tsx      # Month selection modal
│       └── AIFeedbackResults.tsx     # Results display component
└── 📋 types/
    └── receipt.ts                    # TypeScript interfaces (updated)
```

## Key Components

### AIFeedbackService
- Handles Google Gemini AI integration
- Formats data for AI analysis
- Parses AI responses into structured format
- Provides fallback mock responses when AI is unavailable

### MonthlyDataAggregator
- Collects receipts for specific months
- Calculates spending breakdowns and statistics
- Handles budget data integration
- Supports month-to-month comparisons

### MonthPickerModal
- Lists available months with receipt data
- Shows quick preview of spending data
- Loads data on-demand for performance
- Handles empty states gracefully

### AIFeedbackResults
- Displays AI analysis in structured sections
- Supports sharing of insights
- Shows budget utilization and alerts
- Allows requesting new analysis

## Setup Instructions

### 1. Get Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create a new API key
3. Copy the key for configuration

### 2. Configure Environment
Add these environment variables:

```bash
# For development (app.config.js extra field)
LLM_PROVIDER=gemini
LLM_API_KEY=your_gemini_api_key_here
LLM_MODEL=gemini-pro

# Or set in your deployment environment
GEMINI_API_KEY=your_gemini_api_key_here
```

### 3. Test the Feature
1. Ensure you have some receipt data in the app
2. Navigate to home screen and tap "AI Spending Feedback"
3. Select a month with receipt data
4. Review the AI-generated insights

## Usage

### From Home Screen
1. Tap the "AI Spending Feedback" button on the home page
2. Select which month you want analyzed
3. Wait for AI analysis to complete
4. Review insights, recommendations, and action items
5. Share insights if desired

### Features Available
- **Monthly Analysis**: Select any month with receipt data
- **Budget Integration**: Automatic budget vs actual comparison
- **Trend Analysis**: Compare with previous month if data available
- **Sharing**: Share AI insights via standard iOS/Android sharing
- **Retry Option**: Request new analysis for same month

## Mock Data Fallback

When Gemini AI is not configured or unavailable:
- System automatically uses mock analysis
- Provides basic insights based on spending data
- Maintains full functionality for testing
- Shows configuration hints in console

## Error Handling

The system gracefully handles:
- Missing API keys (falls back to mock data)
- Network connectivity issues
- Invalid AI responses
- Empty data sets
- API rate limits

## Performance Considerations

- **Lazy Loading**: Month previews load on-demand
- **Caching**: Recent analyses could be cached (future enhancement)
- **Timeout Handling**: Requests timeout after 30 seconds
- **Background Processing**: AI analysis runs asynchronously

## Privacy & Security

- All data processing happens in real-time
- No user data is stored by Google or third parties
- API keys are managed securely through environment config
- Users can see data being analyzed before sending to AI

## Future Enhancements

Potential improvements:
- **Analysis Caching**: Cache recent AI analyses
- **Custom Focus Areas**: Let users specify what they want analyzed
- **Goal Setting**: Integrate with user-defined financial goals
- **Notification Integration**: Send periodic spending insights
- **Multi-language Support**: Analyze in user's preferred language
- **Category Recommendations**: Suggest better expense categories

## Troubleshooting

### AI Not Working
1. Check environment variables are set correctly
2. Verify API key is valid and has credits
3. Check network connectivity
4. Review console logs for specific errors

### No Data Available
1. Ensure receipts have been scanned
2. Check receipt dates are within selected month
3. Verify data is not filtered by user permissions

### Performance Issues
1. Limit analysis to months with reasonable data amounts
2. Check network speed for API calls
3. Consider reducing analysis complexity for large datasets

## API Integration Details

### Gemini AI Model
- Uses `gemini-pro` model by default
- Supports structured JSON responses
- Handles context up to 32k tokens
- Optimized for analysis and reasoning tasks

### Request Format
The system sends structured spending data including:
- Monthly totals and transaction counts
- Category and merchant breakdowns
- Budget comparisons (if available)
- Previous month data for trends

### Response Parsing
AI responses are parsed into:
- Summary text
- Key insights array
- Recommendations array
- Action items array
- Budget analysis (when applicable)
- Trend information (when available)

This feature represents a significant enhancement to SlipScan's capabilities, providing users with actionable financial intelligence powered by advanced AI.