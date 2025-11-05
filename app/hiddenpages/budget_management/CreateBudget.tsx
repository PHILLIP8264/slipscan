import { getFontFamily } from '@/utils/fonts';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import {
  AddCategoryModal,
  CategoryBudgetItem,
  CategoryDropdown
} from '../../../assets/components/budget';
import { createBudget, getUserBudgets } from '../../../utils/CRUD/budgetcrud';
import { cleanupDuplicateCategories, createCategory, getHardcodedCategories, initializeBudgetCategories, listCategories } from '../../../utils/CRUD/categorycrud';
import { getUserByEmail } from '../../../utils/CRUD/usercrud';
import { Category, CategoryBudget } from '../../../utils/localdb';
import { useAuth } from '../../contexts/AuthContext';

export default function CreateBudget() {
  const { authState } = useAuth();
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    loadCurrentUser();
  }, [authState.lastUserEmail]);

  useEffect(() => {
    if (currentUserId) {
      loadCategories();
    }
  }, [currentUserId]);

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
      
      console.log('Available categories (matching hardcoded list):', validCategories.map(c => c.name));
      setAvailableCategories(validCategories);
    } catch (error) {
      console.error('Error loading categories:', error);
      Alert.alert('Error', 'Failed to load categories');
    }
  };

  const loadCurrentUser = async () => {
    try {
      if (authState.lastUserEmail) {
        const user = await getUserByEmail(authState.lastUserEmail);
        if (user) {
          setCurrentUserId(user._id);
        }
      }
    } catch (error) {
      console.error("Error loading current user:", error);
      Alert.alert('Error', 'Please log in to create budgets');
      router.back();
    }
  };

  const formatMonthForStorage = (date: Date) => {
    // Use "Month Year" format to match our fixed budget system
    const monthName = date.toLocaleString('en-US', { month: 'long' });
    const year = date.getFullYear();
    return `${monthName} ${year}`;
  };

  const formatMonthForDisplay = (date: Date) => {
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const handleMonthChange = (year: number, month: number) => {
    const newDate = new Date(year, month, 1);
    setSelectedMonth(newDate);
    setShowMonthPicker(false);
  };

  const getMonthOptions = () => {
    const currentDate = new Date();
    const options = [];
    
    // Generate 24 months: 12 months back and 12 months forward
    for (let i = -12; i <= 12; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() + i, 1);
      options.push({
        year: date.getFullYear(),
        month: date.getMonth(),
        display: date.toLocaleDateString('eu-ZA', { year: 'numeric', month: 'long' }),
        value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      });
    }
    
    return options;
  };

  const handleCategoryToggle = async (categoryId: string) => {
    if (selectedCategoryIds.includes(categoryId)) {
      
      setSelectedCategoryIds(prev => prev.filter(id => id !== categoryId));
      setCategoryBudgets(prev => prev.filter(cb => cb.categoryId !== categoryId));
    } else {
      // Check if this is a hardcoded category that doesn't exist in DB yet
      if (categoryId.startsWith('hardcoded_')) {
        const hardcodedName = categoryId.replace('hardcoded_', '');
        const hardcodedCategories = getHardcodedCategories();
        const hardcodedCat = hardcodedCategories.find(hc => hc.name === hardcodedName);
        
        if (hardcodedCat) {
          try {
            // Create the category in database
            const createdCategory = await createCategory(hardcodedCat);
            // Refresh categories list
            await loadCategories();
            // Now select the newly created category
            setSelectedCategoryIds(prev => [...prev, createdCategory._id]);
            const newCategoryBudget: CategoryBudget = {
              categoryId: createdCategory._id,
              categoryName: createdCategory.name,
              budgetAmount: createdCategory.budgetAmount,
              spent: 0,
              remainingAmount: createdCategory.budgetAmount
            };
            setCategoryBudgets(prev => [...prev, newCategoryBudget]);
          } catch (error) {
            console.error('Error creating hardcoded category:', error);
            Alert.alert('Error', 'Failed to create category');
          }
        }
        return;
      }
      
      // Add existing category
      setSelectedCategoryIds(prev => [...prev, categoryId]);
      const category = availableCategories.find(cat => cat._id === categoryId);
      if (category) {
        const budgetAmount = category.budgetAmount || 0;
        const newCategoryBudget: CategoryBudget = {
          categoryId: categoryId,
          categoryName: category.name,
          budgetAmount: budgetAmount,
          spent: 0,
          remainingAmount: budgetAmount
        };
        setCategoryBudgets(prev => [...prev, newCategoryBudget]);
      }
    }
  };

  const handleCategoryAmountChange = (categoryId: string, amount: number) => {
    setCategoryBudgets(prev => 
      prev.map(cb => 
        cb.categoryId === categoryId 
          ? { ...cb, budgetAmount: amount, remainingAmount: amount - cb.spent }
          : cb
      )
    );
  };

  const handleRemoveCategory = (categoryId: string) => {
    setSelectedCategoryIds(prev => prev.filter(id => id !== categoryId));
    setCategoryBudgets(prev => prev.filter(cb => cb.categoryId !== categoryId));
  };

  const handleAddCategory = (newCategory: Category) => {
    setAvailableCategories(prev => [...prev, newCategory]);
  };

  const handleAddNewCategoryRequest = () => {
    setShowAddCategoryModal(true);
  };

  const handleCancel = () => {
    if (categoryBudgets.length > 0) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to cancel?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { 
            text: 'Discard', 
            style: 'destructive',
            onPress: () => router.back()
          }
        ]
      );
    } else {
      router.back();
    }
  };

  const getTotalBudget = () => {
    return categoryBudgets.reduce((total, cb) => total + cb.budgetAmount, 0);
  };

  const formatCurrency = (amount: number) => {
    return `R${amount.toLocaleString('en-ZA', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const handleSaveBudget = async () => {
    if (categoryBudgets.length === 0) {
      Alert.alert('Error', 'Please add at least one category to your budget');
      return;
    }

    const totalBudget = getTotalBudget();
    if (totalBudget <= 0) {
      Alert.alert('Error', 'Total budget must be greater than R0');
      return;
    }

    try {
      if (!currentUserId) {
        Alert.alert('Error', 'Please log in to create budgets');
        return;
      }

      setLoading(true);
      
      const monthString = formatMonthForStorage(selectedMonth);
      
      // Check if budget already exists for this month
      const existingBudgets = await getUserBudgets(currentUserId);
      const existingBudget = existingBudgets.find(budget => budget.month === monthString);
      
      if (existingBudget) {
        Alert.alert(
          'Budget Already Exists', 
          `A budget for ${monthString} already exists. Please edit the existing budget or choose a different month.`
        );
        setLoading(false);
        return;
      }
      
      const budgetData = {
        month: monthString,
        categoryBudgets: categoryBudgets,
        userId: currentUserId // Link budget to current user
      };
      
      console.log('Creating budget with data:', budgetData);
      
      const createdBudget = await createBudget(budgetData);
      
      console.log('Budget created successfully:', createdBudget);
      
      // Verify the budget was saved by checking user's budgets
      const userBudgets = await getUserBudgets(currentUserId);
      console.log('User budgets after creation:', userBudgets);
      console.log('User budgets count:', userBudgets.length);

      Alert.alert(
        'Success', 
        'Budget created successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Error creating budget:', error);
      Alert.alert('Error', 'Failed to create budget');
    } finally {
      setLoading(false);
    }
  };

  const selectedCategories = availableCategories.filter(cat => 
    selectedCategoryIds.includes(cat._id)
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#007AFF" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Budget</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>
        <KeyboardAvoidingView 
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            style={styles.scrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Month Selection */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Budget Month</Text>
              <TouchableOpacity 
                style={styles.monthSelector}
                onPress={() => setShowMonthPicker(true)}
              >
                <Text style={styles.monthText}>
                  {formatMonthForDisplay(selectedMonth)}
                </Text>
                <Ionicons name="calendar" size={24} color="#22D3EE" />
              </TouchableOpacity>
            </View>

            {/* Category Selection */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Categories</Text>
              </View>
              
              <CategoryDropdown
                categories={availableCategories}
                selectedCategories={selectedCategoryIds}
                onCategoryToggle={handleCategoryToggle}
                onAddNewCategory={handleAddNewCategoryRequest}
                placeholder="Select categories for this budget"
              />
            </View>

            {/* Selected Categories Budget Amounts */}
            {selectedCategories.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Budget Amounts</Text>
                {selectedCategories.map(category => {
                  const categoryBudget = categoryBudgets.find(cb => cb.categoryId === category._id);
                  return (
                    <CategoryBudgetItem
                      key={category._id}
                      category={category}
                      categoryBudget={categoryBudget}
                      onAmountChange={handleCategoryAmountChange}
                      onRemove={handleRemoveCategory}
                      editable={true}
                    />
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Fixed Bottom Section - Total and Actions */}
          <View style={styles.bottomSection}>
            {/* Total Budget Display */}
            {categoryBudgets.length > 0 && (
              <View style={styles.totalSectionFixed}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabelFixed}>Total Budget:</Text>
                  <Text style={styles.totalAmountFixed}>
                    {formatCurrency(getTotalBudget())}
                  </Text>
                </View>
                <Text style={styles.totalSubtextFixed}>
                  Across {categoryBudgets.length} {categoryBudgets.length === 1 ? 'category' : 'categories'}
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <TouchableOpacity 
                style={styles.cancelButton}
                onPress={handleCancel}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.saveButtonFixed, loading && styles.disabledButton]}
                onPress={handleSaveBudget}
                disabled={loading}
              >
                <Text style={styles.saveButtonTextFixed}>
                  {loading ? 'Saving...' : 'Save Budget'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>

      <AddCategoryModal
        visible={showAddCategoryModal}
        onClose={() => setShowAddCategoryModal(false)}
        onCategoryAdded={handleAddCategory}
      />

      {/* Month Picker Modal */}
      {showMonthPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.monthPickerModal}>
            <View style={styles.monthPickerHeader}>
              <Text style={styles.monthPickerTitle}>Select Budget Month</Text>
              <TouchableOpacity onPress={() => setShowMonthPicker(false)}>
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.monthOptions}>
              {getMonthOptions().map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.monthOption,
                    option.value === formatMonthForStorage(selectedMonth) && styles.selectedMonthOption
                  ]}
                  onPress={() => handleMonthChange(option.year, option.month)}
                >
                  <Text style={[
                    styles.monthOptionText,
                    option.value === formatMonthForStorage(selectedMonth) && styles.selectedMonthOptionText
                  ]}>
                    {option.display}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#374151',
  },
  header: {
    backgroundColor: '#E5398B',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 60 : 12,
  },
  backButton: {
    padding: 8,
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
    marginTop: 20,
  },
  saveButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: 'white',
    fontFamily: getFontFamily('bold'),
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: getFontFamily('semiBold'),
    color: '#fff',
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addCategoryText: {
    color: '#22D3EE',
    fontWeight: '600',
    marginLeft: 4,
  },
  monthSelector: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalSection: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  totalCard: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 8,
  },
  totalAmount: {
    fontSize: 36,
    fontWeight: '800',
    color: 'white',
    marginBottom: 4,
  },
  totalSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  // Month Picker Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthPickerModal: {
    backgroundColor: 'white',
    borderRadius: 16,
    margin: 20,
    maxHeight: 400,
    width: '80%',
  },
  monthPickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  monthPickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  monthOptions: {
    maxHeight: 300,
  },
  monthOption: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  selectedMonthOption: {
    backgroundColor: '#f0f8ff',
  },
  monthOptionText: {
    fontSize: 16,
    color: '#333',
  },
  selectedMonthOptionText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  // New styles for improved layout
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  addCategoryButtonLarge: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  addCategoryTextLarge: {
    color: '#007AFF',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
  },
  bottomSection: {
    backgroundColor: '#374151',
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 34 : 16,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#000',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  totalSectionFixed: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  totalLabelFixed: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalAmountFixed: {
    fontSize: 24,
    fontWeight: '800',
    color: '#007AFF',
  },
  totalSubtextFixed: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonFixed: {
    flex: 2,
    backgroundColor: '#22D3EE',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  saveButtonTextFixed: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
  },
});