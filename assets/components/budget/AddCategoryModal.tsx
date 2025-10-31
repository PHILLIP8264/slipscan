import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Alert,
    Modal,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { createCategory } from '../../../utils/CRUD/categorycrud';
import { Category } from '../../../utils/localdb';

interface AddCategoryModalProps {
  visible: boolean;
  onClose: () => void;
  onCategoryAdded: (category: Category) => void;
}

const PRESET_COLORS = [
  '#007AFF', '#FF3B30', '#FF9500', '#FFCC00', 
  '#34C759', '#5AC8FA', '#AF52DE', '#FF2D92',
  '#A2845E', '#8E8E93', '#FF6B35', '#4CD964'
];

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  visible,
  onClose,
  onCategoryAdded
}) => {
  const [categoryName, setCategoryName] = useState('');
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [budgetAmount, setBudgetAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateCategory = async () => {
    if (!categoryName.trim()) {
      Alert.alert('Error', 'Please enter a category name');
      return;
    }

    if (!budgetAmount.trim() || isNaN(Number(budgetAmount))) {
      Alert.alert('Error', 'Please enter a valid budget amount');
      return;
    }

    try {
      setLoading(true);
      const newCategory = await createCategory({
        name: categoryName.trim(),
        color: selectedColor,
        budgetAmount: Number(budgetAmount)
      });

      onCategoryAdded(newCategory);
      
      // Reset form
      setCategoryName('');
      setBudgetAmount('');
      setSelectedColor(PRESET_COLORS[0]);
      
      onClose();
    } catch (error) {
      console.error('Error creating category:', error);
      Alert.alert('Error', 'Failed to create category');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setCategoryName('');
    setBudgetAmount('');
    setSelectedColor(PRESET_COLORS[0]);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleCancel} style={styles.cancelButton}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>New Category</Text>
            <TouchableOpacity 
              onPress={handleCreateCategory} 
              style={styles.saveButton}
              disabled={loading}
            >
              <Text style={[styles.saveButtonText, loading && styles.disabledText]}>
                {loading ? 'Creating...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category Name</Text>
              <TextInput
                style={styles.textInput}
                value={categoryName}
                onChangeText={setCategoryName}
                placeholder="e.g. Groceries, Entertainment"
                placeholderTextColor="#999"
                autoFocus
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Default Budget Amount</Text>
              <TextInput
                style={styles.textInput}
                value={budgetAmount}
                onChangeText={setBudgetAmount}
                placeholder="0.00"
                placeholderTextColor="#999"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Color</Text>
              <View style={styles.colorPicker}>
                {PRESET_COLORS.map((color) => (
                  <TouchableOpacity
                    key={color}
                    style={[
                      styles.colorOption,
                      { backgroundColor: color },
                      selectedColor === color && styles.selectedColorOption
                    ]}
                    onPress={() => setSelectedColor(color)}
                  >
                    {selectedColor === color && (
                      <Ionicons name="checkmark" size={16} color="white" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.preview}>
              <Text style={styles.previewLabel}>Preview:</Text>
              <View style={styles.previewItem}>
                <View style={[styles.previewColor, { backgroundColor: selectedColor }]} />
                <Text style={styles.previewName}>{categoryName || 'Category Name'}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    paddingBottom: 20,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  cancelButton: {
    padding: 4,
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    padding: 4,
  },
  saveButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  disabledText: {
    color: '#999',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
  },
  colorPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectedColorOption: {
    transform: [{ scale: 1.1 }],
    elevation: 4,
    shadowOpacity: 0.2,
  },
  preview: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  previewColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  previewName: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});