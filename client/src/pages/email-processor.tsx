import { Header } from "@/components/layout/header";
import { EmailInput } from "@/components/email-processor/email-input";
import { ExtractedData } from "@/components/email-processor/extracted-data";
import { GmailDashboard } from "@/components/email-processor/gmail-dashboard";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Mail, Clipboard } from "lucide-react";
import { useLocation } from "wouter";
import { useState } from "react";
import type { ExtractedJobData } from "@/lib/types";

export default function EmailProcessor() {
  const [, setLocation] = useLocation();
  const [emailContent, setEmailContent] = useState("");
  const [extractedData, setExtractedData] = useState<ExtractedJobData | null>(null);

  return (
    <>
      <Header 
        title="Email Processor" 
        subtitle="Extract job details from booking emails"
      />
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-sm p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Email Processor</h3>
                <p className="text-gray-600">Process booking emails manually or connect to Gmail for automatic extraction</p>
              </div>
              <Button 
                variant="ghost" 
                onClick={() => setLocation("/")}
                className="text-blue-600 hover:text-blue-800"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>

            <Tabs defaultValue="gmail" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="gmail" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Gmail Integration
                </TabsTrigger>
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <Clipboard className="h-4 w-4" />
                  Manual Paste
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="manual" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <EmailInput 
                    emailContent={emailContent}
                    setEmailContent={setEmailContent}
                    setExtractedData={setExtractedData}
                  />
                  <ExtractedData extractedData={extractedData} />
                </div>
              </TabsContent>
              
              <TabsContent value="gmail" className="mt-6">
                <GmailDashboard />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </>
  );
}
