# 📱 SlipScan - The Ledger

**AI-Powered Receipt Management & Budget Tracking App**

SlipScan is a comprehensive mobile application built with React Native and Expo that transforms receipt management and budget tracking through advanced AI technology. Scan receipts, automatically categorize expenses, track budgets, and get intelligent spending insights.

## ✅ 2. README Documentation (required)

### 🌟 Features

- **📸 Smart Receipt Scanning**: Advanced OCR and AI-powered receipt text extraction
- **🤖 Intelligent Categorization**: Automatic expense categorization using machine learning
- **💰 Budget Management**: Create and track monthly budgets across multiple categories
- **📊 Spending Analytics**: Visual charts and insights into spending patterns
- **🔍 Advanced Search**: Filter and search receipts by merchant, category, amount, and date
- **🔐 Biometric Security**: Secure app access with fingerprint/face authentication
- **🌙 Modern UI**: Clean, intuitive interface with dark theme support
- **📈 AI Feedback**: Get personalized spending recommendations and insights
- **📱 Cross-Platform**: Available on both iOS and Android

### 🎬 Demo & Screenshots

#### 📹 Demo Video
<!-- Add your demo video here -->
> **Demo Video Coming Soon!** 
> 
> Watch SlipScan in action - from scanning receipts to managing budgets and getting AI insights.

*To add your demo video:*
1. Upload your video to YouTube, Vimeo, or GitHub
2. Replace the placeholder above with: `[![Demo Video](video-thumbnail.png)](video-url)`
3. Or embed directly if using a platform that supports it

#### 📱 App Screenshots

<!-- Add your screenshots here -->
| Home Dashboard | Receipt Scanning | Budget Management | Search & Filter |
|---|---|---|---|
| ![Home](screenshots/home.png) | ![Scan](screenshots/scan.png) | ![Budget](screenshots/budget.png) | ![Search](screenshots/search.png) |
| *Main dashboard with spending overview and quick actions* | *AI-powered receipt scanning with automatic text extraction* | *Monthly budget tracking with category breakdowns* | *Advanced search and filtering capabilities* |

| AI Insights | Receipt Details | Budget Creation | Settings |
|---|---|---|---|
| ![AI](screenshots/ai-insights.png) | ![Details](screenshots/receipt-details.png) | ![Create](screenshots/create-budget.png) | ![Settings](screenshots/settings.png) |
| *Personalized spending analysis and recommendations* | *Detailed receipt view with editing capabilities* | *Easy budget setup with category selection* | *App settings and data management* |

> **📸 To add your screenshots:**
> 1. Create a `screenshots/` folder in your repository
> 2. Add your app screenshots (recommended size: 1080x1920px for mobile)
> 3. Update the image paths above with your actual screenshot filenames
> 4. Consider using tools like [Figma](https://figma.com) or [App Mockup](https://app-mockup.com) to create professional mockups

### 🛠️ Technology Stack

- **Framework**: React Native with Expo
- **Language**: TypeScript
- **Navigation**: Expo Router (file-based routing)
- **Database**: AsyncStorage (NoSQL local storage)
- **OCR**: Google ML Kit Document Scanner
- **AI/LLM**: Google Gemini API for intelligent processing
- **Charts**: Custom chart components
- **Authentication**: Local biometric authentication
- **State Management**: React Hooks + Context API
- **Styling**: StyleSheet with custom design system

### 📋 Prerequisites

Before running this project, make sure you have:

- **Node.js** (v16 or higher)
- **npm** or **yarn**
- **Expo CLI** (`npm install -g @expo/cli`)
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)
- **Physical device** or emulator/simulator

### 🚀 Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/PHILLIP8264/slipscan.git
   cd slipscan
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   
   Create a `.env` file in the root directory:
   ```env
   GOOGLE_GEMINI_API_KEY=your_gemini_api_key_here
   GOOGLE_CLOUD_PROJECT_ID=your_project_id
   ```

4. **Google Cloud Setup**
   
   Place your `google-service-account.json` file in the root directory for Google Vision API access.

5. **Start the development server**
   ```bash
   npx expo start
   ```

### 📱 Running the App

#### Android
```bash
# Run on Android device/emulator
npx expo run:android
```

#### iOS
```bash
# Run on iOS device/simulator (macOS only)
npx expo run:ios
```

#### Development Build
For full feature access (including native modules), use a development build:
```bash
# Create development build
npx expo install --fix
eas build --profile development --platform android
```

