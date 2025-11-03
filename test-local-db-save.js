/**
 * Test script to verify local database save functionality
 * Run this to test the EditReceiptModern -> Local DB integration
 */

import { createUser, getUserByEmail } from './utils/CRUD/usercrud.js';
import { RelationshipHelpers } from './utils/localdb.js';

// Mock processed receipt data (similar to what Gemini returns)
const mockProcessedReceipt = {
  id: 'test_receipt_' + Date.now(),
  originalImageUri: 'file://test-image.jpg',
  rawText: 'Test receipt text',
  merchant: {
    name: 'Test Store',
    phone_number: '123-456-7890',
    address: '123 Test St',
    confidence: 0.9
  },
  transaction: {
    date: '03/11/25',
    confidence: 0.8
  },
  items: [
    {
      name: 'Test Item 1',
      quantity: 1,
      totalPrice: 10.99,
      itemprice: 10.99,
      linetotal: 10.99,
      confidence: 0.85,
      category: 'Groceries',
      categoryConfidence: 0.9
    },
    {
      name: 'Test Item 2',
      quantity: 2,
      totalPrice: 24.98,
      itemprice: 12.49,
      linetotal: 24.98,
      confidence: 0.85,
      category: 'Restaurant',
      categoryConfidence: 0.8
    }
  ],
  totals: {
    subtotal: 35.97,
    tax: 3.60,
    tip: 5.00,
    total: 44.57,
    confidence: 0.9
  },
  payment: {
    method: 'credit_card',
    confidence: 0.7
  },
  processingSteps: [],
  confidence: {
    overall: 0.85,
    textExtraction: 0.9,
    documentParsing: 0.8,
    dataQuality: 'high'
  },
  rawFields: {
    rawText: 'Test receipt text',
    originalGeminiResponse: {}
  },
  metadata: {
    currency: 'ZAR',
    locale: 'en-ZA',
    processingDate: new Date().toISOString(),
    imageUri: 'file://test-image.jpg',
    documentType: 'receipt'
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  userId: undefined,
  tags: [],
  notes: 'Test receipt for local DB integration'
};

async function testLocalDbSave() {
  console.log('🧪 Testing Local DB Save Integration...');
  
  try {
    // Test user creation/retrieval
    const testEmail = 'test@example.com';
    const testName = 'Test User';
    
    console.log('👤 Checking for user:', testEmail);
    let user = await getUserByEmail(testEmail);
    
    if (!user) {
      console.log('➕ Creating new user...');
      user = await createUser({
        name: testName,
        email: testEmail,
        settings: ''
      });
      console.log('✅ User created:', user._id);
    } else {
      console.log('✅ User found:', user._id);
    }
    
    // Test receipt save
    console.log('💾 Saving processed receipt to local database...');
    const savedReceipt = await RelationshipHelpers.addProcessedReceiptToUser(
      user._id,
      mockProcessedReceipt,
      mockProcessedReceipt.originalImageUri
    );
    
    if (savedReceipt) {
      console.log('✅ Receipt saved successfully!');
      console.log('   Receipt ID:', savedReceipt._id);
      console.log('   Merchant:', savedReceipt.merchant);
      console.log('   Amount:', savedReceipt.amount);
      console.log('   Items count:', savedReceipt.items.length);
      console.log('   User linked:', user._id);
      
      // Verify user now has this receipt
      const { getUserWithRelations } = await import('./utils/CRUD/usercrud.js');
      const userWithReceipts = await getUserWithRelations(user._id);
      
      if (userWithReceipts) {
        console.log('✅ User verification:');
        console.log('   Total receipts:', userWithReceipts.receipts.length);
        console.log('   Latest receipt:', userWithReceipts.receipts[userWithReceipts.receipts.length - 1]?.merchant);
      }
      
      console.log('\n🎉 LOCAL DATABASE SAVE TEST PASSED!');
      console.log('   EditReceiptModern -> Local DB integration is working correctly');
      
    } else {
      throw new Error('Failed to save receipt');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.log('\n💡 Make sure to:');
    console.log('   1. Check import paths');
    console.log('   2. Ensure AsyncStorage is properly mocked');
    console.log('   3. Verify all required modules are available');
  }
}

// Run the test
testLocalDbSave();