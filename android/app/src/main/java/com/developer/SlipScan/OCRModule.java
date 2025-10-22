package com.developer.SlipScan;

import android.graphics.Bitmap;
import android.net.Uri;
import android.provider.MediaStore;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;

import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import java.io.IOException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class OCRModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "OCRModule";
    private TextRecognizer textRecognizer;

    public OCRModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.textRecognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void extractText(String imageUri, Promise promise) {
        try {
            // Load image from URI
            Uri uri = Uri.parse(imageUri);
            Bitmap bitmap = MediaStore.Images.Media.getBitmap(
                getReactApplicationContext().getContentResolver(), uri);
            
            InputImage image = InputImage.fromBitmap(bitmap, 0);
            
            // Process with ML Kit Text Recognition
            textRecognizer.process(image)
                .addOnSuccessListener(visionText -> {
                    WritableMap result = Arguments.createMap();
                    result.putString("text", visionText.getText());
                    
                    // Add text blocks with bounding boxes
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
                })
                .addOnFailureListener(e -> {
                    promise.reject("OCR_ERROR", "Text recognition failed: " + e.getMessage(), e);
                });
                
        } catch (IOException e) {
            promise.reject("IMAGE_LOAD_ERROR", "Failed to load image: " + e.getMessage(), e);
        } catch (Exception e) {
            promise.reject("GENERAL_ERROR", "OCR processing failed: " + e.getMessage(), e);
        }
    }

    @ReactMethod
    public void parseReceipt(String imageUri, Promise promise) {
        try {
            // First extract text
            Uri uri = Uri.parse(imageUri);
            Bitmap bitmap = MediaStore.Images.Media.getBitmap(
                getReactApplicationContext().getContentResolver(), uri);
            
            InputImage image = InputImage.fromBitmap(bitmap, 0);
            
            textRecognizer.process(image)
                .addOnSuccessListener(visionText -> {
                    // Parse the text into receipt structure
                    WritableMap receiptData = parseReceiptText(visionText.getText());
                    receiptData.putString("rawText", visionText.getText());
                    promise.resolve(receiptData);
                })
                .addOnFailureListener(e -> {
                    promise.reject("RECEIPT_PARSE_ERROR", 
                        "Receipt parsing failed: " + e.getMessage(), e);
                });
                
        } catch (IOException e) {
            promise.reject("IMAGE_LOAD_ERROR", "Failed to load image: " + e.getMessage(), e);
        } catch (Exception e) {
            promise.reject("GENERAL_ERROR", "Receipt parsing failed: " + e.getMessage(), e);
        }
    }

    private WritableMap parseReceiptText(String text) {
        WritableMap receipt = Arguments.createMap();
        
        // Extract merchant (usually first few lines)
        String merchant = extractMerchant(text);
        receipt.putString("merchant", merchant);
        
        // Extract total amount
        String total = extractTotal(text);
        receipt.putString("total", total);
        
        // Extract date
        String date = extractDate(text);
        receipt.putString("date", date);
        
        // Extract items (basic implementation)
        WritableArray items = extractItems(text);
        receipt.putArray("items", items);
        
        // Calculate confidence based on what we found
        double confidence = calculateConfidence(merchant, total, date);
        receipt.putDouble("confidence", confidence);
        
        return receipt;
    }

    private String extractMerchant(String text) {
        String[] lines = text.split("\n");
        // Usually merchant name is in the first 1-3 lines
        for (int i = 0; i < Math.min(3, lines.length); i++) {
            String line = lines[i].trim();
            if (line.length() > 3 && !line.matches(".*\\d{3,}.*")) {
                // Skip lines with lots of numbers (likely not merchant name)
                return line;
            }
        }
        return "Unknown";
    }

    private String extractTotal(String text) {
        // Look for total patterns
        Pattern totalPattern = Pattern.compile(
            "(?i)(?:total|amount|sum|subtotal)[:\\s]*\\$?([0-9]+\\.?[0-9]*)", 
            Pattern.CASE_INSENSITIVE);
        Matcher matcher = totalPattern.matcher(text);
        
        String lastTotal = "0.00";
        while (matcher.find()) {
            lastTotal = matcher.group(1);
        }
        return lastTotal;
    }

    private String extractDate(String text) {
        // Look for date patterns
        Pattern datePattern = Pattern.compile(
            "\\b(\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4})\\b|\\b(\\d{4}-\\d{2}-\\d{2})\\b");
        Matcher matcher = datePattern.matcher(text);
        
        if (matcher.find()) {
            return matcher.group();
        }
        return "";
    }

    private WritableArray extractItems(String text) {
        WritableArray items = Arguments.createArray();
        
        // Simple item extraction - look for lines with item name and price
        Pattern itemPattern = Pattern.compile("^([^0-9]*?)\\s+\\$?([0-9]+\\.?[0-9]*)$", 
            Pattern.MULTILINE);
        Matcher matcher = itemPattern.matcher(text);
        
        while (matcher.find()) {
            String itemName = matcher.group(1).trim();
            String price = matcher.group(2);
            
            if (itemName.length() > 1 && !itemName.toLowerCase().contains("total")) {
                WritableMap item = Arguments.createMap();
                item.putString("name", itemName);
                item.putString("price", price);
                items.pushMap(item);
            }
        }
        
        return items;
    }

    private double calculateConfidence(String merchant, String total, String date) {
        double confidence = 0.0;
        
        if (!"Unknown".equals(merchant)) confidence += 0.3;
        if (!"0.00".equals(total)) confidence += 0.4;
        if (!date.isEmpty()) confidence += 0.2;
        
        // Base confidence for successful OCR
        confidence += 0.1;
        
        return Math.min(1.0, confidence);
    }
}