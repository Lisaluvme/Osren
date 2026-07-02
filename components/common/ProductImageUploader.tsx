/**
 * Product Image Uploader Component
 * Reusable component for product image upload and management
 */

import React, { useState, useCallback, useRef } from 'react';
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle } from 'lucide-react';
import { productApiService } from '../../services/api/productApi';

interface ProductImageUploaderProps {
  productId: string;
  productName: string;
  currentImageUrl?: string;
  hasImage: boolean;
  onImageChange: (imageUrl: string | null) => void;
  readonly?: boolean;
  showLabel?: boolean;
}

const ProductImageUploader: React.FC<ProductImageUploaderProps> = ({
  productId,
  productName,
  currentImageUrl,
  hasImage,
  onImageChange,
  readonly = false,
  showLabel = true
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const validation = productApiService.validateImageFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      // Create preview
      const preview = await productApiService.getImagePreviewUrl(file);
      setPreviewUrl(preview);

      // Upload image
      const result = await productApiService.uploadProductImage(productId, file);
      onImageChange(result.data.imageUrl);
      setPreviewUrl(null);
    } catch (err: any) {
      setError(err.message || 'Failed to upload image');
      setPreviewUrl(null);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [productId, onImageChange]);

  const handleDeleteImage = async () => {
    setUploading(true);
    setError('');

    try {
      await productApiService.deleteProductImage(productId);
      onImageChange(null);
    } catch (err: any) {
      setError(err.message || 'Failed to delete image');
    } finally {
      setUploading(false);
    }
  };

  const handleImageClick = () => {
    if (!readonly && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const displayImageUrl = previewUrl || (currentImageUrl ? productApiService.getImageUrl(currentImageUrl) : null);

  return (
    <div className="flex items-center space-x-4">
      {/* Image Preview/Display */}
      <div
        className={`relative w-20 h-20 rounded-lg overflow-hidden bg-slate-100 border-2 border-slate-200 ${
          !readonly ? 'cursor-pointer hover:border-blue-400 transition-colors' : ''
        }`}
        onClick={handleImageClick}
        title={readonly ? 'Product image' : (hasImage ? 'Click to change image' : 'Click to upload image')}
      >
        {displayImageUrl ? (
          <img
            src={displayImageUrl}
            alt={productName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-slate-300" />
          </div>
        )}
        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </div>

      {/* Upload/Delete Controls */}
      <div className="flex-1">
        {!readonly ? (
          <div className="space-y-2">
            {showLabel && (
              <label className="text-sm font-medium text-slate-700">
                Product Image
              </label>
            )}

            <div className="flex gap-2">
              <label className="flex items-center px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 cursor-pointer transition-colors">
                <Upload className="w-4 h-4 mr-2" />
                {hasImage ? 'Change' : 'Upload'}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={uploading}
                />
              </label>

              {hasImage && !uploading && (
                <button
                  onClick={handleDeleteImage}
                  className="flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-colors"
                  disabled={uploading}
                >
                  <X className="w-4 h-4 mr-2" />
                  Remove
                </button>
              )}
            </div>

            <p className="text-xs text-slate-400">
              JPEG, PNG, GIF, WEBP (max 5MB)
            </p>
          </div>
        ) : (
          <div>
            {showLabel && (
              <p className="text-sm font-medium text-slate-700 mb-1">Product Image</p>
            )}
            <p className="text-sm text-slate-500">
              {hasImage ? 'Image uploaded' : 'No image'}
            </p>
          </div>
        )}

        {error && (
          <div className="flex items-center text-red-600 text-xs mt-2">
            <AlertCircle className="w-3 h-3 mr-1" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductImageUploader;