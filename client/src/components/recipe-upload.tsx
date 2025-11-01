import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, Camera, Loader2, CheckCircle, X, Image as ImageIcon } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Recipe } from "@shared/schema";

export function RecipeUpload() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const uploadRecipeMutation = useMutation({
    mutationFn: async (imageBase64: string) => {
      const response = await apiRequest("POST", "/api/recipes/from-image", {
        image: imageBase64
      });
      return await response.json();
    },
    onSuccess: (recipe: Recipe) => {
      toast({
        title: "Recipe Added!",
        description: `Successfully extracted: ${recipe.title}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      setIsOpen(false);
      resetUpload();
    },
    onError: (error: Error | unknown) => {
      toast({
        title: "Extraction Failed",
        description: error instanceof Error ? error.message : "Could not extract recipe from image. Please try a clearer photo.",
        variant: "destructive",
      });
    },
  });

  const resetUpload = () => {
    setSelectedImage(null);
    setSelectedFile(null);
  };

  const handleFileSelect = (file: File) => {
    if (file && file.type.startsWith("image/")) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      toast({
        title: "Invalid File",
        description: "Please select an image file",
        variant: "destructive",
      });
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleUpload = () => {
    if (selectedImage) {
      // Remove data URL prefix to get base64
      const base64 = selectedImage.split(",")[1];
      uploadRecipeMutation.mutate(base64);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" data-testid="button-upload-recipe">
          <Upload className="w-4 h-4 mr-2" />
          Upload Recipe
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl bg-muted">
        <DialogHeader>
          <DialogTitle>Upload Recipe from Image</DialogTitle>
          <DialogDescription>
            Take a photo or upload an image of a paper recipe. Our AI will extract the ingredients and instructions for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedImage ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              data-testid="dropzone-recipe-upload"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-medium">Drag and drop your recipe photo here</p>
                  <p className="text-sm text-muted-foreground mt-1">or click to select a file</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="recipe-upload"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                  data-testid="input-recipe-file"
                />
                <label htmlFor="recipe-upload">
                  <Button variant="outline" asChild>
                    <span>
                      <ImageIcon className="w-4 h-4 mr-2" />
                      Choose Image
                    </span>
                  </Button>
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="relative rounded-lg overflow-hidden bg-muted">
                <img
                  src={selectedImage}
                  alt="Recipe preview"
                  className="max-h-96 w-full object-contain"
                  data-testid="image-recipe-preview"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm"
                  onClick={resetUpload}
                  data-testid="button-remove-image"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {selectedFile && (
                <div className="text-sm text-muted-foreground">
                  Selected: {selectedFile.name}
                </div>
              )}
            </div>
          )}

          <Alert>
            <AlertDescription>
              <strong>Tips for best results:</strong>
              <ul className="mt-2 ml-4 space-y-1 list-disc text-sm">
                <li>Ensure the text is clearly visible and in focus</li>
                <li>Include the entire recipe in the photo</li>
                <li>Use good lighting to avoid shadows on the text</li>
                <li>Keep the camera straight to avoid distortion</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsOpen(false);
              resetUpload();
            }}
            disabled={uploadRecipeMutation.isPending}
            data-testid="button-cancel-upload"
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!selectedImage || uploadRecipeMutation.isPending}
            data-testid="button-process-recipe"
          >
            {uploadRecipeMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Extracting Recipe...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Extract Recipe
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}