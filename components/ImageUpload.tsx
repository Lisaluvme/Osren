import React, { useState, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import imageService from '../services/imageService';

interface ImageUploadProps {
  itemId: string;
  currentImage?: string;
  onImageUpdate: (imageUrl: string, fileId: string) => void;
  onImageDelete: () => void;
  disabled?: boolean;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  itemId,
  currentImage = '',
  onImageUpdate,
  onImageDelete,
  disabled = false,
}) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setError('');
    uploadImage(file);
  };

  const uploadImage = async (file: File) => {
    setUploading(true);
    try {
      const result = await imageService.uploadImage(itemId, file);

      if (result.success && result.data) {
        setPreview(result.data.imageUrl);
        onImageUpdate(result.data.imageUrl, result.data.fileId);
        setError('');
      } else {
        setError(result.error || 'Failed to upload image');
      }
    } catch (err) {
      setError('Failed to upload image. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    setUploading(true);
    try {
      const result = await imageService.deleteImage(itemId);

      if (result.success) {
        setPreview('');
        onImageDelete();
        setError('');
      } else {
        setError(result.error || 'Failed to delete image');
      }
    } catch (err) {
      setError('Failed to delete image. Please try again.');
      console.error('Delete error:', err);
    } finally {
      setUploading(false);
    }
  };

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div className="flex items-center gap-4">
      {/* Image Preview */}
      <div className="relative">
        {preview ? (
          <div className="relative w-20 h-20 rounded-lg overflow-hidden border-2 border-slate-200 bg-slate-50">
            <img
              src={preview}
              alt="Product"
              className="w-full h-full object-cover"
              onError={() => {
                setError('Failed to load image');
                setPreview('');
              }}
            />
            {!disabled && !uploading && (
              <button
                onClick={handleDelete}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                title="Remove image"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : (
          <div
            onClick={handleClick}
            className={`w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors ${
              disabled || uploading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {uploading ? (
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            ) : (
              <ImageIcon className="w-8 h-8 text-slate-400" />
            )}
          </div>
        )}
      </div>

      {/* Upload Controls */}
      <div className="flex-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          disabled={disabled || uploading}
        />

        <button
          onClick={handleClick}
          disabled={disabled || uploading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              {preview ? 'Change Image' : 'Upload Image'}
            </>
          )}
        </button>

        <div className="mt-2 space-y-1">
          <p className="text-xs text-slate-500">
            Accepted: JPEG, PNG, GIF, WebP (max 5MB)
          </p>
          {error && (
            <p className="text-xs text-red-600 font-medium">{error}</p>
          )}
          {preview && !error && (
            <p className="text-xs text-green-600 font-medium">✓ Image uploaded successfully</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImageUpload;