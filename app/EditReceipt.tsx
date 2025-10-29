import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
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
import { getBudgetByMonth, updateBudget } from "../utils/CRUD/budgetcrud";
import { ReceiptData } from "../utils/OCRModule";
import ReceiptManager, { ReceiptCategory } from "../utils/ReceiptManager";

interface EditableReceiptData {
  merchant: string;
  total: string;
  date: string;
  items: Array<{ 
    name: string; 
    price: string; 
    id: string;
    quantity?: string;
    category?: string;
    subcategory?: string;
    categoryConfidence?: number;
  }>;
  category: string;
  notes: string;
  paymentMethod: string;
  tax: string;
  // Enhanced store details
  storeDetails: {
    name: string;
    address: string;
    phone: string;
    email?: string;
    website?: string;
    storeId?: string;
    cashierName?: string;
    registerNumber?: string;
  };
  // Enhanced tax information
  taxInfo: {
    taxAmount: string;
    taxRate?: string;
    vatAmount?: string;
    vatRate?: string;
    subtotal: string;
    taxableAmount?: string;
    exemptAmount?: string;
  };
  // Payment information
  paymentInfo: {
    paymentMethod?: string;
    cardType?: string;
    cardLast4?: string;
    changeAmount?: string;
    tenderedAmount?: string;
  };
  // Receipt metadata
  receiptMetadata: {
    receiptNumber?: string;
    transactionId?: string;
    batchNumber?: string;
    timestamp?: string;
    currency?: string;
    locale?: string;
  };
}