### 📁 Project Structure

```
slipscan/
├── app/                          # Main application screens
│   ├── tabs/                     # Tab-based navigation screens
│   │   ├── index.tsx            # Home/Dashboard screen
│   │   ├── budget.tsx           # Budget management
│   │   └── search.tsx           # Receipt search & filtering
│   ├── components/              # Reusable UI components
│   ├── contexts/                # React Context providers
│   └── hiddenpages/             # Authentication & settings
├── assets/                       # Static assets & UI components
│   ├── components/              # Feature-specific components
│   │   ├── budget/             # Budget-related components
│   │   ├── search/             # Search-related components
│   │   └── homeui/             # Dashboard components
│   └── images/                  # App icons & images
├── services/                     # Business logic & API services
│   ├── AIFeedbackService.ts     # AI-powered insights
│   ├── ReceiptProcessingService.ts # Receipt processing pipeline
│   └── DatabaseService.ts       # Data management
├── utils/                        # Utility functions & helpers
│   ├── CRUD/                    # Database operations
│   ├── DocumentScanner.ts       # OCR & scanning logic
│   └── localdb.ts              # Local database management
├── types/                        # TypeScript type definitions
└── config/                       # Environment & configuration
```

### 🔧 Configuration

#### API Keys Required:
- **Google Gemini API**: For AI-powered receipt processing
- **Google Cloud Vision API**: For advanced OCR capabilities

#### App Configuration:
- **Bundle ID**: `com.developer.SlipScan`
- **App Name**: "The Ledger"
- **Supported Platforms**: iOS 11.0+, Android API 21+

### 🎯 Core Features Guide

#### 📸 Receipt Scanning
1. Tap the scan button on the home screen
2. Use the camera to capture receipt images
3. AI automatically extracts merchant, items, and amounts
4. Review and edit details before saving

#### 💰 Budget Management
1. Navigate to the Budget tab
2. Create monthly budgets by category
3. Track spending automatically as receipts are added
4. View progress with visual indicators

#### 🔍 Search & Filter
1. Use the Search tab to find specific receipts
2. Filter by merchant, category, amount range, or date
3. Advanced search across receipt content

#### 🤖 AI Insights
1. Access AI Feedback from the home screen
2. Get personalized spending analysis
3. Receive recommendations for budget optimization

### 🚀 Development Workflow

#### Adding New Features
1. Create feature branch: `git checkout -b feature/new-feature`
2. Implement changes following the existing architecture
3. Test on both iOS and Android
4. Submit pull request

#### Code Style
- **TypeScript**: Strict mode enabled
- **ESLint**: Configured for React Native
- **Prettier**: Code formatting
- **File Structure**: Feature-based organization

### 🧪 Testing

```bash
# Run type checking
npx tsc --noEmit

# Run linting
npx eslint .

# Test on devices
npx expo start --dev-client
```

### 📦 Building for Production

#### Android
```bash
# Build APK
eas build --platform android --profile production

# Build AAB (Play Store)
eas build --platform android --profile production --auto-submit
```

#### iOS
```bash
# Build for App Store
eas build --platform ios --profile production --auto-submit
```

### 🔒 Security Features

- **Biometric Authentication**: Fingerprint/Face ID support
- **Local Data Storage**: All data stored securely on device
- **API Key Protection**: Environment-based configuration
- **Input Validation**: Comprehensive data sanitization

### 🐛 Troubleshooting

#### Common Issues:

1. **Metro bundler issues**:
   ```bash
   npx expo start --clear
   ```

2. **Android build errors**:
   ```bash
   cd android && ./gradlew clean && cd ..
   npx expo run:android
   ```

3. **iOS build errors**:
   ```bash
   cd ios && xcodebuild clean && cd ..
   npx expo run:ios
   ```

### 📚 Documentation

- **Expo Documentation**: [https://docs.expo.dev/](https://docs.expo.dev/)
- **React Native**: [https://reactnative.dev/](https://reactnative.dev/)
- **Google ML Kit**: [https://developers.google.com/ml-kit](https://developers.google.com/ml-kit)

### 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

### 👥 Authors

- **Phillip** - *Lead Developer* - [@PHILLIP8264](https://github.com/PHILLIP8264)

### 🙏 Acknowledgments

- Expo team for the excellent development framework
- Google for ML Kit and Gemini API
- React Native community for valuable resources
- All contributors who helped improve this project

---

**Built with ❤️ using React Native & Expo**
