import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getHardcodedCategories } from '../../../utils/CRUD/categorycrud';
import { Category } from '../../../utils/localdb';

interface CategoryDropdownProps {
  categories: Category[];
  selectedCategories: string[];
  onCategoryToggle: (categoryId: string) => void;
  onAddNewCategory: () => void;
  placeholder?: string;
}

export const CategoryDropdown: React.FC<CategoryDropdownProps> = ({
  categories,
  selectedCategories,
  onCategoryToggle,
  onAddNewCategory,
  placeholder = "Select Categories"
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Combine hardcoded categories with existing categories and add "Add New" option
  const getCombinedItems = () => {
    const hardcodedCategories = getHardcodedCategories();
    const items: (Category | { isAddNew: boolean })[] = [];
    
    // Add hardcoded categories (create temporary Category objects with IDs based on name)
    hardcodedCategories.forEach(hc => {
      const existingCategory = categories.find(c => c.name.toLowerCase() === hc.name.toLowerCase());
      if (existingCategory) {
        items.push(existingCategory);
      } else {
        // Create a temporary category object for display
        items.push({
          _id: `hardcoded_${hc.name}`,
          name: hc.name,
          color: hc.color,
          budgetAmount: hc.budgetAmount,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    });
    
    // Add any custom categories that aren't in hardcoded list
    const customCategories = categories.filter(cat => 
      !hardcodedCategories.some(hc => hc.name.toLowerCase() === cat.name.toLowerCase())
    );
    items.push(...customCategories);
    
    // Add "Add New Category" option at the end
    items.push({ isAddNew: true });
    
    return items;
  };

  const getSelectedCategoriesText = () => {
    if (selectedCategories.length === 0) return placeholder;
    if (selectedCategories.length === 1) {
      const category = categories.find(cat => cat._id === selectedCategories[0]);
      return category?.name || 'Unknown Category';
    }
    return `${selectedCategories.length} categories selected`;
  };

  const renderCategoryItem = ({ item }: { item: Category | { isAddNew: boolean } }) => {
    // Handle "Add New Category" option
    if ('isAddNew' in item && item.isAddNew) {
      return (
        <TouchableOpacity
          style={styles.addNewCategoryItem}
          onPress={() => {
            setIsOpen(false);
            onAddNewCategory();
          }}
          activeOpacity={0.7}
        >
          <View style={styles.categoryInfo}>
            <View style={styles.addNewIcon}>
              <Ionicons name="add" size={20} color="#007AFF" />
            </View>
            <Text style={styles.addNewCategoryText}>Add New Category</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#007AFF" />
        </TouchableOpacity>
      );
    }
    
    // Handle regular category
    const category = item as Category;
    const isSelected = selectedCategories.includes(category._id);
    const isHardcoded = category._id.startsWith('hardcoded_');
    
    return (
      <TouchableOpacity
        style={[styles.categoryItem, isSelected && styles.selectedCategoryItem]}
        onPress={() => onCategoryToggle(category._id)}
        activeOpacity={0.7}
      >
        <View style={styles.categoryInfo}>
          <View style={[styles.colorIndicator, { backgroundColor: category.color }]} />
          <Text style={[styles.categoryName, isSelected && styles.selectedCategoryName]}>
            {category.name}
            {isHardcoded && <Text style={styles.hardcodedIndicator}> (Default)</Text>}
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <>
      <TouchableOpacity 
        style={styles.dropdownButton} 
        onPress={() => setIsOpen(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.dropdownText}>{getSelectedCategoriesText()}</Text>
        <Ionicons name="chevron-down" size={20} color="#666" />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Categories</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setIsOpen(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <FlatList
              data={getCombinedItems()}
              renderItem={renderCategoryItem}
              keyExtractor={(item, index) => 'isAddNew' in item ? 'add_new' : (item as Category)._id}
              style={styles.categoryList}
              showsVerticalScrollIndicator={false}
            />
            
            <TouchableOpacity 
              style={styles.doneButton}
              onPress={() => setIsOpen(false)}
            >
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 50,
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  categoryList: {
    maxHeight: 400,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  selectedCategoryItem: {
    backgroundColor: '#f0f8ff',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  selectedCategoryName: {
    color: '#007AFF',
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  doneButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // New styles for "Add New Category" option
  addNewCategoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    backgroundColor: '#f8f9fa',
  },
  addNewIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addNewCategoryText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  hardcodedIndicator: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
});