package com.developer.SlipScan

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.*
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult

class DocumentScannerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext), ActivityEventListener {

    companion object {
        private const val NAME = "DocumentScannerModule"
        private const val DOCUMENT_SCANNER_REQUEST_CODE = 12345
    }

    private var scannerPromise: Promise? = null

    init {
        reactContext.addActivityEventListener(this)
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun startScanning(options: ReadableMap, promise: Promise) {
        try {
            // Build scanner options from React Native options
            val optionsBuilder = GmsDocumentScannerOptions.Builder()
            
            // Set scanner mode
            val scannerMode = options.getString("scannerMode") ?: "full"
            if (scannerMode == "base") {
                optionsBuilder.setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_BASE)
            } else {
                optionsBuilder.setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_FULL)
            }

            // Set page limit
            if (options.hasKey("pageLimit")) {
                val pageLimit = options.getInt("pageLimit")
                if (pageLimit > 0) {
                    optionsBuilder.setPageLimit(pageLimit)
                }
            }

            // Set result format
            val resultFormat = options.getString("resultFormat") ?: "pdf"
            if (resultFormat == "jpeg") {
                optionsBuilder.setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_JPEG)
            } else {
                optionsBuilder.setResultFormats(
                    GmsDocumentScannerOptions.RESULT_FORMAT_PDF,
                    GmsDocumentScannerOptions.RESULT_FORMAT_JPEG
                )
            }

            // Enable gallery import if specified
            if (options.hasKey("allowGalleryImport") && options.getBoolean("allowGalleryImport")) {
                optionsBuilder.setGalleryImportAllowed(true)
            }

            val scanner = GmsDocumentScanning.getClient(optionsBuilder.build())
            val activity = reactApplicationContext.currentActivity
            
            if (activity != null) {
                // Store the promise to resolve it later in onActivityResult
                scannerPromise = promise
                
                scanner.getStartScanIntent(activity)
                    .addOnSuccessListener { intentSender ->
                        try {
                            activity.startIntentSenderForResult(
                                intentSender,
                                DOCUMENT_SCANNER_REQUEST_CODE,
                                null, 0, 0, 0
                            )
                            // Don't resolve promise here - wait for onActivityResult
                        } catch (e: Exception) {
                            scannerPromise = null
                            promise.reject("SCANNER_ERROR", "Failed to start scanner: ${e.message}")
                        }
                    }
                    .addOnFailureListener { e ->
                        scannerPromise = null
                        promise.reject("SCANNER_INIT_ERROR", "Failed to initialize scanner: ${e.message}")
                    }
            } else {
                promise.reject("NO_ACTIVITY", "Activity doesn't exist")
            }

        } catch (e: Exception) {
            promise.reject("SCANNER_ERROR", "Error starting document scanner: ${e.message}")
        }
    }



    override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == DOCUMENT_SCANNER_REQUEST_CODE && scannerPromise != null) {
            if (resultCode == Activity.RESULT_OK && data != null) {
                val result = GmsDocumentScanningResult.fromActivityResultIntent(data)
                
                if (result != null) {
                    try {
                        val resultMap = Arguments.createMap()
                        val pagesArray = Arguments.createArray()
                        
                        // Add pages
                        result.pages?.forEach { page ->
                            val pageMap = Arguments.createMap()
                            pageMap.putString("imageUri", page.imageUri.toString())
                            pagesArray.pushMap(pageMap)
                        }
                        
                        resultMap.putArray("pages", pagesArray)
                        resultMap.putBoolean("success", true)
                        
                        // Add PDF if available
                        result.pdf?.let { pdf ->
                            resultMap.putString("pdfUri", pdf.uri.toString())
                            resultMap.putInt("pdfPageCount", pdf.pageCount)
                        }
                        
                        scannerPromise?.resolve(resultMap)
                    } catch (e: Exception) {
                        scannerPromise?.reject("RESULT_PARSING_ERROR", "Failed to parse scanner result: ${e.message}")
                    }
                } else {
                    scannerPromise?.reject("NO_RESULT", "No scanning result received")
                }
            } else if (resultCode == Activity.RESULT_CANCELED) {
                scannerPromise?.reject("USER_CANCELED", "User canceled the scanning")
            } else {
                scannerPromise?.reject("SCANNER_ERROR", "Scanner failed with result code: $resultCode")
            }
            
            scannerPromise = null
        }
    }

    override fun onNewIntent(intent: Intent) {
        // Not needed for document scanner
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