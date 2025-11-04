#!/bin/bash
# Script to update font families across the entire app

echo "🔄 Starting font migration to Merriweather Sans..."

# Find all TSX files and update fontWeight to fontFamily
find . -name "*.tsx" -not -path "./node_modules/*" -exec sed -i.bak -E 's/fontWeight: ['\''"]bold['\''"]|fontWeight: '\''bold'\''/fontFamily: getFontFamily('\''bold'\'')/g' {} \;
find . -name "*.tsx" -not -path "./node_modules/*" -exec sed -i.bak -E 's/fontWeight: ['\''"]600['\''"]|fontWeight: '\''600'\''/fontFamily: getFontFamily('\''semiBold'\'')/g' {} \;
find . -name "*.tsx" -not -path "./node_modules/*" -exec sed -i.bak -E 's/fontWeight: ['\''"]500['\''"]|fontWeight: '\''500'\''/fontFamily: getFontFamily('\''medium'\'')/g' {} \;
find . -name "*.tsx" -not -path "./node_modules/*" -exec sed -i.bak -E 's/fontWeight: ['\''"]400['\''"]|fontWeight: '\''400'\''/fontFamily: getFontFamily('\''regular'\'')/g' {} \;
find . -name "*.tsx" -not -path "./node_modules/*" -exec sed -i.bak -E 's/fontWeight: ['\''"]300['\''"]|fontWeight: '\''300'\''/fontFamily: getFontFamily('\''light'\'')/g' {} \;

echo "✅ Font migration completed!"
echo "⚠️  Please manually import { getFontFamily } from '../utils/fonts' in files that use getFontFamily"