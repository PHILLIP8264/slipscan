/**
 * Receipt Budget Integration Utility
 * 
 * This utility handles the integration between receipt saving/editing/deleting 
 * and automatic budget updates. It abstracts all budget-related operations 
 * away from the UI components.
 */

import { Alert } from 'react-native';
import budgetUpdateService from '../services/BudgetUpdateService';
import { ProcessedReceipt } from '../types/receipt';
import { getReceiptById } from '../utils/CRUD/receiptcrud';
import { createUser, getUserByEmail } from '../utils/CRUD/usercrud';
import { Receipt, RelationshipHelpers } from '../utils/localdb';

interface SaveReceiptResult {
  success: boolean;
  savedReceipt?: Receipt;
  successMessage?: string;
  error?: string;
}

interface ReceiptBudgetIntegration {
  /**
   * Save a new receipt with automatic budget updates
   */
  saveNewReceipt: (
    finalReceipt: ProcessedReceipt,
    userEmail: string,
    userName?: string
  ) => Promise<SaveReceiptResult>;

  /**
   * Save an edited receipt with retroactive budget updates
   */
  saveEditedReceipt: (
    finalReceipt: ProcessedReceipt,
    originalReceiptId: string,
    userEmail: string,
    userName?: string
  ) => Promise<SaveReceiptResult>;

  /**
   * Delete a receipt with budget impact reversal
   */
  deleteReceipt: (
    receiptId: string,
    userEmail: string
  ) => Promise<{ success: boolean; error?: string }>;

  /**
   * Get or create user by email
   */
  getOrCreateUser: (
    userEmail: string,
    userName?: string
  ) => Promise<{ success: boolean; user?: any; error?: string }>;
}

class ReceiptBudgetIntegrationImpl implements ReceiptBudgetIntegration {

