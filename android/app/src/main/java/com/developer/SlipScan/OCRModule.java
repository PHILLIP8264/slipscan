package com.developer.SlipScan;

import java.io.IOException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.google.android.gms.tasks.OnFailureListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import android.net.Uri;
import android.util.Log;

public class OCRModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "OCRModule";
    private static final String TAG = "OCRModule";
    
    private TextRecognizer textRecognizer;

    public OCRModule(ReactApplicationContext reactContext) {
        super(reactContext);
        textRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void extractText(String imageUri, Promise promise) {
        try {
            // Load image from URI
            InputImage image = InputImage.fromFilePath(getReactApplicationContext(), Uri.parse(imageUri));
            
            textRecognizer.process(image)
                    .addOnSuccessListener(new OnSuccessListener<Text>() {
                        @Override
                        public void onSuccess(Text visionText) {
                            processTextResult(visionText, promise);
                        }
                    })
                    .addOnFailureListener(new OnFailureListener() {
                        @Override
                        public void onFailure(Exception e) {
                            Log.e(TAG, "Text recognition failed", e);
                            promise.reject("OCR_ERROR", "Text recognition failed: " + e.getMessage());
                        }
                    });

        } catch (IOException e) {
            Log.e(TAG, "Failed to load image", e);
            promise.reject("IMAGE_ERROR", "Failed to load image: " + e.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "OCR processing error", e);
            promise.reject("OCR_ERROR", "OCR processing error: " + e.getMessage());
        }
    }

    @ReactMethod
    public void parseReceipt(String imageUri, Promise promise) {
        try {
            InputImage image = InputImage.fromFilePath(getReactApplicationContext(), Uri.parse(imageUri));
            
            textRecognizer.process(image)
                    .addOnSuccessListener(new OnSuccessListener<Text>() {
                        @Override
                        public void onSuccess(Text visionText) {
                            parseReceiptData(visionText, promise);
                        }
                    })
                    .addOnFailureListener(new OnFailureListener() {
                        @Override
                        public void onFailure(Exception e) {
                            Log.e(TAG, "Receipt parsing failed", e);
                            promise.reject("PARSE_ERROR", "Receipt parsing failed: " + e.getMessage());
                        }
                    });

        } catch (IOException e) {
            Log.e(TAG, "Failed to load image for parsing", e);
            promise.reject("IMAGE_ERROR", "Failed to load image: " + e.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "Receipt parsing error", e);
            promise.reject("PARSE_ERROR", "Receipt parsing error: " + e.getMessage());
        }
    }

    private void processTextResult(Text visionText, Promise promise) {
        WritableMap result = Arguments.createMap();
        result.putString("text", visionText.getText());
        
        WritableArray blocks = Arguments.createArray();
        for (Text.TextBlock block : visionText.getTextBlocks()) {
            WritableMap blockMap = Arguments.createMap();
            blockMap.putString("text", block.getText());
            
            // Add bounding box if available
            if (block.getBoundingBox() != null) {
                WritableMap boundingBox = Arguments.createMap();
                boundingBox.putInt("left", block.getBoundingBox().left);
                boundingBox.putInt("top", block.getBoundingBox().top);
                boundingBox.putInt("right", block.getBoundingBox().right);
                boundingBox.putInt("bottom", block.getBoundingBox().bottom);
                blockMap.putMap("boundingBox", boundingBox);
            }
            
            blocks.pushMap(blockMap);
        }
        result.putArray("blocks", blocks);
        
        promise.resolve(result);
    }

    private void parseReceiptData(Text visionText, Promise promise) {
        String fullText = visionText.getText();
        WritableMap receiptData = Arguments.createMap();
        
        // Extract merchant name (usually at the top)
        String merchant = extractMerchantName(fullText);
        receiptData.putString("merchant", merchant);
        
        // Extract total amount
        String total = extractTotal(fullText);
        receiptData.putString("total", total);
        
        // Extract date
        String date = extractDate(fullText);
        receiptData.putString("date", date);
        
        // Extract items
        WritableArray items = extractItems(visionText);
        receiptData.putArray("items", items);
        
        // Raw text for debugging
        receiptData.putString("rawText", fullText);
        
        // Confidence score (simplified)
        receiptData.putDouble("confidence", calculateConfidence(merchant, total, date));
        
        promise.resolve(receiptData);
    }

    private String extractMerchantName(String text) {
        String[] lines = text.split("\n");
        // Take the first non-empty line that's likely a business name
        for (String line : lines) {
            line = line.trim();
            if (!line.isEmpty() && line.length() > 2 && 
                !line.matches(".*\\d{4}.*") && // Avoid lines with years
                !line.toLowerCase().contains("receipt") &&
                !line.toLowerCase().contains("invoice")) {
                return line;
            }
        }
        return "Unknown Merchant";
    }

    private String extractTotal(String text) {
        // Patterns for total amount
        Pattern[] totalPatterns = {
            Pattern.compile("(?i)total[:\\s]*\\$?([0-9]+\\.?[0-9]*)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(?i)amount[:\\s]*\\$?([0-9]+\\.?[0-9]*)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("\\$([0-9]+\\.[0-9]{2})(?!.*\\$[0-9]+\\.[0-9]{2})"), // Last dollar amount
            Pattern.compile("([0-9]+\\.[0-9]{2})(?!.*[0-9]+\\.[0-9]{2})") // Last decimal amount
        };
        
        for (Pattern pattern : totalPatterns) {
            Matcher matcher = pattern.matcher(text);
            String lastMatch = null;
            while (matcher.find()) {
                lastMatch = matcher.group(1) != null ? matcher.group(1) : matcher.group(0);
            }
            if (lastMatch != null) {
                return lastMatch.replaceAll("[^0-9.]", "");
            }
        }
        return "0.00";
    }

    private String extractDate(String text) {
        // Patterns for dates
        Pattern[] datePatterns = {
            Pattern.compile("\\b(\\d{1,2}[/\\-]\\d{1,2}[/\\-]\\d{2,4})\\b"),
            Pattern.compile("\\b(\\d{4}[/\\-]\\d{1,2}[/\\-]\\d{1,2})\\b"),
            Pattern.compile("\\b(\\w+ \\d{1,2}, \\d{4})\\b")
        };
        
        for (Pattern pattern : datePatterns) {
            Matcher matcher = pattern.matcher(text);
            if (matcher.find()) {
                return matcher.group(1);
            }
        }
        return "";
    }

    private WritableArray extractItems(Text visionText) {
        WritableArray items = Arguments.createArray();
        
        // Simple item extraction based on lines with prices
        Pattern itemPattern = Pattern.compile("(.+?)\\s+(\\$?[0-9]+\\.?[0-9]*)\\s*$");
        
        for (Text.TextBlock block : visionText.getTextBlocks()) {
            for (Text.Line line : block.getLines()) {
                String lineText = line.getText().trim();
                Matcher matcher = itemPattern.matcher(lineText);
                
                if (matcher.find() && !lineText.toLowerCase().contains("total") &&
                    !lineText.toLowerCase().contains("subtotal") &&
                    !lineText.toLowerCase().contains("tax")) {
                    
                    WritableMap item = Arguments.createMap();
                    item.putString("name", matcher.group(1).trim());
                    item.putString("price", matcher.group(2).replaceAll("[^0-9.]", ""));
                    items.pushMap(item);
                }
            }
        }
        
        return items;
    }

    private double calculateConfidence(String merchant, String total, String date) {
        double confidence = 0.0;
        
        if (!merchant.equals("Unknown Merchant")) confidence += 0.3;
        if (!total.equals("0.00")) confidence += 0.4;
        if (!date.isEmpty()) confidence += 0.3;
        
        return Math.min(confidence, 1.0);
    }
}