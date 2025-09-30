package com.developer.SlipScan;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.BaseActivityEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableMap;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableMap;
import com.google.mlkit.vision.documentscanner.GmsDocumentScanner;
import com.google.mlkit.vision.documentscanner.GmsDocumentScannerOptions;
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult;

import android.app.Activity;
import android.content.Intent;
import android.content.IntentSender;
import android.util.Log;
import androidx.activity.result.IntentSenderRequest;

public class DocumentScannerModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "DocumentScannerModule";
    private static final int DOCUMENT_SCANNER_REQUEST = 1001;
    private static final String TAG = "DocumentScannerModule";
    
    private Promise scannerPromise;
    private GmsDocumentScanner scanner;

    private final ActivityEventListener activityEventListener = new BaseActivityEventListener() {
        @Override
        public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
            if (requestCode == DOCUMENT_SCANNER_REQUEST && scannerPromise != null) {
                handleScanResult(resultCode, data);
            }
        }
    };

    public DocumentScannerModule(ReactApplicationContext reactContext) {
        super(reactContext);
        reactContext.addActivityEventListener(activityEventListener);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void startScanning(ReadableMap options, Promise promise) {
        try {
            this.scannerPromise = promise;
            
            // Parse options
            int pageLimit = options.hasKey("pageLimit") ? options.getInt("pageLimit") : 5;
            boolean allowGalleryImport = options.hasKey("allowGalleryImport") ? 
                options.getBoolean("allowGalleryImport") : true;
            String scannerMode = options.hasKey("scannerMode") ? 
                options.getString("scannerMode") : "full";
            String resultFormat = options.hasKey("resultFormat") ? 
                options.getString("resultFormat") : "jpeg";

            // Build scanner options
            GmsDocumentScannerOptions.Builder optionsBuilder = new GmsDocumentScannerOptions.Builder()
                    .setPageLimit(pageLimit)
                    .setGalleryImportAllowed(allowGalleryImport);

            // Set scanner mode
            if ("base".equals(scannerMode)) {
                optionsBuilder.setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_BASE);
            } else {
                optionsBuilder.setScannerMode(GmsDocumentScannerOptions.SCANNER_MODE_FULL);
            }

            // Set result format
            if ("pdf".equals(resultFormat)) {
                optionsBuilder.setResultFormats(
                    GmsDocumentScannerOptions.RESULT_FORMAT_PDF, 
                    GmsDocumentScannerOptions.RESULT_FORMAT_JPEG
                );
            } else {
                optionsBuilder.setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_JPEG);
            }

            // Create scanner
            scanner = com.google.mlkit.vision.documentscanner.GmsDocumentScanning
                    .getClient(optionsBuilder.build());

            // Start scanning
            Activity currentActivity = getCurrentActivity();
            if (currentActivity == null) {
                promise.reject("NO_ACTIVITY", "No current activity available");
                return;
            }

            scanner.getStartScanIntent(currentActivity)
                    .addOnSuccessListener(intentSender -> {
                        try {
                            IntentSenderRequest intentRequest = new IntentSenderRequest.Builder(intentSender).build();
                            currentActivity.startIntentSenderForResult(
                                intentSender,
                                DOCUMENT_SCANNER_REQUEST,
                                null,
                                0,
                                0,
                                0
                            );
                        } catch (IntentSender.SendIntentException e) {
                            Log.e(TAG, "Failed to start scanner", e);
                            promise.reject("SCANNER_ERROR", "Failed to start scanner: " + e.getMessage());
                        }
                    })
                    .addOnFailureListener(e -> {
                        Log.e(TAG, "Failed to get scan intent", e);
                        promise.reject("SCANNER_ERROR", "Failed to initialize scanner: " + e.getMessage());
                    });

        } catch (Exception e) {
            Log.e(TAG, "Error starting scanner", e);
            promise.reject("SCANNER_ERROR", "Error starting scanner: " + e.getMessage());
        }
    }

    private void handleScanResult(int resultCode, Intent data) {
        try {
            if (resultCode == Activity.RESULT_OK && data != null) {
                GmsDocumentScanningResult result = 
                    GmsDocumentScanningResult.fromActivityResultIntent(data);

                if (result != null) {
                    WritableMap scanResult = Arguments.createMap();
                    scanResult.putBoolean("success", true);

                    // Process pages
                    WritableArray pages = Arguments.createArray();
                    if (result.getPages() != null) {
                        for (GmsDocumentScanningResult.Page page : result.getPages()) {
                            WritableMap pageMap = Arguments.createMap();
                            pageMap.putString("imageUri", page.getImageUri().toString());
                            pages.pushMap(pageMap);
                        }
                    }
                    scanResult.putArray("pages", pages);

                    // Add PDF info if available
                    if (result.getPdf() != null) {
                        scanResult.putString("pdfUri", result.getPdf().getUri().toString());
                        scanResult.putInt("pdfPageCount", result.getPdf().getPageCount());
                    }

                    scannerPromise.resolve(scanResult);
                } else {
                    scannerPromise.reject("NO_RESULT", "No scan result received");
                }
            } else if (resultCode == Activity.RESULT_CANCELED) {
                scannerPromise.reject("USER_CANCELED", "User canceled scanning");
            } else {
                scannerPromise.reject("SCAN_FAILED", "Scan failed with result code: " + resultCode);
            }
        } catch (Exception e) {
            Log.e(TAG, "Error processing scan result", e);
            scannerPromise.reject("RESULT_ERROR", "Error processing scan result: " + e.getMessage());
        } finally {
            scannerPromise = null;
        }
    }
}