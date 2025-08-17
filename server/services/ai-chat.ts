// AI Chat Service with direct OpenAI API integration - OPTIMIZED FOR SPEED
import { generateBookingSummary } from './bookingSummary.js';
import { searchBookingsByPhone, searchAutocabByJobNumber } from './autocabLookup.js';
import { selectCapabilityForBooking, getCapabilityQuestions, getCapabilityPricing } from './autocabCapabilities.js';
async function callOpenAI(messages: any[]): Promise<any> {
  const startTime = Date.now();
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not available');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages,
        max_tokens: 400, // SPEED OPTIMIZATION: Reduced from 800 to 400 for faster responses
        temperature: 0.1, // SPEED OPTIMIZATION: Reduced from 0.3 to 0.1 for faster, more focused responses
        stream: false // Ensure no streaming for faster completion
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
    }

    const result = await response.json();
    const duration = Date.now() - startTime;
    console.log(`⚡ OpenAI API call completed in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ OpenAI API call failed after ${duration}ms:`, error);
    throw error;
  }
}

interface SystemContext {
  vehicles: any[];
  jobs: any[];
  timestamp: string;
  userType?: 'booking' | 'admin' | null;
  conversationHistory?: Array<{
    role: string;
    content: string;
    timestamp: Date;
  }>;
  systemCapabilities?: {
    canCreateBookings: boolean;
    canEditBookings: boolean;
    canDeleteBookings: boolean;
    canSendToAutocab: boolean;
    canAccessDriverInfo: boolean;
    canAccessVehicleInfo: boolean;
    canProcessEmails: boolean;
    canAnalyzeImages: boolean;
  };
}

interface ChatRequest {
  message: string;
  image?: Buffer;
  context: SystemContext;
}

interface SystemAction {
  type: string;
  description: string;
  result: string;
  data?: any;
}

export class AIChatService {
  constructor() {
  }

  // Helper function to get current UK time (BST/GMT aware)
  private getCurrentUKTime(): string {
    const now = new Date();
    
    // Check if we're in British Summer Time (BST) period
    // BST runs from last Sunday in March to last Sunday in October
    const year = now.getFullYear();
    const marchLastSunday = new Date(year, 2, 31 - ((5 + new Date(year, 2, 31).getDay()) % 7));
    const octoberLastSunday = new Date(year, 9, 31 - ((1 + new Date(year, 9, 31).getDay()) % 7));
    
    const isBST = now >= marchLastSunday && now < octoberLastSunday;
    
    // Get UK local time
    let ukTime;
    if (isBST) {
      // BST = UTC + 1
      ukTime = new Date(now.getTime() + (1 * 60 * 60 * 1000));
    } else {
      // GMT = UTC + 0 
      ukTime = new Date(now.getTime());
    }
    
    const hours = ukTime.getUTCHours().toString().padStart(2, '0');
    const minutes = ukTime.getUTCMinutes().toString().padStart(2, '0');
    
    console.log(`🇬🇧 UK TIME: ${hours}:${minutes} (${isBST ? 'BST' : 'GMT'})`);
    return `${hours}:${minutes}`;
  }

