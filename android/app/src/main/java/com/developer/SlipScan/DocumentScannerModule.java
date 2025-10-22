package com.developer.SlipScan;

import android.app.Activity;
import android.content.Intent;
import android.content.IntentSender;
import android.net.Uri;
import androidx.activity.result.ActivityResult;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import androidx.appcompat.app.AppCompatActivity;

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
import com.google.mlkit.vision.documentscanner.GmsDocumentScanning;
import com.google.mlkit.vision.documentscanner.GmsDocumentScanningResult;

import java.util.List;

public class DocumentScannerModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "DocumentScannerModule";
    private Promise scannerPromise;
    
    private final ActivityEventListener activityEventListener = new BaseActivityEventListener() {
        @Override
        public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent intent) {
            if (requestCode == 1001) {
                handleScanResult(resultCode, intent);
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
        this.scannerPromise = promise;
        
        try {
            // Configure ML Kit document scanner
            GmsDocumentScannerOptions.Builder optionsBuilder = new GmsDocumentScannerOptions.Builder()
                    .setGalleryImportAllowed(options.hasKey("allowGalleryImport") ? 
                        options.getBoolean("allowGalleryImport") : true)
                    .setPageLimit(options.hasKey("pageLimit") ? 
                        options.getInt("pageLimit") : 6)
                    .setScannerMode(options.hasKey("scannerMode") && 
                        "base".equals(options.getString("scannerMode")) ? 
                        GmsDocumentScannerOptions.SCANNER_MODE_BASE : 
                        GmsDocumentScannerOptions.SCANNER_MODE_FULL);

            // Set result format
            if (options.hasKey("resultFormat") && "pdf".equals(options.getString("resultFormat"))) {
                optionsBuilder.setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_JPEG, 
                                              GmsDocumentScannerOptions.RESULT_FORMAT_PDF);
            } else {
                optionsBuilder.setResultFormats(GmsDocumentScannerOptions.RESULT_FORMAT_JPEG);
            }

            GmsDocumentScannerOptions scannerOptions = optionsBuilder.build();
            GmsDocumentScanner scanner = GmsDocumentScanning.getClient(scannerOptions);

            // Start scanning
            Activity currentActivity = getCurrentActivity();
            if (currentActivity != null) {
                scanner.getStartScanIntent(currentActivity)
                    .addOnSuccessListener(intentSender -> {
                        try {
                            currentActivity.startIntentSenderForResult(intentSender, 1001, null, 0, 0, 0);
                        } catch (Exception e) {
                            if (scannerPromise != null) {
                                scannerPromise.reject("SCANNER_ERROR", 
                                    "Failed to start scanner intent: " + e.getMessage(), e);
                                scannerPromise = null;
                            }
                        }
                    })
                    .addOnFailureListener(exception -> {
                        if (scannerPromise != null) {
                            scannerPromise.reject("SCANNER_ERROR", 
                                "Failed to start scanner: " + exception.getMessage(), exception);
                            scannerPromise = null;
                        }
                    });
            } else {
                if (scannerPromise != null) {
                    scannerPromise.reject("NO_ACTIVITY", "No current activity available");
                    scannerPromise = null;
                }
            }
        } catch (Exception e) {
            if (scannerPromise != null) {
                scannerPromise.reject("SCANNER_INIT_ERROR", 
                    "Failed to initialize scanner: " + e.getMessage(), e);
                scannerPromise = null;
            }
        }
    }

    private void handleScanResult(int resultCode, Intent data) {
        if (scannerPromise == null) return;

        try {
            if (resultCode == Activity.RESULT_OK && data != null) {
                GmsDocumentScanningResult result = 
                    GmsDocumentScanningResult.fromActivityResultIntent(data);
                
                WritableMap response = Arguments.createMap();
                response.putBoolean("success", true);

                // Process pages
                WritableArray pages = Arguments.createArray();
                List<GmsDocumentScanningResult.Page> scanPages = result.getPages();
                
                if (scanPages != null) {
                    for (GmsDocumentScanningResult.Page page : scanPages) {
                        WritableMap pageMap = Arguments.createMap();
                        pageMap.putString("imageUri", page.getImageUri().toString());
                        pages.pushMap(pageMap);
                    }
                }
                response.putArray("pages", pages);

                // Add PDF info if available
                GmsDocumentScanningResult.Pdf pdf = result.getPdf();
                if (pdf != null) {
                    response.putString("pdfUri", pdf.getUri().toString());
                    response.putInt("pdfPageCount", pdf.getPageCount());
                }

                scannerPromise.resolve(response);
            } else {
                // User cancelled or error
                WritableMap response = Arguments.createMap();
                response.putBoolean("success", false);
                response.putString("error", "User cancelled or scanning failed");
                scannerPromise.resolve(response);
            }
        } catch (Exception e) {
            scannerPromise.reject("RESULT_PROCESSING_ERROR", 
                "Failed to process scan result: " + e.getMessage(), e);
        } finally {
            scannerPromise = null;
        }
    }
}