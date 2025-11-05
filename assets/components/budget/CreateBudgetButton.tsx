import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CreateBudgetButtonProps {
  onPress: () => void;
}

export const CreateBudgetButton: React.FC<CreateBudgetButtonProps> = ({ onPress }) => {
  return (
    <TouchableOpacity style={styles.createButton} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.buttonContent}>
        <Ionicons name="add-circle" size={24} color="white" />
        <Text style={styles.buttonText}>Create New Budget</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  createButton: {
    backgroundColor: '#22D3EE',
    marginHorizontal: 16,
    marginVertical: 16,
    borderRadius: 16,
    elevation: 6,
    shadowColor: '#22D3EE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  buttonText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 10,
    letterSpacing: 0.3,
  },
});