  /**
   * Get or create user by email
   */
  async getOrCreateUser(userEmail: string, userName?: string) {
    try {
      let user = await getUserByEmail(userEmail);
      
      if (!user) {
        // Create user if doesn't exist
        user = await createUser({
          name: userName || 'User',
          email: userEmail,
        });
        console.log('✅ Created new user for email:', userEmail);
      }

      return { success: true, user };
    } catch (error) {
      console.error('❌ User creation/retrieval failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Save a new receipt with automatic budget updates
   */
  async saveNewReceipt(
    finalReceipt: ProcessedReceipt,
    userEmail: string,
    userName?: string
  ): Promise<SaveReceiptResult> {
    try {
      console.log('💾 Saving new receipt with budget integration...');

      // Get or create user
      const userResult = await this.getOrCreateUser(userEmail, userName);
      if (!userResult.success || !userResult.user) {
        return { 
          success: false, 
          error: userResult.error || 'Failed to get/create user' 
        };
      }

      const user = userResult.user;
      console.log('💾 Saving to local database for user:', user._id);

      // Save receipt to database
      const savedReceipt = await RelationshipHelpers.addProcessedReceiptToUser(
        user._id,
        finalReceipt,
        finalReceipt.originalImageUri
      );

      if (!savedReceipt) {
        return { 
          success: false, 
          error: 'Failed to save receipt to local database' 
        };
      }

      console.log('✅ Receipt saved to local database with ID:', savedReceipt._id);
      console.log('🔍 SAVED RECEIPT FULL DETAILS:', JSON.stringify(savedReceipt, null, 2));

      // Update budget automatically using the SAVED receipt (proper format)
      console.log('💰 Updating budget for new receipt...');
      console.log('🔍 Budget update params:', {
        receiptId: savedReceipt._id,
        userId: user._id,
        receiptTotal: savedReceipt.amount,
        itemCount: savedReceipt.items?.length,
        receiptDate: savedReceipt.date
      });
      
      console.log('🚀 === CALLING BUDGET UPDATE SERVICE ===');
      const budgetUpdateResult = await budgetUpdateService.updateBudgetForReceipt(
        savedReceipt, // Use savedReceipt instead of finalReceipt
        user._id,
        false // Not a reversal
      );
      console.log('🏁 === BUDGET UPDATE SERVICE COMPLETE ===');
      
      console.log('📊 Budget update result:', budgetUpdateResult);

      // Prepare success message with budget info
      let successMessage = "Your receipt has been successfully saved to your collection.";
      
      if (budgetUpdateResult) {
        if (budgetUpdateResult.success) {
          console.log('✅ Budget updated successfully');
          successMessage += "\n\n💰 Your budget has been updated automatically.";
          
          if (budgetUpdateResult.overspentCategories && budgetUpdateResult.overspentCategories.length > 0) {
            const overspendMessage = budgetUpdateService.formatOverspendingMessage(budgetUpdateResult.overspentCategories);
            successMessage += `\n\n${overspendMessage}`;
          }
        } else {
          console.warn('⚠️ Budget update failed:', budgetUpdateResult.error);
          successMessage += "\n\nNote: Budget update failed, but receipt was saved successfully.";
        }
      } else {
        console.warn('⚠️ No budget update result returned');
        successMessage += "\n\nNote: Budget update was not performed.";
      }

      return {
        success: true,
        savedReceipt,
        successMessage
      };

    } catch (error) {
      console.error('❌ Save new receipt failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Save an edited receipt with retroactive budget updates
   */
  async saveEditedReceipt(
    finalReceipt: ProcessedReceipt,
    originalReceiptId: string,
    userEmail: string,
    userName?: string
  ): Promise<SaveReceiptResult> {
    try {
      console.log('🔄 Saving edited receipt with budget integration...');

      // Get or create user
      const userResult = await this.getOrCreateUser(userEmail, userName);
      if (!userResult.success || !userResult.user) {
        return { 
          success: false, 
          error: userResult.error || 'Failed to get/create user' 
        };
      }

      const user = userResult.user;

      // Get original receipt for budget reversal
      console.log('🔄 Getting original receipt for budget update...');
      const originalReceipt = await getReceiptById(originalReceiptId);

      // Save updated receipt to database FIRST
      const savedReceipt = await RelationshipHelpers.addProcessedReceiptToUser(
        user._id,
        finalReceipt,
        finalReceipt.originalImageUri
      );

      if (!savedReceipt) {
        return { 
          success: false, 
          error: 'Failed to save receipt to local database' 
        };
      }

      console.log('✅ Receipt updated in local database with ID:', savedReceipt._id);

      // NOW update budget with proper format receipts
      let budgetUpdateResult;
      if (originalReceipt) {
        console.log('💰 Updating budget for edited receipt...');
        console.log('🔍 Budget edit params:', {
          originalReceiptId: originalReceipt._id,
          newReceiptId: savedReceipt._id,
          userId: user._id,
          originalTotal: originalReceipt.amount,
          newTotal: savedReceipt.amount
        });
        
        budgetUpdateResult = await budgetUpdateService.updateBudgetForReceiptEdit(
          originalReceipt,
          savedReceipt, // Use savedReceipt instead of finalReceipt
          user._id
        );
        
        console.log('📊 Budget edit result:', budgetUpdateResult);
      } else {
        console.warn('⚠️ Could not find original receipt for budget update');
      }

      // Prepare success message with budget info
      let successMessage = "Your receipt has been successfully updated.";
      
      if (budgetUpdateResult) {
        if (budgetUpdateResult.success && budgetUpdateResult.overspentCategories) {
          const overspendMessage = budgetUpdateService.formatOverspendingMessage(budgetUpdateResult.overspentCategories);
          successMessage += `\n\n${overspendMessage}`;
        } else if (!budgetUpdateResult.success) {
          console.warn('⚠️ Budget update failed:', budgetUpdateResult.error);
          successMessage += "\n\nNote: Budget update failed, but receipt was saved successfully.";
        } else {
          console.log('✅ Budget updated successfully for edited receipt');
        }
      }

      return {
        success: true,
        savedReceipt,
        successMessage
      };

    } catch (error) {
      console.error('❌ Save edited receipt failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Delete a receipt with budget impact reversal
   */
  async deleteReceipt(receiptId: string, userEmail: string) {
    try {
      console.log('🗑️ Deleting receipt with budget integration...');

      // Get user
      const userResult = await this.getOrCreateUser(userEmail);
      if (!userResult.success || !userResult.user) {
        return { 
          success: false, 
          error: userResult.error || 'User not found' 
        };
      }

      const user = userResult.user;

      // Get the receipt data before deletion for budget reversal
      const receiptToDelete = await getReceiptById(receiptId);
      
      // Delete from database and user relationship
      const deleted = await RelationshipHelpers.deleteReceiptFromUser(user._id, receiptId);
      
      if (!deleted) {
        return { 
          success: false, 
          error: 'Failed to delete receipt' 
        };
      }

      console.log('✅ Receipt deleted successfully');
      
      // Reverse budget impact
      if (receiptToDelete) {
        console.log('💰 Reversing budget impact for deleted receipt...');
        const budgetUpdateResult = await budgetUpdateService.updateBudgetForReceiptDeletion(
          receiptToDelete,
          user._id
        );
        
        if (budgetUpdateResult.success) {
          console.log('✅ Budget impact reversed successfully');
        } else {
          console.warn('⚠️ Failed to reverse budget impact:', budgetUpdateResult.error);
        }
      }

      return { success: true };

    } catch (error) {
      console.error('❌ Delete receipt failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Show success alert with navigation options
   */
  showSaveSuccessAlert(
    message: string,
    onViewAllReceipts: () => void,
    onScanAnother: () => void
  ) {
    Alert.alert(
      "✅ Receipt Saved!",
      message,
      [
        {
          text: "View All Receipts",
          onPress: onViewAllReceipts
        },
        {
          text: "Scan Another",
          onPress: onScanAnother
        }
      ]
    );
  }

  /**
   * Show delete success alert
   */
  showDeleteSuccessAlert(onOK: () => void) {
    Alert.alert(
      "✅ Receipt Deleted",
      "The receipt has been successfully deleted from your collection.",
      [
        {
          text: "OK",
          onPress: onOK
        }
      ]
    );
  }

  /**
   * Show error alert
   */
  showErrorAlert(title: string, message: string) {
    Alert.alert(title, message);
  }
}

// Export singleton instance
const receiptBudgetIntegration = new ReceiptBudgetIntegrationImpl();
export default receiptBudgetIntegration;