/**
 * Test script for the chatbot API endpoints
 * 
 * This script tests the following endpoints:
 * 1. POST /api/chat/conversations - Create a new conversation
 * 2. POST /api/chat/conversations/:id/messages - Add a message to a conversation
 * 3. GET /api/chat/conversations/:id/messages - Get messages for a conversation
 * 
 * Usage: 
 * 1. First login to get a JWT token
 * 2. Save the token to a .env file or pass it as an environment variable
 * 3. Run this script: node chat-test.js
 */

const fetch = require('node-fetch');

// Configuration
const API_URL = 'http://localhost:5000';
const TOKEN = process.env.JWT_TOKEN; // Replace with your JWT token

// Headers for authenticated requests
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${TOKEN}`
};

// Test function
async function testChatbotAPI() {
  console.log('🚀 Starting chatbot API test...');
  let conversationId;

  try {
    // Step 1: Create a new conversation
    console.log('\n📡 Testing: Create a new conversation');
    const createConvResponse = await fetch(`${API_URL}/api/chat/conversations`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        metadata: {
          source: 'test-script',
          testRun: true
        }
      })
    });

    if (!createConvResponse.ok) {
      const error = await createConvResponse.json();
      throw new Error(`Failed to create conversation: ${error.message}`);
    }

    const conversation = await createConvResponse.json();
    console.log('✅ Conversation created successfully');
    console.log('📋 Conversation details:', conversation);
    
    // Extract the conversation ID
    conversationId = conversation.data.id;
    console.log(`📝 Conversation ID: ${conversationId}`);

    // Step 2: Add a user message to the conversation
    console.log('\n📡 Testing: Add a user message to the conversation');
    const addUserMsgResponse = await fetch(`${API_URL}/api/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        senderType: 'user',
        content: 'Hello, this is a test message from the user'
      })
    });

    if (!addUserMsgResponse.ok) {
      const error = await addUserMsgResponse.json();
      throw new Error(`Failed to add user message: ${error.message}`);
    }

    const userMessage = await addUserMsgResponse.json();
    console.log('✅ User message added successfully');
    console.log('📋 Message details:', userMessage);

    // Step 3: Add a bot message to the conversation
    console.log('\n📡 Testing: Add a bot message to the conversation');
    const addBotMsgResponse = await fetch(`${API_URL}/api/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        senderType: 'bot',
        content: 'Hello, this is a response from the bot'
      })
    });

    if (!addBotMsgResponse.ok) {
      const error = await addBotMsgResponse.json();
      throw new Error(`Failed to add bot message: ${error.message}`);
    }

    const botMessage = await addBotMsgResponse.json();
    console.log('✅ Bot message added successfully');
    console.log('📋 Message details:', botMessage);

    // Step 4: Get all messages for the conversation
    console.log('\n📡 Testing: Get all messages for the conversation');
    const getMsgsResponse = await fetch(`${API_URL}/api/chat/conversations/${conversationId}/messages`, {
      method: 'GET',
      headers
    });

    if (!getMsgsResponse.ok) {
      const error = await getMsgsResponse.json();
      throw new Error(`Failed to get messages: ${error.message}`);
    }

    const messages = await getMsgsResponse.json();
    console.log('✅ Messages retrieved successfully');
    console.log('📋 Messages:', messages);

    console.log('\n🎉 All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testChatbotAPI(); 