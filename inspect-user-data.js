/**
 * Script to inspect and clean user data - receipts and budgets
 */

const path = require('path');
const fs = require('fs').promises;

// Database paths
const DB_PATH = path.join(__dirname, 'slipscan_db.json');

async function inspectUserData() {
  try {
    console.log('🔍 Inspecting user data...');
    
    // Read database
    const dbContent = await fs.readFile(DB_PATH, 'utf8');
    const db = JSON.parse(dbContent);
    
    const userEmail = 'phillipvanderhoven@gmail.com';
    
    // Find user
    const users = db.users || [];
    const user = users.find(u => u.email === userEmail);
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('👤 USER FOUND:', user._id);
    console.log('📧 Email:', user.email);
    console.log('📊 Budget IDs:', user.budgetIds);
    console.log('🧾 Receipt IDs:', user.receiptIds);
    
    // Check receipts
    const receipts = db.receipts || [];
    const userReceipts = receipts.filter(r => user.receiptIds?.includes(r._id));
    
    console.log('\n🧾 === USER RECEIPTS ===');
    userReceipts.forEach((receipt, index) => {
      console.log(`\nReceipt ${index + 1}:`);
      console.log(`  ID: ${receipt._id}`);
      console.log(`  Merchant: ${receipt.merchant}`);
      console.log(`  Amount: R${receipt.amount}`);
      console.log(`  Date: ${receipt.date}`);
      console.log(`  Items: ${receipt.items?.length || 0}`);
      
      if (receipt.items && receipt.items.length > 0) {
        receipt.items.forEach((item, i) => {
          console.log(`    Item ${i + 1}: ${item.name} - ${item.category || 'No category'} - R${item.lineTotal || item.totalPrice || 0}`);
        });
      }
    });
    
    // Check budgets
    const budgets = db.budgets || [];
    const userBudgets = budgets.filter(b => user.budgetIds?.includes(b._id));
    
    console.log('\n💰 === USER BUDGETS ===');
    userBudgets.forEach((budget, index) => {
      console.log(`\nBudget ${index + 1}:`);
      console.log(`  ID: ${budget._id}`);
      console.log(`  Month: ${budget.month}`);
      console.log(`  Categories: ${budget.categoryBudgets?.length || 0}`);
      
      if (budget.categoryBudgets) {
        budget.categoryBudgets.forEach(cb => {
          console.log(`    ${cb.categoryName}: Budget=R${cb.budgetAmount}, Spent=R${cb.spent}, Remaining=R${cb.remainingAmount}`);
        });
      }
    });
    
    // Show total spending by category across all receipts
    console.log('\n📈 === CALCULATED SPENDING FROM RECEIPTS ===');
    const categoryTotals = {};
    
    userReceipts.forEach(receipt => {
      if (receipt.items) {
        receipt.items.forEach(item => {
          const category = item.category || 'Uncategorized';
          const amount = item.lineTotal || item.totalPrice || 0;
          categoryTotals[category] = (categoryTotals[category] || 0) + amount;
        });
      }
    });
    
    Object.entries(categoryTotals).forEach(([category, total]) => {
      console.log(`  ${category}: R${total}`);
    });
    
  } catch (error) {
    console.error('❌ Error inspecting data:', error);
  }
}

async function clearUserReceipts() {
  try {
    console.log('\n🗑️ Clearing all user receipts...');
    
    // Read database
    const dbContent = await fs.readFile(DB_PATH, 'utf8');
    const db = JSON.parse(dbContent);
    
    const userEmail = 'phillipvanderhoven@gmail.com';
    
    // Find user
    const users = db.users || [];
    const userIndex = users.findIndex(u => u.email === userEmail);
    
    if (userIndex === -1) {
      console.log('❌ User not found');
      return;
    }
    
    const user = users[userIndex];
    const receiptIds = user.receiptIds || [];
    
    // Remove receipts
    db.receipts = (db.receipts || []).filter(r => !receiptIds.includes(r._id));
    
    // Clear user's receipt IDs
    users[userIndex].receiptIds = [];
    
    // Reset budget spending
    if (user.budgetIds) {
      user.budgetIds.forEach(budgetId => {
        const budgetIndex = (db.budgets || []).findIndex(b => b._id === budgetId);
        if (budgetIndex !== -1) {
          const budget = db.budgets[budgetIndex];
          if (budget.categoryBudgets) {
            budget.categoryBudgets.forEach(cb => {
              cb.spent = 0;
              cb.remainingAmount = cb.budgetAmount;
            });
          }
        }
      });
    }
    
    // Save database
    await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
    
    console.log(`✅ Cleared ${receiptIds.length} receipts and reset budget spending`);
    
  } catch (error) {
    console.error('❌ Error clearing receipts:', error);
  }
}

// Main execution
async function main() {
  const action = process.argv[2];
  
  if (action === 'clear') {
    await clearUserReceipts();
  } else {
    await inspectUserData();
    console.log('\n💡 To clear all receipts and reset budgets, run: node inspect-user-data.js clear');
  }
}

main();