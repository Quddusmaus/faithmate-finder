import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Loader2 } from "lucide-react";

interface PhotoUploadProps {
  userId: string;
  existingPhotos: string[];
  onPhotosChange: (photos: string[]) => void;
}

export const PhotoUpload = ({ userId, existingPhotos, onPhotosChange }: PhotoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const maxPhotos = 6;

  const uploadPhoto = async (file: File) => {
    try {
      setUploading(true);

      // Validate file
      if (!file.type.startsWith('image/')) {
        throw new Error('Please upload an image file');
      }

      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Image size must be less than 5MB');
      }

      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('profile-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(data.path);

      // Add to photos array
      const updatedPhotos = [...existingPhotos, publicUrl];
      onPhotosChange(updatedPhotos);

      toast({
        title: "Photo uploaded",
        description: "Your photo has been uploaded successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to upload photo.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (photoUrl: string) => {
    try {
      // Extract file path from URL
      const urlParts = photoUrl.split('/profile-photos/');
      if (urlParts.length === 2) {
        const filePath = urlParts[1];
        
        // Delete from storage
        const { error } = await supabase.storage
          .from('profile-photos')
          .remove([filePath]);

        if (error) throw error;
      }

      // Remove from photos array
      const updatedPhotos = existingPhotos.filter(url => url !== photoUrl);
      onPhotosChange(updatedPhotos);

      toast({
        title: "Photo deleted",
        description: "Your photo has been removed.",
      });
    } catch (error: any) {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete photo.",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadPhoto(file);
      // Reset input
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {existingPhotos.map((photoUrl, index) => (
          <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-muted group">
            <img
              src={photoUrl}
              alt={`Profile photo ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => deletePhoto(photoUrl)}
              className="absolute top-2 right-2 p-1.5 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}

        {existingPhotos.length < maxPhotos && (
          <label className="relative aspect-square rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading}
              className="sr-only"
            />
            {uploading ? (
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Upload</span>
              </>
            )}
          </label>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Upload up to {maxPhotos} photos (max 5MB each). Supported formats: JPEG, PNG, WebP.
      </p>
    </div>
  );
};