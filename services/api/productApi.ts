/**
 * Product API Service
 * Handles product image upload, deletion, and retrieval
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export interface ProductImageUploadResponse {
  success: boolean;
  data: {
    imageUrl: string;
    product: {
      id: string;
      name: string;
      image_url: string;
      has_image: boolean;
    };
  };
}

export interface ProductImageDeleteResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    name: string;
    has_image: boolean;
  };
}

export interface ProductResponse {
  success: boolean;
  data: any;
}

class ProductApiService {
  /**
   * Upload product image
   */
  async uploadProductImage(productId: string, file: File): Promise<ProductImageUploadResponse> {
    const formData = new FormData();
    formData.append('image', file);

    const response = await fetch(`${API_BASE_URL}/products/${productId}/image`, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type header when sending FormData - browser sets it with boundary
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  }

  /**
   * Delete product image
   */
  async deleteProductImage(productId: string): Promise<ProductImageDeleteResponse> {
    const response = await fetch(`${API_BASE_URL}/products/${productId}/image`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  }

  /**
   * Get product with image
   */
  async getProductWithImage(productId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/products/${productId}`, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }

    return data.data;
  }

  /**
   * Get full image URL from relative path
   */
  getImageUrl(imagePath: string): string {
    if (!imagePath) return '';
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    // Otherwise, prepend the API base URL
    return `${API_BASE_URL}${imagePath}`;
  }

  /**
   * Validate image file
   */
  validateImageFile(file: File): { valid: boolean; error?: string } {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: 'Only image files (JPEG, PNG, GIF, WEBP) are allowed'
      };
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return {
        valid: false,
        error: 'File size must be less than 5MB'
      };
    }

    return { valid: true };
  }

  /**
   * Get image preview URL
   */
  getImagePreviewUrl(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

export const productApiService = new ProductApiService();