package com.developer.SlipScan

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.*
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult

class DocumentScannerModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    companion object {
        private const val NAME = "DocumentScannerModule"
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
                scanner.getStartScanIntent(activity)
                    .addOnSuccessListener { intentSender ->
                        try {
                            activity.startIntentSenderForResult(
                                intentSender,
                                123, // request code
                                null, 0, 0, 0
                            )
                            promise.resolve("Scanner started successfully")
                        } catch (e: Exception) {
                            promise.reject("SCANNER_ERROR", "Failed to start scanner: ${e.message}")
                        }
                    }
                    .addOnFailureListener { e ->
                        promise.reject("SCANNER_INIT_ERROR", "Failed to initialize scanner: ${e.message}")
                    }
            } else {
                promise.reject("NO_ACTIVITY", "Activity doesn't exist")
            }

        } catch (e: Exception) {
            promise.reject("SCANNER_ERROR", "Error starting document scanner: ${e.message}")
        }
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