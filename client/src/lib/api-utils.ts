// API utilities with timeout, retry logic and fallbacks
const DEBUG_MODE = import.meta.env.DEV || import.meta.env.VITE_DEBUG === 'true';

export function debugLog(message: string, ...args: any[]) {
  if (DEBUG_MODE) {
    console.log(message, ...args);
  }
}

export function debugError(message: string, error: any) {
  if (DEBUG_MODE) {
    console.error(message, error);
  }
}

// Fetch with timeout and retry logic
export async function fetchWithTimeout(
  url: string, 
  options: RequestInit = {}, 
  timeout: number = 8000,
  retries: number = 2
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  const fetchOptions = {
    ...options,
    signal: controller.signal
  };

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      debugLog(`🔄 API Request attempt ${attempt + 1}/${retries + 1}: ${url}`);
      
      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);
      
      // Retry on rate limit or server errors
      if ((response.status === 429 || response.status >= 500) && attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        debugLog(`⏳ Retrying in ${delay}ms due to status ${response.status}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error as Error;
      
      if (attempt < retries) {
        const delay = Math.pow(2, attempt) * 1000;
        debugLog(`❌ Request failed, retrying in ${delay}ms:`, error);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  debugError(`❌ All ${retries + 1} attempts failed for ${url}`, lastError);
  throw lastError || new Error('Request failed after all retries');
}

// Canterbury fallback coordinates and zone
export const CANTERBURY_FALLBACK = {
  coordinates: { lat: 51.2802, lng: 1.0789 },
  zone: { id: 1, name: 'Canterbury Center' }
};

// Clean status translation with fallback
export function translateStatusToEnglish(statusType: string): string {
  const translations: Record<string, string> = {
    'AvailableInQueueWithJob': 'Available in Queue',
    'AvailableNotInQueue': 'Available',
    'NotAvailable': 'Not Available',
    'BusyMeterOnFromMeterOffCash': 'With Customer (Cash)',
    'BusyMeterOnFromMeterOffAccount': 'With Customer (Account)',
    'BusyMeterOffCash': 'Meter Off (Cash)',
    'BusyMeterOffAccount': 'Meter Off (Account)',
    'BusyGoingToPickup': 'Going to Pickup',
    'BusyAtPickup': 'At Pickup',
    'Emergency': 'Emergency',
    'Break': 'On Break',
    'Lunch': 'On Lunch',
    'EndOfShift': 'End of Shift'
  };

  if (translations[statusType]) {
    return translations[statusType];
  }

  // Clean fallback for unknown statuses
  return `Status: ${statusType.replace(/([A-Z])/g, ' $1').trim()}`;
}

// Rate limiting utility
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly timeWindow: number;

  constructor(maxRequests: number = 10, timeWindowMs: number = 1000) {
    this.maxRequests = maxRequests;
    this.timeWindow = timeWindowMs;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside time window
    this.requests = this.requests.filter(time => now - time < this.timeWindow);
    
    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.timeWindow - (now - oldestRequest);
      
      if (waitTime > 0) {
        debugLog(`🚦 Rate limiting: waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
    
    this.requests.push(now);
  }
}

export const autocabRateLimiter = new RateLimiter(8, 1000); // 8 requests per second max