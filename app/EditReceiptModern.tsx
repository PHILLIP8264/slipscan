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
import receiptProcessingService from "../services/ReceiptProcessingService";
import { ProcessedReceipt } from "../types/receipt";
import { initializeBudgetCategories, listCategories } from "../utils/CRUD/categorycrud";
import { getReceiptById } from "../utils/CRUD/receiptcrud";
import { createUser, getUserByEmail } from "../utils/CRUD/usercrud";
import { Category, RelationshipHelpers, convertLocalReceiptToProcessed } from "../utils/localdb";
import { useAuth } from "./contexts/AuthContext";

interface ProcessingState {
  stage: 'extracting' | 'parsing' | 'categorizing' | 'storing' | 'complete' | 'error';
  message: string;
  progress: number;
}

export default function EditReceipt() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { authState } = useAuth();

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
  const [isDeleting, setIsDeleting] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [isExistingReceipt, setIsExistingReceipt] = useState(false);

  // Category state
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(-1);

  // Animation
  const progressAnim = useState(new Animated.Value(0))[0];
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    initializeReceipt();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      // Initialize default categories if needed
      await initializeBudgetCategories();
      const categoryList = await listCategories();
      setCategories(categoryList);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

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
      // Check if we have a receipt ID to load an existing receipt
      if (params.id) {
        console.log('Loading existing receipt with ID:', params.id);
        const existingReceipt = await getReceiptById(params.id as string);
        
        if (existingReceipt) {
          console.log('🔍 LOAD DEBUG - Raw receipt from database:', JSON.stringify(existingReceipt, null, 2));
          
          // Convert Receipt to ProcessedReceipt format using helper function
          const processedReceiptData = convertLocalReceiptToProcessed(existingReceipt);
          
          console.log('🔄 LOAD DEBUG - Converted ProcessedReceipt:', JSON.stringify(processedReceiptData, null, 2));
          
          setProcessedReceipt(processedReceiptData);
          setEditableData(processedReceiptData);
          setOriginalImageUri(existingReceipt.imageUrl || '');
          setIsExistingReceipt(true); // Mark as existing receipt
          setIsProcessing(false);
          setProcessingState({
            stage: 'complete',
            message: 'Receipt loaded successfully!',
            progress: 1.0
          });
          return;
        } else {
          throw new Error('Receipt not found');
        }
      }

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

  /**
   * Deep merge utility function to properly combine objects without losing data
   */
  const deepMerge = (target: any, source: any): any => {
    if (!source || typeof source !== 'object') return target;
    if (!target || typeof target !== 'object') return source;
    
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] !== undefined && source[key] !== null) {
        if (typeof source[key] === 'object' && !Array.isArray(source[key])) {
          result[key] = deepMerge(target[key] || {}, source[key]);
        } else {
          result[key] = source[key];
        }
      }
    }
    
    return result;
  };

  const handleSaveReceipt = async () => {
    if (!editableData) return;

    try {
      setIsSaving(true);
      
      console.log('📦 SAVE DEBUG - Original processedReceipt:', JSON.stringify(processedReceipt, null, 2));
      console.log('✏️ SAVE DEBUG - Editable data:', JSON.stringify(editableData, null, 2));
      
      // Create final receipt with proper deep merging to preserve all data
      const finalReceipt: ProcessedReceipt = deepMerge(processedReceipt!, {
        ...editableData,
        updatedAt: new Date().toISOString(),
      });

      console.log('💾 SAVE DEBUG - Final receipt to be saved:', JSON.stringify(finalReceipt, null, 2));
      console.log('🔍 SAVE DEBUG - Key fields check:');
      console.log('  - VAT/Tax:', finalReceipt.totals?.tax);
      console.log('  - Tip:', finalReceipt.totals?.tip);
      console.log('  - Payment Method:', finalReceipt.payment?.method);
      console.log('  - Items with categories:', finalReceipt.items?.map(item => ({ name: (item as any).name, category: (item as any).category })));

      // Get or create user for local database
      const userEmail = authState.lastUserEmail;
      if (!userEmail) {
        throw new Error('No authenticated user found');
      }

      let user = await getUserByEmail(userEmail);
      if (!user) {
        // Create user if doesn't exist
        user = await createUser({
          name: authState.lastUserName || 'User',
          email: userEmail,
        });
        console.log('✅ Created new user for email:', userEmail);
      }

      console.log('💾 Saving to local database for user:', user._id);

      // Save to local database using RelationshipHelpers
      const savedReceipt = await RelationshipHelpers.addProcessedReceiptToUser(
        user._id,
        finalReceipt,
        finalReceipt.originalImageUri
      );

      if (!savedReceipt) {
        throw new Error('Failed to save receipt to local database');
      }

      console.log('✅ Receipt saved to local database with ID:', savedReceipt._id);

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

  const handleDeleteReceipt = async () => {
    if (!processedReceipt?.id || !isExistingReceipt) return;

    Alert.alert(
      "🗑️ Delete Receipt",
      "Are you sure you want to delete this receipt? This action cannot be undone.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setIsDeleting(true);
              
              console.log('🗑️ DELETE RECEIPT - Starting deletion for receipt ID:', processedReceipt.id);
              
              // Get current user
              const userEmail = authState.lastUserEmail;
              if (!userEmail) {
                throw new Error('No authenticated user found');
              }

              const user = await getUserByEmail(userEmail);
              if (!user) {
                throw new Error('User not found in database');
              }
              
              // Delete from database and user relationship
              const deleted = await RelationshipHelpers.deleteReceiptFromUser(user._id, processedReceipt.id);
              
              if (deleted) {
                console.log('✅ Receipt deleted successfully');
                
                Alert.alert(
                  "✅ Receipt Deleted",
                  "The receipt has been successfully deleted from your collection.",
                  [
                    {
                      text: "OK",
                      onPress: () => router.push('/tabs/search') // Go back to search page
                    }
                  ]
                );
              } else {
                throw new Error('Failed to delete receipt');
              }
            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert("❌ Delete Failed", "Failed to delete receipt. Please try again.");
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  const updateItem = (itemIndex: number, field: string, value: any) => {
    if (!editableData.items) return;
    
    console.log(`🏷️ CATEGORY UPDATE - Item ${itemIndex}, Field: ${field}, Value:`, value);
    
    const updatedItems = [...editableData.items];
    updatedItems[itemIndex] = { ...updatedItems[itemIndex], [field]: value };
    
    setEditableData({
      ...editableData,
      items: updatedItems
    });

    console.log('📝 Updated editableData.items:', updatedItems.map(item => ({ 
      name: (item as any).name, 
      category: (item as any).category,
      categoryConfidence: (item as any).categoryConfidence 
    })));
  };

  const openCategoryPicker = (itemIndex: number) => {
    setSelectedItemIndex(itemIndex);
    setShowCategoryPicker(true);
  };

  const selectCategory = (category: Category) => {
    if (selectedItemIndex >= 0) {
      updateItem(selectedItemIndex, 'category', category.name);
      updateItem(selectedItemIndex, 'categoryConfidence', 1.0); // Manual selection = 100% confidence
    }
    setShowCategoryPicker(false);
    setSelectedItemIndex(-1);
  };

  const getCategoryColor = (categoryName?: string): string => {
    if (!categoryName) return '#E0E0E0'; // Default gray for uncategorized
    const category = categories.find(cat => cat.name === categoryName);
    return category?.color || '#E0E0E0';
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
    <View style={styles.modernContainer}>
      {/* Modern Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.modernHeader}
      >
        <View style={styles.modernHeaderContent}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.modernHeaderTitle}>Receipt Details</Text>
            <Text style={styles.modernHeaderSubtitle}>
              {editableData.merchant?.name || 'Processing complete'}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.editToggle, isEditing && styles.editToggleActive]}
            onPress={() => setIsEditing(!isEditing)}
          >
            <Ionicons 
              name={isEditing ? "checkmark" : "pencil"} 
              size={20} 
              color={isEditing ? "#667eea" : "white"} 
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <Animated.View style={[styles.modernContent, { opacity: fadeAnim }]}>
        <ScrollView style={styles.modernScrollView} showsVerticalScrollIndicator={false}>
          
          {/* Receipt Image Card */}
          {originalImageUri && (
            <View style={styles.modernCard}>
              <TouchableOpacity 
                style={styles.imageCard}
                onPress={() => setShowImagePreview(true)}
              >
                <View style={styles.imageIconContainer}>
                  <Ionicons name="image-outline" size={24} color="#667eea" />
                </View>
                <View style={styles.imageTextContainer}>
                  <Text style={styles.imageCardTitle}>Original Receipt</Text>
                  <Text style={styles.imageCardSubtitle}>Tap to view full image</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          )}

          {/* Merchant Information Card */}
          <View style={styles.modernCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="storefront-outline" size={20} color="#667eea" />
              </View>
              <Text style={styles.cardTitle}>Merchant Information</Text>
            </View>
            
            <View style={styles.cardContent}>
              <View style={styles.modernInputGroup}>
                <Text style={styles.modernLabel}>Store Name</Text>
                <TextInput
                  style={[styles.modernInput, !isEditing && styles.modernInputDisabled]}
                  value={editableData.merchant?.name || ''}
                  onChangeText={(text) => setEditableData({
                    ...editableData,
                    merchant: { ...editableData.merchant!, name: text }
                  })}
                  placeholder="Enter store name"
                  editable={isEditing}
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.modernInputGroup}>
                <Text style={styles.modernLabel}>Phone Number</Text>
                <TextInput
                  style={[styles.modernInput, !isEditing && styles.modernInputDisabled]}
                  value={(editableData.merchant as any)?.phone_number || ''}
                  onChangeText={(text) => setEditableData({
                    ...editableData,
                    merchant: { ...editableData.merchant!, phone_number: text } as any
                  })}
                  placeholder="Enter phone number"
                  editable={isEditing}
                  keyboardType="phone-pad"
                  placeholderTextColor="#999"
                />
              </View>

              <View style={styles.modernInputGroup}>
                <Text style={styles.modernLabel}>Address</Text>
                <TextInput
                  style={[styles.modernInput, styles.modernTextArea, !isEditing && styles.modernInputDisabled]}
                  value={
                    typeof editableData.merchant?.address === 'string' 
                      ? editableData.merchant.address 
                      : editableData.merchant?.address?.street || ''
                  }
                  onChangeText={(text) => setEditableData({
                    ...editableData,
                    merchant: { 
                      ...editableData.merchant!, 
                      address: text
                    } as any
                  })}
                  placeholder="Enter store address"
                  editable={isEditing}
                  multiline
                  numberOfLines={2}
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>

          {/* Transaction Details Card */}
          <View style={styles.modernCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="receipt-outline" size={20} color="#667eea" />
              </View>
              <Text style={styles.cardTitle}>Transaction Details</Text>
            </View>
            
            <View style={styles.cardContent}>
              <View style={styles.transactionRow}>
                <View style={styles.modernInputGroup}>
                  <Text style={styles.modernLabel}>Date</Text>
                  <TextInput
                    style={[styles.modernInput, !isEditing && styles.modernInputDisabled]}
                    value={editableData.transaction?.date || ''}
                    onChangeText={(text) => setEditableData({
                      ...editableData,
                      transaction: { ...editableData.transaction!, date: text }
                    })}
                    placeholder="DD/MM/YY"
                    editable={isEditing}
                    placeholderTextColor="#999"
                  />
                </View>
                
                <View style={styles.modernInputGroup}>
                  <Text style={styles.modernLabel}>Total Amount</Text>
                  <TextInput
                    style={[styles.modernInput, styles.totalAmountInput, !isEditing && styles.modernInputDisabled]}
                    value={`R${editableData.totals?.total?.toFixed(2) || '0.00'}`}
                    onChangeText={(text) => {
                      const amount = parseFloat(text.replace('R', '')) || 0;
                      setEditableData({
                        ...editableData,
                        totals: { 
                          tax: 0, 
                          tip: 0, 
                          confidence: 0.5,
                          ...editableData.totals, 
                          total: amount 
                        }
                      });
                    }}
                    placeholder="R0.00"
                    editable={isEditing}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Payment Summary Card */}
          <View style={styles.modernCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="card-outline" size={20} color="#667eea" />
              </View>
              <Text style={styles.cardTitle}>Payment Summary</Text>
            </View>

            <View style={styles.cardContent}>
              <View style={styles.transactionRow}>
                <View style={styles.modernInputGroup}>
                  <Text style={styles.modernLabel}>VAT/Tax</Text>
                  <TextInput
                    style={[styles.modernInput, !isEditing && styles.modernInputDisabled]}
                    value={`R${editableData.totals?.tax?.toFixed(2) || '0.00'}`}
                    onChangeText={(text) => {
                      const amount = parseFloat(text.replace('R', '')) || 0;
                      setEditableData({
                        ...editableData,
                        totals: { 
                          total: 0, 
                          tip: 0, 
                          confidence: 0.5,
                          ...editableData.totals, 
                          tax: amount 
                        }
                      });
                    }}
                    placeholder="R0.00"
                    editable={isEditing}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>

                <View style={styles.modernInputGroup}>
                  <Text style={styles.modernLabel}>Tip</Text>
                  <TextInput
                    style={[styles.modernInput, !isEditing && styles.modernInputDisabled]}
                    value={`R${editableData.totals?.tip?.toFixed(2) || '0.00'}`}
                    onChangeText={(text) => {
                      const amount = parseFloat(text.replace('R', '')) || 0;
                      setEditableData({
                        ...editableData,
                        totals: { 
                          total: 0, 
                          tax: 0, 
                          confidence: 0.5,
                          ...editableData.totals, 
                          tip: amount 
                        }
                      });
                    }}
                    placeholder="R0.00"
                    editable={isEditing}
                    keyboardType="numeric"
                    placeholderTextColor="#999"
                  />
                </View>
              </View>

              <View style={styles.modernInputGroup}>
                <Text style={styles.modernLabel}>Payment Method</Text>
                <TextInput
                  style={[styles.modernInput, !isEditing && styles.modernInputDisabled]}
                  value={editableData.payment?.method || 'Unknown'}
                  onChangeText={(text) => {
                    setEditableData({
                      ...editableData,
                      payment: { 
                        confidence: 0.5,
                        ...editableData.payment, 
                        method: text as any 
                      }
                    });
                  }}
                  placeholder="Payment method"
                  editable={isEditing}
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>

          {/* Items Card */}
          <View style={styles.modernCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="list-outline" size={20} color="#667eea" />
              </View>
              <Text style={styles.cardTitle}>
                Items ({editableData.items?.length || 0})
              </Text>
            </View>
            
            <View style={styles.cardContent}>
              {editableData.items?.map((item, index) => (
                <View key={index} style={styles.modernItemCard}>
                  <View style={styles.itemMainInfo}>
                    <TextInput
                      style={[styles.modernInput, styles.itemNameInput, !isEditing && styles.modernInputDisabled]}
                      value={item.name}
                      onChangeText={(text) => updateItem(index, 'name', text)}
                      placeholder="Item name"
                      editable={isEditing}
                      placeholderTextColor="#999"
                    />
                    
                    <TouchableOpacity 
                      style={[
                        styles.modernCategoryTag, 
                        { backgroundColor: getCategoryColor((item as any).category) },
                        !isEditing && styles.categoryTagDisabled
                      ]}
                      onPress={() => openCategoryPicker(index)}
                      disabled={!isEditing}
                    >
                      <Text style={styles.modernCategoryText}>
                        {(item as any).category || 'Uncategorized'}
                      </Text>
                      {isEditing && (
                        <Ionicons name="chevron-down" size={14} color="white" style={{ marginLeft: 4 }} />
                      )}
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.itemDetailsGrid}>
                    <View style={styles.modernInputGroup}>
                      <Text style={styles.modernLabel}>Quantity</Text>
                      <TextInput
                        style={[styles.modernInput, styles.modernQuantityInput, !isEditing && styles.modernInputDisabled]}
                        value={item.quantity?.toString() || '1'}
                        onChangeText={(text) => updateItem(index, 'quantity', parseInt(text) || 1)}
                        placeholder="1"
                        editable={isEditing}
                        keyboardType="numeric"
                        placeholderTextColor="#999"
                      />
                    </View>
                    
                    <View style={styles.modernInputGroup}>
                      <Text style={styles.modernLabel}>Unit Price</Text>
                      <TextInput
                        style={[styles.modernInput, styles.modernPriceInput, !isEditing && styles.modernInputDisabled]}
                        value={`R${((item as any).itemprice || (item as any).totalPrice || 0).toFixed(2)}`}
                        onChangeText={(text) => {
                          const amount = parseFloat(text.replace('R', '')) || 0;
                          updateItem(index, 'itemprice', amount);
                        }}
                        placeholder="R0.00"
                        editable={isEditing}
                        keyboardType="numeric"
                        placeholderTextColor="#999"
                      />
                    </View>
                    
                    <View style={styles.modernInputGroup}>
                      <Text style={styles.modernLabel}>Line Total</Text>
                      <TextInput
                        style={[styles.modernInput, styles.modernPriceInput, !isEditing && styles.modernInputDisabled]}
                        value={`R${((item as any).linetotal || (item as any).totalPrice || 0).toFixed(2)}`}
                        onChangeText={(text) => {
                          const amount = parseFloat(text.replace('R', '')) || 0;
                          updateItem(index, 'linetotal', amount);
                        }}
                        placeholder="R0.00"
                        editable={isEditing}
                        keyboardType="numeric"
                        placeholderTextColor="#999"
                      />
                    </View>
                    </View>                  <View style={styles.confidenceBadge}>
                    <Text style={styles.confidenceText}>
                      {Math.round(item.confidence * 100)}% confidence
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Notes Card */}
          <View style={styles.modernCard}>
            <View style={styles.cardHeader}>
              <View style={styles.cardIconContainer}>
                <Ionicons name="chatbubble-outline" size={20} color="#667eea" />
              </View>
              <Text style={styles.cardTitle}>Notes</Text>
            </View>
            
            <View style={styles.cardContent}>
              <TextInput
                style={[styles.modernInput, styles.modernTextArea, !isEditing && styles.modernInputDisabled]}
                value={editableData.notes || ''}
                onChangeText={(text) => setEditableData({
                  ...editableData,
                  notes: text
                })}
                placeholder="Add any additional notes..."
                editable={isEditing}
                multiline
                numberOfLines={3}
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.modernActionsContainer}>
            {/* Save Button */}
            <TouchableOpacity 
              style={[styles.modernSaveButton, isSaving && styles.modernSaveButtonDisabled]}
              onPress={handleSaveReceipt}
              disabled={isSaving || isDeleting}
            >
              <LinearGradient
                colors={isSaving ? ['#ccc', '#999'] : ['#667eea', '#764ba2']}
                style={styles.saveButtonGradient}
              >
                {isSaving ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={24} color="white" />
                    <Text style={styles.modernSaveButtonText}>Save Receipt</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>

            {/* Delete Button - Only show for existing receipts */}
            {isExistingReceipt && (
              <TouchableOpacity 
                style={[styles.modernDeleteButton, isDeleting && styles.modernDeleteButtonDisabled]}
                onPress={handleDeleteReceipt}
                disabled={isDeleting || isSaving}
              >
                <LinearGradient
                  colors={isDeleting ? ['#ccc', '#999'] : ['#ff6b6b', '#ee5a52']}
                  style={styles.deleteButtonGradient}
                >
                  {isDeleting ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={24} color="white" />
                      <Text style={styles.modernDeleteButtonText}>Delete</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.modernBottomSpacing} />
        </ScrollView>
      </Animated.View>
    </View>
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
      
      {/* Modern Category Picker Modal */}
      {showCategoryPicker && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.modernModal]}>
            <View style={styles.modernModalHeader}>
              <Text style={styles.modernModalTitle}>Select Category</Text>
              <Text style={styles.modernModalSubtitle}>Choose a category for this item</Text>
            </View>
            <ScrollView style={styles.categoryList} showsVerticalScrollIndicator={false}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category._id}
                  style={styles.modernCategoryOption}
                  onPress={() => selectCategory(category)}
                >
                  <View style={[styles.modernCategoryIcon, { backgroundColor: category.color }]}>
                    <Ionicons name="pricetag" size={16} color="white" />
                  </View>
                  <Text style={styles.modernCategoryOptionText}>{category.name}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#666" />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modernCancelButton}
              onPress={() => setShowCategoryPicker(false)}
            >
              <Text style={styles.modernCancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
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
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
    minWidth: 80,
    alignItems: 'center',
  },
  categoryText: {
    fontSize: 12,
    color: 'white',
    fontWeight: '500',
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
  // Category picker modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  categoryList: {
    maxHeight: 300,
  },
  categoryOption: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
  },
  categoryOptionText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
    padding: 12,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  
  // Modern UI Styles
  modernContainer: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  modernHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  modernHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 20,
  },
  modernHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 2,
  },
  modernHeaderSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  editToggle: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  editToggleActive: {
    backgroundColor: 'white',
  },
  modernContent: {
    flex: 1,
  },
  modernScrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  modernCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1d29',
  },
  cardContent: {
    padding: 20,
  },
  imageCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  imageIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f4ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  imageTextContainer: {
    flex: 1,
  },
  imageCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1d29',
    marginBottom: 2,
  },
  imageCardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  modernInputGroup: {
    marginBottom: 16,
  },
  modernLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  modernInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#1f2937',
  },
  modernInputDisabled: {
    backgroundColor: '#f9fafb',
    color: '#6b7280',
  },
  modernTextArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  transactionRow: {
    flexDirection: 'row',
    gap: 16,
  },
  totalAmountInput: {
    fontWeight: '600',
    color: '#059669',
  },
  modernItemCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  itemMainInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  itemNameInput: {
    flex: 1,
    fontWeight: '500',
  },
  modernCategoryTag: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 100,
    justifyContent: 'center',
  },
  categoryTagDisabled: {
    opacity: 0.7,
  },
  modernCategoryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  itemDetailsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  modernQuantityInput: {
    textAlign: 'center',
    fontWeight: '500',
  },
  modernPriceInput: {
    fontWeight: '500',
    color: '#059669',
  },
  confidenceBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
  },
  confidenceText: {
    fontSize: 12,
    color: '#0891b2',
    fontWeight: '500',
  },
  modernActionsContainer: {
    padding: 20,
    flexDirection: 'row',
    gap: 12,
  },
  modernSaveButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  modernSaveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  modernSaveButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
  modernDeleteButton: {
    flex: 0.6, // Make delete button smaller than save
    borderRadius: 16,
    overflow: 'hidden',
  },
  modernDeleteButtonDisabled: {
    opacity: 0.6,
  },
  deleteButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 6,
  },
  modernDeleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modernBottomSpacing: {
    height: 40,
  },
  
  // Modern Modal Styles
  modernModal: {
    borderRadius: 20,
    maxHeight: '80%',
  },
  modernModalHeader: {
    alignItems: 'center',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f2f5',
    marginBottom: 16,
  },
  modernModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1d29',
    marginBottom: 4,
  },
  modernModalSubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  modernCategoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  modernCategoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  modernCategoryOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  modernCancelButton: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  modernCancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '500',
  },
});