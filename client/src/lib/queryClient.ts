import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      const errorData = await res.json();
      console.log('🔍 API ERROR RESPONSE:', errorData);
      
      // For duplicate job errors (409), throw the full error object
      if (res.status === 409 && errorData.isDuplicate) {
        console.log('✅ CREATING STRUCTURED DUPLICATE ERROR');
        const error = new Error(errorData.message || `${res.status}: ${res.statusText}`);
        (error as any).status = res.status;
        (error as any).isDuplicate = errorData.isDuplicate;
        (error as any).existingJob = errorData.existingJob;
        console.log('🚀 THROWING STRUCTURED ERROR:', error);
        throw error;
      } else {
        throw new Error(`${res.status}: ${errorData.message || res.statusText}`);
      }
    } catch (parseError) {
      console.log('❌ ERROR PARSING JSON:', parseError);
      // If this is already our structured error, re-throw it
      if ((parseError as any).isDuplicate) {
        throw parseError;
      }
      
      // If JSON parsing fails, fall back to text
      if (parseError instanceof Error && parseError.message.includes('already consumed')) {
        const error = new Error(`${res.status}: ${res.statusText}`);
        (error as any).status = res.status;
        throw error;
      } else {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }
    }
  }
}

export async function apiRequest(
  url: string,
  options?: {
    method?: string;
    body?: unknown;
  }
): Promise<Response> {
  const method = options?.method || "GET";
  const data = options?.body;
  
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
