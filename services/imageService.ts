const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

interface ImageUploadResponse {
  success: boolean;
  message?: string;
  data?: {
    fileId: string;
    imageUrl: string;
    item: any;
  };
  error?: string;
}

interface ImageUrlResponse {
  success: boolean;
  data?: {
    imageUrl: string;
    imageFileId: string;
  };
  error?: string;
}

interface ImageDeleteResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

export const imageService = {
  // Upload image for inventory item
  async uploadImage(itemId: string, file: File): Promise<ImageUploadResponse> {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await fetch(`${API_BASE}/images/upload/${itemId}`, {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error uploading image:', error);
      return { success: false, error: 'Failed to upload image' };
    }
  },

  // Get image URL for item
  async getImageUrl(itemId: string): Promise<ImageUrlResponse> {
    try {
      const response = await fetch(`${API_BASE}/images/url/${itemId}`);
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error getting image URL:', error);
      return { success: false, error: 'Failed to get image URL' };
    }
  },

  // Delete image from item
  async deleteImage(itemId: string): Promise<ImageDeleteResponse> {
    try {
      const response = await fetch(`${API_BASE}/images/delete/${itemId}`, {
        method: 'DELETE',
      });
      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error deleting image:', error);
      return { success: false, error: 'Failed to delete image' };
    }
  },
};

export default imageService;