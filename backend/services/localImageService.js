const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class LocalImageService {
  constructor() {
    this.uploadDir = path.join(__dirname, '../public/images');
    this.baseUrl = process.env.BASE_URL || 'http://localhost:5000';

    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  // Save image locally and return URL
  async saveImage(buffer, originalName, itemId) {
    try {
      // Generate unique filename
      const ext = path.extname(originalName);
      const filename = `${itemId}_${uuidv4()}${ext}`;
      const filepath = path.join(this.uploadDir, filename);

      // Write file to disk
      fs.writeFileSync(filepath, buffer);

      // Generate URL
      const imageUrl = `${this.baseUrl}/images/${filename}`;

      return {
        success: true,
        filename: filename,
        imageUrl: imageUrl,
        filepath: filepath
      };
    } catch (error) {
      console.error('Error saving image locally:', error);
      throw error;
    }
  }

  // Delete local image file
  async deleteImage(filename) {
    try {
      const filepath = path.join(this.uploadDir, filename);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
        return { success: true, message: 'Image deleted successfully' };
      }
      return { success: true, message: 'File not found, but no error' };
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }

  // Get image URL from filename
  getImageUrl(filename) {
    if (!filename) return '';
    return `${this.baseUrl}/images/${filename}`;
  }
}

module.exports = new LocalImageService();