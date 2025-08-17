import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Paperclip, Send, Bot, User, Image as ImageIcon, Loader2, Eye, EyeOff, Smartphone } from 'lucide-react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useJobs } from '@/hooks/use-jobs';
import { useAutocab } from '@/hooks/use-autocab';
import { useLocation } from 'wouter';
import { MobileMenuButton } from '@/components/layout/sidebar';
import type { Job, InsertJob, ExtractedJobData } from '@/lib/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  image?: string;
  type?: 'text' | 'image' | 'system_action';
  metadata?: any;
}

export default function AIChat() {
  const { getJob, createJob, updateJob, deleteJob } = useJobs();
  const { sendToAutocab, getBookingDetails, updateBooking } = useAutocab();
  const [location, setLocation] = useLocation();
  
  // Detect mobile screen size
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m Sarah from CABCO Canterbury Taxis. How can I help you today?',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showThinking, setShowThinking] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Execute system actions requested by AI
  const executeSystemAction = async (action: any) => {
    try {
      console.log('🤖 Executing AI action:', action);
      
      switch (action.type) {
        case 'create_booking':
          // Only create job if there are no errors or missing fields
          if (action.data.error || action.data.missingFields?.length > 0) {
            console.log('🔄 SKIPPING JOB CREATION - Missing fields or error:', action.data.missingFields);
            // The AI is asking for missing information, don't create job yet
            return;
          }
          
          const newJob = await createJob(action.data);
          console.log('✅ Booking created:', newJob);
          await queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
          if (action.sendToAutocab) {
            await sendToAutocab({ jobId: newJob.id });
            console.log('✅ Booking sent to AUTOCAB');
          }
          // Add success message to chat
          const successMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `✅ Booking created successfully! Job ID: ${newJob.id}${action.sendToAutocab ? ' and sent to AUTOCAB' : ''}`,
            timestamp: new Date(),
            type: 'system_action'
          };
          setMessages(prev => [...prev, successMessage]);
          break;
          
        case 'update_booking':
          await updateJob(action.jobId, action.data);
          console.log('✅ Booking updated:', action.jobId);
          await queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
          if (action.sendToAutocab) {
            await sendToAutocab({ jobId: action.jobId });
            console.log('✅ Updated booking sent to AUTOCAB');
          }
          const updateMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `✅ Booking ${action.jobId} updated successfully!${action.sendToAutocab ? ' and sent to AUTOCAB' : ''}`,
            timestamp: new Date(),
            type: 'system_action'
          };
          setMessages(prev => [...prev, updateMessage]);
          break;
          
        case 'delete_booking':
          await deleteJob(action.jobId);
          console.log('✅ Booking deleted:', action.jobId);
          await queryClient.invalidateQueries({ queryKey: ['/api/jobs'] });
          const deleteMessage: ChatMessage = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `✅ Booking ${action.jobId} deleted successfully!`,
            timestamp: new Date(),
            type: 'system_action'
          };
          setMessages(prev => [...prev, deleteMessage]);
          break;
          
        case 'send_to_autocab':
          await sendToAutocab({ jobId: action.jobId, force: action.force });
          console.log('✅ Booking sent to AUTOCAB:', action.jobId);
          break;
          
        case 'get_booking_details':
          const details = await getBookingDetails(action.bookingId);
          console.log('✅ Booking details retrieved:', details);
          break;
          
        case 'update_autocab_booking':
          await updateBooking({ bookingId: action.bookingId, bookingData: action.data });
          console.log('✅ AUTOCAB booking updated:', action.bookingId);
          break;
          
        default:
          console.log('❌ Unknown action type:', action.type);
      }
    } catch (error) {
      console.error('❌ Action execution failed:', error);
      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Error executing action: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle clipboard paste for images
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            setSelectedImage(file);
            const reader = new FileReader();
            reader.onload = (e) => {
              setImagePreview(e.target?.result as string);
            };
            reader.readAsDataURL(file);
            
            // Show notification
            console.log('📷 Clipboard image detected and added!');
          }
          break;
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, []);

  // Get system status for context - only when needed and less frequently
  const { data: vehiclesData } = useQuery({
    queryKey: ['/api/vehicles'],
    refetchInterval: 60000, // Reduced from 30s to 60s
    staleTime: 30000 // Cache for 30s before considering stale
  });

  const { data: jobsData } = useQuery({
    queryKey: ['/api/jobs'],
    refetchInterval: 60000, // Reduced from 30s to 60s  
    staleTime: 30000 // Cache for 30s before considering stale
  });

  const chatMutation = useMutation({
    mutationFn: async ({ message, image }: { message: string; image?: File }) => {
      // Enhanced context with booking functions and conversation history
      const requestBody = {
        message,
        context: {
          vehicles: (vehiclesData?.vehicles || []).slice(0, 5), // Only send first 5 vehicles to reduce AI processing time
          jobs: (jobsData || []).slice(0, 10), // Only send first 10 jobs to reduce payload
          timestamp: new Date().toISOString(),
          conversationHistory: messages.slice(-15).map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
          })),
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
        }
      };

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || 'Chat request failed');
      }

      return response.json();
    },
    onSuccess: async (data) => {
      // Execute any system actions requested by AI
      if (data.actions && Array.isArray(data.actions)) {
        for (const action of data.actions) {
          await executeSystemAction(action);
        }
      }
      
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        type: data.type || 'text',
        metadata: data.metadata
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Only show system actions that are NOT incomplete booking information
      if (data.actions && data.actions.length > 0) {
        data.actions.forEach((action: any, index: number) => {
          // Skip booking actions that are just "Text processing error" - these are handled in main response
          if (action.type === 'create_booking' && action.description === 'Text processing error') {
            return; // Don't show duplicate incomplete booking messages
          }
          
          const actionMessage: ChatMessage = {
            id: `${Date.now()}-action-${index}`,
            role: 'assistant',
            content: `🔧 ${action.description || 'System Action'}: ${action.result || 'Processing...'}`,
            timestamp: new Date(),
            type: 'system_action',
            metadata: action
          };
          setMessages(prev => [...prev, actionMessage]);
        });
      }
    },
    onError: (error) => {
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ Error: ${error.message}. Please try again.`,
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  });

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = () => {
    if (!input.trim() && !selectedImage) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input || 'Attached image',
      timestamp: new Date(),
      image: imagePreview || undefined,
      type: selectedImage ? 'image' : 'text'
    };

    setMessages(prev => [...prev, userMessage]);

    chatMutation.mutate({
      message: input,
      image: selectedImage || undefined
    });

    setInput('');
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full h-screen">
      {/* Mobile-optimized header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 md:hidden">
        <div className="flex items-center gap-3">
          <MobileMenuButton />
          <Bot className="h-5 w-5 text-blue-600" />
          <h1 className="text-base font-semibold text-gray-900">Sarah from CABCO</h1>
        </div>
      </div>
      
      <div className="p-2 md:p-4 h-full md:h-screen">
        <Card className="h-full flex flex-col max-w-none">
          <CardHeader className="pb-2 px-3 md:pb-3 md:px-6 hidden md:block">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Bot className="h-4 w-4 md:h-5 md:w-5 text-blue-600" />
                <span className="hidden sm:inline">AI Chat - </span>Sarah from CABCO
                {isMobile && (
                  <div className="ml-2 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full flex items-center gap-1">
                    <Smartphone className="h-3 w-3" />
                    Mobile
                  </div>
                )}
              </CardTitle>
              <div className="flex gap-1 md:gap-2">
              {isMobile && location !== '/ai-chat-mobile' && (
                <button
                  onClick={() => setLocation('/ai-chat-mobile')}
                  className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded-md transition-colors flex items-center gap-1"
                >
                  <Smartphone className="h-3 w-3" />
                  <span className="hidden sm:inline">Full Screen</span>
                </button>
              )}
              <button
                onClick={() => setShowThinking(!showThinking)}
                className={`px-2 py-1 text-xs rounded-md transition-colors flex items-center gap-1 ${
                  showThinking 
                    ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                    : 'bg-gray-500 hover:bg-gray-600 text-white'
                }`}
              >
                {showThinking ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                <span className="hidden sm:inline">{showThinking ? 'Hide Logic' : 'Show Logic'}</span>
              </button>
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = '/AI_CHAT_USER_GUIDE.txt';
                  link.download = 'AI_CHAT_USER_GUIDE.txt';
                  link.click();
                }}
                className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              >
                <span className="sm:hidden">📖</span>
                <span className="hidden sm:inline">📖 Simple Guide</span>
              </button>
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = '/AI_CHAT_MANUAL.txt';
                  link.download = 'AI_CHAT_MANUAL.txt';
                  link.click();
                }}
                className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
              >
                <span className="sm:hidden">📋</span>
                <span className="hidden sm:inline">📋 Developer Guide</span>
              </button>
              </div>
            </div>
            <p className="text-xs md:text-sm text-muted-foreground">
              <span className="hidden md:inline">I analyze images, answer questions about drivers, and create bookings. </span>
              {vehiclesData?.vehicles?.length || 0} vehicles online.
              <span className="text-blue-600 ml-2 hidden md:inline">💡 You can paste images with Ctrl+V!</span>
            </p>
          </CardHeader>
        
        <CardContent className="flex-1 flex flex-col px-2 py-2 md:px-3">
          <div className="flex-1 overflow-y-auto pr-1 pb-2" style={{ maxHeight: 'calc(100vh - 180px)' }}>
            <div className="space-y-2 md:space-y-3">
              {messages
                .filter(message => showThinking || message.type !== 'system_action')
                .map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <Avatar className="h-6 w-6 md:h-8 md:w-8 mt-1 flex-shrink-0">
                      <AvatarFallback className="bg-blue-100">
                        <Bot className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  
                  <div className={`max-w-[85%] md:max-w-[80%] ${message.role === 'user' ? 'order-first' : ''}`}>
                    <div
                      className={`p-3 md:p-4 rounded-lg text-sm md:text-base leading-relaxed ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : message.type === 'system_action'
                          ? 'bg-green-50 border border-green-200 text-green-800 rounded-bl-sm'
                          : 'bg-gray-100 dark:bg-gray-800 rounded-bl-sm'
                      }`}
                    >
                      {message.image && (
                        <div className="mb-2">
                          <img
                            src={message.image}
                            alt="User uploaded"
                            className="max-w-full h-auto rounded border"
                            style={{ maxHeight: '120px' }}
                          />
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 px-1">
                      {message.timestamp.toLocaleTimeString('en-GB', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                  
                  {message.role === 'user' && (
                    <Avatar className="h-6 w-6 md:h-8 md:w-8 flex-shrink-0">
                      <AvatarFallback className="bg-blue-600">
                        <User className="h-3 w-3 md:h-4 md:w-4 text-white" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              ))}
              
              {chatMutation.isPending && (
                <div className="flex gap-2 justify-start">
                  <Avatar className="h-6 w-6 md:h-8 md:w-8">
                    <AvatarFallback className="bg-blue-100">
                      <Bot className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 rounded-lg rounded-bl-sm">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-sm">Sarah is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </div>

          <div className="pt-2 md:pt-4 border-t">
            {imagePreview && (
              <div className="mb-2 p-2 border rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-2">
                  <ImageIcon className="h-4 w-4" />
                  <span className="text-sm">Selected image:</span>
                </div>
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-16 md:max-h-20 rounded border"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedImage(null);
                    setImagePreview(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="mt-1"
                >
                  Remove
                </Button>
              </div>
            )}
            
            <div className="flex gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
              />
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={chatMutation.isPending}
                className="flex-shrink-0 h-10 w-10 md:h-12 md:w-12"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about drivers, bookings, or send images..."
                className="flex-1 h-10 md:h-12 text-base"
                disabled={chatMutation.isPending}
              />
              
              <Button
                onClick={handleSend}
                disabled={chatMutation.isPending || (!input.trim() && !selectedImage)}
                className="flex-shrink-0 h-10 w-10 md:h-12 md:w-12 bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}