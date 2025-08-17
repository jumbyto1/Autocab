import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Mail, 
  Search, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Settings,
  ExternalLink,
  Calendar
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GmailEmail {
  id: string;
  subject: string;
  sender: string;
  date: string;
  snippet: string;
  processed: boolean;
  jobNumber?: string;
}

interface GmailSettings {
  isConnected: boolean;
  emailAddress?: string;
  lastSync?: string;
  authUrl?: string;
  demo?: boolean;
  credentialsConfigured?: boolean;
}

export function GmailDashboard() {
  const [searchDays, setSearchDays] = useState(7);
  const [customQuery, setCustomQuery] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [showAuthCode, setShowAuthCode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get Gmail connection status
  const { data: gmailStatus, isLoading: statusLoading } = useQuery({
    queryKey: ["/api/gmail/status"],
    refetchInterval: 5000, // Check status every 5 seconds
  });

  // Type the Gmail status data
  const status = (gmailStatus as GmailSettings) || { isConnected: false };

  // Search emails
  const searchEmailsMutation = useMutation({
    mutationFn: async (params: { days: number; query?: string }) => {
      const response = await fetch("/api/gmail/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRangeDays: params.days,
          customQuery: params.query || "",
          subjects: ["Saga Work Offer", "VIP Allocation", "External VIP", "Work Allocation"]
        }),
      });
      if (!response.ok) throw new Error("Failed to search emails");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/gmail/emails"] });
      toast({
        title: "Search completed",
        description: "Email search completed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Search failed",
        description: error.message || "Failed to search emails",
        variant: "destructive",
      });
    },
  });

  // Connect to Gmail
  const connectGmailMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/gmail/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to connect to Gmail");
      return response.json();
    },
    onSuccess: (data: any) => {
      if (data.authUrl) {
        setShowAuthCode(true);
        window.open(data.authUrl, '_blank');
      }
      queryClient.invalidateQueries({ queryKey: ["/api/gmail/status"] });
    },
    onError: (error: any) => {
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect to Gmail",
        variant: "destructive",
      });
    },
  });

  // Complete authentication
  const completeAuthMutation = useMutation({
    mutationFn: async (code: string) => {
      const response = await fetch("/api/gmail/auth/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ authCode: code }),
      });
      if (!response.ok) throw new Error("Failed to complete authentication");
      return response.json();
    },
    onSuccess: () => {
      setShowAuthCode(false);
      setAuthCode("");
      queryClient.invalidateQueries({ queryKey: ["/api/gmail/status"] });
      toast({
        title: "Connected successfully",
        description: "Gmail account connected successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Authentication failed",
        description: error.message || "Failed to complete authentication",
        variant: "destructive",
      });
    },
  });

  // Process emails - This will extract jobs directly into bookings with PENDING status
  const processEmailsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/gmail/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateRangeDays: searchDays,
          markAsRead: false
        }),
      });
      if (!response.ok) throw new Error("Failed to process emails");
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Processing completed",
        description: `Processed ${data.imported?.length || 0} emails successfully`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Processing failed",
        description: error.message || "Failed to process emails",
        variant: "destructive",
      });
    },
  });

  // Get recent emails
  const { data: recentEmails, isLoading: emailsLoading } = useQuery({
    queryKey: ["/api/gmail/emails"],
    enabled: status.isConnected,
  });

  // Type the emails data safely
  const emails = Array.isArray(recentEmails) ? recentEmails as GmailEmail[] : [];

  const handleSearchEmails = () => {
    searchEmailsMutation.mutate({
      days: searchDays,
      query: customQuery
    });
  };

  const handleProcessEmails = () => {
    processEmailsMutation.mutate();
  };

  const handleCompleteAuth = () => {
    if (authCode.trim()) {
      completeAuthMutation.mutate(authCode.trim());
    }
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Gmail Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statusLoading ? (
            <div className="flex items-center gap-2 text-gray-500">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Checking connection status...
            </div>
          ) : status.isConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-600 font-medium">Connected to Gmail</span>
                {status.demo && (
                  <Badge variant="secondary" className="ml-2">
                    Demo Mode
                  </Badge>
                )}
              </div>
              {status.emailAddress && (
                <div className="text-sm text-gray-600">
                  Account: {status.emailAddress}
                </div>
              )}
              {status.lastSync && (
                <div className="text-sm text-gray-600">
                  Last sync: {new Date(status.lastSync).toLocaleString()}
                </div>
              )}
              {status.demo && (
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    You're using demo mode. Configure real Gmail API credentials in Settings to connect to your actual Gmail account.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <span className="text-yellow-600 font-medium">Not connected to Gmail</span>
              </div>
              
              {status.credentialsConfigured ? (
                <div className="space-y-4">
                  <Alert>
                    <Settings className="h-4 w-4" />
                    <AlertDescription>
                      Gmail API credentials are configured. Click below to authenticate with Google.
                    </AlertDescription>
                  </Alert>
                  
                  {status.authUrl && (
                    <Button 
                      onClick={() => window.open(status.authUrl, '_blank')}
                      className="flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Authenticate with Google
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <Settings className="h-4 w-4" />
                    <AlertDescription>
                      Gmail API credentials not configured. Please go to Settings to configure your Gmail Client ID, Client Secret, and Redirect URI.
                    </AlertDescription>
                  </Alert>
                  
                  <Button 
                    onClick={() => window.location.href = '/settings'}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Settings className="h-4 w-4" />
                    Go to Settings
                  </Button>
                </div>
              )}
              
              {showAuthCode && status.credentialsConfigured && (
                <div className="space-y-4">
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please complete the authentication in the opened window, then enter the verification code below.
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <Label htmlFor="authCode">Verification Code</Label>
                    <div className="flex gap-2">
                      <Input
                        id="authCode"
                        placeholder="Enter verification code..."
                        value={authCode}
                        onChange={(e) => setAuthCode(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleCompleteAuth()}
                      />
                      <Button 
                        onClick={handleCompleteAuth}
                        disabled={!authCode.trim() || completeAuthMutation.isPending}
                      >
                        {completeAuthMutation.isPending ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          "Verify"
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search and Process Controls */}
      {status.isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Email Search & Processing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="searchDays">Search Last Days</Label>
                <Input
                  id="searchDays"
                  type="number"
                  min="1"
                  max="365"
                  value={searchDays}
                  onChange={(e) => setSearchDays(parseInt(e.target.value) || 7)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="customQuery">Custom Search (Optional)</Label>
                <Input
                  id="customQuery"
                  placeholder="e.g., subject:(VIP OR Saga)"
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSearchEmails}
                disabled={searchEmailsMutation.isPending}
                variant="outline"
                className="flex items-center gap-2"
              >
                {searchEmailsMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                Search Emails
              </Button>
              
              <Button 
                onClick={handleProcessEmails}
                disabled={processEmailsMutation.isPending}
                className="flex items-center gap-2"
              >
                {processEmailsMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                Process & Import
              </Button>
            </div>

            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                Search will look for SAGA booking emails, VIP allocations, and work offers. 
                Processing will automatically extract job details and create bookings.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Recent Emails */}
      {status.isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Recent Booking Emails
            </CardTitle>
          </CardHeader>
          <CardContent>
            {emailsLoading ? (
              <div className="flex items-center gap-2 text-gray-500">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading emails...
              </div>
            ) : emails.length > 0 ? (
              <div className="space-y-3">
                {emails.map((email: GmailEmail) => (
                  <div key={email.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">{email.subject}</h4>
                          {email.processed ? (
                            <Badge variant="secondary" className="text-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Processed
                            </Badge>
                          ) : (
                            <Badge variant="outline">
                              <Clock className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-gray-600 mb-2">
                          From: {email.sender} • {new Date(email.date).toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {email.snippet}
                        </div>
                        {email.jobNumber && (
                          <div className="text-xs text-blue-600 mt-1">
                            Job: {email.jobNumber}
                          </div>
                        )}
                      </div>
                      <Calendar className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No booking emails found</p>
                <p className="text-sm">Try searching for emails or check your search criteria</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}