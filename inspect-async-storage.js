/**
 * Inspect actual AsyncStorage database content
 */

// Mock AsyncStorage for Node.js environment
const mockAsyncStorage = {
  data: {},
  async getItem(key) {
    return this.data[key] || null;
  },
  async setItem(key, value) {
    this.data[key] = value;
  },
  async removeItem(key) {
    delete this.data[key];
  },
  async clear() {
    this.data = {};
  },
  async getAllKeys() {
    return Object.keys(this.data);
  }
};

// Setup global AsyncStorage
global.AsyncStorage = mockAsyncStorage;

// Now we can import the modules
import { listCategories } from './utils/CRUD/categorycrud.js';
import { getUserByEmail } from './utils/CRUD/usercrud.js';
import { COLLECTIONS, NoSQLDB } from './utils/localdb.js';

async function inspectUserDatabase() {
  console.log('🔍 Inspecting AsyncStorage Database...\n');
  
  try {
    const userEmail = 'phillipvanderhoven@gmail.com';
    
    // Get user
    const user = await getUserByEmail(userEmail);
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('👤 USER FOUND:');
    console.log(`   ID: ${user._id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Budget IDs: ${user.budgetIds?.length || 0} budgets`);
    console.log(`   Receipt IDs: ${user.receiptIds?.length || 0} receipts`);
    
    // Get user's receipts
    console.log('\n🧾 === USER RECEIPTS ===');
    if (user.receiptIds && user.receiptIds.length > 0) {
      for (let i = 0; i < user.receiptIds.length; i++) {
        const receiptId = user.receiptIds[i];
        const receipt = await NoSQLDB.getDocumentById(COLLECTIONS.RECEIPTS, receiptId);
        
        if (receipt) {
          console.log(`\nReceipt ${i + 1}:`);
          console.log(`   ID: ${receipt._id}`);
          console.log(`   Merchant: ${receipt.merchant}`);
          console.log(`   Amount: R${receipt.amount}`);
          console.log(`   Date: ${receipt.date}`);
          console.log(`   Items: ${receipt.items?.length || 0}`);
          
          if (receipt.items && receipt.items.length > 0) {
            receipt.items.forEach((item, idx) => {
              const amount = item.lineTotal || item.totalPrice || 0;
              console.log(`     Item ${idx + 1}: ${item.name} - ${item.category || 'No category'} - R${amount}`);
            });
          }
        }
      }
    } else {
      console.log('   No receipts found');
    }
    
    // Get user's budgets
    console.log('\n💰 === USER BUDGETS ===');
    if (user.budgetIds && user.budgetIds.length > 0) {
      for (let i = 0; i < user.budgetIds.length; i++) {
        const budgetId = user.budgetIds[i];
        const budget = await NoSQLDB.getDocumentById(COLLECTIONS.BUDGETS, budgetId);
        
        if (budget) {
          console.log(`\nBudget ${i + 1}:`);
          console.log(`   ID: ${budget._id}`);
          console.log(`   Month: ${budget.month}`);
          console.log(`   Categories: ${budget.categoryBudgets?.length || 0}`);
          
          if (budget.categoryBudgets) {
            budget.categoryBudgets.forEach(cb => {
              console.log(`     ${cb.categoryName}: Budget=R${cb.budgetAmount}, Spent=R${cb.spent}, Remaining=R${cb.remainingAmount}`);
            });
          }
        }
      }
    } else {
      console.log('   No budgets found');
    }
    
    // Calculate actual spending from receipts
    console.log('\n📊 === ACTUAL SPENDING CALCULATION ===');
    const categorySpending = {};
    
    if (user.receiptIds) {
      for (const receiptId of user.receiptIds) {
        const receipt = await NoSQLDB.getDocumentById(COLLECTIONS.RECEIPTS, receiptId);
        if (receipt && receipt.items) {
          receipt.items.forEach(item => {
            const category = item.category || 'Uncategorized';
            const amount = item.lineTotal || item.totalPrice || 0;
            categorySpending[category] = (categorySpending[category] || 0) + amount;
          });
        }
      }
    }
    
    console.log('Calculated from receipt items:');
    Object.entries(categorySpending).forEach(([category, total]) => {
      console.log(`   ${category}: R${total}`);
    });
    
    // Show available categories
    console.log('\n📂 === AVAILABLE CATEGORIES ===');
    const categories = await listCategories();
    categories.forEach(cat => {
      console.log(`   ${cat.name}: R${cat.budgetAmount} default budget (Color: ${cat.color})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

async function clearUserData() {
  console.log('🗑️ Clearing user receipts and resetting budgets...\n');
  
  try {
    const userEmail = 'phillipvanderhoven@gmail.com';
    
    // Get user
    const user = await getUserByEmail(userEmail);
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    // Clear receipts
    if (user.receiptIds) {
      for (const receiptId of user.receiptIds) {
        await NoSQLDB.deleteDocument(COLLECTIONS.RECEIPTS, receiptId);
      }
      
      // Clear user's receipt IDs
      await NoSQLDB.updateDocument(COLLECTIONS.USERS, user._id, {
        receiptIds: []
      });
      
      console.log(`✅ Deleted ${user.receiptIds.length} receipts`);
    }
    
    // Reset budgets
    if (user.budgetIds) {
      for (const budgetId of user.budgetIds) {
        const budget = await NoSQLDB.getDocumentById(COLLECTIONS.BUDGETS, budgetId);
        if (budget && budget.categoryBudgets) {
          const resetCategories = budget.categoryBudgets.map(cb => ({
            ...cb,
            spent: 0,
            remainingAmount: cb.budgetAmount
          }));
          
          await NoSQLDB.updateDocument(COLLECTIONS.BUDGETS, budgetId, {
            categoryBudgets: resetCategories
          });
        }
      }
      
      console.log(`✅ Reset spending in ${user.budgetIds.length} budgets`);
    }
    
    console.log('\n✨ User data cleared and budgets reset!');
    
  } catch (error) {
    console.error('❌ Error clearing data:', error);
  }
}

// Main execution
async function main() {
  const action = process.argv[2];
  
  if (action === 'clear') {
    await clearUserData();
  } else {
    await inspectUserDatabase();
    console.log('\n💡 To clear all receipts and reset budgets, run: node inspect-async-storage.js clear');
  }
}

main();