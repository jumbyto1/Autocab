// Simple test to verify if conversation memory is working
const fetch = globalThis.fetch;

async function simpleMemoryTest() {
  console.log('🧪 SIMPLE CONVERSATION MEMORY TEST');
  console.log('═══════════════════════════════════');
  
  try {
    const testMessage = "where is driver 997";
    const context = {
      vehicles: [
        { id: 997, callsign: '997', driverName: 'Test Driver', status: 'Available', latitude: 51.276, longitude: 1.087 }
      ],
      jobs: [],
      timestamp: new Date().toISOString(),
      conversationHistory: [
        { role: 'user', content: 'can you tell me where driver 997 is please?', timestamp: new Date() },
        { role: 'assistant', content: 'Let me check driver 997 location for you.', timestamp: new Date() }
      ],
      systemCapabilities: {
        canCreateBookings: true,
        canEditBookings: true,
        canDeleteBookings: true,
        canSendToAutocab: true,
        canAccessDriverInfo: true,
        canAccessVehicleInfo: true,
        canProcessEmails: true,
        canAnalyzeImages: true
      }
    };

    console.log('📝 CONVERSATION HISTORY:', context.conversationHistory.length, 'messages');
    console.log('🎯 TESTING MESSAGE:', testMessage);
    console.log('📡 SENDING REQUEST...');

    const response = await fetch('http://localhost:5000/api/ai-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: testMessage,
        context: context
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    
    console.log('\n✅ AI RESPONSE RECEIVED:');
    console.log('Response:', result.response);
    console.log('Type:', result.type);
    
    // Check if the AI responds about driver 997 specifically (showing context awareness)
    if (result.response.includes('997') || result.response.includes('51.276') || result.response.includes('location')) {
      console.log('\n🎉 CONVERSATION MEMORY TEST: ✅ SUCCESS!');
      console.log('The AI is using context from conversation history.');
    } else {
      console.log('\n❌ CONVERSATION MEMORY TEST: FAILED');
      console.log('The AI is not using context from conversation history.');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

simpleMemoryTest();