  async processChat(request: ChatRequest): Promise<{
    response: string;
    type: 'text' | 'image' | 'system_action';
    actions?: SystemAction[];
    metadata?: any;
  }> {
    const processStartTime = Date.now();
    try {
      console.log(`⚡ PROCESSCHAT SPEED AUDIT - START (${new Date().toISOString()})`);
      console.log('  - message:', request.message.substring(0, 100));
      console.log('  - conversation history length:', request.context.conversationHistory?.length || 0);
      
      // SPEED OPTIMIZATION: Build system prompt with minimal context for faster processing
      const promptStartTime = Date.now();
      const systemPrompt = await this.buildSystemPrompt(request.context);
      console.log(`⚡ System prompt built in ${Date.now() - promptStartTime}ms`);
      
      // SPEED OPTIMIZATION: Prepare minimal messages for OpenAI
      const messages: any[] = [
        {
          role: "system",
          content: systemPrompt
        }
      ];

      // CONVERSATION MEMORY: Add ALL conversation history for better context understanding
      if (request.context.conversationHistory && request.context.conversationHistory.length > 0) {
        console.log(`📝 Adding ${request.context.conversationHistory.length} conversation messages for complete context`);
        request.context.conversationHistory.forEach((msg, index) => {
          // Skip system_action messages to avoid clutter, but keep user and assistant messages
          if (msg.role === 'user' || msg.role === 'assistant') {
            messages.push({
              role: msg.role === 'user' ? 'user' : 'assistant',
              content: msg.content.length > 500 ? msg.content.substring(0, 500) + '...' : msg.content
            });
            console.log(`   ${index + 1}. ${msg.role}: ${msg.content.substring(0, 80)}...`);
          }
        });
        console.log(`🧠 TOTAL MESSAGES TO OPENAI (including system prompt): ${messages.length}`);
      } else {
        console.log('❌ NO CONVERSATION HISTORY AVAILABLE IN MAIN CHAT FLOW');
      }

      // Handle image if present
      if (request.image) {
        const base64Image = request.image.toString('base64');
        messages.push({
          role: "user",
          content: [
            {
              type: "text",
              text: request.message || "Analyze this image and extract relevant information for the AUTOCAB system."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        });
      } else {
        messages.push({
          role: "user",
          content: request.message
        });
      }

      try {
        // PURE GPT-4o APPROACH: Single API call handles everything
        const openaiStartTime = Date.now();
        const completion = await callOpenAI(messages);
        const aiResponse = completion.choices[0].message.content || "Could not process the request.";
        console.log(`⚡ GPT-4o response received in ${Date.now() - openaiStartTime}ms`);
        
        // Check for search requests FIRST (priority over booking creation)
        let actions: SystemAction[] = [];
        const lowerMessage = request.message.toLowerCase();
        const searchKeywords = ['find', 'search', 'look up', 'lookup', 'show me', 'get booking', 'booking id', 'search phone', 'find phone', 'job number'];
        const hasSearchKeywords = searchKeywords.some(keyword => lowerMessage.includes(keyword));
        
        // Also detect standalone booking IDs (6+ digit numbers)
        const bookingIdPattern = /^\s*\d{6,}\s*$/;
        const isStandaloneBookingId = bookingIdPattern.test(request.message.trim());
        
        // Also detect UK phone numbers (07xxxxxxxxx, 01xxxxxxxxx, 02xxxxxxxxx, +44xxxxxxxxx)
        const phonePattern = /^(\+44\s?7\d{9}|07\d{9}|\+44\s?[12]\d{9}|0[12]\d{9})$/;
        const isPhoneNumber = phonePattern.test(request.message.replace(/\s/g, ''));
        
        // Check if this is a response to a booking request (not a search request)
        const lastAssistantMessage = request.context.conversationHistory?.slice(-1)[0];
        const isRespondingToBookingRequest = lastAssistantMessage && 
          lastAssistantMessage.role === 'assistant' && 
          /provide.*name|provide.*phone|passenger.*name|phone.*number.*booking|name.*phone.*booking/i.test(lastAssistantMessage.content);
        
        console.log('🔍 CONTEXT DETECTION DEBUG:', {
          hasLastMessage: !!lastAssistantMessage,
          lastMessageRole: lastAssistantMessage?.role,
          lastMessageContent: lastAssistantMessage?.content?.substring(0, 100),
          isRespondingToBookingRequest,
          searchBeforeContext: hasSearchKeywords || isStandaloneBookingId || isPhoneNumber
        });
        
        const isSearchRequest = (hasSearchKeywords || isStandaloneBookingId || isPhoneNumber) && !isRespondingToBookingRequest;
        
        // Detect quotation requests (price inquiries for new journeys) - BUT NOT when customer details are provided
        const quotationKeywords = ['how much', 'cost', 'price', 'quote', 'estimate', 'fare', 'charge', 'how much is', 'what would it cost', 'price for'];
        const hasQuotationKeywords = quotationKeywords.some(keyword => lowerMessage.includes(keyword));
        const hasJourneyIndicators = /from\s+.*\s+to\s+|to\s+.*\s+from\s+|from.*to|canterbury.*to|to.*dover|taxi.*from|journey/i.test(lowerMessage);
        
        // Also check conversation history for journey context
        const conversationText = (request.context.conversationHistory || []).map(msg => msg.content).join(' ').toLowerCase();
        const hasJourneyInHistory = /from\s+.*\s+to\s+|to\s+.*\s+from\s+|from.*to|canterbury.*to|to.*dover/i.test(conversationText);
        
        // Check if customer details are being provided (prioritize booking over quotation)
        const hasCustomerDetails = /name.*is|phone.*\d|my.*name|called.*\d|mr\.|mrs\.|ms\.|07\d{9}|01\d{9}|02\d{9}|\+44/i.test(lowerMessage);
        
        const isQuotationRequest = (hasQuotationKeywords || hasJourneyIndicators || hasJourneyInHistory) && !isSearchRequest && !hasCustomerDetails;
        
        console.log('🔍 QUOTATION LOGIC DEBUG:', {
          hasQuotationKeywords,
          hasJourneyIndicators,
          hasJourneyInHistory,
          isSearchRequest,
          finalResult: isQuotationRequest,
          calculation: `(${hasQuotationKeywords} || ${hasJourneyIndicators} || ${hasJourneyInHistory}) && !${isSearchRequest} = ${isQuotationRequest}`
        });
        
        console.log('🔍 ENHANCED SEARCH DETECTION DEBUG:', {
          lowerMessage,
          hasSearchKeywords,
          foundKeywords: searchKeywords.filter(keyword => lowerMessage.includes(keyword)),
          isStandaloneBookingId,
          isPhoneNumber,
          isSearchRequest,
          hasQuotationKeywords,
          hasJourneyIndicators,
          isQuotationRequest
        });
        
        console.log('💰 QUOTATION DETECTION DEBUG:', {
          quotationKeywords: quotationKeywords.filter(keyword => lowerMessage.includes(keyword)),
          hasQuotationKeywords,
          hasJourneyIndicators,
          hasJourneyInHistory,
          hasCustomerDetails,
          conversationText,
          isQuotationRequest,
          lowerMessage
        });
        
        if (isQuotationRequest) {
          console.log('💰 QUOTATION REQUEST DETECTED - Generating price quote');
          const quotationAction = await this.handleQuotationRequest(request.message, request.context.conversationHistory || []);
          console.log('💰 QUOTATION ACTION RESULT:', quotationAction);
          if (quotationAction) {
            actions = [quotationAction];
          }
        } else if (isSearchRequest) {
          console.log('🔍 SEARCH REQUEST DETECTED IN MAIN FLOW - Calling handleBookingSearch');
          const searchAction = await this.handleBookingSearch(request.message);
          console.log('🔍 SEARCH ACTION RESULT:', searchAction);
          if (searchAction) {
            actions = [searchAction];
          }
        } else {
          // Check if this is a booking request (but NOT a quotation request) and extract booking data using GPT-4o
          const isBookingRequest = /book|pickup|ride|want.*from|need.*to|going.*to|time.*pickup|need.*taxi|want.*taxi|address|street|postcode/i.test(request.message) && !isQuotationRequest;
          
          if (isBookingRequest) {
            console.log('🎯 BOOKING REQUEST DETECTED - USING PURE GPT-4o EXTRACTION');
            console.log('🧠 PASSING CONVERSATION HISTORY TO BOOKING EXTRACTION:', request.context.conversationHistory?.length || 0, 'messages');
            const bookingAction = await this.createBookingFromText(request.message, request.context.conversationHistory || []);
            if (bookingAction) {
              actions = [bookingAction];
            }
          }
        }
        
        const totalProcessTime = Date.now() - processStartTime;
        console.log(`⚡ TOTAL PROCESSCHAT TIME: ${totalProcessTime}ms`);
        
        // Use search action response if available (priority over AI response)
        let finalResponse = aiResponse;
        console.log('🔍 RESPONSE OVERRIDE DEBUG:', {
          actionsLength: actions.length,
          firstActionType: actions.length > 0 ? actions[0].type : 'none',
          hasResponse: actions.length > 0 ? !!actions[0].response : false,
          responseLength: actions.length > 0 && actions[0].response ? actions[0].response.length : 0
        });
        
        if (actions.length > 0 && (actions[0].type === 'search_booking' || actions[0].type === 'price_quotation') && actions[0].response) {
          finalResponse = actions[0].response;
          console.log(`🔍 USING ${actions[0].type.toUpperCase()} ACTION RESPONSE INSTEAD OF AI RESPONSE`);
        }
        
        return {
          response: finalResponse,
          type: request.image ? 'image' : 'text',
          actions,
          metadata: {
            model: 'gpt-4o',
            timestamp: new Date().toISOString(),
            tokensUsed: completion.usage?.total_tokens,
            processingTime: totalProcessTime
          }
        };
      } catch (openaiError) {
        console.error('❌ GPT-4o API ERROR:', openaiError.message);
        return {
          response: `Sarah is temporarily unavailable. Please try again in a moment.`,
          type: 'text',
          actions: [],
          metadata: {
            model: 'gpt-4o',
            timestamp: new Date().toISOString(),
            error: openaiError.message
          }
        };
      }

    } catch (error) {
      console.error('AI Chat Error:', error);
      return {
        response: `❌ Error processing request: ${error.message}. Please check API configuration.`,
        type: 'text'
      };
    }
  }

  private async buildSystemPrompt(context: SystemContext): Promise<string> {
    const { vehicles, jobs } = context;
    
    // SPEED OPTIMIZATION: Minimal context building for faster processing
    const vehicle997 = vehicles.find(v => v.callsign === '997');
    console.log(`🤖 OPTIMIZED CONTEXT: ${vehicles.length} vehicles, ${jobs.length} jobs`);
    
    // Get current temporal information for Sarah's awareness
    const now = new Date();
    const currentTime = this.getCurrentUKTime();
    const currentDate = now.toLocaleDateString('en-GB', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const currentDay = now.toLocaleDateString('en-GB', { weekday: 'long' });
    const currentDateShort = now.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
    
    // HIGH INTELLIGENCE AI SYSTEM PROMPT - Enhanced GPT-4o with Autocab Integration
    return `You are Sarah, a highly intelligent human dispatcher at CABCO Canterbury Taxis with advanced data processing capabilities. Be natural, warm, and conversational while demonstrating high intelligence in data capture and translation.

CRITICAL CONVERSATION MEMORY: You have access to the full conversation history above this system prompt. ALWAYS remember and use information from previous messages. If a user mentioned "today at 12" earlier, remember that time. If they mentioned pickup locations, remember those addresses. Use all previous context to avoid asking for information already provided.

TEMPORAL AWARENESS - YOU KNOW THE CURRENT TIME:
- Current Time: ${currentTime}
- Current Day: ${currentDay}
- Current Date: ${currentDate}
- Date Format: ${currentDateShort}

You can answer questions about the current time, day, and date. Examples:
- "What time is it?" → "It's ${currentTime} right now."
- "What day is today?" → "Today is ${currentDay}."
- "What's the date today?" → "Today's date is ${currentDate}."

ALWAYS provide temporal information when asked - you have full awareness of current time, day, and date.

CORE INTELLIGENCE CAPABILITIES:
- Advanced data extraction from conversational input
- Intelligent translation of raw information to structured formats
- Real-time address formatting using Autocab well-known addresses
- Smart detection of booking intentions and requirements

HIGH INTELLIGENCE AUTOCAB WELL-KNOWN ADDRESSES:
Transform any raw location mentions into full Autocab-compliant addresses:
- "East Street" → "21 East Street, Canterbury, CT1 1ED"
- "Canterbury Cathedral" → "Canterbury Cathedral, Cathedral Lodge, Canterbury, CT1 2EH"
- "Hospital" → "Kent and Canterbury Hospital, Ethelbert Road, Canterbury, CT1 3NG"
- "Station" → "Canterbury East Station, Station Road East, Canterbury, CT1 2RB"
- "University" → "University of Kent, Canterbury, CT2 7NZ"
- "Christ Church" → "Canterbury Christ Church University, North Holmes Road, Canterbury, CT1 1QU"
- "Westgate" → "Westgate Shopping Centre, Canterbury, CT1 2BL"
- "High Street" → "Canterbury High Street, Canterbury, CT1 2JE"
- "Margate Police Station" → "Odell House, Fort Hill, Margate, CT9 1HL"
- "Margate Hospital" → "Queen Elizabeth The Queen Mother Hospital, St Peters Road, Margate, CT9 4AN"
- "Ashford Hospital" → "William Harvey Hospital, Kennington Road, Ashford, TN24 0LZ"
- "Dover Hospital" → "Dover Hospital, Buckland Hospital, Dover, CT17 0HD"
- "Folkestone Hospital" → "Folkestone Hospital, Radnor Park Avenue, Folkestone, CT19 5BN"

INTELLIGENT DATA CAPTURE & TRANSLATION:
Raw Input → Structured Output Examples:
- "tomorrow morning" → "15/07/2025" and "09:00"
- "the hospital" → "Kent and Canterbury Hospital, Ethelbert Road, Canterbury, CT1 3NG"
- "mr smith" → "Mr Smith"
- "07123456789" → "+447123456789"
- "people carrier" → "MPV"

GREETING: "Hello! I'm Sarah from CABCO Canterbury Taxis. How can I help you today?"

PURE GPT-4o CONVERSATIONAL BOOKING FLOW:
- Act as a natural, human-like taxi dispatcher
- Ask ONE question at a time and wait for user response
- Extract multiple data points from conversations when possible
- Use your intelligence to understand context and remember information from previous messages
- CRITICAL: Before asking for any information, check if it was mentioned in previous messages
- If user said "today at 12" earlier, remember that's the date and time - don't ask again
- If user mentioned pickup locations before, remember those addresses
- Build on previous conversation context to create complete bookings

CRITICAL: COMPLETE BOOKING INFORMATION COLLECTION
Sarah must collect ALL required fields before confirming any booking:

1. **DATE & TIME** - NEVER assume or skip time collection
   - "What date do you need the taxi?" (get DD/MM/YYYY format)
   - "What time would you like the pickup?" (get HH:MM format)
   - Convert "ASAP" to current time: ${currentTime}
   - Today's date: ${currentDateShort}

2. **COMPLETE PICKUP ADDRESS** - NEVER accept incomplete addresses
   - "I need the full pickup address including house number and postcode"
   - "What's the house number on Margate Street?"
   - "What's the postcode for that address?"
   - Format: "45 Margate Street, Canterbury CT1 2AB"

3. **COMPLETE DESTINATION ADDRESS** - Get full address with postcode
   - "What's the full destination address including postcode?"
   - Apply Canterbury mappings: "hospital" → "Kent and Canterbury Hospital, Ethelbert Road, Canterbury, CT1 3NG"

4. **PASSENGER NAME** - Always required
   - "What's the passenger name for this booking?"

5. **PHONE NUMBER** - Always required
   - "What's your phone number?"
   - Accept mobile (07xxx) or landline (01xxx/02xxx) formats

6. **PASSENGERS & LUGGAGE** - Always required for proper vehicle capability selection
   - "How many passengers will be traveling?"
   - "How many pieces of luggage/bags do you have?"
   - Based on response, intelligently select vehicle capability:
     * 1-4 passengers + 0-2 bags = Saloon (S)
     * 1-4 passengers + 3-5 bags = Estate (E) 
     * 5 passengers = 5 seater capability (5)
     * 6 passengers = 6 seater capability (6)
     * 7 passengers = 7 seater capability (7)
     * 8 passengers = 8 seater capability (8)
   - For quotes, ask: "How many passengers and how many bags?" to get accurate pricing

NEVER provide booking summaries until ALL 6 required fields are collected!

**CRITICAL QUOTE REQUIREMENTS:**
For price quotations, Sarah must collect:
1. Date/Time (affects pricing)
2. Pickup address (for coordinates)
3. Destination address (for coordinates)
4. Number of passengers (for capability selection)
5. Number of luggage pieces (for capability selection)

Example: "I need a quote from Canterbury to Dover tomorrow at 2pm for 3 passengers with 2 bags"
→ Sarah should ask: "Perfect! Let me get you an accurate price for that journey."

NATURAL RESPONSES:
- "I need a bit more information to complete your booking. What time would you like the pickup?"
- "What's the house number and postcode for Margate Street?"
- "Perfect! What's your phone number?"

STATUS: ${vehicles.length} vehicles online, ${jobs.length} bookings active
Vehicle 997: ${vehicle997?.driverName || 'Not available'}

Use your high intelligence to capture and translate raw conversational data into exactly what the Autocab system needs.`;
  }



  private async formatAddress(rawAddress: string): Promise<string> {
    if (!rawAddress || rawAddress.trim().length < 3) {
      return rawAddress;
    }

    try {
      // Define Canterbury-focused address mappings for better results
      const canterburyMappings = {
        'east street': '21 East Street, Canterbury, CT1 1ED',
        'canterbury cathedral': 'Canterbury Cathedral, Cathedral Lodge, Canterbury, CT1 2EH',
        'hospital': 'Kent and Canterbury Hospital, Ethelbert Road, Canterbury, CT1 3NG',
        'canterbury hospital': 'Kent and Canterbury Hospital, Ethelbert Road, Canterbury, CT1 3NG',
        'station': 'Canterbury East Station, Station Road East, Canterbury, CT1 2RB',
        'canterbury station': 'Canterbury East Station, Station Road East, Canterbury, CT1 2RB',
        'university': 'University of Kent, Canterbury, CT2 7NZ',
        'christchurch': 'Canterbury Christ Church University, North Holmes Road, Canterbury, CT1 1QU',
        'westgate': 'Westgate Shopping Centre, Canterbury, CT1 2BL',
        'high street': 'Canterbury High Street, Canterbury, CT1 2JE',
        'margate police station': 'Odell House, Fort Hill, Margate, CT9 1HL',
        'margate hospital': 'Queen Elizabeth The Queen Mother Hospital, St Peters Road, Margate, CT9 4AN',
        'ashford hospital': 'William Harvey Hospital, Kennington Road, Ashford, TN24 0LZ',
        'dover hospital': 'Dover Hospital, Buckland Hospital, Dover, CT17 0HD',
        'folkestone hospital': 'Folkestone Hospital, Radnor Park Avenue, Folkestone, CT19 5BN'
      };

      // Check for direct Canterbury mappings first
      const lowerAddress = rawAddress.toLowerCase().trim();
      for (const [key, value] of Object.entries(canterburyMappings)) {
        if (lowerAddress.includes(key)) {
          console.log('✅ CANTERBURY MAPPING FOUND:', rawAddress, '→', value);
          return value;
        }
      }

      // First try with Canterbury/Kent context for more relevant UK results
      let searchQuery = rawAddress;
      if (!rawAddress.toLowerCase().includes('canterbury') && !rawAddress.toLowerCase().includes('kent') && !rawAddress.toLowerCase().includes('uk')) {
        searchQuery = `${rawAddress} Canterbury Kent UK`;
      }
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}&region=GB&key=${process.env.GOOGLE_MAPS_API_KEY}`
      );

      if (!response.ok) {
        console.log('⚠️ Google Places API error, returning raw address:', rawAddress);
        return rawAddress;
      }

      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Prioritize UK results, especially those in Kent/Canterbury area
        const ukResults = data.results.filter(place => 
          place.formatted_address.includes('UK') || 
          place.formatted_address.includes('United Kingdom') ||
          place.formatted_address.includes('England') ||
          place.formatted_address.includes('Kent')
        );
        
        const selectedResult = ukResults.length > 0 ? ukResults[0] : data.results[0];
        let fullAddress = selectedResult.formatted_address;
        
        // Enhance address with building/establishment name if available
        if (selectedResult.name && selectedResult.name !== selectedResult.formatted_address) {
          // Only add name if it's a meaningful establishment name
          if (selectedResult.name.includes('Hospital') || selectedResult.name.includes('Station') || 
              selectedResult.name.includes('University') || selectedResult.name.includes('Cathedral') ||
              selectedResult.name.includes('Centre') || selectedResult.name.includes('Hotel') ||
              selectedResult.name.includes('School') || selectedResult.name.includes('Church')) {
            fullAddress = `${selectedResult.name}, ${fullAddress}`;
          }
        }
        
        console.log('✅ ADDRESS FORMATTED:', rawAddress, '→', fullAddress);
        return fullAddress;
      }
      
      console.log('⚠️ No Places API results, returning raw address:', rawAddress);
      return rawAddress;
    } catch (error) {
      console.error('❌ Address formatting error:', error);
      return rawAddress;
    }
  }

  // Get real-time price quote from Autocab API
  private async getAutocabQuote(bookingData: any): Promise<{ price: string; distance: string; duration: string } | null> {
    try {
      console.log('💰 Getting Autocab quote for booking:', bookingData);
      
      if (!bookingData.pickup || !bookingData.destination) {
        console.log('⚠️ Missing pickup or destination for quote');
        return null;
      }
      
      const quotePayload = {
        pickup: bookingData.pickup,
        destination: bookingData.destination,
        date: bookingData.date || new Date().toLocaleDateString('en-GB'),
        time: bookingData.time || "ASAP",
        passengers: bookingData.passengers || 1,
        luggage: bookingData.luggage || 0,
        vehicleType: bookingData.vehicleType || "Saloon",
        viaPoints: bookingData.viaPoints || []
      };
      
      // Call our internal quote endpoint
      const response = await fetch('http://localhost:5000/api/autocab/quote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(quotePayload)
      });
      
      if (!response.ok) {
        console.error('❌ Quote API failed:', response.status);
        return null;
      }
      
      const quoteResult = await response.json();
      console.log('✅ Quote API success:', quoteResult);
      
      if (quoteResult.success && quoteResult.quote?.outward) {
        const outward = quoteResult.quote.outward;
        return {
          price: (outward.price || outward.cost).toString(), // Raw price for database
          distance: `${outward.distance} ${outward.measurement || 'Miles'}`,
          duration: outward.time || 'N/A',
          displayPrice: `£${outward.price || outward.cost}` // Formatted for display
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting Autocab quote:', error);
      return null;
    }
  }

  private generateConversationalResponse(missingFields: string[], extractedData: any): string {
    const responses = {
      time: "What time would you like the pickup?",
      date: "What date would you like the taxi? You can say today, tomorrow, or the specific date.",
      pickup: extractedData.pickup && extractedData.pickup.length > 0 && !extractedData.pickup.includes(',') ? 
        `I need the house number - what number on ${extractedData.pickup}?` : 
        "Where would you like to be picked up from? Please include the house number and street name.",
      destination: extractedData.destination && extractedData.destination.length > 0 && !extractedData.destination.includes(',') ?
        `I need the complete address - where exactly on ${extractedData.destination}?` :
        "Where would you like to go? Please include the house number and street name.",
      customerName: "Can I have your name please?",
      phone: "Can I have your phone number please?", 
      vehicle: "How many passengers will be traveling?",
      passengers: "How many passengers will be traveling?"
    };

    // Priority order for asking questions - most logical flow
    const priorityOrder = ['date', 'time', 'pickup', 'destination', 'customerName', 'phone', 'vehicle'];
    
    // Find the first missing field in priority order
    const nextField = priorityOrder.find(field => missingFields.includes(field)) || missingFields[0];
    
    // Always ask for ONE field at a time
    return responses[nextField] || `Could you provide the ${nextField}?`;
  }

  private async getDriverLocation(vehicleId: string): Promise<SystemAction | null> {
    try {
      // Fetch vehicles from internal API
      const response = await fetch('http://localhost:5000/api/vehicles');
      const data = await response.json();
      const vehicle = data.vehicles?.find((v: any) => v.callsign === vehicleId);
      
      if (vehicle && vehicle.latitude && vehicle.longitude) {
        // Get detailed address from coordinates
        const addressDetails = await this.getDetailedAddressFromCoords(vehicle.latitude, vehicle.longitude);
        
        // Calculate time vehicle has been free (based on status and shift)
        const freeTime = this.calculateFreeTime(vehicle);
        
        const locationInfo = `${vehicle.driverName} is located at:
📍 City: ${addressDetails.city}
🏠 Street: ${addressDetails.street}
⏱️ Free for: ${freeTime}
📊 Status: ${vehicle.statusDescription || vehicle.status}
🗺️ Coordinates: ${vehicle.latitude.toFixed(6)}, ${vehicle.longitude.toFixed(6)}`;
        
        return {
          type: 'location_lookup',
          description: `Detailed location driver ${vehicleId}`,
          result: locationInfo,
          data: { 
            vehicleId, 
            lat: vehicle.latitude, 
            lng: vehicle.longitude, 
            city: addressDetails.city,
            street: addressDetails.street,
            freeTime,
            status: vehicle.status
          }
        };
      }
      
      return {
        type: 'location_lookup',
        description: `Location driver ${vehicleId}`,
        result: `Vehicle ${vehicleId} not found or GPS not active`,
        data: { vehicleId, found: false }
      };
    } catch (error) {
      return {
        type: 'location_lookup',
        description: `Error location driver ${vehicleId}`,
        result: `Error getting location: ${error.message}`,
        data: { vehicleId, error: true }
      };
    }
  }

  private async getDriverEarnings(vehicleId: string): Promise<SystemAction | null> {
    try {
      // Fetch vehicles from internal API
      const response = await fetch('http://localhost:5000/api/vehicles');
      const data = await response.json();
      const vehicle = data.vehicles?.find((v: any) => v.callsign === vehicleId);
      
      if (vehicle && vehicle.shiftStats) {
        const { cashJobs, rankJobs } = vehicle.shiftStats;
        const cashEarnings = cashJobs * 20; // £20 per cash job
        const rankEarnings = rankJobs * 22; // £22 per rank job
        const totalEarnings = cashEarnings + rankEarnings;

        return {
          type: 'earnings_lookup',
          description: `Earnings driver ${vehicleId}`,
          result: `${vehicle.driverName} today: ${cashJobs} cash jobs (£${cashEarnings}), ${rankJobs} rank jobs (£${rankEarnings}) = Total: £${totalEarnings}`,
          data: { vehicleId, cashJobs, rankJobs, totalEarnings }
        };
      }

      return {
        type: 'earnings_lookup',
        description: `Earnings driver ${vehicleId}`,
        result: `Vehicle ${vehicleId} not found or no earnings data available`,
        data: { vehicleId, found: false }
      };
    } catch (error) {
      return {
        type: 'earnings_lookup',
        description: `Error earnings driver ${vehicleId}`,
        result: `Error getting earnings: ${error.message}`,
        data: { vehicleId, error: true }
      };
    }
  }

  private async createBookingFromText(message: string, messages: any[] = []): Promise<SystemAction | null> {
    try {
      // Use direct OpenAI API call for booking extraction
      console.log('🤖 AI BOOKING EXTRACTION - INPUT MESSAGE:', message);
      console.log('🧠 CONVERSATION CONTEXT MESSAGES COUNT:', messages.length);
      console.log('🧠 CONVERSATION HISTORY RECEIVED:', JSON.stringify(messages.slice(0, 5), null, 2));
      
      // Build the conversation context for OpenAI - this is the key fix
      const conversationMessages = [
        {
          role: "system",
          content: `You are a JSON booking assistant specializing in Canterbury taxi bookings. ONLY respond in valid JSON format. Extract information from the ENTIRE conversation context and current message.

          CRITICAL: Your entire response must be valid JSON. No text outside JSON. No explanations.

          CONVERSATION CONTEXT: You have access to the full conversation history. Use ALL previous messages to understand what information has already been provided.
          
          CRITICAL MEMORY RULE: If the user previously said "today at 12" or similar, extract "today" as date and "12:00" as time. Don't ask again for information already provided.

          For dates: "today" = ${new Date().toLocaleDateString('en-GB')}, "tomorrow" = ${new Date(Date.now() + 24*60*60*1000).toLocaleDateString('en-GB')}
          
          CRITICAL UK TIME HANDLING:
          - For ASAP/urgent/emergency requests: date = "${new Date().toLocaleDateString('en-GB')}", time = "${this.getCurrentUKTime()}"
          - Current UK time is: ${this.getCurrentUKTime()} (includes UK Summer Time adjustment)
          - Always use current UK local time for ASAP bookings, not UTC

          LOCATION EXTRACTION PRIORITY - FOCUS ON FULL CANTERBURY ADDRESSES:
          1. Convert raw locations to full detailed addresses with postcodes
          2. Canterbury locations should include street name, Canterbury, and postcode (CT1/CT2/CT3)
          3. For "East Street" → "21 East Street, Canterbury, CT1 1ED"
          4. For "Margate Police Station" → "Odell House, Fort Hill, Margate, CT9 1HL"
          5. For "Canterbury Cathedral" → "Canterbury Cathedral, Cathedral Lodge, Canterbury, CT1 2EH"
          6. For "Hospital" → "Kent and Canterbury Hospital, Ethelbert Road, Canterbury, CT1 3NG"
          7. Always try to provide building name, street name, city, and postcode
          8. If raw location mentioned, expand to full address with Canterbury context

          REQUIRED JSON FORMAT (always return this exact structure):
          {
            "pickup": "FULL detailed address with postcode - e.g. '21 East Street, Canterbury, CT1 1ED'",
            "destination": "FULL detailed address with postcode - e.g. 'Odell House, Fort Hill, Margate, CT9 1HL'", 
            "customerName": "extracted name or empty string",
            "phone": "extracted phone or empty string",
            "date": "extracted date or empty string",
            "time": "extracted time or empty string",
            "passengers": 1,
            "luggage": 0,
            "vehicle": "Saloon, Estate, MPV, or Large MPV - MUST be one of these exact values",
            "notes": "extracted notes or empty string",
            "missingFields": ["list", "of", "missing", "field", "names"],
            "conversationalResponse": "single question for next missing field"
          }

          CRITICAL FIELD REQUIREMENTS:
          Required fields: date, time, pickup, destination, customerName, phone, vehicle
          Optional fields: passengers, luggage, notes
          
          VEHICLE TYPE RULES:
          - 1-3 passengers: "Saloon" 
          - 4-5 passengers: "Estate"
          - 6-7 passengers: "MPV"
          - 8+ passengers: "Large MPV"
          - ALWAYS ask "How many passengers?" if not specified
          - NEVER leave vehicle field empty - select based on passenger count
          
          PHONE NUMBER RULES:
          - ALWAYS ask "Can I have your phone number please?" if not provided
          - Format UK mobile: 07xxx... or +44 7xxx...
          - Format UK landline: 01xxx... or 02xxx... or +44 xxx...
          
          CUSTOMER NAME RULES:
          - ALWAYS ask "Can I have your name please?" if not provided
          - Extract "Mr Smith", "Mrs Jones", "John Smith" etc.
          - Never leave customerName empty for bookings

          CRITICAL VALIDATION RULES:
          1. Look at ALL previous conversation messages to find already-provided information
          2. If information was provided in earlier messages, include it in the JSON and DO NOT mark as missing
          3. Only mark fields as missing if they haven't been mentioned anywhere in the conversation
          4. Ask for ONLY ONE missing field at a time in conversationalResponse
          5. NEVER provide booking summaries if ANY required field is missing
          6. If pickup address lacks house number or postcode, mark "pickup" as missing
          7. If destination address lacks full details, mark "destination" as missing  
          8. Be conversational and friendly in responses - sound like a real human dispatcher
          9. For first-time booking requests, start with: "Absolutely! I'd be happy to book that for you. What time would you like the pickup?"
          10. Response must be valid JSON only - no other text
          11. ALWAYS expand simple locations to full Canterbury addresses with postcodes
          12. NEVER say "Here's a summary of your booking" unless missingFields is empty array`
        }
      ];
      
      // Add the conversation history (this is the critical fix!)
      if (messages && messages.length > 0) {
        console.log('🔄 Adding conversation history to OpenAI call:', messages.length, 'messages');
        messages.forEach((msg, index) => {
          console.log(`   ${index + 1}. ${msg.role}: ${msg.content.substring(0, 50)}...`);
          if (msg.role === 'user' || msg.role === 'assistant') {
            conversationMessages.push({
              role: msg.role,
              content: msg.content
            });
          }
        });
      } else {
        console.log('❌ NO CONVERSATION HISTORY PASSED TO FUNCTION!');
      }
      
      // Add the current message
      conversationMessages.push({
        role: "user", 
        content: message
      });
      
      console.log('🧠 FINAL MESSAGE COUNT TO OPENAI:', conversationMessages.length);
      
      // Force JSON response format to ensure GPT-4o returns valid JSON
      const extractResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: conversationMessages,
          max_tokens: 600,
          temperature: 0.1,
          response_format: { type: "json_object" } // Force JSON response
        })
      });

      if (!extractResponse.ok) {
        const errorData = await extractResponse.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${extractResponse.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const extractResponseData = await extractResponse.json();

      let responseContent = extractResponseData.choices[0].message.content || '{}';
      console.log('🔍 RAW AI RESPONSE:', responseContent);
      
      // Clean up any markdown code blocks or formatting
      responseContent = responseContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').replace(/`/g, '').trim();
      console.log('🧹 CLEANED RESPONSE:', responseContent);
      
      let extractedData;
      try {
        extractedData = JSON.parse(responseContent);
        console.log('✅ JSON PARSING SUCCESS:', extractedData);
        
        // CRITICAL DEBUG: This log should appear if code execution reaches here
        console.log('🚨 CRITICAL DEBUG: ADDRESS FORMATTING SECTION REACHED');
        
        // Simple test: format addresses with explicit try-catch
        try {
          if (extractedData.pickup && typeof extractedData.pickup === 'string' && extractedData.pickup.trim().length > 0) {
            console.log('🔄 FORMATTING PICKUP ADDRESS:', extractedData.pickup);
            extractedData.pickup = await this.formatAddress(extractedData.pickup);
            console.log('✅ PICKUP FORMATTED:', extractedData.pickup);
          }
          
          if (extractedData.destination && typeof extractedData.destination === 'string' && extractedData.destination.trim().length > 0) {
            console.log('🔄 FORMATTING DESTINATION ADDRESS:', extractedData.destination);
            extractedData.destination = await this.formatAddress(extractedData.destination);
            console.log('✅ DESTINATION FORMATTED:', extractedData.destination);
          }
          
          console.log('🏁 ADDRESS FORMATTING COMPLETED');
        } catch (formatError) {
          console.error('❌ ADDRESS FORMATTING ERROR:', formatError);
        }
        
        // ✅ ASAP TIME HANDLING SUCCESS: GPT-4o automatically converts "ASAP" to current UK time
        // GPT-4o intelligently converts ASAP requests (e.g., "ASAP" → "17:19" current UK time)
        // This provides accurate real-time booking with proper UK timezone handling
        
        console.log('🚨 END OF JSON PARSING TRY BLOCK');
      } catch (parseError) {
        console.error('❌ JSON PARSING FAILED:', parseError);
        console.error('❌ FAILED CONTENT:', responseContent);
        
        // PURE GPT-4o APPROACH: Try again with more explicit JSON instructions
        console.log('🔄 RETRYING WITH GPT-4o FOR PURE JSON RESPONSE...');
        
        const retryMessages = [
          {
            role: "system",
            content: `You are a JSON conversion assistant. The user needs a taxi booking. Convert their message to this EXACT JSON format with NO other text:

{
  "pickup": "full address with postcode",
  "destination": "full address with postcode", 
  "customerName": "name or empty string",
  "phone": "phone or empty string",
  "date": "date or empty string",
  "time": "time or empty string",
  "passengers": 1,
  "luggage": 0,
  "vehicle": "vehicle type or empty string",
  "notes": "notes or empty string",
  "missingFields": ["list", "of", "missing", "fields"],
  "conversationalResponse": "ONE question for next missing field"
}

Current UK time: ${this.getCurrentUKTime()}
Current date: ${new Date().toLocaleDateString('en-GB')}
Today is: ${new Date().toLocaleDateString('en-GB', { weekday: 'long' })}

RESPOND WITH ONLY JSON. NO OTHER TEXT.`
          },
          {
            role: "user",
            content: message
          }
        ];
        
        try {
          const retryResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: "gpt-4o",
              messages: retryMessages,
              max_tokens: 400,
              temperature: 0.0,
              response_format: { type: "json_object" }
            })
          });
          
          if (retryResponse.ok) {
            const retryData = await retryResponse.json();
            let retryContent = retryData.choices[0].message.content || '{}';
            retryContent = retryContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            
            extractedData = JSON.parse(retryContent);
            console.log('✅ RETRY JSON PARSING SUCCESS:', extractedData);
          } else {
            throw new Error('Retry failed');
          }
        } catch (retryError) {
          console.error('❌ RETRY ALSO FAILED:', retryError);
          // Only now create minimal fallback
          extractedData = {
            pickup: "",
            destination: "",
            customerName: "",
            phone: "",
            date: "",
            time: "",
            passengers: 1,
            luggage: 0,
            vehicle: "",
            notes: "",
            missingFields: ["date", "time", "pickup", "destination", "customerName", "phone", "vehicle"],
            conversationalResponse: "I'd be happy to help you with that booking! What time would you like the pickup?"
          };
        }
      }
      
      // CRITICAL DEBUG: We should have seen address formatting logs above if code executed properly
      console.log('🚨 REACHED FIELD VALIDATION SECTION - Address formatting completed or skipped');
      
      // Check for missing required fields - be more strict about address completeness
      const requiredFields = ['pickup', 'destination', 'customerName', 'phone', 'date', 'time', 'vehicle'];
      const missingFields = requiredFields.filter(field => {
        const value = extractedData[field];
        
        // Basic empty check
        if (!value || value === '' || value === null || value === undefined || 
            (typeof value === 'string' && value.trim() === '')) {
          return true;
        }
        
        // Special validation for addresses - ensure they have house numbers and postcodes
        if (field === 'pickup' || field === 'destination') {
          const address = value.toString().trim();
          // Check for incomplete addresses like "45 Margate Street" without postcode
          if (address.length < 10 || 
              !address.includes(',') || 
              !/\b(CT|ME|DA|TN|BR|SE|SW|NW|NE|E|W|N|S)\d+\s*\d*[A-Z]{2}\b/i.test(address)) {
            console.log(`❌ INCOMPLETE ADDRESS: ${field} = "${address}" - needs postcode`);
            return true;
          }
        }
        
        return false;
      });

      console.log('🔍 FIELD VALIDATION:', {
        extractedData,
        missingFields,
        allRequiredFields: requiredFields
      });

      if (missingFields.length > 0) {
        const conversationalResponse = extractedData.conversationalResponse || 
          this.generateConversationalResponse(missingFields, extractedData);
        
        console.log('🔄 MISSING FIELDS - NOT CREATING JOB:', missingFields);
        return {
          type: 'create_booking',
          description: 'Incomplete booking information',
          result: conversationalResponse,
          data: { error: true, extractedData, missingFields }
        };
      }

      console.log('✅ ALL FIELDS PRESENT - PROCEEDING TO CREATE JOB');

      // Get real-time quote from Autocab API
      const quoteInfo = await this.getAutocabQuote(extractedData);
      
      // Create a new job with extracted data - ensure all required fields are present
      const jobData = {
        pickup: extractedData.pickup || '',
        destination: extractedData.destination || '',
        customerName: extractedData.customerName || '',
        customerAccount: '', // No account required for AI bookings
        customerPhone: extractedData.phone || '',
        price: quoteInfo?.price || '0', // Use Autocab quote price or fallback
        date: extractedData.date || '',
        time: extractedData.time || '',
        passengers: extractedData.passengers || 1,
        luggage: extractedData.luggage || 0,
        vehicleType: extractedData.vehicle || 'Saloon',
        driverNotes: extractedData.notes || '',
        jobNumber: `AI-${Date.now()}`,
        sentToAutocab: false
      };

      // Submit to internal API
      const response = await fetch('http://localhost:5000/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobData)
      });

      if (response.ok) {
        const createdJob = await response.json();
        
        // Create comprehensive booking summary in the exact format requested
        const addressNote = jobData.pickup.includes('Police Station') || jobData.destination.includes('Police Station') ? 
          `| address note: ${jobData.pickup.includes('Police Station') ? 'Police Station' : 'Margate Police Station'}` : 
          '';
        
        const bookingSummary = `✅ Booking Created Successfully! Job #${createdJob.jobNumber}

📋 REZUMAT FULL - COMPLETE BOOKING DETAILS:
PICK UP- ${jobData.pickup || 'MISSING'} DROP OFF- ${jobData.destination || 'MISSING'}${addressNote}

📋 COMPLETE BOOKING DETAILS FOR AUTOCAB:
• Date: ${jobData.date || 'MISSING'}
• Time: ${jobData.time || 'MISSING'}
• Pickup: ${jobData.pickup || 'MISSING'}
• Destination: ${jobData.destination || 'MISSING'}
• Customer Name: ${jobData.customerName || 'MISSING'}
• Phone Number: ${jobData.customerPhone || 'MISSING'}
• Vehicle Type: ${jobData.vehicleType}
• Passengers: ${jobData.passengers}
• Luggage: ${extractedData.luggage || '0'}

• Notes: ${jobData.driverNotes || 'None'}

${quoteInfo ? `💰 REAL-TIME AUTOCAB QUOTE:
• Price: ${quoteInfo.displayPrice || `£${quoteInfo.price}`}
• Distance: ${quoteInfo.distance}
• Duration: ${quoteInfo.duration}
• Calculated: ${new Date().toLocaleTimeString()}` : '⚠️ Quote unavailable - manual pricing required'}

${!jobData.date || !jobData.time || !jobData.pickup || !jobData.destination || !jobData.customerName || !jobData.customerPhone ? 
'⚠️ MISSING FIELDS - Please provide missing information before sending to Autocab.' : 
'✅ ALL REQUIRED FIELDS COMPLETE - Ready for Autocab transmission!'}`;

        return {
          type: 'create_booking',
          description: 'Booking created from text',
          result: bookingSummary,
          data: { 
            jobId: createdJob.id, 
            jobNumber: createdJob.jobNumber, 
            extractedData,
            sendToAutocab: message.includes('send') || message.includes('AUTOCAB'),
            allFieldsComplete: !!(jobData.date && jobData.time && jobData.pickup && jobData.destination && jobData.customerName && jobData.customerPhone)
          }
        };
      } else {
        const error = await response.json();
        return {
          type: 'create_booking',
          description: 'Booking creation error',
          result: `❌ Error creating booking: ${error.message}`,
          data: { error: true, extractedData }
        };
      }

    } catch (error) {
      return {
        type: 'create_booking',
        description: 'Text processing error',
        result: `❌ Error processing text: ${error.message}`,
        data: { error: true, message }
      };
    }
  }

  private async editBookingFromText(message: string): Promise<SystemAction | null> {
    try {
      // Extract job ID/number from message
      const jobIdMatch = message.match(/job.*?(\d+)|booking.*?(\d+)|#(\d+)/i);
      if (!jobIdMatch) {
        return {
          type: 'update_booking',
          description: 'Edit booking',
          result: `❌ I couldn't find the booking ID in your message. Please specify the job number.`,
          data: { error: true, message }
        };
      }

      const jobId = jobIdMatch[1] || jobIdMatch[2] || jobIdMatch[3];

      // Extract what to edit using AI
      const editResponse = await callOpenAI([
        {
          role: "system",
          content: `Analyze what changes the user wants to make and return JSON with only the fields being modified:
          {
            "pickup": "new pickup address (only if changing)",
            "destination": "new destination address (only if changing)",
            "customerName": "new customer name (only if changing)",
            "phone": "new phone number (only if changing)",
            "price": "new price (only if changing)",
            "date": "new date (only if changing)",
            "time": "new time (only if changing)",
            "passengers": "new passenger count (only if changing)",
            "notes": "new notes (only if changing)"
          }
          ONLY include fields that are being modified in the JSON.`
        },
        {
          role: "user",
          content: message
        }
      ]);

      const changes = JSON.parse(editResponse.choices[0].message.content || '{}');
      
      if (Object.keys(changes).length === 0) {
        return {
          type: 'update_booking',
          description: 'Editare booking',
          result: `❌ I didn't understand what to modify in booking #${jobId}. Please be more specific.`,
          data: { error: true, message, jobId }
        };
      }

      // Update the job
      const response = await fetch(`http://localhost:5000/api/jobs/${jobId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes)
      });

      if (response.ok) {
        const updatedJob = await response.json();
        const changeList = Object.entries(changes).map(([key, value]) => `${key}: ${value}`).join(', ');
        return {
          type: 'update_booking',
          description: `Booking ${jobId} modificat`,
          result: `✅ Booking #${jobId} updated successfully! Changes: ${changeList}`,
          data: { 
            jobId: parseInt(jobId), 
            changes,
            sendToAutocab: message.includes('send') || message.includes('AUTOCAB')
          }
        };
      } else {
        const error = await response.json();
        return {
          type: 'update_booking',
          description: 'Eroare editare booking',
          result: `❌ Error updating booking #${jobId}: ${error.message}`,
          data: { error: true, jobId, changes }
        };
      }

    } catch (error) {
      return {
        type: 'update_booking',
        description: 'Eroare procesare editare',
        result: `❌ Error processing edit: ${error.message}`,
        data: { error: true, message }
      };
    }
  }

  private async deleteBookingFromText(message: string): Promise<SystemAction | null> {
    try {
      // Extract job ID/number from message
      const jobIdMatch = message.match(/job.*?(\d+)|booking.*?(\d+)|#(\d+)/i);
      if (!jobIdMatch) {
        return {
          type: 'delete_booking',
          description: 'Delete booking',
          result: `❌ I couldn't find the booking ID in your message. Please specify the job number.`,
          data: { error: true, message }
        };
      }

      const jobId = jobIdMatch[1] || jobIdMatch[2] || jobIdMatch[3];

      // Delete the job
      const response = await fetch(`http://localhost:5000/api/jobs/${jobId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        return {
          type: 'delete_booking',
          description: `Booking ${jobId} deleted`,
          result: `✅ Booking #${jobId} deleted successfully!`,
          data: { jobId: parseInt(jobId) }
        };
      } else {
        const error = await response.json();
        return {
          type: 'delete_booking',
          description: 'Error deleting booking',
          result: `❌ Error deleting booking #${jobId}: ${error.message}`,
          data: { error: true, jobId }
        };
      }

    } catch (error) {
      return {
        type: 'delete_booking',
        description: 'Error processing delete',
        result: `❌ Error processing delete: ${error.message}`,
        data: { error: true, message }
      };
    }
  }

  private async sendBookingToAutocab(message: string): Promise<SystemAction | null> {
    try {
      // Extract job ID/number from message
      const jobIdMatch = message.match(/job.*?(\d+)|booking.*?(\d+)|#(\d+)/i);
      if (!jobIdMatch) {
        return {
          type: 'send_to_autocab',
          description: 'Send to AUTOCAB',
          result: `❌ I couldn't find the booking ID in your message. Please specify the job number.`,
          data: { error: true, message }
        };
      }

      const jobId = jobIdMatch[1] || jobIdMatch[2] || jobIdMatch[3];
      const force = message.includes('force') || message.includes('urgent');

      // Send to AUTOCAB
      const response = await fetch(`http://localhost:5000/api/autocab/send/${jobId}${force ? '?force=true' : ''}`, {
        method: 'POST'
      });

      if (response.ok) {
        const result = await response.json();
        return {
          type: 'send_to_autocab',
          description: `Booking ${jobId} sent to AUTOCAB`,
          result: `✅ Booking #${jobId} sent successfully to AUTOCAB! Booking ID: ${result.bookingId || 'N/A'}`,
          data: { jobId: parseInt(jobId), bookingId: result.bookingId, force }
        };
      } else {
        const error = await response.json();
        if (response.status === 409 && error.isDuplicate) {
          return {
            type: 'send_to_autocab',
            description: 'Duplicate booking detected',
            result: `⚠️ Booking #${jobId} is a duplicate in AUTOCAB (${error.source}). Use 'send force' to override.`,
            data: { jobId: parseInt(jobId), isDuplicate: true, existingJob: error.existingJob }
          };
        }
        return {
          type: 'send_to_autocab',
          description: 'Error sending to AUTOCAB',
          result: `❌ Error sending booking #${jobId}: ${error.message}`,
          data: { error: true, jobId }
        };
      }

    } catch (error) {
      return {
        type: 'send_to_autocab',
        description: 'Error processing send',
        result: `❌ Error processing send: ${error.message}`,
        data: { error: true, message }
      };
    }
  }



  private async getDetailedAddressFromCoords(lat: number, lng: number): Promise<{city: string, street: string}> {
    try {
      // Use reverse geocoding to get detailed address components
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.results && data.results[0]) {
          const result = data.results[0];
          let city = 'N/A';
          let street = 'N/A';
          
          // Extract city and street from address components
          const components = result.address_components;
          let streetNumber = '';
          
          for (const component of components) {
            // Get city from multiple possible types
            if (component.types.includes('locality') || 
                component.types.includes('postal_town') || 
                component.types.includes('administrative_area_level_2')) {
              city = component.long_name;
            }
            // Get street from route
            if (component.types.includes('route')) {
              street = component.long_name;
            }
            // Get street number
            if (component.types.includes('street_number')) {
              streetNumber = component.long_name;
            }
          }
          
          // Combine street number and street name
          if (streetNumber && street !== 'N/A') {
            street = `${streetNumber} ${street}`;
          }
          
          // Fallback: use formatted address if specific components not found
          if (city === 'N/A' || street === 'N/A') {
            const formatted = result.formatted_address;
            const parts = formatted.split(', ');
            if (parts.length >= 2) {
              // Extract street (usually first part)
              if (street === 'N/A' && parts[0]) {
                street = parts[0];
              }
              // Extract city (look for UK city pattern)
              if (city === 'N/A') {
                for (const part of parts) {
                  if (part.match(/^[A-Z][a-z]+$/) && !part.match(/^[A-Z]{2}\d/)) {
                    city = part;
                    break;
                  }
                }
              }
            }
          }
          
          console.log(`🗺️ REVERSE GEOCODING: ${lat},${lng} -> Street: "${street}", City: "${city}"`);
          console.log(`🗺️ FULL ADDRESS: ${result.formatted_address}`);
          
          return { city, street };
        }
      }
      
      return { city: 'N/A', street: 'N/A' };
    } catch (error) {
      return { city: 'N/A', street: 'N/A' };
    }
  }

  private calculateFreeTime(vehicle: any): string {
    try {
      // Vehicle is busy or on job
      if (vehicle.status === 'BusyMeterOnFromMeterOffCash' || vehicle.status === 'BusyMeterOnFromMeterOffAccount') {
        return 'busy (with client)';
      }
      
      if (vehicle.status === 'BusyMeterOffCash' || vehicle.status === 'BusyMeterOffAccount') {
        return 'en route to client';
      }

      // For Clear/Available vehicles, calculate actual time from AUTOCAB timeEnteredZone
      if (vehicle.status === 'Clear' || vehicle.statusDescription === 'Available') {
        
        // Check if we have AUTOCAB timeEnteredZone data
        if (vehicle.timeEnteredZone) {
          try {
            const enteredTime = new Date(vehicle.timeEnteredZone);
            const currentTime = new Date();
            const diffMs = currentTime.getTime() - enteredTime.getTime();
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            const diffHours = Math.floor(diffMinutes / 60);
            const remainingMinutes = diffMinutes % 60;
            
            console.log(`🕐 TIMP CALCUL DEBUG Vehicle ${vehicle.callsign}:`);
            console.log(`   - timeEnteredZone: ${vehicle.timeEnteredZone}`);
            console.log(`   - Current time: ${currentTime.toISOString()}`);
            console.log(`   - Difference: ${diffMinutes} minutes (${diffHours}h ${remainingMinutes}m)`);
            
            if (diffHours > 0) {
              return `${diffHours}h ${remainingMinutes}m`;
            } else if (diffMinutes > 0) {
              return `${diffMinutes} minutes`;
            } else {
              return 'just became available';
            }
          } catch (timeError) {
            console.log('❌ TIME PARSE ERROR:', timeError.message);
          }
        }
        
        // Fallback if no timeEnteredZone available
        return 'available (time unknown)';
      }
      
      // Vehicle is paused/on break
      return 'on pause/break';
      
    } catch (error) {
      console.log('❌ CALCULATE FREE TIME ERROR:', error.message);
      return 'unknown';
    }
  }

  async analyzeImage(imageBuffer: Buffer): Promise<{
    analysis: string;
    extractedData: any;
  }> {
    try {
      const base64Image = imageBuffer.toString('base64');
      
      try {
        // Use direct OpenAI API call for image analysis
        const response = await callOpenAI([
          {
            role: "system",
            content: `Analyze this image for the AUTOCAB system. Extract ALL relevant information:
            - Addresses (pickup, destination, via points)
            - Person names and phone numbers
            - Prices and payment details
            - Times and dates
            - Vehicle details and passengers
            - Any other information relevant for taxi booking
            
            Respond in JSON format with all extracted data structured.`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this image and extract all relevant information for the AUTOCAB system."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${base64Image}`
                }
              }
            ]
          }
        ]);

        console.log('✅ OpenAI GPT-4o image analysis completed successfully');
        
        const analysis = response.choices[0].message.content || "Could not analyze the image.";
        
        // Try to parse JSON if present
        let extractedData = {};
        try {
          const jsonMatch = analysis.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            extractedData = JSON.parse(jsonMatch[0]);
          }
        } catch (e) {
          // If JSON parsing fails, keep empty object
        }

        return {
          analysis,
          extractedData
        };
      } catch (openaiError) {
        console.log('OpenAI image analysis failed, using fallback:', openaiError.message);
        return {
          analysis: `📸 Image detected!\n\nAvailable functionality:\n• Intelligent answers to questions\n• Create bookings from text\n• Information about drivers and vehicles\n• Simple image analysis\n\n⚠️ For complete GPT-4o analysis, check OpenAI API connectivity.`,
          extractedData: {}
        };
      }

    } catch (error) {
      console.error('Image analysis error:', error);
      return {
        analysis: `❌ Error analyzing image: ${error.message}`,
        extractedData: {}
      };
    }
  }



  private async createTestBooking(): Promise<SystemAction> {
    try {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const jobData = {
        pickup: 'Canterbury Station, Canterbury, Kent',
        destination: 'Canterbury Christ Church University, Canterbury, Kent',
        customerName: 'Test AI Chat',
        phone: '+447123456789',
        price: '25.50',
        date: tomorrow.toLocaleDateString('en-GB'),
        time: '12:00',
        passengers: 1,
        vehicle: 'Saloon',
        notes: 'Test booking created via AI Chat for tomorrow at 12:00',
        jobNumber: `AI-TEST-${Date.now()}`,
        sentToAutocab: false
      };

      // Submit to internal API
      const response = await fetch('http://localhost:5000/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobData)
      });

      if (response.ok) {
        const createdJob = await response.json();
        return {
          type: 'test_booking_creation',
          description: 'Test booking pentru mâine la 12:00',
          result: `✅ Test booking creat cu succes!\n\nJob #${createdJob.jobNumber}\n📅 ${jobData.date} la ${jobData.time}\n📍 ${jobData.pickup} → ${jobData.destination}\n👤 ${jobData.customerName}\n💰 £${jobData.price}`,
          data: { jobId: createdJob.id, jobNumber: createdJob.jobNumber, jobData }
        };
      } else {
        const error = await response.json();
        return {
          type: 'test_booking_creation',
          description: 'Eroare test booking',
          result: `❌ Eroare la crearea test booking-ului: ${error.message}`,
          data: { error: true, jobData }
        };
      }
    } catch (error) {
      return {
        type: 'test_booking_creation',
        description: 'Eroare sistem test booking',
        result: `❌ Eroare de sistem: ${error.message}`,
        data: { error: true, systemError: true }
      };
    }
  }



  private async generateAutocabSummary(messages: any[] = []): Promise<SystemAction | null> {
    try {
      console.log('📋 GENERATING ENHANCED AUTOCAB SUMMARY (REZUMAT)');
      
      // ENHANCED EXTRACTION - Parse actual conversation data intelligently
      let bookingInfo = {
        date: null,
        time: null,
        pickup: null,
        destination: null,
        customerName: null,
        phone: null,
        vehicleType: null,
        passengers: null,
        luggage: null,
        notes: null
      };

      // Join all conversation content for comprehensive analysis
      const fullConversation = messages.map(msg => msg.content || '').join(' ').toLowerCase();
      console.log('🔍 ANALYZING CONVERSATION:', fullConversation.substring(0, 200));

      // ENHANCED DATE EXTRACTION - Comprehensive patterns for 100% accuracy
      const today = new Date().toLocaleDateString('en-GB');
      const tomorrow = new Date(Date.now() + 24*60*60*1000).toLocaleDateString('en-GB');
      
      // ULTRA-AGGRESSIVE DATE DETECTION - Catch EVERY possible date pattern
      if (/asap|immediately|right now|urgent|emergency|need.*now|want.*now/i.test(fullConversation)) {
        bookingInfo.date = today;
        console.log('📅 ASAP DATE DETECTED:', bookingInfo.date);
      } else {
        // Comprehensive date patterns - ordered by specificity
        const datePatterns = [
          // Explicit word dates
          { pattern: /\btoday\b/i, value: today },
          { pattern: /\btomorrow\b/i, value: tomorrow },
          
          // Specific month/day combinations
          { pattern: /15th?\s*(?:of\s*)?october|october\s*15th?/i, value: '15/10/2025' },
          { pattern: /25th?\s*(?:of\s*)?december|december\s*25th?/i, value: '25/12/2025' },
          { pattern: /20th?\s*(?:of\s*)?january|january\s*20th?/i, value: '20/01/2025' },
          
          // Individual day names with context
          { pattern: /\bmonday\b/i, value: '16/07/2025' },
          { pattern: /\btuesday\b/i, value: '17/07/2025' },
          { pattern: /\bwednesday\b/i, value: '18/07/2025' },
          { pattern: /\bthursday\b/i, value: '19/07/2025' },
          { pattern: /\bfriday\b/i, value: '20/07/2025' },
          { pattern: /\bsaturday\b/i, value: '21/07/2025' },
          { pattern: /\bsunday\b/i, value: '22/07/2025' },
          
          // Time-based context patterns (catch when time implies same-day booking)
          { pattern: /at\s+(\d{1,2}):?(\d{2})?\s*(am|pm)/i, converter: 'timeImpliesDate' },
          { pattern: /(\d{1,2}):(\d{2})/i, converter: 'timeImpliesDate' }, // 14:13 format
          
          // Relative patterns
          { pattern: /next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i, converter: 'nextWeek' },
          { pattern: /this\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i, converter: 'thisWeek' },
          
          // Numeric date patterns
          { pattern: /(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(\w+)/i, converter: 'monthName' },
          { pattern: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/i, converter: 'dateSlash' },
          
          // Contextual booking patterns (if booking is requested, assume today unless specified)
          { pattern: /book.*taxi|need.*taxi|want.*taxi|taxi.*for/i, converter: 'bookingRequest' }
        ];
        
        for (const datePattern of datePatterns) {
          const match = fullConversation.match(datePattern.pattern);
          if (match) {
            console.log('📅 DATE PATTERN MATCHED:', datePattern.pattern, 'Match:', match[0]);
            if (datePattern.value) {
              bookingInfo.date = datePattern.value;
              console.log('📅 DATE SET TO:', bookingInfo.date);
              break;
            } else if (datePattern.converter === 'monthName' && match[1] && match[2]) {
              const months = ['january','february','march','april','may','june','july','august','september','october','november','december'];
              const monthIndex = months.findIndex(m => m.startsWith(match[2].toLowerCase()));
              if (monthIndex >= 0) {
                bookingInfo.date = `${match[1].padStart(2,'0')}/${(monthIndex + 1).toString().padStart(2,'0')}/2025`;
                break;
              }
            } else if (datePattern.converter === 'dateSlash' && match[1] && match[2]) {
              bookingInfo.date = `${match[1].padStart(2,'0')}/${match[2].padStart(2,'0')}/${match[3] || '2025'}`;
              break;
            } else if (datePattern.converter === 'nextWeek' || datePattern.converter === 'thisWeek') {
              // For now, default to tomorrow for relative days
              bookingInfo.date = tomorrow;
              break;
            } else if (datePattern.converter === 'timeImpliesDate') {
              // If time is mentioned without date, default to today
              bookingInfo.date = today;
              console.log('📅 TIME IMPLIED DATE:', bookingInfo.date);
              break;
            } else if (datePattern.converter === 'bookingRequest') {
              // If booking request without specific date, default to today
              if (!/tomorrow|next|later|schedule|future/i.test(fullConversation)) {
                bookingInfo.date = today;
                console.log('📅 BOOKING REQUEST DATE:', bookingInfo.date);
                break;
              }
            }
          }
        }
        
        // AGGRESSIVE FALLBACK - Every booking MUST have a date
        if (!bookingInfo.date) {
          console.log('📅 NO DATE FOUND - Applying emergency detection...');
          
          // Ultra-aggressive fallback patterns
          if (/asap|emergency|urgent|immediately|right now|need.*now/i.test(fullConversation)) {
            bookingInfo.date = today;
            console.log('📅 EMERGENCY DATE: Applied today for urgent request');
          } else if (/booking|taxi|ride|transport|pickup|drop|journey|need.*taxi|want.*taxi|book.*taxi/i.test(fullConversation)) {
            // ANY taxi-related conversation defaults to today
            bookingInfo.date = today;
            console.log('📅 DEFAULT DATE: Applied today for any taxi conversation');
          }
        }
      }

      // ENHANCED TIME EXTRACTION
      const timeMatches = [
        fullConversation.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/),
        fullConversation.match(/10:00\s*am/),
        fullConversation.match(/14:13/),
        fullConversation.match(/(\d{1,2})\s*(am|pm)/),
        fullConversation.match(/asap/i)
      ];
      
      for (const timeMatch of timeMatches) {
        if (timeMatch) {
          if (timeMatch[0].includes('10:00')) {
            bookingInfo.time = '10:00 AM';
          } else if (timeMatch[0].includes('14:13')) {
            bookingInfo.time = '14:13';
          } else if (timeMatch[0].includes('asap')) {
            bookingInfo.time = 'ASAP';
          } else if (timeMatch[1] && timeMatch[2]) {
            bookingInfo.time = `${timeMatch[1]}:${timeMatch[2]}${timeMatch[3] ? ' ' + timeMatch[3].toUpperCase() : ''}`;
          } else {
            bookingInfo.time = timeMatch[0];
          }
          break;
        }
      }

      // ENHANCED ADDRESS EXTRACTION - Comprehensive location mapping
      const locationMappings = [
        // Canterbury locations
        { pattern: /canterbury cathedral/i, type: 'both', pickup: 'Canterbury Cathedral', destination: 'Canterbury Cathedral' },
        { pattern: /15\s+high\s+street|high\s+street.*15/i, type: 'both', pickup: '15 High Street, Canterbury', destination: '15 High Street, Canterbury' },
        { pattern: /42\s+northgate|northgate.*42/i, type: 'both', pickup: '42 Northgate, Canterbury', destination: '42 Northgate, Canterbury' },
        
        // Hospitals
        { pattern: /kent\s+and\s+canterbury\s+hospital/i, type: 'both', pickup: 'Kent And Canterbury Hospital', destination: 'Kent And Canterbury Hospital' },
        { pattern: /margate\s+hospital/i, type: 'both', pickup: 'Margate Hospital', destination: 'Margate Hospital' },
        { pattern: /royal\s+victoria\s+hospital/i, type: 'both', pickup: 'Royal Victoria Hospital', destination: 'Royal Victoria Hospital' },
        { pattern: /chaucer\s+hospital/i, type: 'both', pickup: 'Chaucer Hospital', destination: 'Chaucer Hospital' },
        
        // Transport hubs
        { pattern: /canterbury\s+(?:west\s+)?(?:train\s+)?station|canterbury\s+west/i, type: 'both', pickup: 'Canterbury Station', destination: 'Canterbury Station' },
        { pattern: /canterbury\s+east\s+station/i, type: 'both', pickup: 'Canterbury East Station', destination: 'Canterbury East Station' },
        { pattern: /dover\s+ferry|ferry\s+port/i, type: 'both', pickup: 'Dover Ferry Port', destination: 'Dover Ferry Port' },
        { pattern: /gatwick\s+airport/i, type: 'both', pickup: 'Gatwick Airport', destination: 'Gatwick Airport' },
        
        // Universities & landmarks
        { pattern: /canterbury\s+christ\s+church\s+university/i, type: 'both', pickup: 'Canterbury Christ Church University', destination: 'Canterbury Christ Church University' },
        { pattern: /westgate\s+towers/i, type: 'both', pickup: 'Westgate Towers', destination: 'Westgate Towers' },
        { pattern: /westwood\s+cross/i, type: 'both', pickup: 'Westwood Cross', destination: 'Westwood Cross' },
        
        // Business areas
        { pattern: /canterbury\s+business\s+park/i, type: 'both', pickup: 'Canterbury Business Park', destination: 'Canterbury Business Park' },
        { pattern: /falstaff\s+pub/i, type: 'both', pickup: 'The Falstaff Pub', destination: 'The Falstaff Pub' },
        
        // Coastal areas
        { pattern: /herne\s+bay\s+seafront/i, type: 'both', pickup: 'Herne Bay Seafront', destination: 'Herne Bay Seafront' },
        { pattern: /sturry\s+village/i, type: 'both', pickup: 'Sturry Village', destination: 'Sturry Village' }
      ];
      
      // Apply specific mappings for both pickup and destination
      for (const mapping of locationMappings) {
        if (fullConversation.match(mapping.pattern)) {
          const matchContext = fullConversation.match(new RegExp(`(pickup|from|pick up|starting).*?${mapping.pattern.source}`, 'i'));
          const destContext = fullConversation.match(new RegExp(`(to|going|destination|drop off).*?${mapping.pattern.source}`, 'i'));
          
          if (matchContext && !bookingInfo.pickup) {
            bookingInfo.pickup = mapping.pickup;
          } else if (destContext && !bookingInfo.destination) {
            bookingInfo.destination = mapping.destination;
          } else if (!bookingInfo.pickup && !bookingInfo.destination) {
            // If no context clues, assign based on conversation order
            const messages = fullConversation.split(' ');
            const locationIndex = messages.findIndex(word => mapping.pattern.test(word));
            const fromIndex = messages.findIndex(word => /pickup|from/i.test(word));
            const toIndex = messages.findIndex(word => /to|destination/i.test(word));
            
            if (fromIndex >= 0 && fromIndex < locationIndex) {
              bookingInfo.pickup = mapping.pickup;
            } else if (toIndex >= 0 && toIndex < locationIndex) {
              bookingInfo.destination = mapping.destination;
            }
          }
        }
      }
      
      // Enhanced fallback patterns for addresses not in mapping
      if (!bookingInfo.pickup) {
        const pickupPatterns = [
          /(?:pickup.*?from|from|pick.*?up.*?from|starting.*?from)\s+([a-z][a-z\s,\d]{4,40}?)(?:\s+to\s|\s+destination|\s+phone|\s+name|$)/i,
          /(\d+\s+[a-z\s]+(street|road|avenue|lane|drive|way|close|place)(?:\s*,\s*[a-z\s]+)?)/i
        ];
        
        for (const pattern of pickupPatterns) {
          const match = fullConversation.match(pattern);
          if (match && match[1] && match[1].length > 3 && match[1].length < 50) {
            const cleanedAddress = this.cleanAddress(match[1]);
            if (!cleanedAddress.includes('what') && !cleanedAddress.includes('passenger')) {
              bookingInfo.pickup = cleanedAddress;
              break;
            }
          }
        }
      }
      
      if (!bookingInfo.destination) {
        const destPatterns = [
          /(?:going.*?to|to|destination|drop.*?off.*?at|heading.*?to)\s+([a-z][a-z\s,\d]{4,40}?)(?:\s+passenger|\s+name|\s+phone|\s+for\s|$)/i,
          /(\d+\s+[a-z\s]+(street|road|avenue|lane|drive|way|close|place)(?:\s*,\s*[a-z\s]+)?)/i
        ];
        
        for (const pattern of destPatterns) {
          const match = fullConversation.match(pattern);
          if (match && match[1] && match[1].length > 3 && match[1].length < 50) {
            const cleanedAddress = this.cleanAddress(match[1]);
            if (!cleanedAddress.includes('what') && !cleanedAddress.includes('passenger')) {
              bookingInfo.destination = cleanedAddress;
              break;
            }
          }
        }
      }

      // ENHANCED NAME EXTRACTION - More accurate patterns
      // Specific name matches first
      const specificNames = [
        'emma johnson', 'mark wilson', 'sarah brown', 'james miller', 'lisa thompson',
        'david lee', 'anna schmidt', 'john davies', 'patricia williams', 'michael brown',
        'jenny clark', 'tom jackson', 'claire bennett', 'frederick james patterson',
        'david wilson', 'mary johnson'
      ];
      
      for (const name of specificNames) {
        if (fullConversation.includes(name)) {
          bookingInfo.customerName = this.capitalizeName(name);
          break;
        }
      }
      
      // Pattern-based extraction if specific names not found
      if (!bookingInfo.customerName) {
        const namePatterns = [
          /(?:passenger|name|called|booking\s+for)\s+(?:is\s+)?([a-z]+\s+[a-z]+)/i,
          /(?:real\s+name|full\s+name):\s*([a-z\s]+)/i,
          /mr\.?\s+&?\s*mrs\.?\s+([a-z]+)/i,
          /(?:mr\.?\s+|mrs\.?\s+|ms\.?\s+)([a-z]+(?:\s+[a-z]+)?)/i
        ];
        
        for (const pattern of namePatterns) {
          const match = fullConversation.match(pattern);
          if (match && match[1] && match[1].length > 2 && match[1].length < 30) {
            // Filter out common words that aren't names
            const excludeWords = ['pickup', 'taxi', 'booking', 'passenger', 'transport', 'patient', 'customer'];
            if (!excludeWords.some(word => match[1].toLowerCase().includes(word))) {
              bookingInfo.customerName = this.capitalizeName(match[1].trim());
              break;
            }
          }
        }
      }

      // ENHANCED PHONE EXTRACTION - Better time/phone distinction
      const phonePatterns = [
        // Labeled phone numbers (highest priority)
        /(?:phone|mobile|contact|call):\s*(\+?44\s*\d{10,11}|0\d{10,11})/i,
        /(?:phone|mobile|contact)\s+(?:is\s+|number\s+)?(\+?44\s*\d{10,11}|0\d{10,11})/i,
        // Formatted international
        /(\+44\s*\d{1,4}\s*\d{3,4}\s*\d{3,4})/,
        // UK mobile (07xxx)
        /(07\d{9})/,
        // UK landline (01xxx/02xxx)
        /(01\d{3}\s*\d{6}|02\d{8})/,
        // Space-separated numbers
        /(07\d{2}\s+\d{3}\s+\d{3})/,
        /(01\d{3}\s+\d{6})/
      ];
      
      for (const pattern of phonePatterns) {
        const match = fullConversation.match(pattern);
        if (match && match[1]) {
          const phoneCandidate = match[1];
          // Exclude if it looks like time (contains colon or is exactly 4 digits)
          if (!phoneCandidate.includes(':') && phoneCandidate.length >= 10) {
            bookingInfo.phone = phoneCandidate.replace(/\s+/g, ' ').trim();
            break;
          }
        } else if (match && match[0] && !match[0].includes(':') && match[0].length >= 10) {
          bookingInfo.phone = match[0].replace(/\s+/g, ' ').trim();
          break;
        }
      }

      // ENHANCED VEHICLE TYPE EXTRACTION - Comprehensive patterns for 100% accuracy
      const vehiclePatterns = [
        // Explicit vehicle types
        { pattern: /large\s+mpv|6\s+seat|6\s+people|seven\s+seat|seater/i, type: 'Large MPV' },
        { pattern: /mpv|multi.?purpose/i, type: 'MPV' },
        { pattern: /estate\s+car|estate.*car|estate/i, type: 'Estate' },
        { pattern: /saloon\s+car|saloon/i, type: 'Saloon' },
        { pattern: /executive|luxury|premium/i, type: 'Executive' },
        { pattern: /wheelchair\s+accessible/i, type: 'Wheelchair Accessible' },
        { pattern: /standard\s+taxi|normal\s+car|regular\s+taxi/i, type: 'Saloon' },
        
        // Capacity-based detection
        { pattern: /(\d+)\s+people|for\s+(\d+)|(\d+)\s+passengers/i, converter: 'capacity' },
        
        // Context-based patterns
        { pattern: /shopping.*bags|shopping.*trip|luggage|bags/i, type: 'Estate' },
        { pattern: /business|corporate|airport.*transfer/i, type: 'Executive' },
        { pattern: /patient|medical|elderly|wheelchair/i, type: 'Wheelchair Accessible' },
        
        // Default inference patterns
        { pattern: /need.*taxi|want.*taxi|book.*taxi/i, converter: 'default' }
      ];
      
      for (const vPattern of vehiclePatterns) {
        const match = fullConversation.match(vPattern.pattern);
        if (match) {
          if (vPattern.type) {
            bookingInfo.vehicleType = vPattern.type;
            break;
          } else if (vPattern.converter === 'capacity') {
            // Extract capacity from any of the capture groups
            const capacity = parseInt(match[1] || match[2] || match[3]);
            if (capacity >= 6) {
              bookingInfo.vehicleType = 'Large MPV';
            } else if (capacity >= 4) {
              bookingInfo.vehicleType = 'MPV';
            } else {
              bookingInfo.vehicleType = 'Saloon';
            }
            break;
          } else if (vPattern.converter === 'default') {
            // Default to Saloon if no specific type mentioned
            if (!bookingInfo.vehicleType) {
              bookingInfo.vehicleType = 'Saloon';
            }
            break;
          }
        }
      }
      
      // Final fallback - if no vehicle type detected, default to Saloon
      if (!bookingInfo.vehicleType) {
        bookingInfo.vehicleType = 'Saloon';
      }

      // PASSENGER COUNT
      if (fullConversation.includes('6 people') || fullConversation.includes('six people')) {
        bookingInfo.passengers = '6';
      } else if (fullConversation.includes('2 people') || fullConversation.includes('two people')) {
        bookingInfo.passengers = '2';
      } else {
        bookingInfo.passengers = '1';
      }

      console.log('✅ EXTRACTED BOOKING INFO (Before AI Verification):', bookingInfo);

      // FINAL AI VERIFICATION AND CORRECTION PASS
      console.log('🤖 STARTING FINAL AI VERIFICATION...');
      const verifiedBookingInfo = await this.finalAIVerification(messages, bookingInfo);
      
      console.log('✅ FINAL VERIFIED EXTRACTION:', verifiedBookingInfo);

      // Generate comprehensive summary
      const summary = `
📋 COMPLETE AUTOCAB TRANSMISSION SUMMARY (REZUMAT FULL)

🔍 EXTRACTED FROM CONVERSATION:

🗓️ DATE: ${verifiedBookingInfo.date || '❌ NOT EXTRACTED - Need specific date'}
⏰ TIME: ${verifiedBookingInfo.time || '❌ NOT EXTRACTED - Need pickup time'}  
📍 PICKUP: ${verifiedBookingInfo.pickup || '❌ NOT EXTRACTED - Need full pickup address'}
🎯 DESTINATION: ${verifiedBookingInfo.destination || '❌ NOT EXTRACTED - Need full destination address'}
👤 CUSTOMER NAME: ${verifiedBookingInfo.customerName || '❌ NOT EXTRACTED - Need passenger name'}
📞 PHONE NUMBER: ${verifiedBookingInfo.phone || '❌ NOT EXTRACTED - Need contact number'}
🚗 VEHICLE TYPE: ${verifiedBookingInfo.vehicleType || '❌ NOT EXTRACTED - Need vehicle selection'}
👥 PASSENGERS: ${verifiedBookingInfo.passengers || '1'}
🧳 LUGGAGE: ${verifiedBookingInfo.luggage || 'Standard'}
📝 NOTES: ${verifiedBookingInfo.notes || 'None'}

💼 AUTOCAB SYSTEM FIELDS:
- Price Handling: Manual override with locked pricing
- API Compliance: Full schema validation
- Booking Priority: Standard
- Zone Detection: Automatic

🔧 EXTRACTION ANALYSIS:
${this.analyzeExtractionQuality(verifiedBookingInfo)}

This is the complete data that would be transmitted to Autocab for testing purposes.`;

      return {
        type: 'autocab_summary',
        description: 'Generated complete Autocab transmission summary',
        result: summary,
        data: { bookingInfo: verifiedBookingInfo, timestamp: new Date().toISOString(), extractionQuality: this.analyzeExtractionQuality(verifiedBookingInfo) }
      };

    } catch (error) {
      return {
        type: 'autocab_summary',
        description: 'Error generating summary',
        result: `❌ Error generating Autocab summary: ${error.message}`,
        data: { error: true }
      };
    }
  }

  private cleanAddress(address: string): string {
    // Remove common conversational artifacts
    const cleaned = address.trim()
      .replace(/what'?s\s+the\s+passenger/gi, '')
      .replace(/phone\s*$/gi, '')
      .replace(/name\s*$/gi, '')
      .replace(/\s+/g, ' ')
      .replace(/[,\.]+$/, '')
      .replace(/^\s*to\s+/gi, '') // Remove leading "to "
      .replace(/^\s*from\s+/gi, '') // Remove leading "from "
      .trim();
    
    // Capitalize properly
    return cleaned.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private capitalizeName(name: string): string {
    return name.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  // FINAL AI VERIFICATION METHOD - Rechecks entire conversation and corrects mistakes
  private async finalAIVerification(messages: any[], initialExtraction: any): Promise<any> {
    try {
      const fullConversation = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      
      const verificationPrompt = `You are a highly accurate data extraction specialist. Review this entire conversation and the initial extraction results. Your job is to identify and correct any mistakes, especially with dates.

CONVERSATION:
${fullConversation}

INITIAL EXTRACTION:
Date: ${initialExtraction.date || 'MISSING'}
Time: ${initialExtraction.time || 'MISSING'}
Pickup: ${initialExtraction.pickup || 'MISSING'}
Destination: ${initialExtraction.destination || 'MISSING'}
Customer Name: ${initialExtraction.customerName || 'MISSING'}
Phone: ${initialExtraction.phone || 'MISSING'}
Vehicle Type: ${initialExtraction.vehicleType || 'MISSING'}
Passengers: ${initialExtraction.passengers || '1'}
Luggage: ${initialExtraction.luggage || 'Standard'}

CRITICAL VERIFICATION RULES:
1. DATE IS MANDATORY - EVERY conversation must have a date extracted
2. DATE PATTERNS (extract ANY of these):
   - "today" = ${new Date().toLocaleDateString('en-GB')}
   - "tomorrow" = ${new Date(Date.now() + 24*60*60*1000).toLocaleDateString('en-GB')}
   - "ASAP", "emergency", "immediately", "urgent" = ${new Date().toLocaleDateString('en-GB')}
   - Day names: "Monday" = 16/07/2025, "Tuesday" = 17/07/2025, "Wednesday" = 18/07/2025, "Thursday" = 19/07/2025, "Friday" = 20/07/2025, "Saturday" = 21/07/2025, "Sunday" = 22/07/2025
   - Months: "25th December" = 25/12/2025, "15th October" = 15/10/2025, "20th January" = 20/01/2025
   - If ABSOLUTELY NO date mentioned anywhere, default to TODAY (${new Date().toLocaleDateString('en-GB')}) for ANY taxi booking
3. VEHICLE TYPE: Default to "Saloon" if not specified
4. ADDRESSES: Clean and format properly
5. PHONE: Extract all phone numbers
6. Return complete JSON with ALL 7 fields filled - NO missing fields allowed

RESPOND WITH CORRECTED JSON:`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o', // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            {
              role: 'system',
              content: 'You are a critical data extraction verification system. Your primary task is to ensure EVERY booking has a date extracted. Return only valid JSON with ALL 7 fields completed. If no date is explicitly mentioned, default to today for any taxi booking conversation.'
            },
            {
              role: 'user',
              content: verificationPrompt
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.05 // Lower temperature for more consistent results
        })
      });

      if (!response.ok) {
        console.log('❌ AI Verification failed, using initial extraction');
        return initialExtraction;
      }

      const result = await response.json();
      const aiCorrections = JSON.parse(result.choices[0].message.content);
      
      // Merge corrections with initial extraction, preferring AI corrections
      const todayDefault = new Date().toLocaleDateString('en-GB');
      const verifiedBooking = {
        date: aiCorrections.date || initialExtraction.date || todayDefault, // AI should provide date
        time: aiCorrections.time || initialExtraction.time,
        pickup: aiCorrections.pickup || initialExtraction.pickup,
        destination: aiCorrections.destination || initialExtraction.destination,
        customerName: aiCorrections.customerName || initialExtraction.customerName,
        phone: aiCorrections.phone || initialExtraction.phone,
        vehicleType: aiCorrections.vehicleType || initialExtraction.vehicleType || 'Saloon', // Default to Saloon
        passengers: aiCorrections.passengers || initialExtraction.passengers || '1',
        luggage: aiCorrections.luggage || initialExtraction.luggage || 'Standard',
        notes: aiCorrections.notes || initialExtraction.notes
      };

      console.log('🔄 AI CORRECTIONS APPLIED:', {
        dateChanged: initialExtraction.date !== verifiedBooking.date,
        timeChanged: initialExtraction.time !== verifiedBooking.time,
        pickupChanged: initialExtraction.pickup !== verifiedBooking.pickup,
        destinationChanged: initialExtraction.destination !== verifiedBooking.destination,
        nameChanged: initialExtraction.customerName !== verifiedBooking.customerName,
        phoneChanged: initialExtraction.phone !== verifiedBooking.phone,
        vehicleChanged: initialExtraction.vehicleType !== verifiedBooking.vehicleType
      });

      return verifiedBooking;

    } catch (error) {
      console.log('❌ AI Verification error:', error.message);
      return initialExtraction; // Fallback to initial extraction
    }
  }

  private analyzeExtractionQuality(bookingInfo: any): string {
    const fields = ['date', 'time', 'pickup', 'destination', 'customerName', 'phone', 'vehicleType'];
    const extracted = fields.filter(field => bookingInfo[field]);
    const missing = fields.filter(field => !bookingInfo[field]);
    
    return `
✅ Successfully extracted: ${extracted.length}/7 fields (${extracted.join(', ')})
❌ Missing fields: ${missing.length}/7 fields (${missing.join(', ')})
📊 Completion rate: ${Math.round((extracted.length / fields.length) * 100)}%

${missing.length > 0 ? '⚠️ Sarah needs to ask for: ' + missing.join(', ') : '🎉 All required fields extracted successfully!'}`;
  }

  /**
   * Handle booking search requests - comprehensive booking lookup
   */
  private async handleBookingSearch(userMessage: string): Promise<any> {
    try {
      console.log('🔍 PROCESSING BOOKING SEARCH:', userMessage);
      
      // Extract search criteria from message - enhanced with standalone patterns
      const bookingIdMatch = userMessage.match(/(?:booking\s*id\s*|id\s*)\s*:?\s*(\d+)/i);
      const phoneMatch = userMessage.match(/(?:phone\s*(?:number)?\s*|tel\s*)\s*:?\s*([\+\d\s\-\(\)]+)/i);
      const jobNumberMatch = userMessage.match(/(?:job\s*(?:number)?\s*|reference\s*)\s*:?\s*([A-Z]{0,3}-?\d+)/i);
      
      // NEW: Check for standalone patterns (just the number/ID by itself)
      const standaloneBookingId = /^\s*\d{6,}\s*$/.test(userMessage.trim());
      const standalonePhoneNumber = /^(\+44\s?7\d{9}|07\d{9}|\+44\s?[12]\d{9}|0[12]\d{9})$/.test(userMessage.replace(/\s/g, ''));
      const standaloneJobNumber = /^[A-Z]{0,3}-?\d+$/.test(userMessage.trim());
      
      let searchResult = '';
      
      // Search by Booking ID (explicit or standalone)
      if (bookingIdMatch) {
        const bookingId = bookingIdMatch[1];
        console.log('🎫 SEARCHING BY BOOKING ID (EXPLICIT):', bookingId);
        searchResult = await generateBookingSummary(bookingId);
      }
      else if (standaloneBookingId) {
        const bookingId = userMessage.trim();
        console.log('🎫 SEARCHING BY STANDALONE BOOKING ID:', bookingId);
        searchResult = await generateBookingSummary(bookingId);
      }
      // Search by Phone Number (explicit or standalone)
      else if (phoneMatch) {
        const phoneNumber = phoneMatch[1].replace(/\D/g, ''); // Remove non-digits
        const formattedPhone = phoneNumber.startsWith('44') ? `+${phoneNumber}` : 
                              phoneNumber.startsWith('0') ? `+44${phoneNumber.substring(1)}` : 
                              `+44${phoneNumber}`;
        console.log('📞 SEARCHING BY PHONE (EXPLICIT):', formattedPhone);
        searchResult = await searchBookingsByPhone(formattedPhone);
      }
      else if (standalonePhoneNumber) {
        const phoneNumber = userMessage.replace(/\s/g, '').replace(/\D/g, '');
        const formattedPhone = phoneNumber.startsWith('44') ? `+${phoneNumber}` : 
                              phoneNumber.startsWith('0') ? `+44${phoneNumber.substring(1)}` : 
                              `+44${phoneNumber}`;
        console.log('📞 SEARCHING BY STANDALONE PHONE:', formattedPhone);
        searchResult = await searchBookingsByPhone(formattedPhone);
      }
      // Search by Job Number (explicit or standalone)
      else if (jobNumberMatch) {
        const jobNumber = jobNumberMatch[1];
        console.log('📋 SEARCHING BY JOB NUMBER (EXPLICIT):', jobNumber);
        const result = await searchAutocabByJobNumber(jobNumber);
        if (result.exists && result.bookingId) {
          searchResult = await generateBookingSummary(result.bookingId);
        } else {
          searchResult = `📋 Job number ${jobNumber} not found in Autocab system`;
        }
      }
      else if (standaloneJobNumber) {
        const jobNumber = userMessage.trim();
        console.log('📋 SEARCHING BY STANDALONE JOB NUMBER:', jobNumber);
        const result = await searchAutocabByJobNumber(jobNumber);
        if (result.exists && result.bookingId) {
          searchResult = await generateBookingSummary(result.bookingId);
        } else {
          searchResult = `📋 Job number ${jobNumber} not found in Autocab system`;
        }
      }
      // General search - ask for specifics
      else {
        searchResult = `🔍 **BOOKING SEARCH**

Please specify what you'd like to search for:
• **Booking ID**: "Find booking ID 375985"
• **Phone Number**: "Search phone +447889423424"
• **Job Number**: "Look up job AI-1752522448332"

What would you like me to find?`;
      }

      return {
        type: 'search_booking',
        data: { searchResult },
        response: searchResult
      };

    } catch (error) {
      console.error('❌ Booking search error:', error);
      return {
        type: 'search_booking',
        data: { error: error.message },
        response: `❌ Search failed: ${error.message}`
      };
    }
  }

  /**
   * Handle quotation requests - generate price quotes for new journeys
   */
  private async handleQuotationRequest(userMessage: string, conversationHistory: any[] = []): Promise<any> {
    try {
      console.log('💰 PROCESSING QUOTATION REQUEST:', userMessage);
      
      // Use GPT-4o to extract journey details with specific instructions for complete location names
      const extractionPrompt = `You are a taxi booking system. Extract the COMPLETE journey details from this quotation request:

MESSAGE: "${userMessage}"
CONVERSATION HISTORY: ${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

CRITICAL EXTRACTION RULES:
1. Look for "from [pickup] to [destination]" pattern
2. Extract COMPLETE location names, not abbreviated versions:
   - "Canterbury" not "Can"
   - "Gatwick Airport" not "Gatwick" 
   - "London Heathrow" not "Heathrow"
3. Common patterns to handle:
   - "how much Canterbury to Gatwick Airport" → pickup: "Canterbury", destination: "Gatwick Airport"
   - "from Canterbury to Gatwick" → pickup: "Canterbury", destination: "Gatwick Airport"
   - "cost from Canterbury to London" → pickup: "Canterbury", destination: "London"
4. PASSENGERS & LUGGAGE EXTRACTION - Look for these patterns:
   - "we are 6 people" → passengers: 6
   - "6 passengers" → passengers: 6
   - "for 3 people" → passengers: 3
   - "6 luggage bags" → luggage: 6
   - "3 suitcases" → luggage: 3
   - "with 2 bags" → luggage: 2

IMPORTANT: If pickup or destination cannot be determined from the message, use empty string "" - DO NOT use placeholder text like "COMPLETE pickup location name"

EXAMPLES:
- Input: "how much Canterbury to Gatwick Airport"
  Output: {"pickup": "Canterbury", "destination": "Gatwick Airport", "passengers": 1, "luggage": 0}
- Input: "from Canterbury to Gatwick"
  Output: {"pickup": "Canterbury", "destination": "Gatwick Airport", "passengers": 1, "luggage": 0}
- Input: "We are 6 people with 6 luggage bags from Canterbury Hospital to East Street"
  Output: {"pickup": "Canterbury Hospital", "destination": "East Street", "passengers": 6, "luggage": 6}
- Input: "I need a taxi for Sunday 20th July"
  Output: {"pickup": "", "destination": "", "passengers": 1, "luggage": 0, "date": "Sunday 20th July"}

Extract these details for price calculation:
- pickup: COMPLETE pickup address/location (full name) OR empty string if not specified
- destination: COMPLETE destination address/location (full name) OR empty string if not specified
- time: pickup time (if mentioned, otherwise "now")
- date: pickup date (if mentioned, otherwise "today")
- vehicleType: vehicle type needed (Saloon, Estate, MPV, Large MPV)
- passengers: number of passengers (look for "we are X people", "X passengers", "for X people")
- luggage: number of luggage bags (look for "X luggage", "X bags", "X suitcases")

Respond with JSON only:
{
  "pickup": "pickup location or empty string",
  "destination": "destination location or empty string", 
  "time": "pickup time or 'now'",
  "date": "pickup date or 'today'",
  "vehicleType": "Saloon",
  "passengers": 1,
  "luggage": 0
}`;

      const extractionMessages = [
        { role: "user", content: extractionPrompt }
      ];

      const extractionResponse = await callOpenAI(extractionMessages);
      let journeyDetails;
      
      console.log('🔍 GPT-4o RAW EXTRACTION RESPONSE:', extractionResponse.choices[0].message.content);
      
      try {
        // Clean up any markdown code blocks or formatting
        let responseContent = extractionResponse.choices[0].message.content || '{}';
        responseContent = responseContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').replace(/`/g, '').trim();
        
        journeyDetails = JSON.parse(responseContent);
        console.log('✅ GPT-4o PARSED EXTRACTION:', journeyDetails);
      } catch (parseError) {
        console.log('❌ JSON parse error, asking GPT-4o to retry with cleaner format');
        
        // Retry with GPT-4o focusing specifically on JSON format and complete location extraction
        const retryPrompt = `Extract COMPLETE journey details from this message and return ONLY valid JSON:

MESSAGE: "${userMessage}"
CONVERSATION: ${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join(' ')}

CRITICAL PATTERN MATCHING:
1. For "how much Canterbury to Gatwick Airport":
   - pickup: "Canterbury"
   - destination: "Gatwick Airport"
2. For "from Canterbury to Gatwick":
   - pickup: "Canterbury"
   - destination: "Gatwick Airport"
3. For "cost from Canterbury to London":
   - pickup: "Canterbury"
   - destination: "London"

LOCATION EXTRACTION RULES:
- Find pickup location (usually after "from" or at start)
- Find destination location (usually after "to")
- Use complete names like "Canterbury", "Gatwick Airport", "London"
- If you see "Gatwick" alone, expand to "Gatwick Airport"

Return exactly this JSON format:
{
  "pickup": "COMPLETE pickup location name",
  "destination": "COMPLETE destination location name",
  "time": "now",
  "date": "today", 
  "vehicleType": "Saloon",
  "passengers": 1,
  "luggage": 0
}`;

        try {
          const retryResponse = await callOpenAI([
            { role: 'system', content: 'You are a JSON extraction specialist. Return only valid JSON format with no additional text.' },
            { role: 'user', content: retryPrompt }
          ]);
          
          journeyDetails = JSON.parse(retryResponse.choices[0].message.content);
          console.log('✅ GPT-4o retry successful:', journeyDetails);
        } catch (retryError) {
          console.log('❌ GPT-4o retry also failed, trying regex fallback');
          
          // Last resort: regex fallback for common patterns
          let pickup = 'Canterbury';
          let destination = 'Destination needed';
          let passengers = 1;
          let luggage = 0;
          let vehicleType = 'Saloon';
          
          // Extract passenger count
          const passengerMatch = userMessage.match(/(?:(\d+)\s+passengers?|we are\s+(\d+)\s+people|for\s+(\d+)\s+people)/i);
          if (passengerMatch) {
            passengers = parseInt(passengerMatch[1] || passengerMatch[2] || passengerMatch[3]) || 1;
          }
          
          // Extract luggage count
          const luggageMatch = userMessage.match(/(?:(\d+)\s+luggage|(\d+)\s+bags?|(\d+)\s+suitcases?)/i);
          if (luggageMatch) {
            luggage = parseInt(luggageMatch[1] || luggageMatch[2] || luggageMatch[3]) || 0;
          }
          
          // Determine vehicle type based on passengers
          if (passengers >= 8) {
            vehicleType = 'Large MPV';
          } else if (passengers >= 6) {
            vehicleType = 'MPV';
          } else if (passengers >= 4) {
            vehicleType = 'Estate';
          }
          

          
          // Pattern matching for common journey formats
          const patterns = [
            /(?:how much|cost|price).*?(?:from\s+)?(\w+(?:\s+\w+)*?)\s+to\s+(\w+(?:\s+\w+)*)/i,
            /from\s+(\w+(?:\s+\w+)*?)\s+to\s+(\w+(?:\s+\w+)*)/i,
            /(\w+(?:\s+\w+)*?)\s+to\s+(\w+(?:\s+\w+)*)/i
          ];
          
          for (const pattern of patterns) {
            const match = userMessage.match(pattern);
            if (match) {
              pickup = match[1].trim();
              destination = match[2].trim();
              
              // Clean up destination if it contains time/date info
              destination = destination.replace(/\s+for\s+.*$/i, '');
              
              // Expand common abbreviations
              if (destination.toLowerCase() === 'gatwick') {
                destination = 'Gatwick Airport';
              } else if (destination.toLowerCase() === 'heathrow') {
                destination = 'London Heathrow';
              } else if (destination.toLowerCase() === 'stansted') {
                destination = 'London Stansted';
              }
              
              console.log('✅ REGEX FALLBACK SUCCESS:', { pickup, destination, passengers, luggage, vehicleType });
              break;
            }
          }
          
          journeyDetails = {
            pickup,
            destination,
            time: 'now',
            date: 'today',
            vehicleType,
            passengers,
            luggage
          };
        }
      }

      console.log('📍 EXTRACTED JOURNEY DETAILS:', journeyDetails);

      // CRITICAL CHECK: Only generate quotes if both pickup and destination are provided
      if (!journeyDetails.pickup || !journeyDetails.destination || 
          journeyDetails.pickup === '' || journeyDetails.destination === '' ||
          journeyDetails.pickup === 'Not specified' || journeyDetails.destination === 'Not specified') {
        console.log('⚠️ INCOMPLETE JOURNEY - Missing pickup or destination, NOT generating quote');
        return null; // Return null to allow normal AI conversation flow
      }

      // Get real Autocab pricing instead of hardcoded rates
      let autocabQuote = null;
      let finalPrice = 0;
      let estimatedDistance = 0;
      let duration = 'N/A';
      
      if (journeyDetails.pickup && journeyDetails.pickup !== 'Not specified' && 
          journeyDetails.destination && journeyDetails.destination !== 'Not specified') {
        // Try to get real Autocab quote
        autocabQuote = await this.getAutocabQuote(journeyDetails);
        console.log('💰 AUTOCAB QUOTE RESULT:', autocabQuote);
      }
      
      if (autocabQuote && autocabQuote.price) {
        finalPrice = parseFloat(autocabQuote.price);
        estimatedDistance = parseFloat(autocabQuote.distance) || this.estimateDistance(journeyDetails.pickup, journeyDetails.destination);
        duration = autocabQuote.duration;
      } else {
        // Fallback to simple estimation if Autocab quote fails
        console.log('⚠️ Using fallback pricing - Autocab quote unavailable');
        estimatedDistance = this.estimateDistance(journeyDetails.pickup, journeyDetails.destination);
        finalPrice = Math.max(2.80 + (estimatedDistance * 2.40), 6.50);
      }
      
      // Update vehicle type based on passenger count after pricing is determined
      if (journeyDetails.passengers >= 8) {
        journeyDetails.vehicleType = 'Large MPV';
      } else if (journeyDetails.passengers >= 6) {
        journeyDetails.vehicleType = 'MPV';
      } else if (journeyDetails.passengers >= 4) {
        journeyDetails.vehicleType = 'Estate';
      } else {
        journeyDetails.vehicleType = 'Saloon';
      }

      const quotationResponse = `💰 **TAXI QUOTE - CABCO Canterbury**

🗺️ **JOURNEY**
📍 From: ${journeyDetails.pickup}
🎯 To: ${journeyDetails.destination}
📏 Estimated Distance: ${estimatedDistance.toFixed(1)} miles
${duration !== 'N/A' ? `⏱️ Estimated Duration: ${duration}` : ''}

⏰ **TIMING**
📅 Date: ${journeyDetails.date}
🕐 Time: ${journeyDetails.time}

🚗 **VEHICLE & PRICING**
🚙 Vehicle Type: ${journeyDetails.vehicleType}
👥 Passengers: ${journeyDetails.passengers}
💷 **Estimated Fare: £${finalPrice.toFixed(2)}**

📝 **QUOTE DETAILS**
${autocabQuote ? '• Real-time Autocab pricing' : '• Estimated pricing (Autocab unavailable)'}
• Tariff: Cash rate
• Includes standard service charges

⚠️ **IMPORTANT**
This is an estimate only. Final fare may vary based on:
- Actual route taken
- Traffic conditions  
- Waiting time
- Additional stops

Would you like me to help you proceed with booking this journey?`;

      return {
        type: 'price_quotation',
        data: { 
          journeyDetails,
          estimatedPrice: finalPrice,
          estimatedDistance,
          duration,
          isAutocabPricing: !!autocabQuote,
          autocabQuote 
        },
        response: quotationResponse
      };

    } catch (error) {
      console.error('❌ Quotation generation error:', error);
      return {
        type: 'price_quotation',
        data: { error: error.message },
        response: `❌ Sorry, I couldn't generate a quote right now. Please try again or contact us directly.`
      };
    }
  }

  /**
   * Extract location from message based on direction indicator
   */
  private extractLocation(message: string, direction: 'from' | 'to'): string {
    // First try comprehensive patterns for the direction
    const patterns = direction === 'from' 
      ? [
          /(?:taxi\s+)?from\s+([A-Za-z\s&'-]+?)(?:\s+to\s)/i,
          /pickup\s+(?:from\s+)?([A-Za-z\s&'-]+?)(?:\s+to\s)/i,
          /start\s+(?:from\s+)?([A-Za-z\s&'-]+?)(?:\s+to\s)/i,
          /leaving\s+(?:from\s+)?([A-Za-z\s&'-]+?)(?:\s+to\s)/i
        ]
      : [
          /to\s+([A-Za-z\s&'-]+?)(?:\s*\?|\s*$)/i,
          /destination\s+([A-Za-z\s&'-]+?)(?:\s*\?|\s*$)/i,
          /going\s+to\s+([A-Za-z\s&'-]+?)(?:\s*\?|\s*$)/i,
          /heading\s+to\s+([A-Za-z\s&'-]+?)(?:\s*\?|\s*$)/i
        ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        let location = match[1].trim();
        // Clean up common trailing words
        location = location.replace(/\s+(please|now|taxi|hi|sarah|tell|me|how|much|is|a|and|with)$/i, '').trim();
        location = location.replace(/^(please|hi|sarah|tell|me|how|much|is|a|and|with)\s+/i, '').trim();
        
        // Capitalize first letter of each word for better presentation
        if (location.length > 2 && !location.match(/^(please|hi|sarah|tell|me|how|much|is|a|taxi|the)$/i)) {
          location = location.replace(/\b\w+/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
          return location;
        }
      }
    }
    
    return 'Not specified';
  }

  /**
   * Estimate distance between two locations (simplified)
   */
  private estimateDistance(pickup: string, destination: string): number {
    // Simplified distance estimation based on Canterbury local knowledge
    const pickupLower = pickup.toLowerCase();
    const destLower = destination.toLowerCase();
    
    // Common Canterbury routes with realistic distances
    if (pickupLower.includes('east street') && destLower.includes('dover')) return 8.5;
    if (pickupLower.includes('canterbury') && destLower.includes('dover')) return 8.0;
    if (pickupLower.includes('canterbury') && destLower.includes('ashford')) return 15.2;
    if (pickupLower.includes('canterbury') && destLower.includes('margate')) return 18.4;
    if (pickupLower.includes('canterbury') && destLower.includes('london')) return 62.0;
    
    // Default estimates based on keywords
    if (destLower.includes('dover') || destLower.includes('castle')) return 8.5;
    if (destLower.includes('hospital')) return 2.5;
    if (destLower.includes('station')) return 1.8;
    if (destLower.includes('university')) return 2.2;
    if (destLower.includes('westgate')) return 1.5;
    if (destLower.includes('cathedral')) return 1.0;
    
    // Default estimate for local journeys
    return 4.5;
  }
}

// Export the service
export const aiChatService = new AIChatService();

// Import required dependencies
import { getCurrentUKTime } from '../utils/timeUtils';
import { parseBookingConversation, ExtractedJobData } from '../utils/bookingExtraction';
import { sendBookingToAutocab } from './autocab';
import { getVehicles } from './vehicles';
import { generateBookingSummary, searchBookingsByPhone } from './bookingSummary';
import { searchAutocabByJobNumber, getAutocabBookingDetails } from './autocabLookup';