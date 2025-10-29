import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import databaseService from "../services/DatabaseService";
import receiptProcessingService from "../services/ReceiptProcessingService";
import { ProcessedReceipt } from "../types/receipt";

interface ProcessingState {
  stage: 'extracting' | 'parsing' | 'categorizing' | 'storing' | 'complete' | 'error';
  message: string;
  progress: number;
}

export default function EditReceipt() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Core state
  const [processedReceipt, setProcessedReceipt] = useState<ProcessedReceipt | null>(null);
  const [originalImageUri, setOriginalImageUri] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(true);
  const [processingState, setProcessingState] = useState<ProcessingState>({
    stage: 'extracting',
    message: 'Extracting text from receipt...',
    progress: 0.2
  });

  // Edit state
  const [editableData, setEditableData] = useState<Partial<ProcessedReceipt>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);

  // Animation
  const progressAnim = useState(new Animated.Value(0))[0];
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    initializeReceipt();
  }, []);

  useEffect(() => {
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: processingState.progress,
      duration: 500,
      useNativeDriver: false,
    }).start();

    // Fade in content when complete
    if (processingState.stage === 'complete') {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [processingState]);

  const initializeReceipt = async () => {
    try {
      // Check if we have pre-processed data
      if (params.receiptData) {
        let decoded: string;
        try {
          decoded = decodeURIComponent(params.receiptData as string);
        } catch (uriError) {
          console.warn('Failed to decode receipt data URI, using raw data:', uriError);
          decoded = params.receiptData as string;
        }
        const preProcessedData = JSON.parse(decoded);
        
        if (preProcessedData.id && preProcessedData.merchant) {
          // Already processed - use directly
          setProcessedReceipt(preProcessedData);
          setEditableData(preProcessedData);
          setIsProcessing(false);
          setProcessingState({
            stage: 'complete',
            message: 'Receipt processed successfully!',
            progress: 1.0
          });
          return;
        }
      }

      // Need to process the image
      if (params.imageUri) {
        let imageUri: string;
        try {
          imageUri = decodeURIComponent(params.imageUri as string);
        } catch (uriError) {
          console.warn('Failed to decode image URI, using raw URI:', uriError);
          imageUri = params.imageUri as string;
        }
        console.log(' Processing image:', imageUri);
        setOriginalImageUri(imageUri);
        await processReceiptWithStates(imageUri);
      } else {
        console.error(' No image or receipt data provided');
        throw new Error('No image or receipt data provided');
      }
    } catch (error) {
      console.error('Failed to initialize receipt:', error);
      setProcessingState({
        stage: 'error',
        message: 'Failed to process receipt',
        progress: 0
      });
      setIsProcessing(false);
    }
  };

  const processReceiptWithStates = async (imageUri: string) => {
    try {
      // Stage 1: Text Extraction
      setProcessingState({
        stage: 'extracting',
        message: '🔍 Extracting text using Google Vision API...',
        progress: 0.3
      });
      await new Promise(resolve => setTimeout(resolve, 1000)); // Visual delay

      // Stage 2: AI Parsing (no categorization)
      setProcessingState({
        stage: 'parsing',
        message: '🤖 AI parsing receipt structure (no categorization)...',
        progress: 0.7
      });
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Process the receipt
      const result = await receiptProcessingService.processReceipt(imageUri);

      if (result.success && result.receipt) {
        setProcessedReceipt(result.receipt);
        setEditableData(result.receipt);
        
        // Show JSON structure alert for debugging
        Alert.alert(
          "📋 Parsed JSON Structure", 
          JSON.stringify(result.receipt, null, 2),
          [{ text: "OK" }]
        );
        
        setProcessingState({
          stage: 'complete',
          message: ' Receipt parsed successfully!',
          progress: 1.0
        });
        
        await new Promise(resolve => setTimeout(resolve, 500));
        setIsProcessing(false);
      } else {
        throw new Error(result.error || 'Processing failed');
      }
    } catch (error) {
      console.error('Processing error:', error);
      setProcessingState({
        stage: 'error',
        message: ` Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        progress: 0
      });
      setIsProcessing(false);
    }
  };

  const handleSaveReceipt = async () => {
    if (!editableData) return;

    try {
      setIsSaving(true);
      
      // Create final receipt with edits
      const finalReceipt: ProcessedReceipt = {
        ...processedReceipt!,
        ...editableData,
        updatedAt: new Date().toISOString(),
      };

      // Save to database
      await databaseService.storeReceipt(finalReceipt);

      Alert.alert(
        "✅ Receipt Saved!",
        "Your receipt has been successfully saved to your collection.",
        [
          {
            text: "View All Receipts",
            onPress: () => router.push('/tabs/search')
          },
          {
            text: "Scan Another",
            onPress: () => router.push('/tabs')
          }
        ]
      );
    } catch (error) {
      console.error('Save error:', error);
      Alert.alert(" Save Failed", "Failed to save receipt. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const updateItem = (itemIndex: number, field: string, value: any) => {
    if (!editableData.items) return;
    
    const updatedItems = [...editableData.items];
    updatedItems[itemIndex] = { ...updatedItems[itemIndex], [field]: value };
    
    setEditableData({
      ...editableData,
      items: updatedItems
    });
  };

  const renderProcessingState = () => (
    <View style={styles.processingContainer}>
      <LinearGradient
        colors={['#4285F4', '#34A853']}
        style={styles.processingHeader}
      >
        <Ionicons name="receipt" size={40} color="white" />
        <Text style={styles.processingTitle}>Processing Receipt</Text>
        <Text style={styles.processingSubtitle}>AI-powered receipt analysis</Text>
      </LinearGradient>

      <View style={styles.processingContent}>
        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <Animated.View 
              style={[
                styles.progressBar, 
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%']
                  })
                }
              ]} 
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round(processingState.progress * 100)}%
          </Text>
        </View>

        {/* Current Stage */}
        <View style={styles.stageContainer}>
          <ActivityIndicator 
            size="large" 
            color="#4285F4" 
            style={styles.spinner}
          />
          <Text style={styles.stageMessage}>{processingState.message}</Text>
        </View>

        {/* Processing Steps */}
        <View style={styles.stepsContainer}>
          {[
            { key: 'extracting', label: 'Extract Text', icon: 'scan' },
            { key: 'parsing', label: 'Parse Structure', icon: 'document-text' },
            { key: 'categorizing', label: 'Categorize Items', icon: 'pricetags' },
            { key: 'complete', label: 'Complete', icon: 'checkmark-circle' }
          ].map((step, index) => (
            <View key={step.key} style={styles.stepItem}>
              <View style={[
                styles.stepIcon,
                processingState.stage === step.key && styles.stepIconActive,
                (index < getStageIndex(processingState.stage)) && styles.stepIconComplete
              ]}>
                <Ionicons 
                  name={step.icon as any} 
                  size={16} 
                  color={
                    processingState.stage === step.key ? '#4285F4' :
                    (index < getStageIndex(processingState.stage)) ? '#34A853' : '#ccc'
                  } 
                />
              </View>
              <Text style={[
                styles.stepLabel,
                processingState.stage === step.key && styles.stepLabelActive
              ]}>
                {step.label}
              </Text>
            </View>
          ))}
        </View>

        {originalImageUri && (
          <View style={styles.imagePreview}>
            <Text style={styles.imagePreviewTitle}>Processing this receipt:</Text>
            <Image source={{ uri: originalImageUri }} style={styles.previewImage} />
          </View>
        )}
      </View>
    </View>
  );

  const renderReceiptEditor = () => (
    <Animated.View style={[styles.editorContainer, { opacity: fadeAnim }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <LinearGradient
          colors={['#4285F4', '#34A853']}
          style={styles.editorHeader}
        >
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Review Receipt</Text>
            <Text style={styles.headerSubtitle}>
              Confidence: {Math.round((processedReceipt?.confidence.overall || 0) * 100)}%
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.editButton}
            onPress={() => setIsEditing(!isEditing)}
          >
            <Ionicons name={isEditing ? "checkmark" : "pencil"} size={20} color="white" />
          </TouchableOpacity>
        </LinearGradient>

        {/* Receipt Image */}
        {originalImageUri && (
          <View style={styles.imageSection}>
            <TouchableOpacity onPress={() => setShowImagePreview(true)}>
              <Image source={{ uri: originalImageUri }} style={styles.receiptImage} />
            </TouchableOpacity>
          </View>
        )}

        {/* Merchant Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Store Information</Text>
          <View style={styles.infoCard}>
            <TextInput
              style={[styles.input, styles.merchantName]}
              value={editableData.merchant?.name || ''}
              onChangeText={(text) => setEditableData({
                ...editableData,
                merchant: { ...editableData.merchant!, name: text }
              })}
              placeholder="Store name"
              editable={isEditing}
            />
            <TextInput
              style={styles.input}
              value={(editableData.merchant as any)?.phone_number || ''}
              onChangeText={(text) => setEditableData({
                ...editableData,
                merchant: { ...editableData.merchant!, phone_number: text } as any
              })}
              placeholder="Phone number"
              editable={isEditing}
              keyboardType="phone-pad"
            />
            <TextInput
              style={styles.input}
              value={(editableData.merchant as any)?.address || editableData.merchant?.address?.street || ''}
              onChangeText={(text) => setEditableData({
                ...editableData,
                merchant: { 
                  ...editableData.merchant!, 
                  address: text
                } as any
              })}
              placeholder="Address"
              editable={isEditing}
              multiline
            />
          </View>
        </View>

        {/* Transaction Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transaction Details</Text>
          <View style={styles.infoCard}>
            <View style={styles.row}>
              <Text style={styles.label}>Date:</Text>
              <TextInput
                style={styles.input}
                value={editableData.transaction?.date || ''}
                onChangeText={(text) => setEditableData({
                  ...editableData,
                  transaction: { ...editableData.transaction!, date: text }
                })}
                placeholder="Transaction date"
                editable={isEditing}
              />
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>Total:</Text>
              <TextInput
                style={[styles.input, styles.totalInput]}
                value={`R${editableData.totals?.total?.toFixed(2) || '0.00'}`}
                onChangeText={(text) => {
                  const amount = parseFloat(text.replace('R', '')) || 0;
                  setEditableData({
                    ...editableData,
                    totals: { ...editableData.totals!, total: amount }
                  });
                }}
                placeholder="R0.00"
                editable={isEditing}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items ({editableData.items?.length || 0})</Text>
          {editableData.items?.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <TextInput
                  style={[styles.input, styles.itemName]}
                  value={item.name}
                  onChangeText={(text) => updateItem(index, 'name', text)}
                  placeholder="Item name"
                  editable={isEditing}
                />
                <View style={styles.itemMeta}>
                  <Text style={styles.categoryTag}>
                    No Category
                  </Text>
                  <Text style={styles.confidenceTag}>
                    {Math.round(item.confidence * 100)}%
                  </Text>
                </View>
              </View>
              <View style={styles.itemDetails}>
                <View style={styles.itemField}>
                  <Text style={styles.fieldLabel}>Qty</Text>
                  <TextInput
                    style={styles.quantityInput}
                    value={item.quantity?.toString() || '1'}
                    onChangeText={(text) => updateItem(index, 'quantity', parseInt(text) || 1)}
                    placeholder="1"
                    editable={isEditing}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.itemField}>
                  <Text style={styles.fieldLabel}>Unit Price</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={`R${((item as any).itemprice || (item as any).totalPrice || 0).toFixed(2)}`}
                    onChangeText={(text) => {
                      const amount = parseFloat(text.replace('R', '')) || 0;
                      updateItem(index, 'itemprice', amount);
                    }}
                    placeholder="R0.00"
                    editable={isEditing}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.itemField}>
                  <Text style={styles.fieldLabel}>Line Total</Text>
                  <TextInput
                    style={styles.priceInput}
                    value={`R${((item as any).linetotal || (item as any).totalPrice || 0).toFixed(2)}`}
                    onChangeText={(text) => {
                      const amount = parseFloat(text.replace('R', '')) || 0;
                      updateItem(index, 'linetotal', amount);
                    }}
                    placeholder="R0.00"
                    editable={isEditing}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={editableData.notes || ''}
            onChangeText={(text) => setEditableData({
              ...editableData,
              notes: text
            })}
            placeholder="Add any additional notes..."
            editable={isEditing}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          onPress={handleSaveReceipt}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <Ionicons name="save" size={20} color="white" />
              <Text style={styles.saveButtonText}>Save Receipt</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </Animated.View>
  );

  const getStageIndex = (stage: string) => {
    const stages = ['extracting', 'parsing', 'categorizing', 'complete'];
    return stages.indexOf(stage);
  };

  if (processingState.stage === 'error') {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={60} color="#ff4444" />
        <Text style={styles.errorTitle}>Processing Failed</Text>
        <Text style={styles.errorMessage}>{processingState.message}</Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={() => router.back()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {isProcessing ? renderProcessingState() : renderReceiptEditor()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  
  // Processing States
  processingContainer: {
    flex: 1,
  },
  processingHeader: {
    padding: 40,
    alignItems: 'center',
    paddingTop: 60,
  },
  processingTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginTop: 10,
  },
  processingSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  processingContent: {
    flex: 1,
    padding: 20,
  },
  progressContainer: {
    marginBottom: 30,
  },
  progressTrack: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4285F4',
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'center',
    marginTop: 10,
    fontSize: 16,
    fontWeight: '600',
    color: '#4285F4',
  },
  stageContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  spinner: {
    marginBottom: 15,
  },
  stageMessage: {
    fontSize: 18,
    textAlign: 'center',
    color: '#333',
    fontWeight: '500',
  },
  stepsContainer: {
    marginBottom: 30,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 10,
  },
  stepIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  stepIconActive: {
    backgroundColor: '#e3f2fd',
    borderWidth: 2,
    borderColor: '#4285F4',
  },
  stepIconComplete: {
    backgroundColor: '#e8f5e8',
  },
  stepLabel: {
    fontSize: 16,
    color: '#666',
  },
  stepLabelActive: {
    color: '#4285F4',
    fontWeight: '600',
  },
  imagePreview: {
    alignItems: 'center',
    marginTop: 20,
  },
  imagePreviewTitle: {
    fontSize: 16,
    marginBottom: 10,
    color: '#666',
  },
  previewImage: {
    width: 200,
    height: 250,
    borderRadius: 10,
    resizeMode: 'cover',
  },

  // Editor
  editorContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  editorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    marginLeft: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  editButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  imageSection: {
    padding: 20,
    alignItems: 'center',
  },
  receiptImage: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    resizeMode: 'cover',
  },
  section: {
    margin: 20,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  infoCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  merchantName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 10,
    minWidth: 60,
  },
  totalInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  itemCard: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  itemName: {
    flex: 1,
    marginRight: 10,
    fontWeight: '500',
  },
  itemMeta: {
    alignItems: 'flex-end',
  },
  categoryTag: {
    fontSize: 12,
    color: '#4285F4',
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  confidenceTag: {
    fontSize: 11,
    color: '#666',
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  priceInput: {
    fontWeight: 'bold',
    color: '#34A853',
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    padding: 8,
    backgroundColor: '#f9f9f9',
  },
  quantityInput: {
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 4,
    padding: 8,
    backgroundColor: '#f9f9f9',
  },
  itemField: {
    flex: 1,
    marginHorizontal: 5,
  },
  fieldLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  notesInput: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#4285F4',
    margin: 20,
    padding: 18,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4285F4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  bottomSpacing: {
    height: 40,
  },

  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ff4444',
    marginTop: 20,
    marginBottom: 10,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});