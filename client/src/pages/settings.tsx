import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Settings, Cloud, Map, Save, CheckCircle, XCircle, AlertCircle, Mail, Upload } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export default function SettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [googleMapsKey, setGoogleMapsKey] = useState("");
  const [autocabApiKey, setAutocabApiKey] = useState("");
  const [autocabBaseUrl, setAutocabBaseUrl] = useState("https://autocab-api.azure-api.net");
  const [gmailClientId, setGmailClientId] = useState("");
  const [gmailClientSecret, setGmailClientSecret] = useState("");
  const [gmailRedirectUri, setGmailRedirectUri] = useState("http://localhost:5000/api/gmail/callback");
  const [autocabStatus, setAutocabStatus] = useState<"checking" | "connected" | "error" | "not-configured">("not-configured");
  const [googleMapsStatus, setGoogleMapsStatus] = useState<"checking" | "connected" | "error" | "not-configured">("not-configured");
  const [licenseUploadStatus, setLicenseUploadStatus] = useState<string | null>(null);
  const [currentLicenseCount, setCurrentLicenseCount] = useState<number>(0);
  
  // Get Gmail status from query
  const { data: gmailStatusData } = useQuery({
    queryKey: ["/api/gmail/status"],
    refetchInterval: 5000, // Check status every 5 seconds
  });
  
  const gmailStatus = gmailStatusData?.credentialsConfigured ? "connected" : "not-configured";

  useEffect(() => {
    // Load existing settings from server
    loadSettings();
    
    // Test API connections
    testAutocabConnection();
    testGoogleMapsConnection();
    testGmailConnection();
    
    // Load current license count
    loadLicenseInfo();
  }, []);

  const loadLicenseInfo = async () => {
    try {
      const response = await fetch('/api/licenses/info');
      if (response.ok) {
        const data = await response.json();
        setCurrentLicenseCount(data.count || 0);
      }
    } catch (error) {
      console.error('Failed to load license info:', error);
    }
  };

  const handleLicenseUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    // For now, trigger a reload of existing CSV data
    setLicenseUploadStatus('Reloading...');

    try {
      const response = await fetch('/api/licenses/reload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        setLicenseUploadStatus(`✓ Success: ${result.count} licenses loaded`);
        setCurrentLicenseCount(result.count);
        
        // Clear the form
        event.target.value = '';
        
        // Invalidate vehicle cache to reload with new licenses
        queryClient.invalidateQueries({ queryKey: ['/api/vehicles'] });
        
        toast({
          title: "License Data Reloaded",
          description: `Successfully reloaded ${result.count} driver licenses`,
        });
        
        // Clear status after 5 seconds
        setTimeout(() => setLicenseUploadStatus(null), 5000);
      } else {
        const error = await response.text();
        setLicenseUploadStatus(`Error: ${error}`);
      }
    } catch (error) {
      setLicenseUploadStatus('Error: Reload failed');
      console.error('License reload error:', error);
    }
  };

  const loadSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const settings = await response.json();
        setGoogleMapsKey(settings.googleMapsApiKey === "••••••••••••••••••••••••••••••••••••••••••••••" ? "" : settings.googleMapsApiKey || "");
        setAutocabApiKey(settings.autocabApiKey === "••••••••••••••••••••••••••••••••••••••••••••••" ? "" : settings.autocabApiKey || "");
        setAutocabBaseUrl(settings.autocabBaseUrl || "https://autocab-api.azure-api.net");
        setGmailClientId(settings.gmailClientId === "••••••••••••••••••••••••••••••••••••••••••••••" ? "" : settings.gmailClientId || "");
        setGmailClientSecret(settings.gmailClientSecret === "••••••••••••••••••••••••••••••••••••••••••••••" ? "" : settings.gmailClientSecret || "");
        setGmailRedirectUri(settings.gmailRedirectUri || "http://localhost:5000/api/gmail/callback");
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const testAutocabConnection = async () => {
    setAutocabStatus("checking");
    try {
      const response = await fetch('/api/autocab/test');
      if (response.ok) {
        setAutocabStatus("connected");
      } else {
        setAutocabStatus("error");
      }
    } catch (error) {
      setAutocabStatus("not-configured");
    }
  };

  const testGoogleMapsConnection = async () => {
    setGoogleMapsStatus("checking");
    try {
      const response = await fetch('/api/route/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickup: "Canterbury, UK",
          destination: "Dover, UK",
          viaPoints: []
        })
      });
      
      if (response.ok) {
        setGoogleMapsStatus("connected");
      } else {
        const error = await response.json();
        if (error.error?.includes("API key") || error.error?.includes("not configured")) {
          setGoogleMapsStatus("not-configured");
        } else {
          setGoogleMapsStatus("error");
        }
      }
    } catch (error) {
      setGoogleMapsStatus("error");
    }
  };

  const testGmailConnection = async () => {
    try {
      // Invalidate and refetch Gmail status query
      await queryClient.invalidateQueries({ queryKey: ["/api/gmail/status"] });
    } catch (error) {
      console.error("Failed to test Gmail connection:", error);
    }
  };

  const handleGmailJsonUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const credentials = JSON.parse(content);
        
        // Handle both "installed" and "web" app types from Google Cloud Console
        const clientData = credentials.installed || credentials.web;
        
        if (clientData) {
          setGmailClientId(clientData.client_id || '');
          setGmailClientSecret(clientData.client_secret || '');
          // Use the proper Replit domain for redirect URI
          setGmailRedirectUri('https://workspace.cabco.repl.co/api/gmail/callback');
          
          toast({
            title: "Gmail Credentials Loaded",
            description: "Successfully loaded credentials from JSON file",
          });
        } else {
          toast({
            title: "Invalid JSON Format",
            description: "Please upload a valid Google Cloud Console credentials file",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "JSON Parse Error",
          description: "Unable to parse the uploaded JSON file",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleSaveSettings = async () => {
    try {
      const response = await fetch('/api/settings/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          googleMapsApiKey: googleMapsKey,
          autocabApiKey,
          autocabBaseUrl,
          gmailClientId,
          gmailClientSecret,
          gmailRedirectUri,
        }),
      });

      if (response.ok) {
        toast({
          title: "Settings Saved",
          description: "API configurations have been updated successfully",
        });
        
        // Test connections after saving
        testAutocabConnection();
        testGoogleMapsConnection();
        
        // Refresh Gmail status query to update badge
        queryClient.invalidateQueries({ queryKey: ["/api/gmail/status"] });
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Settings" subtitle="Configure API integrations and system preferences" />
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-3 mb-6">
          <Settings className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        </div>

        <div className="space-y-6">
          {/* Integration Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="h-5 w-5" />
                INTEGRATION
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Autocab API */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-100 rounded flex items-center justify-center">
                    <Cloud className="h-4 w-4 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Autocab API</h3>
                  {autocabStatus === "checking" && (
                    <Badge variant="secondary" className="ml-auto">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Checking...
                    </Badge>
                  )}
                  {autocabStatus === "connected" && (
                    <Badge variant="default" className="ml-auto bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                  {autocabStatus === "error" && (
                    <Badge variant="destructive" className="ml-auto">
                      <XCircle className="h-3 w-3 mr-1" />
                      Error
                    </Badge>
                  )}
                  {autocabStatus === "not-configured" && (
                    <Badge variant="outline" className="ml-auto">
                      <XCircle className="h-3 w-3 mr-1" />
                      Not Configured
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-8">
                  <div className="space-y-2">
                    <Label htmlFor="autocab-key">API Key</Label>
                    <Input
                      id="autocab-key"
                      type="password"
                      placeholder="Enter Autocab API key"
                      value={autocabApiKey}
                      onChange={(e) => setAutocabApiKey(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="autocab-url">Base URL</Label>
                    <Input
                      id="autocab-url"
                      placeholder="https://autocab-api.azure-api.net"
                      value={autocabBaseUrl}
                      onChange={(e) => setAutocabBaseUrl(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Route Manager (Google Maps) */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-100 rounded flex items-center justify-center">
                    <Map className="h-4 w-4 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Route Manager</h3>
                  {googleMapsStatus === "checking" && (
                    <Badge variant="secondary" className="ml-auto">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Checking...
                    </Badge>
                  )}
                  {googleMapsStatus === "connected" && (
                    <Badge variant="default" className="ml-auto bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                  {googleMapsStatus === "error" && (
                    <Badge variant="destructive" className="ml-auto">
                      <XCircle className="h-3 w-3 mr-1" />
                      Error
                    </Badge>
                  )}
                  {googleMapsStatus === "not-configured" && (
                    <Badge variant="outline" className="ml-auto">
                      <XCircle className="h-3 w-3 mr-1" />
                      Not Configured
                    </Badge>
                  )}
                </div>
                
                <div className="ml-8 space-y-2">
                  <Label htmlFor="google-maps-key">Google Maps API Key</Label>
                  <Input
                    id="google-maps-key"
                    type="password"
                    placeholder="Enter Google Maps API key"
                    value={googleMapsKey}
                    onChange={(e) => setGoogleMapsKey(e.target.value)}
                  />
                  <p className="text-sm text-gray-500">
                    Required for real-time route mapping, geocoding, and distance calculations.
                    Get your key from Google Cloud Console with Maps JavaScript API, Geocoding API, and Directions API enabled.
                  </p>
                </div>
              </div>

              {/* Gmail API */}
              <Separator />
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-red-100 rounded flex items-center justify-center">
                    <Mail className="h-4 w-4 text-red-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Gmail Integration</h3>
                  {gmailStatus === "checking" && (
                    <Badge variant="secondary" className="ml-auto">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Checking...
                    </Badge>
                  )}
                  {gmailStatus === "connected" && (
                    <Badge variant="default" className="ml-auto bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  )}
                  {gmailStatus === "error" && (
                    <Badge variant="destructive" className="ml-auto">
                      <XCircle className="h-3 w-3 mr-1" />
                      Error
                    </Badge>
                  )}
                  {gmailStatus === "not-configured" && (
                    <Badge variant="outline" className="ml-auto">
                      <XCircle className="h-3 w-3 mr-1" />
                      Not Configured
                    </Badge>
                  )}
                </div>
                
                <div className="ml-8 space-y-4">
                  {/* Google Cloud Console Configuration Instructions */}
                  <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Google Cloud Console Configuration Required</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-2">
                      Before uploading credentials, add this redirect URI to your OAuth 2.0 Client:
                    </p>
                    <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded mb-2">
                      <code className="text-sm font-mono text-blue-800 dark:text-blue-200">
                        https://workspace.cabco.repl.co/api/gmail/callback
                      </code>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      1. Edit your OAuth 2.0 Client in Google Cloud Console<br/>
                      2. Add the URI above to "Authorized redirect URIs"<br/>
                      3. Save changes, then upload your credentials JSON below
                    </p>
                  </div>

                  {/* JSON File Upload Option */}
                  <div className="space-y-2">
                    <Label htmlFor="gmail-json-upload">Quick Setup</Label>
                    <div className="flex items-center space-x-2">
                      <input
                        id="gmail-json-upload"
                        type="file"
                        accept=".json"
                        onChange={handleGmailJsonUpload}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('gmail-json-upload')?.click()}
                        className="flex items-center space-x-2"
                      >
                        <Upload className="h-4 w-4" />
                        <span>Upload Google Cloud Console JSON</span>
                      </Button>
                    </div>
                    <p className="text-sm text-gray-500">
                      Upload the credentials JSON file downloaded from Google Cloud Console to automatically configure Gmail API access.
                    </p>
                  </div>

                  <Separator className="my-4" />
                  <p className="text-sm text-gray-600">Or configure manually:</p>

                  <div className="space-y-2">
                    <Label htmlFor="gmail-client-id">Client ID</Label>
                    <Input
                      id="gmail-client-id"
                      type="text"
                      placeholder="Enter Gmail API Client ID"
                      value={gmailClientId}
                      onChange={(e) => setGmailClientId(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="gmail-client-secret">Client Secret</Label>
                    <Input
                      id="gmail-client-secret"
                      type="password"
                      placeholder="Enter Gmail API Client Secret"
                      value={gmailClientSecret}
                      onChange={(e) => setGmailClientSecret(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="gmail-redirect-uri">Redirect URI</Label>
                    <Input
                      id="gmail-redirect-uri"
                      type="text"
                      placeholder="http://localhost:5000/api/gmail/callback"
                      value={gmailRedirectUri}
                      onChange={(e) => setGmailRedirectUri(e.target.value)}
                    />
                  </div>
                  
                  <p className="text-sm text-gray-500">
                    Required for automatic SAGA email processing and job extraction. 
                    Get credentials from Google Cloud Console with Gmail API enabled. 
                    Current status: {gmailStatus === "connected" ? "Demo mode active" : "Real Gmail API not configured"}
                  </p>
                </div>
              </div>

              <Separator />

              {/* License Management */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center">
                    <Upload className="h-4 w-4 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">License Management</h3>
                  <Badge variant="default" className="ml-auto bg-purple-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    CSV Active
                  </Badge>
                </div>
                
                <div className="ml-8 space-y-4">
                  <p className="text-sm text-gray-600">
                    Upload a new driver license CSV file to update vehicle-driver mappings. 
                    The system will automatically reload and apply the new license data.
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleLicenseUpload}
                        className="hidden"
                        id="license-upload"
                      />
                      <Button 
                        variant="outline" 
                        onClick={() => document.getElementById('license-upload')?.click()}
                        className="flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Upload License CSV
                      </Button>
                      {licenseUploadStatus && (
                        <Badge 
                          variant={licenseUploadStatus.includes('success') ? 'default' : 'destructive'}
                          className={licenseUploadStatus.includes('success') ? 'bg-green-500' : ''}
                        >
                          {licenseUploadStatus}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
                      <strong>CSV Format Required:</strong><br/>
                      Driver Name, Company, Driver Callsign, Vehicle Callsign, Last Log-On, Username, etc.<br/>
                      <strong>Current file:</strong> Licences_1751399885299.csv ({currentLicenseCount} licenses loaded)
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleSaveSettings} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}