export default function EditReceipt() {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse the receipt data from navigation params
  const [receiptData, setReceiptData] = useState<EditableReceiptData | null>(
    null
  );
  const [originalImageUri, setOriginalImageUri] = useState<string>("");
  const [categories, setCategories] = useState<ReceiptCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);

  useEffect(() => {
    initializeData();
    loadCategories();
  }, []);

  const initializeData = () => {
    try {
      if (params.receiptData && params.imageUri) {
        // params are passed via query string and URI-encoded; decode before parsing
        let decoded: string;
        try {
          decoded = decodeURIComponent(params.receiptData as string);
        } catch (uriError) {
          console.warn('Failed to decode URI, using raw data:', uriError);
          decoded = params.receiptData as string;
        }
        const parsedData = JSON.parse(decoded);

        // Transform OCR data to editable format
        const editableData: EditableReceiptData = {
          merchant: parsedData.merchant || "",
          total: parsedData.total || "0.00",
          date: parsedData.date || new Date().toLocaleDateString(),
          items:
            parsedData.items?.map((item: any, index: number) => ({
              ...item,
              id: `item_${index}`,
            })) || [],
          category: parsedData.category || "Other",
          notes: "",
          paymentMethod: parsedData.paymentInfo?.paymentMethod || "Card",
          tax: parsedData.taxInfo?.taxAmount || parsedData.taxAmount || "0.00",
          storeDetails: {
            name: parsedData.storeDetails?.name || parsedData.merchant || "",
            address: parsedData.storeDetails?.address || "",
            phone: parsedData.storeDetails?.phone || "",
            email: parsedData.storeDetails?.email || "",
            website: parsedData.storeDetails?.website || "",
            storeId: parsedData.storeDetails?.storeId || "",
            cashierName: parsedData.storeDetails?.cashierName || "",
            registerNumber: parsedData.storeDetails?.registerNumber || ""
          },
          taxInfo: {
            taxAmount: parsedData.taxInfo?.taxAmount || parsedData.taxAmount || "0.00",
            taxRate: parsedData.taxInfo?.taxRate || "",
            vatAmount: parsedData.taxInfo?.vatAmount || "",
            vatRate: parsedData.taxInfo?.vatRate || "",
            subtotal: parsedData.taxInfo?.subtotal || parsedData.subtotal || "0.00",
            taxableAmount: parsedData.taxInfo?.taxableAmount || "",
            exemptAmount: parsedData.taxInfo?.exemptAmount || ""
          },
          paymentInfo: {
            paymentMethod: parsedData.paymentInfo?.paymentMethod || "",
            cardType: parsedData.paymentInfo?.cardType || "",
            cardLast4: parsedData.paymentInfo?.cardLast4 || "",
            changeAmount: parsedData.paymentInfo?.changeAmount || "",
            tenderedAmount: parsedData.paymentInfo?.tenderedAmount || ""
          },
          receiptMetadata: {
            receiptNumber: parsedData.receiptMetadata?.receiptNumber || "",
            transactionId: parsedData.receiptMetadata?.transactionId || "",
            batchNumber: parsedData.receiptMetadata?.batchNumber || "",
            timestamp: parsedData.receiptMetadata?.timestamp || "",
            currency: parsedData.receiptMetadata?.currency || "ZAR",
            locale: parsedData.receiptMetadata?.locale || "en-ZA"
          }
        };

        setReceiptData(editableData);
        
        // Safely decode image URI
        try {
          setOriginalImageUri(decodeURIComponent(params.imageUri as string));
        } catch (uriError) {
          console.warn('Failed to decode image URI, using raw URI:', uriError);
          setOriginalImageUri(params.imageUri as string);
        }
      }
    } catch (error) {
      console.error("Error parsing receipt data:", error);
      Alert.alert("Error", "Failed to load receipt data");
      router.back();
    }
  };

  const loadCategories = async () => {
    try {
      const cats = await ReceiptManager.getCategories();
      setCategories(cats);
    } catch (error) {
      console.error("Error loading categories:", error);
    }
  };

  const updateField = (field: keyof EditableReceiptData, value: string) => {
    if (!receiptData) return;
    setReceiptData({ ...receiptData, [field]: value });
  };

  const updateItem = (
    itemId: string,
    field: "name" | "price",
    value: string
  ) => {
    if (!receiptData) return;

    const updatedItems = receiptData.items.map((item) =>
      item.id === itemId ? { ...item, [field]: value } : item
    );

    setReceiptData({ ...receiptData, items: updatedItems });
  };

  const addItem = () => {
    if (!receiptData) return;

    const newItem = {
      id: `item_${Date.now()}`,
      name: "",
      price: "0.00",
    };

    setReceiptData({
      ...receiptData,
      items: [...receiptData.items, newItem],
    });
  };

  const removeItem = (itemId: string) => {
    if (!receiptData) return;

    const updatedItems = receiptData.items.filter((item) => item.id !== itemId);
    setReceiptData({ ...receiptData, items: updatedItems });
  };

  const calculateItemsTotal = () => {
    if (!receiptData) return 0;

    return receiptData.items.reduce((sum, item) => {
      const price = parseFloat(item.price) || 0;
      return sum + price;
    }, 0);
  };

  const deductFromBudget = async (amount: number, categoryName: string) => {
    try {
      // Get current month budget
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      const budget = await getBudgetByMonth(currentMonth);
      
      if (!budget) {
        console.log("No budget found for current month, skipping budget deduction");
        return;
      }

      // Find the category budget to deduct from
      const categoryBudget = budget.categoryBudgets.find(cb => cb.categoryName === categoryName);
      
      if (!categoryBudget) {
        console.log(`No budget found for category: ${categoryName}, skipping deduction`);
        return;
      }

      // Calculate new spent amount and remaining amount
      const newSpent = categoryBudget.spent + amount;
      const newRemaining = categoryBudget.budgetAmount - newSpent;

      // Update the category budget
      const updatedCategoryBudgets = budget.categoryBudgets.map(cb => 
        cb.categoryName === categoryName 
          ? { ...cb, spent: newSpent, remainingAmount: newRemaining }
          : cb
      );

      // Update the budget in database
      await updateBudget(budget._id, { categoryBudgets: updatedCategoryBudgets });

      // Show budget impact notification
      if (newRemaining <= 0) {
        Alert.alert(
          "⚠️ Budget Exceeded!",
          `You've exceeded your ${categoryName} budget by $${Math.abs(newRemaining).toFixed(2)}!`,
          [{ text: "OK" }]
        );
      } else if (newRemaining <= categoryBudget.budgetAmount * 0.1) {
        Alert.alert(
          "🚨 Budget Warning",
          `Only $${newRemaining.toFixed(2)} remaining in your ${categoryName} budget!`,
          [{ text: "OK" }]
        );
      }

    } catch (error) {
      console.error("Error deducting from budget:", error);
      // Don't fail the receipt save if budget update fails
    }
  };

  const saveReceipt = async () => {
    if (!receiptData) return;

    try {
      setIsLoading(true);

      // Validate required fields
      if (!receiptData.merchant.trim()) {
        Alert.alert("Validation Error", "Merchant name is required");
        return;
      }

      if (!receiptData.total || parseFloat(receiptData.total) <= 0) {
        Alert.alert("Validation Error", "Total amount must be greater than 0");
        return;
      }

      // Transform back to ReceiptData format
      const finalReceiptData: ReceiptData = {
        merchant: receiptData.merchant.trim(),
        total: receiptData.total,
        date: receiptData.date,
        items: receiptData.items.filter((item) => item.name.trim() !== ""),
        rawText: `Edited Receipt - ${receiptData.merchant}`,
        confidence: 1.0, // User verified data
        storeDetails: receiptData.storeDetails,
        taxInfo: receiptData.taxInfo,
        paymentInfo: receiptData.paymentInfo,
        receiptMetadata: receiptData.receiptMetadata
      };

      // Save to storage
      const savedReceipt = await ReceiptManager.saveReceipt(
        finalReceiptData,
        originalImageUri,
        undefined, // pdfUri
        receiptData.category,
        receiptData.notes
      );

      // Automatically deduct from budget if category is selected
      if (receiptData.category && receiptData.category !== "Other") {
        await deductFromBudget(parseFloat(receiptData.total), receiptData.category);
      }

      Alert.alert(
        "Receipt Saved! ✅",
        `${savedReceipt.merchant} - $${savedReceipt.total} has been saved to your receipts.${
          receiptData.category && receiptData.category !== "Other" 
            ? `\n\n💰 Automatically deducted from your ${receiptData.category} budget.`
            : ""
        }`,
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error("Error saving receipt:", error);
      Alert.alert("Error", "Failed to save receipt. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!receiptData) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading receipt data...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Receipt</Text>
        <TouchableOpacity
          style={styles.imageButton}
          onPress={() => setShowImagePreview(!showImagePreview)}
        >
          <Ionicons name="image" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView}>
        {/* Original Image Preview */}
        {showImagePreview && originalImageUri && (
          <View style={styles.imagePreviewContainer}>
            <Image
              source={{ uri: originalImageUri }}
              style={styles.imagePreview}
            />
          </View>
        )}

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Merchant Name *</Text>
            <TextInput
              style={styles.input}
              value={receiptData.merchant}
              onChangeText={(value) => updateField("merchant", value)}
              placeholder="Enter merchant name"
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.flex1]}>
              <Text style={styles.label}>Total Amount *</Text>
              <TextInput
                style={styles.input}
                value={receiptData.total}
                onChangeText={(value) => updateField("total", value)}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>

            <View
              style={[styles.inputContainer, styles.flex1, styles.marginLeft]}
            >
              <Text style={styles.label}>Tax</Text>
              <TextInput
                style={styles.input}
                value={receiptData.tax}
                onChangeText={(value) => updateField("tax", value)}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Date</Text>
            <TextInput
              style={styles.input}
              value={receiptData.date}
              onChangeText={(value) => updateField("date", value)}
              placeholder="MM/DD/YYYY"
            />
          </View>
        </View>

        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  receiptData.category === category.id &&
                    styles.categoryButtonSelected,
                ]}
                onPress={() => updateField("category", category.id)}
              >
                <Ionicons
                  name={category.icon as any}
                  size={20}
                  color={
                    receiptData.category === category.id
                      ? "#fff"
                      : category.color
                  }
                />
                <Text
                  style={[
                    styles.categoryText,
                    receiptData.category === category.id &&
                      styles.categoryTextSelected,
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Items ({receiptData.items.length})
            </Text>
            <TouchableOpacity style={styles.addButton} onPress={addItem}>
              <Ionicons name="add-circle" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>

          {receiptData.items.map((item, index) => (
            <View key={item.id} style={styles.itemContainer}>
              <View style={styles.itemRow}>
                <TextInput
                  style={[styles.input, styles.itemNameInput]}
                  value={item.name}
                  onChangeText={(value) => updateItem(item.id, "name", value)}
                  placeholder="Item name"
                />
                <TextInput
                  style={[styles.input, styles.itemPriceInput]}
                  value={item.price}
                  onChangeText={(value) => updateItem(item.id, "price", value)}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeItem(item.id)}
                >
                  <Ionicons name="trash" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            </View>
          ))}

          <View style={styles.totalCalculation}>
            <Text style={styles.calculatedTotal}>
              Items Total: ${calculateItemsTotal().toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Additional Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Additional Information</Text>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Payment Method</Text>
            <View style={styles.paymentMethods}>
              {["Card", "Cash", "Check", "Digital"].map((method) => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.paymentButton,
                    receiptData.paymentMethod === method &&
                      styles.paymentButtonSelected,
                  ]}
                  onPress={() => updateField("paymentMethod", method)}
                >
                  <Text
                    style={[
                      styles.paymentText,
                      receiptData.paymentMethod === method &&
                        styles.paymentTextSelected,
                    ]}
                  >
                    {method}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              value={receiptData.notes}
              onChangeText={(value) => updateField("notes", value)}
              placeholder="Add notes about this receipt..."
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Store Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Store Details</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Store Address</Text>
            <TextInput
              style={[styles.input, styles.addressInput]}
              value={receiptData.storeDetails.address}
              onChangeText={(value) => {
                setReceiptData({
                  ...receiptData,
                  storeDetails: { ...receiptData.storeDetails, address: value }
                });
              }}
              placeholder="Enter store address"
              multiline
              numberOfLines={2}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.flex1]}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={receiptData.storeDetails.phone}
                onChangeText={(value) => {
                  setReceiptData({
                    ...receiptData,
                    storeDetails: { ...receiptData.storeDetails, phone: value }
                  });
                }}
                placeholder="Phone number"
                keyboardType="phone-pad"
              />
            </View>

            <View style={[styles.inputContainer, styles.flex1, styles.marginLeft]}>
              <Text style={styles.label}>Store ID</Text>
              <TextInput
                style={styles.input}
                value={receiptData.storeDetails.storeId || ""}
                onChangeText={(value) => {
                  setReceiptData({
                    ...receiptData,
                    storeDetails: { ...receiptData.storeDetails, storeId: value }
                  });
                }}
                placeholder="Store ID"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.flex1]}>
              <Text style={styles.label}>Cashier Name</Text>
              <TextInput
                style={styles.input}
                value={receiptData.storeDetails.cashierName || ""}
                onChangeText={(value) => {
                  setReceiptData({
                    ...receiptData,
                    storeDetails: { ...receiptData.storeDetails, cashierName: value }
                  });
                }}
                placeholder="Cashier name"
              />
            </View>

            <View style={[styles.inputContainer, styles.flex1, styles.marginLeft]}>
              <Text style={styles.label}>Register #</Text>
              <TextInput
                style={styles.input}
                value={receiptData.storeDetails.registerNumber || ""}
                onChangeText={(value) => {
                  setReceiptData({
                    ...receiptData,
                    storeDetails: { ...receiptData.storeDetails, registerNumber: value }
                  });
                }}
                placeholder="Register number"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={receiptData.storeDetails.email || ""}
              onChangeText={(value) => {
                setReceiptData({
                  ...receiptData,
                  storeDetails: { ...receiptData.storeDetails, email: value }
                });
              }}
              placeholder="Store email"
              keyboardType="email-address"
            />
          </View>
        </View>

        {/* Tax Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tax Information</Text>
          
          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.flex1]}>
              <Text style={styles.label}>Subtotal</Text>
              <TextInput
                style={styles.input}
                value={receiptData.taxInfo.subtotal}
                onChangeText={(value) => {
                  setReceiptData({
                    ...receiptData,
                    taxInfo: { ...receiptData.taxInfo, subtotal: value }
                  });
                }}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.inputContainer, styles.flex1, styles.marginLeft]}>
              <Text style={styles.label}>Tax Amount</Text>
              <TextInput
                style={styles.input}
                value={receiptData.taxInfo.taxAmount}
                onChangeText={(value) => {
                  setReceiptData({
                    ...receiptData,
                    taxInfo: { ...receiptData.taxInfo, taxAmount: value }
                  });
                }}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.flex1]}>
              <Text style={styles.label}>Tax Rate</Text>
              <TextInput
                style={styles.input}
                value={receiptData.taxInfo.taxRate || ""}
                onChangeText={(value) => {
                  setReceiptData({
                    ...receiptData,
                    taxInfo: { ...receiptData.taxInfo, taxRate: value }
                  });
                }}
                placeholder="15%"
              />
            </View>

            <View style={[styles.inputContainer, styles.flex1, styles.marginLeft]}>
              <Text style={styles.label}>VAT Amount</Text>
              <TextInput
                style={styles.input}
                value={receiptData.taxInfo.vatAmount || ""}
                onChangeText={(value) => {
                  setReceiptData({
                    ...receiptData,
                    taxInfo: { ...receiptData.taxInfo, vatAmount: value }
                  });
                }}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        {/* Payment Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          
          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.flex1]}>
              <Text style={styles.label}>Card Type</Text>
              <TextInput
                style={styles.input}
                value={receiptData.paymentInfo.cardType || ""}
                onChangeText={(value) => {
                  setReceiptData({
                    ...receiptData,
                    paymentInfo: { ...receiptData.paymentInfo, cardType: value }
                  });
                }}
                placeholder="VISA, Mastercard, etc."
              />
            </View>

            <View style={[styles.inputContainer, styles.flex1, styles.marginLeft]}>
              <Text style={styles.label}>Card Last 4</Text>
              <TextInput
                style={styles.input}
                value={receiptData.paymentInfo.cardLast4 || ""}
                onChangeText={(value) => {
                  setReceiptData({
                    ...receiptData,
                    paymentInfo: { ...receiptData.paymentInfo, cardLast4: value }
                  });
                }}
                placeholder="1234"
                maxLength={4}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.flex1]}>
              <Text style={styles.label}>Change Amount</Text>
              <TextInput
                style={styles.input}
                value={receiptData.paymentInfo.changeAmount || ""}
                onChangeText={(value) => {
                  setReceiptData({
                    ...receiptData,
                    paymentInfo: { ...receiptData.paymentInfo, changeAmount: value }
                  });
                }}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.inputContainer, styles.flex1, styles.marginLeft]}>
              <Text style={styles.label}>Tendered Amount</Text>
              <TextInput
                style={styles.input}
                value={receiptData.paymentInfo.tenderedAmount || ""}
                onChangeText={(value) => {
                  setReceiptData({
                    ...receiptData,
                    paymentInfo: { ...receiptData.paymentInfo, tenderedAmount: value }
                  });
                }}
                placeholder="0.00"
                keyboardType="decimal-pad"
              />
            </View>
          </View>
        </View>

        {/* Receipt Metadata */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Receipt Details</Text>
          
          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.flex1]}>
              <Text style={styles.label}>Receipt Number</Text>
              <TextInput
                style={styles.input}
                value={receiptData.receiptMetadata.receiptNumber || ""}
                onChangeText={(value) => {
                  setReceiptData({
                    ...receiptData,
                    receiptMetadata: { ...receiptData.receiptMetadata, receiptNumber: value }
                  });
                }}
                placeholder="Receipt #"
              />
            </View>

            <View style={[styles.inputContainer, styles.flex1, styles.marginLeft]}>
              <Text style={styles.label}>Transaction ID</Text>
              <TextInput
                style={styles.input}
                value={receiptData.receiptMetadata.transactionId || ""}
                onChangeText={(value) => {
                  setReceiptData({
                    ...receiptData,
                    receiptMetadata: { ...receiptData.receiptMetadata, transactionId: value }
                  });
                }}
                placeholder="Transaction ID"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.flex1]}>
              <Text style={styles.label}>Time</Text>
              <TextInput
                style={styles.input}
                value={receiptData.receiptMetadata.timestamp || ""}
                onChangeText={(value) => {
                  setReceiptData({
                    ...receiptData,
                    receiptMetadata: { ...receiptData.receiptMetadata, timestamp: value }
                  });
                }}
                placeholder="HH:MM"
              />
            </View>

            <View style={[styles.inputContainer, styles.flex1, styles.marginLeft]}>
              <Text style={styles.label}>Currency</Text>
              <TextInput
                style={styles.input}
                value={receiptData.receiptMetadata.currency || ""}
                onChangeText={(value) => {
                  setReceiptData({
                    ...receiptData,
                    receiptMetadata: { ...receiptData.receiptMetadata, currency: value }
                  });
                }}
                placeholder="ZAR"
              />
            </View>
          </View>
        </View>

        {/* Smart Categorization Display */}
        {receiptData.items.some(item => item.category) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🤖 Smart Categorization</Text>
            <Text style={styles.categorizationNote}>
              Items have been automatically categorized based on merchant context and item analysis
            </Text>
            
            {receiptData.items
              .filter(item => item.category)
              .map((item, index) => (
              <View key={`cat-${index}`} style={styles.categorizationItem}>
                <View style={styles.categorizationItemHeader}>
                  <Text style={styles.categorizationItemName}>{item.name}</Text>
                  <View style={styles.categorizationBadge}>
                    <Text style={styles.categorizationBadgeText}>
                      {item.category}
                      {item.subcategory && ` • ${item.subcategory}`}
                    </Text>
                  </View>
                </View>
                {item.categoryConfidence && (
                  <Text style={styles.categorizationConfidence}>
                    Confidence: {Math.round(item.categoryConfidence * 100)}%
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Save Button */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          onPress={saveReceipt}
          disabled={isLoading}
        >
          <Ionicons name="checkmark-circle" size={24} color="white" />
          <Text style={styles.saveButtonText}>
            {isLoading ? "Saving..." : "Save Receipt"}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
    marginTop: 40,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  imageButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  imagePreviewContainer: {
    margin: 16,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imagePreview: {
    width: "100%",
    height: 200,
    resizeMode: "contain",
  },
  section: {
    backgroundColor: "#fff",
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#e1e1e1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#fff",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  flex1: {
    flex: 1,
  },
  marginLeft: {
    marginLeft: 12,
  },
  categoriesScroll: {
    flexGrow: 0,
  },
  categoryButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e1e1e1",
    marginRight: 8,
    backgroundColor: "#fff",
  },
  categoryButtonSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  categoryText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 6,
  },
  categoryTextSelected: {
    color: "#fff",
  },
  addButton: {
    padding: 4,
  },
  itemContainer: {
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemNameInput: {
    flex: 2,
    marginRight: 8,
  },
  itemPriceInput: {
    flex: 1,
    marginRight: 8,
  },
  removeButton: {
    padding: 8,
  },
  totalCalculation: {
    alignItems: "flex-end",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e1e1e1",
    marginTop: 8,
  },
  calculatedTotal: {
    fontSize: 16,
    fontWeight: "600",
    color: "#007AFF",
  },
  paymentMethods: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  paymentButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#e1e1e1",
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  paymentButtonSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  paymentText: {
    fontSize: 14,
    color: "#666",
  },
  paymentTextSelected: {
    color: "#fff",
  },
  notesInput: {
    height: 80,
    textAlignVertical: "top",
  },
  saveButtonContainer: {
    padding: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e1e1e1",
  },
  saveButton: {
    backgroundColor: "#34C759",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: "#34C759",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonDisabled: {
    backgroundColor: "#999",
  },
  saveButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 12,
  },
  // Enhanced styles for new sections
  addressInput: {
    height: 60,
    textAlignVertical: "top",
  },
  categorizationNote: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    marginBottom: 12,
    lineHeight: 20,
  },
  categorizationItem: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e1e5e9",
  },
  categorizationItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  categorizationItemName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    flex: 1,
    marginRight: 8,
  },
  categorizationBadge: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categorizationBadgeText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "500",
  },
  categorizationConfidence: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
});
