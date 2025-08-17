import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Wand2, Eraser } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ExtractedJobData } from "@/lib/types";

interface EmailInputProps {
  emailContent: string;
  setEmailContent: (content: string) => void;
  setExtractedData: (data: ExtractedJobData | null) => void;
}

export function EmailInput({ emailContent, setEmailContent, setExtractedData }: EmailInputProps) {
  const { toast } = useToast();

  const handleAutoExtract = async () => {
    if (!emailContent.trim()) {
      toast({
        title: "Error",
        description: "Please paste email content first",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await apiRequest("POST", "/api/email/extract", {
        emailContent,
      });
      const extractedData = await response.json();
      setExtractedData(extractedData);
      
      toast({
        title: "Success",
        description: "Email data extracted successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to extract email data",
        variant: "destructive",
      });
    }
  };

  const handleClear = () => {
    setEmailContent("");
    setExtractedData(null);
  };

  return (
    <div>
      <Label htmlFor="email-content" className="text-sm font-medium text-gray-700 mb-3">
        Paste Email Content
      </Label>
      <Textarea
        id="email-content"
        rows={15}
        placeholder="Paste your booking email content here..."
        value={emailContent}
        onChange={(e) => setEmailContent(e.target.value)}
        className="resize-none"
      />
      
      <div className="mt-4 flex space-x-3">
        <Button onClick={handleAutoExtract} className="bg-blue-600 hover:bg-blue-700">
          <Wand2 className="mr-2 h-4 w-4" />
          Auto Extract
        </Button>
        <Button variant="outline" onClick={handleClear}>
          <Eraser className="mr-2 h-4 w-4" />
          Clear
        </Button>
      </div>
    </div>
  );
}
