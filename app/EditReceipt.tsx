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
import { ReceiptData } from "../utils/OCRModule";
import ReceiptManager, { ReceiptCategory } from "../utils/ReceiptManager";

interface EditableReceiptData {
  merchant: string;
  total: string;
  date: string;
  items: Array<{ name: string; price: string; id: string }>;
  category: string;
  notes: string;
  paymentMethod: string;
  tax: string;
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
        const parsedData = JSON.parse(params.receiptData as string);

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
          category: "8", // Default to "Other"
          notes: "",
          paymentMethod: "Card",
          tax: "0.00",
        };

        setReceiptData(editableData);
        setOriginalImageUri(params.imageUri as string);
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
      };

      // Save to storage
      const savedReceipt = await ReceiptManager.saveReceipt(
        finalReceiptData,
        originalImageUri,
        undefined, // pdfUri
        receiptData.category,
        receiptData.notes
      );

      Alert.alert(
        "Receipt Saved! ✅",
        `${savedReceipt.merchant} - $${savedReceipt.total} has been saved to your receipts.`,
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
});
