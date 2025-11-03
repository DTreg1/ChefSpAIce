/**
 * Copy Button Component
 * 
 * Button to copy extracted text to clipboard with feedback
 */

import { useState, useCallback } from "react";
import { Copy, Check, Download, FileJson, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  structuredData?: any;
  format?: "text" | "json" | "csv";
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export function CopyButton({
  text,
  structuredData,
  format = "text",
  className,
  variant = "outline",
  size = "default"
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const copyToClipboard = useCallback(async (content: string, contentFormat: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: `Text copied as ${contentFormat}`,
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Could not copy text to clipboard",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleCopyAsText = useCallback(() => {
    copyToClipboard(text, "plain text");
  }, [text, copyToClipboard]);

  const handleCopyAsJSON = useCallback(() => {
    const jsonContent = structuredData 
      ? JSON.stringify(structuredData, null, 2)
      : JSON.stringify({ text }, null, 2);
    copyToClipboard(jsonContent, "JSON");
  }, [text, structuredData, copyToClipboard]);

  const handleCopyAsCSV = useCallback(() => {
    if (structuredData?.items && Array.isArray(structuredData.items)) {
      // Convert receipt items to CSV
      const headers = "Item,Price";
      const rows = structuredData.items.map((item: any) => 
        `"${item.name || ''}","${item.price || ''}"`
      ).join('\n');
      const csvContent = `${headers}\n${rows}`;
      copyToClipboard(csvContent, "CSV");
    } else {
      // Simple text to CSV (one column)
      const lines = text.split('\n').filter(line => line.trim());
      const csvContent = lines.map(line => `"${line.replace(/"/g, '""')}"`).join('\n');
      copyToClipboard(csvContent, "CSV");
    }
  }, [text, structuredData, copyToClipboard]);

  const handleDownload = useCallback((content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Downloaded",
      description: `File saved as ${filename}`,
    });
  }, [toast]);

  const handleDownloadText = useCallback(() => {
    handleDownload(text, 'extracted-text.txt', 'text/plain');
  }, [text, handleDownload]);

  const handleDownloadJSON = useCallback(() => {
    const jsonContent = structuredData 
      ? JSON.stringify(structuredData, null, 2)
      : JSON.stringify({ text }, null, 2);
    handleDownload(jsonContent, 'extracted-data.json', 'application/json');
  }, [text, structuredData, handleDownload]);

  const handleDownloadCSV = useCallback(() => {
    if (structuredData?.items && Array.isArray(structuredData.items)) {
      const headers = "Item,Price";
      const rows = structuredData.items.map((item: any) => 
        `"${item.name || ''}","${item.price || ''}"`
      ).join('\n');
      const csvContent = `${headers}\n${rows}`;
      handleDownload(csvContent, 'extracted-data.csv', 'text/csv');
    } else {
      const lines = text.split('\n').filter(line => line.trim());
      const csvContent = lines.map(line => `"${line.replace(/"/g, '""')}"`).join('\n');
      handleDownload(csvContent, 'extracted-text.csv', 'text/csv');
    }
  }, [text, structuredData, handleDownload]);

  // Simple copy button for icon size
  if (size === "icon") {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleCopyAsText}
        className={className}
        disabled={!text}
        data-testid="button-copy-icon"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-600" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn("gap-2", className)}
          disabled={!text}
          data-testid="button-copy-dropdown"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-green-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              Copy / Export
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" data-testid="dropdown-content">
        <DropdownMenuLabel>Copy to Clipboard</DropdownMenuLabel>
        <DropdownMenuItem onClick={handleCopyAsText} data-testid="menu-copy-text">
          <FileText className="mr-2 h-4 w-4" />
          Copy as Text
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleCopyAsJSON} data-testid="menu-copy-json">
          <FileJson className="mr-2 h-4 w-4" />
          Copy as JSON
        </DropdownMenuItem>
        {structuredData?.items && (
          <DropdownMenuItem onClick={handleCopyAsCSV} data-testid="menu-copy-csv">
            <FileText className="mr-2 h-4 w-4" />
            Copy as CSV
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel>Download File</DropdownMenuLabel>
        <DropdownMenuItem onClick={handleDownloadText} data-testid="menu-download-text">
          <Download className="mr-2 h-4 w-4" />
          Download Text
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadJSON} data-testid="menu-download-json">
          <Download className="mr-2 h-4 w-4" />
          Download JSON
        </DropdownMenuItem>
        {structuredData?.items && (
          <DropdownMenuItem onClick={handleDownloadCSV} data-testid="menu-download-csv">
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}