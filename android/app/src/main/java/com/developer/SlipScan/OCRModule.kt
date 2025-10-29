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
        
        // Parse basic fields
        val merchant = parseMerchant(lines)
        val total = parseTotal(text, lines)
        val date = parseDate(text, lines)
        val items = parseItemsEnhanced(text, lines)
        
        // Parse enhanced store details
        val storeDetails = Arguments.createMap()
        storeDetails.putString("name", merchant)
        storeDetails.putString("address", parseAddress(text))
        storeDetails.putString("phone", parsePhone(text))
        storeDetails.putString("email", parseEmail(text))
        storeDetails.putString("storeId", parseStoreId(text))
        storeDetails.putString("cashierName", parseCashierName(text))
        storeDetails.putString("registerNumber", parseRegisterNumber(text))
        
        // Parse tax information
        val taxInfo = Arguments.createMap()
        taxInfo.putString("taxAmount", parseTaxAmount(text))
        taxInfo.putString("taxRate", parseTaxRate(text))
        taxInfo.putString("vatAmount", parseVATAmount(text))
        taxInfo.putString("vatRate", parseVATRate(text))
        taxInfo.putString("subtotal", parseSubtotal(text))
        taxInfo.putString("taxableAmount", parseTaxableAmount(text))
        taxInfo.putString("exemptAmount", parseExemptAmount(text))
        
        // Parse payment information
        val paymentInfo = Arguments.createMap()
        paymentInfo.putString("paymentMethod", parsePaymentMethod(text))
        paymentInfo.putString("cardType", parseCardType(text))
        paymentInfo.putString("cardLast4", parseCardLast4(text))
        paymentInfo.putString("changeAmount", parseChangeAmount(text))
        paymentInfo.putString("tenderedAmount", parseTenderedAmount(text))
        
        // Parse receipt metadata
        val receiptMetadata = Arguments.createMap()
        receiptMetadata.putString("receiptNumber", parseReceiptNumber(text))
        receiptMetadata.putString("transactionId", parseTransactionId(text))
        receiptMetadata.putString("batchNumber", parseBatchNumber(text))
        receiptMetadata.putString("timestamp", parseTimestamp(text))
        receiptMetadata.putString("currency", parseCurrency(text))
        receiptMetadata.putString("locale", "en-ZA")
        
        // Build final result
        result.putString("merchant", merchant.ifEmpty { "Unknown Merchant" })
        result.putString("total", total.ifEmpty { "$0.00" })
        result.putString("date", date.ifEmpty { getCurrentDate() })
        result.putArray("items", items)
        result.putString("rawText", text)
        result.putDouble("confidence", 0.8)
        result.putMap("storeDetails", storeDetails)
        result.putMap("taxInfo", taxInfo)
        result.putMap("paymentInfo", paymentInfo)
        result.putMap("receiptMetadata", receiptMetadata)
        
        return result
    }
    
    private fun parseMerchant(lines: List<String>): String {
        for (i in 0 until minOf(3, lines.size)) {
            val line = lines[i].trim()
            if (line.isNotEmpty() && !isNumeric(line) && !isDate(line)) {
                return line
            }
        }
        return ""
    }
    
    private fun parseTotal(text: String, lines: List<String>): String {
        val totalPatterns = listOf(
            Pattern.compile("(?i)total[:\\s]*\\$?([0-9]+\\.?[0-9]*)"),
            Pattern.compile("(?i)amount[:\\s]*\\$?([0-9]+\\.?[0-9]*)"),
            Pattern.compile("\\$([0-9]+\\.[0-9]{2})(?!.*\\$[0-9])")
        )
        
        for (line in lines) {
            for (pattern in totalPatterns) {
                val matcher = pattern.matcher(line)
                if (matcher.find()) {
                    return "$" + matcher.group(1)
                }
            }
        }
        return ""
    }
    
    private fun parseDate(text: String, lines: List<String>): String {
        val datePatterns = listOf(
            Pattern.compile("([0-9]{1,2})[/\\-]([0-9]{1,2})[/\\-]([0-9]{2,4})"),
            Pattern.compile("([0-9]{2,4})[/\\-]([0-9]{1,2})[/\\-]([0-9]{1,2})")
        )
        
        for (line in lines) {
            for (pattern in datePatterns) {
                val matcher = pattern.matcher(line)
                if (matcher.find()) {
                    return matcher.group(0) ?: ""
                }
            }
        }
        return ""
    }
    
    private fun parseItemsEnhanced(text: String, lines: List<String>): WritableArray {
        val items = Arguments.createArray()
        val itemPatterns = listOf(
            Pattern.compile("(\\d+\\.?\\d*)\\s+([^$\\d]+?)\\s+\\$?(\\d+\\.?\\d{2})"), // Qty Item Price
            Pattern.compile("([^$\\d]+?)\\s+(\\d+\\.?\\d*)\\s*x\\s*\\$?(\\d+\\.?\\d{2})"), // Item Qty x Price
            Pattern.compile("([^$\\d]*?)\\s*\\.{2,}\\s*\\$?(\\d+\\.?\\d{2})"), // Item ... Price
            Pattern.compile("([^$\\d]+?)\\s+\\$?(\\d+\\.?\\d{2})") // Item Price
        )
        
        for (line in lines) {
            val trimmed = line.trim()
            if (shouldSkipLine(trimmed)) continue
            
            for ((index, pattern) in itemPatterns.withIndex()) {
                val matcher = pattern.matcher(trimmed)
                if (matcher.find()) {
                    val item = Arguments.createMap()
                    
                    when (index) {
                        0 -> { // Qty Item Price
                            item.putString("quantity", matcher.group(1))
                            item.putString("name", cleanItemName(matcher.group(2) ?: ""))
                            item.putString("price", "$" + matcher.group(3))
                        }
                        1 -> { // Item Qty x Price
                            item.putString("name", cleanItemName(matcher.group(1) ?: ""))
                            item.putString("quantity", matcher.group(2))
                            item.putString("price", "$" + matcher.group(3))
                        }
                        else -> { // Item ... Price or Item Price
                            item.putString("name", cleanItemName(matcher.group(1) ?: ""))
                            item.putString("price", "$" + matcher.group(2))
                        }
                    }
                    
                    val itemName = item.getString("name") ?: ""
                    if (itemName.isNotEmpty() && !isLikelyNotItem(itemName)) {
                        items.pushMap(item)
                    }
                    break
                }
            }
        }
        
        return items
    }
    
    private fun shouldSkipLine(line: String): Boolean {
        val skipPatterns = listOf(
            "(?i)^(subtotal|total|tax|discount|cash|credit|debit|change)",
            "(?i)^(thank you|receipt|store|address|phone)",
            "^\\d{4}-\\d{2}-\\d{2}",
            "^\\*{3,}",
            "^-{3,}"
        )
        
        return skipPatterns.any { Pattern.compile(it).matcher(line).find() } || line.length < 2
    }
    
    private fun isLikelyNotItem(name: String): Boolean {
        val notItemPatterns = listOf(
            "(?i)^(qty|quantity|price|total|tax|disc|discount)$",
            "^\\d+$",
            "^[a-z]$"
        )
        
        return notItemPatterns.any { Pattern.compile(it).matcher(name).find() }
    }
    
    private fun cleanItemName(name: String): String {
        return name.replace("[^\\w\\s&'-]".toRegex(), "")
                  .replace("\\s+".toRegex(), " ")
                  .trim()
                  .take(100)
    }
    
    // Enhanced parsing methods
    private fun parseAddress(text: String): String {
        val addressPatterns = listOf(
            Pattern.compile("(\\d+\\s+[A-Za-z\\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln)[A-Za-z\\s,\\d]*)", Pattern.CASE_INSENSITIVE),
            Pattern.compile("(P\\.?O\\.?\\s*Box\\s*\\d+[A-Za-z\\s,]*)", Pattern.CASE_INSENSITIVE)
        )
        
        for (pattern in addressPatterns) {
            val matcher = pattern.matcher(text)
            if (matcher.find()) {
                return matcher.group(1) ?: ""
            }
        }
        return ""
    }
    
    private fun parsePhone(text: String): String {
        val phonePatterns = listOf(
            Pattern.compile("(\\+?\\d{1,3}[-\\.\\s]?\\(?\\d{3}\\)?[-\\.\\s]?\\d{3}[-\\.\\s]?\\d{4})"),
            Pattern.compile("(\\d{3}[-\\.\\s]?\\d{3}[-\\.\\s]?\\d{4})"),
            Pattern.compile("(\\(\\d{3}\\)\\s?\\d{3}[-\\.\\s]?\\d{4})")
        )
        
        for (pattern in phonePatterns) {
            val matcher = pattern.matcher(text)
            if (matcher.find()) {
                return matcher.group(1) ?: ""
            }
        }
        return ""
    }
    
    private fun parseEmail(text: String): String {
        val emailPattern = Pattern.compile("([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})")
        val matcher = emailPattern.matcher(text)
        return if (matcher.find()) matcher.group(1) ?: "" else ""
    }
    
    private fun parseStoreId(text: String): String {
        val storeIdPattern = Pattern.compile("(?:store|shop|location)[\\s#:]*(\\d+)", Pattern.CASE_INSENSITIVE)
        val matcher = storeIdPattern.matcher(text)
        return if (matcher.find()) matcher.group(1) ?: "" else ""
    }
    
    private fun parseCashierName(text: String): String {
        val cashierPattern = Pattern.compile("(?:cashier|served by|attendant)[\\s:]*([A-Za-z]+\\s?[A-Za-z]?\\.?)", Pattern.CASE_INSENSITIVE)
        val matcher = cashierPattern.matcher(text)
        return if (matcher.find()) matcher.group(1)?.trim() ?: "" else ""
    }
    
    private fun parseRegisterNumber(text: String): String {
        val registerPattern = Pattern.compile("(?:register|reg|till)[\\s#:]*(\\d+)", Pattern.CASE_INSENSITIVE)
        val matcher = registerPattern.matcher(text)
        return if (matcher.find()) matcher.group(1) ?: "" else ""
    }
    
    private fun parseTaxAmount(text: String): String {
        val taxPattern = Pattern.compile("(?:tax|sales tax|st)[:\\s]*\\$?(\\d+\\.?\\d*)", Pattern.CASE_INSENSITIVE)
        val matcher = taxPattern.matcher(text)
        return if (matcher.find()) "$" + matcher.group(1) else ""
    }
    
    private fun parseTaxRate(text: String): String {
        val taxRatePattern = Pattern.compile("(?:tax|vat)[\\s:]*(\\d+\\.?\\d*)%", Pattern.CASE_INSENSITIVE)
        val matcher = taxRatePattern.matcher(text)
        return if (matcher.find()) matcher.group(1) + "%" else ""
    }
    
    private fun parseVATAmount(text: String): String {
        val vatPattern = Pattern.compile("(?:vat|value added tax)[:\\s]*\\$?(\\d+\\.?\\d*)", Pattern.CASE_INSENSITIVE)
        val matcher = vatPattern.matcher(text)
        return if (matcher.find()) "$" + matcher.group(1) else parseTaxAmount(text)
    }
    
    private fun parseVATRate(text: String): String {
        val vatRatePattern = Pattern.compile("(?:vat)[\\s:]*(\\d+\\.?\\d*)%", Pattern.CASE_INSENSITIVE)
        val matcher = vatRatePattern.matcher(text)
        return if (matcher.find()) matcher.group(1) + "%" else ""
    }
    
    private fun parseSubtotal(text: String): String {
        val subtotalPattern = Pattern.compile("(?:subtotal|sub total)[:\\s]*\\$?(\\d+\\.?\\d*)", Pattern.CASE_INSENSITIVE)
        val matcher = subtotalPattern.matcher(text)
        return if (matcher.find()) "$" + matcher.group(1) else ""
    }
    
    private fun parseTaxableAmount(text: String): String {
        val taxablePattern = Pattern.compile("(?:taxable)[:\\s]*\\$?(\\d+\\.?\\d*)", Pattern.CASE_INSENSITIVE)
        val matcher = taxablePattern.matcher(text)
        return if (matcher.find()) "$" + matcher.group(1) else ""
    }
    
    private fun parseExemptAmount(text: String): String {
        val exemptPattern = Pattern.compile("(?:exempt|tax free)[:\\s]*\\$?(\\d+\\.?\\d*)", Pattern.CASE_INSENSITIVE)
        val matcher = exemptPattern.matcher(text)
        return if (matcher.find()) "$" + matcher.group(1) else ""
    }
    
    private fun parsePaymentMethod(text: String): String {
        val paymentPattern = Pattern.compile("(cash|card|credit|debit|visa|mastercard|amex)", Pattern.CASE_INSENSITIVE)
        val matcher = paymentPattern.matcher(text)
        return if (matcher.find()) matcher.group(1)?.replaceFirstChar { it.titlecase() } ?: "" else ""
    }
    
    private fun parseCardType(text: String): String {
        val cardTypes = listOf("visa", "mastercard", "amex", "discover", "american express")
        val lowerText = text.lowercase()
        
        for (cardType in cardTypes) {
            if (lowerText.contains(cardType)) {
                return cardType.replaceFirstChar { it.titlecase() }
            }
        }
        return ""
    }
    
    private fun parseCardLast4(text: String): String {
        val cardPattern = Pattern.compile("(?:\\*{4,}|\\*+)(\\d{4})")
        val matcher = cardPattern.matcher(text)
        return if (matcher.find()) matcher.group(1) ?: "" else ""
    }
    
    private fun parseChangeAmount(text: String): String {
        val changePattern = Pattern.compile("(?:change)[:\\s]*\\$?(\\d+\\.?\\d*)", Pattern.CASE_INSENSITIVE)
        val matcher = changePattern.matcher(text)
        return if (matcher.find()) "$" + matcher.group(1) else ""
    }
    
    private fun parseTenderedAmount(text: String): String {
        val tenderedPattern = Pattern.compile("(?:tendered|given)[:\\s]*\\$?(\\d+\\.?\\d*)", Pattern.CASE_INSENSITIVE)
        val matcher = tenderedPattern.matcher(text)
        return if (matcher.find()) "$" + matcher.group(1) else ""
    }
    
    private fun parseReceiptNumber(text: String): String {
        val receiptPattern = Pattern.compile("(?:receipt|rcpt)[\\s#:]*(\\d+)", Pattern.CASE_INSENSITIVE)
        val matcher = receiptPattern.matcher(text)
        return if (matcher.find()) matcher.group(1) ?: "" else ""
    }
    
    private fun parseTransactionId(text: String): String {
        val transactionPattern = Pattern.compile("(?:transaction|trans|txn)[\\s#:]*([A-Z0-9]+)", Pattern.CASE_INSENSITIVE)
        val matcher = transactionPattern.matcher(text)
        return if (matcher.find()) matcher.group(1) ?: "" else ""
    }
    
    private fun parseBatchNumber(text: String): String {
        val batchPattern = Pattern.compile("(?:batch)[\\s#:]*(\\d+)", Pattern.CASE_INSENSITIVE)
        val matcher = batchPattern.matcher(text)
        return if (matcher.find()) matcher.group(1) ?: "" else ""
    }
    
    private fun parseTimestamp(text: String): String {
        val timePatterns = listOf(
            Pattern.compile("(\\d{1,2}:\\d{2}:\\d{2})"),
            Pattern.compile("(\\d{1,2}:\\d{2}\\s?[AP]M)", Pattern.CASE_INSENSITIVE)
        )
        
        for (pattern in timePatterns) {
            val matcher = pattern.matcher(text)
            if (matcher.find()) {
                return matcher.group(1) ?: ""
            }
        }
        return ""
    }
    
    private fun parseCurrency(text: String): String {
        return when {
            text.contains("ZAR") || text.contains("R ") -> "ZAR"
            text.contains("USD") || text.contains("$") -> "USD"
            text.contains("EUR") || text.contains("€") -> "EUR"
            text.contains("GBP") || text.contains("£") -> "GBP"
            else -> "ZAR" // Default for South African context
        }
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