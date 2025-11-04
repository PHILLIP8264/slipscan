import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { ProcessedReceipt } from "../../types/receipt";
import { cleanupDuplicateCategories, getHardcodedCategories, initializeBudgetCategories, listCategories } from "../../utils/CRUD/categorycrud";
import { getReceiptById } from "../../utils/CRUD/receiptcrud";
import { Category, convertLocalReceiptToProcessed } from "../../utils/localdb";
import receiptBudgetIntegration from "../../utils/ReceiptBudgetIntegration";
import { useAuth } from "../contexts/AuthContext";

export default function ReceiptDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { authState } = useAuth();

  // Core state
  const [receipt, setReceipt] = useState<ProcessedReceipt | null>(null);
  const [originalImageUri, setOriginalImageUri] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit state
  const [editableData, setEditableData] = useState<Partial<ProcessedReceipt>>({});
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);

  // Category state
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [selectedItemIndex, setSelectedItemIndex] = useState<number>(-1);

  useEffect(() => {
    loadReceipt();
    loadCategories();
  }, []);
  

  console.log("its details");


  const loadCategories = async () => {
    try {
      // Clean up any duplicates and initialize default categories
      await cleanupDuplicateCategories();
      await initializeBudgetCategories();
      
      const categories = await listCategories();
      
      // Ensure we have the correct hardcoded categories
      const hardcodedCategories = getHardcodedCategories();
      const hardcodedNames = hardcodedCategories.map(c => c.name);
      
      // Filter to only include categories that match our hardcoded list
      // This ensures consistency with the auto budget updating system
      const validCategories = categories.filter(category => 
        hardcodedNames.includes(category.name)
      );
      
      console.log('ReceiptDetails - Available categories (matching hardcoded list):', validCategories.map(c => c.name));
      setCategories(validCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadReceipt = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!params.id) {
        throw new Error('No receipt ID provided');
      }

      console.log('📖 Loading existing receipt with ID:', params.id);
      const existingReceipt = await getReceiptById(params.id as string);
      
      if (!existingReceipt) {
        throw new Error('Receipt not found');
      }

      console.log('📖 Retrieved receipt from database:', JSON.stringify(existingReceipt, null, 2));
      
      // Convert Receipt to ProcessedReceipt format
      const processedReceiptData = convertLocalReceiptToProcessed(existingReceipt);
      
      console.log('🔄 Converted ProcessedReceipt:', JSON.stringify(processedReceiptData, null, 2));
      
      setReceipt(processedReceiptData);
      setEditableData(processedReceiptData);
      setOriginalImageUri(existingReceipt.imageUrl || '');
      
    } catch (error) {
      console.error('Failed to load receipt:', error);
      setError(error instanceof Error ? error.message : 'Failed to load receipt');
    } finally {
      setIsLoading(false);
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
    if (!editableData || !receipt) return;

    try {
      setIsSaving(true);
      
      console.log('💾 === SAVE EXISTING RECEIPT ===');
      console.log('📦 Original receipt:', JSON.stringify(receipt, null, 2));
      console.log('✏️ Editable data:', JSON.stringify(editableData, null, 2));
      
      // Create final receipt with proper deep merging to preserve all data
      const finalReceipt: ProcessedReceipt = deepMerge(receipt, {
        ...editableData,
        updatedAt: new Date().toISOString(),
      });

      console.log('💾 Final receipt to be saved:', JSON.stringify(finalReceipt, null, 2));

      // Get user email
      const userEmail = authState.lastUserEmail;
      if (!userEmail) {
        throw new Error('No authenticated user found');
      }

      // Use saveEditedReceipt for existing receipts
      console.log('📝 Calling saveEditedReceipt with budget integration...');
      const result = await receiptBudgetIntegration.saveEditedReceipt(
        finalReceipt,
        receipt.id,
        userEmail,
        authState.lastUserName || 'User'
      );
      
      console.log('🎯 Save result:', result);

      if (result.success) {
        // Update local state with saved data
        if (result.savedReceipt) {
          const updatedProcessedReceipt = convertLocalReceiptToProcessed(result.savedReceipt);
          setReceipt(updatedProcessedReceipt);
          setEditableData(updatedProcessedReceipt);
        }
        
        setIsEditing(false);
        Alert.alert('✅ Success', 'Receipt updated successfully!');
      } else {
        throw new Error(result.error || 'Failed to save receipt');
      }

    } catch (error) {
      console.error('Save error:', error);
      Alert.alert('❌ Save Failed', 'Failed to save receipt. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteReceipt = async () => {
    if (!receipt?.id) return;

    Alert.alert(
      "🗑️ Delete Receipt",
      "Are you sure you want to delete this receipt? This action cannot be undone and will reverse any budget impacts.",
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
              
              console.log('🗑️ DELETE RECEIPT - Starting deletion for receipt ID:', receipt.id);
              
              // Get current user email
              const userEmail = authState.lastUserEmail;
              if (!userEmail) {
                throw new Error('No authenticated user found');
              }

              // Use the utility to handle deletion with budget integration
              const result = await receiptBudgetIntegration.deleteReceipt(
                receipt.id,
                userEmail
              );

              if (result.success) {
                Alert.alert(
                  "✅ Deleted Successfully",
                  "Receipt has been deleted and budget impacts have been reversed.",
                  [
                    {
                      text: "OK",
                      onPress: () => router.back()
                    }
                  ]
                );
              } else {
                throw new Error(result.error || 'Failed to delete receipt');
              }

            } catch (error) {
              console.error('Delete error:', error);
              Alert.alert('❌ Delete Failed', 'Failed to delete receipt. Please try again.');
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

  // Loading State
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.loadingHeader}
        >
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.loadingHeaderTitle}>Loading Receipt...</Text>
        </LinearGradient>
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color="#667eea" />
          <Text style={styles.loadingText}>Loading receipt details...</Text>
        </View>
      </View>
    );
  }

  // Error State
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.errorHeader}
        >
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.errorHeaderTitle}>Error</Text>
        </LinearGradient>
        <View style={styles.errorContent}>
          <Ionicons name="alert-circle" size={60} color="#ff4444" />
          <Text style={styles.errorTitle}>Failed to Load Receipt</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity 
            style={styles.retryButton}
            onPress={loadReceipt}
          >
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Main Receipt Details View
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
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
              {editableData.merchant?.name || 'Receipt Information'}
            </Text>
          </View>
          
          <TouchableOpacity 
            style={[styles.editToggle, isEditing && styles.editToggleActive]}
            onPress={() => setIsEditing(!isEditing)}
            disabled={isSaving || isDeleting}
          >
            <Ionicons 
              name={isEditing ? "checkmark" : "pencil"} 
              size={20} 
              color={isEditing ? "#667eea" : "white"} 
            />
          </TouchableOpacity>
        </View>
      </LinearGradient>

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
                </View>
                
                <View style={styles.confidenceBadge}>
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
            style={[styles.modernSaveButton, (isSaving || !isEditing) && styles.modernSaveButtonDisabled]}
            onPress={handleSaveReceipt}
            disabled={isSaving || isDeleting || !isEditing}
          >
            <LinearGradient
              colors={(isSaving || !isEditing) ? ['#ccc', '#999'] : ['#667eea', '#764ba2']}
              style={styles.saveButtonGradient}
            >
              {isSaving ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={24} color="white" />
                  <Text style={styles.modernSaveButtonText}>
                    {isEditing ? 'Update Receipt' : 'Edit to Save'}
                  </Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* Delete Button */}
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
        </View>

        <View style={styles.modernBottomSpacing} />
      </ScrollView>
      
      {/* Image Preview Modal */}
      {showImagePreview && originalImageUri && (
        <View style={styles.imagePreviewModal}>
          <View style={styles.imagePreviewContainer}>
            <View style={styles.imagePreviewHeader}>
              <Text style={styles.imagePreviewTitle}>Receipt Image</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowImagePreview(false)}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <Image 
              source={{ uri: originalImageUri }} 
              style={styles.fullImage} 
              resizeMode="contain"
            />
          </View>
        </View>
      )}
      
      {/* Category Picker Modal */}
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
    backgroundColor: '#f5f7fa',
  },
  
  // Loading State
  loadingContainer: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  loadingHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 16,
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },

  // Error State
  errorContainer: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  errorHeader: {
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  errorHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    marginLeft: 16,
  },
  errorContent: {
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
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  retryButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },

  // Main UI
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
    flex: 0.6,
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

  // Image Preview Modal
  imagePreviewModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  imagePreviewContainer: {
    flex: 1,
    width: '100%',
  },
  imagePreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  imagePreviewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  fullImage: {
    flex: 1,
    width: '100%',
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
  categoryList: {
    maxHeight: 300,
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