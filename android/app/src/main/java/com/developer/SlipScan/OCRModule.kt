package com.developer.SlipScan

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import com.facebook.react.bridge.*
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.text.TextRecognition
import com.google.mlkit.vision.text.latin.TextRecognizerOptions
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.*
import java.util.regex.Pattern

class OCRModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val NAME = "OCRModule"
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun extractText(imageUri: String, promise: Promise) {
        try {
            val uri = Uri.parse(imageUri)
            val image = InputImage.fromFilePath(reactApplicationContext, uri)
            
            val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
            
            recognizer.process(image)
                .addOnSuccessListener { visionText ->
                    val result = Arguments.createMap()
                    result.putString("text", visionText.text)
                    
                    val blocks = Arguments.createArray()
                    for (block in visionText.textBlocks) {
                        val blockMap = Arguments.createMap()
                        blockMap.putString("text", block.text)
                        
                        block.boundingBox?.let { boundingBox ->
                            val bbox = Arguments.createMap()
                            bbox.putInt("left", boundingBox.left)
                            bbox.putInt("top", boundingBox.top)
                            bbox.putInt("right", boundingBox.right)
                            bbox.putInt("bottom", boundingBox.bottom)
                            blockMap.putMap("boundingBox", bbox)
                        }
                        
                        blocks.pushMap(blockMap)
                    }
                    
                    result.putArray("blocks", blocks)
                    promise.resolve(result)
                }
                .addOnFailureListener { e ->
                    promise.reject("OCR_ERROR", "Text recognition failed: ${e.message}")
                }
                
        } catch (e: Exception) {
            promise.reject("OCR_ERROR", "Failed to process image: ${e.message}")
        }
    }

    @ReactMethod
    fun parseReceipt(imageUri: String, promise: Promise) {
        try {
            val uri = Uri.parse(imageUri)
            val image = InputImage.fromFilePath(reactApplicationContext, uri)
            
            val recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS)
            
            recognizer.process(image)
                .addOnSuccessListener { visionText ->
                    val receiptData = parseReceiptFromText(visionText.text)
                    promise.resolve(receiptData)
                }
                .addOnFailureListener { e ->
                    promise.reject("RECEIPT_PARSE_ERROR", "Receipt parsing failed: ${e.message}")
                }
                
        } catch (e: Exception) {
            promise.reject("RECEIPT_PARSE_ERROR", "Failed to parse receipt: ${e.message}")
        }
    }

    private fun parseReceiptFromText(text: String): WritableMap {
        val result = Arguments.createMap()
        val lines = text.split("\n")
        
        // Initialize default values
        var merchant = ""
        var total = ""
        var date = ""
        val items = Arguments.createArray()
        
        // Parse merchant (usually first few lines)
        for (i in 0 until minOf(3, lines.size)) {
            val line = lines[i].trim()
            if (line.isNotEmpty() && !isNumeric(line) && !isDate(line)) {
                merchant = line
                break
            }
        }
        
        // Parse total amount
        val totalPatterns = listOf(
            Pattern.compile("(?i)total[:\\s]*\\$?([0-9]+\\.?[0-9]*)"),
            Pattern.compile("(?i)amount[:\\s]*\\$?([0-9]+\\.?[0-9]*)"),
            Pattern.compile("\\$([0-9]+\\.[0-9]{2})(?!.*\\$[0-9])"), // Last dollar amount
        )
        
        for (line in lines) {
            for (pattern in totalPatterns) {
                val matcher = pattern.matcher(line)
                if (matcher.find()) {
                    total = "$" + matcher.group(1)
                    break
                }
            }
            if (total.isNotEmpty()) break
        }
        
        // Parse date
        val datePatterns = listOf(
            Pattern.compile("([0-9]{1,2})[/\\-]([0-9]{1,2})[/\\-]([0-9]{2,4})"),
            Pattern.compile("([0-9]{2,4})[/\\-]([0-9]{1,2})[/\\-]([0-9]{1,2})"),
        )
        
        for (line in lines) {
            for (pattern in datePatterns) {
                val matcher = pattern.matcher(line)
                if (matcher.find()) {
                    date = matcher.group(0) ?: ""
                    break
                }
            }
            if (date.isNotEmpty()) break
        }
        
        // Parse items (lines with price patterns)
        val itemPattern = Pattern.compile("(.+?)\\s+\\$?([0-9]+\\.?[0-9]*)")
        for (line in lines) {
            val matcher = itemPattern.matcher(line.trim())
            if (matcher.find()) {
                val itemName = matcher.group(1)?.trim() ?: ""
                val itemPrice = "$" + (matcher.group(2) ?: "")
                
                if (itemName.isNotEmpty() && !itemName.contains("total", true) && 
                    !itemName.contains("tax", true) && !itemName.contains("subtotal", true)) {
                    val item = Arguments.createMap()
                    item.putString("name", itemName)
                    item.putString("price", itemPrice)
                    items.pushMap(item)
                }
            }
        }
        
        // Build result
        result.putString("merchant", merchant.ifEmpty { "Unknown Merchant" })
        result.putString("total", total.ifEmpty { "$0.00" })
        result.putString("date", date.ifEmpty { getCurrentDate() })
        result.putArray("items", items)
        result.putString("rawText", text)
        result.putDouble("confidence", 0.8) // ML Kit confidence approximation
        
        return result
    }
    
    private fun isNumeric(str: String): Boolean {
        return str.matches(Regex("[0-9.\\$\\s]+"))
    }
    
    private fun isDate(str: String): Boolean {
        return str.matches(Regex(".*[0-9]{1,2}[/\\-][0-9]{1,2}[/\\-][0-9]{2,4}.*"))
    }
    
    private fun getCurrentDate(): String {
        val sdf = SimpleDateFormat("MM/dd/yyyy", Locale.getDefault())
        return sdf.format(Date())
    }

    @ReactMethod
    fun addListener(eventName: String?) {
        // Required for RN built in Event Emitter Calls
    }

    @ReactMethod
    fun removeListeners(count: Int?) {
        // Required for RN built in Event Emitter Calls
    }
}