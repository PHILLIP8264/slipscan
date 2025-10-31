import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
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
  BudgetCategoryBreakdown,
  CategoryBudgetItem,
  CategoryDropdown
} from '../../../assets/components/budget';
import { getBudgetById, listBudgets, updateBudget } from '../../../utils/CRUD/budgetcrud';
import { createCategory, getHardcodedCategories, initializeBudgetCategories, listCategories } from '../../../utils/CRUD/categorycrud';
import { Budget, Category, CategoryBudget } from '../../../utils/localdb';

export default function EditBudget() {
  const params = useLocalSearchParams<{ budgetId: string }>();
  const budgetId = params.budgetId;

  const [originalBudget, setOriginalBudget] = useState<Budget | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [availableCategories, setAvailableCategories] = useState<Category[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [categoryBudgets, setCategoryBudgets] = useState<CategoryBudget[]>([]);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [otherBudgets, setOtherBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    if (budgetId) {
      loadBudgetData();
    }
  }, [budgetId]);

  const loadBudgetData = async () => {
    try {
      setInitialLoading(true);
      
      // Initialize categories first if needed
      await initializeBudgetCategories();
      
      // Load all required data in parallel
      const [budget, categories, allBudgets] = await Promise.all([
        getBudgetById(budgetId),
        listCategories(),
        listBudgets()
      ]);

      if (!budget) {
        Alert.alert('Error', 'Budget not found', [
          { text: 'OK', onPress: () => router.back() }
        ]);
        return;
      }

      setOriginalBudget(budget);
      setAvailableCategories(categories);
      
      // Parse the month string and set the date
      const [year, month] = budget.month.split('-').map(Number);
      setSelectedMonth(new Date(year, month - 1, 1));
      
      // Set up category budgets
      setCategoryBudgets(budget.categoryBudgets);
      setSelectedCategoryIds(budget.categoryBudgets.map(cb => cb.categoryId));
      
      // Filter out current budget from other budgets
      setOtherBudgets(allBudgets.filter(b => b._id !== budgetId));
      
    } catch (error) {
      console.error('Error loading budget data:', error);
      Alert.alert('Error', 'Failed to load budget data');
    } finally {
      setInitialLoading(false);
    }
  };

  const formatMonthForStorage = (date: Date) => {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  };

  const formatMonthForDisplay = (date: Date) => {
    return date.toLocaleDateString('eu-ZA', { year: 'numeric', month: 'long' });
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
      // Remove category
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
            await loadBudgetData();
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
      prev.map(cb => {
        if (cb.categoryId === categoryId) {
          // Maintain the spent amount when changing budget amount
          return { 
            ...cb, 
            budgetAmount: amount, 
            remainingAmount: Math.max(0, amount - cb.spent)
          };
        }
        return cb;
      })
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

  const getTotalBudget = () => {
    return categoryBudgets.reduce((total, cb) => total + cb.budgetAmount, 0);
  };

  const formatCurrency = (amount: number) => {
    return `R${amount.toLocaleString('en-ZA', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  };

  const handleUpdateBudget = async () => {
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
      setLoading(true);
      
      await updateBudget(budgetId, {
        month: formatMonthForStorage(selectedMonth),
        categoryBudgets: categoryBudgets
      });

      Alert.alert(
        'Success', 
        'Budget updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Error updating budget:', error);
      Alert.alert('Error', 'Failed to update budget');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading budget...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const selectedCategories = availableCategories.filter(cat => 
    selectedCategoryIds.includes(cat._id)
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#007AFF" />
      
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Budget</Text>
        <TouchableOpacity 
          style={[styles.saveButton, loading && styles.disabledButton]}
          onPress={handleUpdateBudget}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
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
              <Ionicons name="calendar" size={24} color="#007AFF" />
            </TouchableOpacity>
          </View>

          {/* Category Selection */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Categories</Text>
              <TouchableOpacity 
                style={styles.addCategoryButton}
                onPress={() => setShowAddCategoryModal(true)}
              >
                <Ionicons name="add-circle" size={20} color="#007AFF" />
                <Text style={styles.addCategoryText}>Add New</Text>
              </TouchableOpacity>
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

          {/* Total Budget Display */}
          {categoryBudgets.length > 0 && (
            <View style={styles.totalSection}>
              <View style={styles.totalCard}>
                <Text style={styles.totalLabel}>Total Budget</Text>
                <Text style={styles.totalAmount}>
                  {formatCurrency(getTotalBudget())}
                </Text>
                <Text style={styles.totalSubtext}>
                  Across {categoryBudgets.length} {categoryBudgets.length === 1 ? 'category' : 'categories'}
                </Text>
              </View>
            </View>
          )}

          {/* Other Budgets Context */}
          {otherBudgets.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Other Budgets</Text>
              <Text style={styles.sectionSubtitle}>
                Your other budgets for reference
              </Text>
              {otherBudgets.slice(0, 3).map((budget) => (
                <View key={budget._id} style={styles.contextBudgetCard}>
                  <View style={styles.contextBudgetHeader}>
                    <Text style={styles.contextBudgetMonth}>
                      {new Date(budget.month + '-01').toLocaleDateString('eu-ZA', { 
                        year: 'numeric', 
                        month: 'long' 
                      })}
                    </Text>
                    <Text style={styles.contextBudgetAmount}>
                      {formatCurrency(budget.totalBudget)}
                    </Text>
                  </View>
                  <BudgetCategoryBreakdown
                    categoryBudgets={budget.categoryBudgets}
                    categories={availableCategories}
                    showProgress={false}
                    compact={true}
                  />
                </View>
              ))}
              {otherBudgets.length > 3 && (
                <Text style={styles.moreBudgetsText}>
                  And {otherBudgets.length - 3} more budget{otherBudgets.length - 3 !== 1 ? 's' : ''}
                </Text>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

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
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 60 : 12,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
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
    fontWeight: '600',
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
    fontWeight: '700',
    color: '#333',
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  addCategoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addCategoryText: {
    color: '#007AFF',
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
  contextBudgetCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  contextBudgetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  contextBudgetMonth: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  contextBudgetAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  moreBudgetsText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 8,
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
});