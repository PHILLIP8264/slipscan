import * as FileSystem from 'expo-file-system';

/**
 * Image Manager Utility
 * Handles permanent storage of receipt images in the app's document directory
 */

class ImageManager {
  private static instance: ImageManager;
  private receiptsDir: string;

  private constructor() {
    // Create receipts directory path - FileSystem.documentDirectory is available at runtime
    this.receiptsDir = `${(FileSystem as any).documentDirectory}receipts/`;
  }

  public static getInstance(): ImageManager {
    if (!ImageManager.instance) {
      ImageManager.instance = new ImageManager();
    }
    return ImageManager.instance;
  }

  /**
   * Initialize the receipts directory
   */
  async initialize(): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(this.receiptsDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.receiptsDir, { 
          intermediates: true 
        });
        console.log('✅ Created receipts directory:', this.receiptsDir);
      }
    } catch (error) {
      console.error('❌ Failed to initialize receipts directory:', error);
      throw error;
    }
  }

  /**
   * Save a temporary image to permanent storage
   * @param tempImageUri - The temporary image URI (from camera or document scanner)
   * @param receiptId - Optional receipt ID for filename generation
   * @param merchantName - Optional merchant name for filename generation
   * @returns Promise<string> - The permanent file path
   */
  async saveReceiptImage(
    tempImageUri: string, 
    receiptId?: string,
    merchantName?: string
  ): Promise<string> {
    try {
      // Ensure directory exists
      await this.initialize();

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const merchantPart = merchantName ? 
        merchantName.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20) : 'receipt';
      const receiptPart = receiptId || `temp_${Date.now()}`;
      
      // Get file extension from temp URI
      const extension = this.getFileExtension(tempImageUri) || 'jpg';
      
      const filename = `${merchantPart}_${timestamp}_${receiptPart}.${extension}`;
      const permanentPath = `${this.receiptsDir}${filename}`;

      console.log('💾 Saving receipt image...');
      console.log('📁 From:', tempImageUri);
      console.log('📁 To:', permanentPath);

      // Copy the temporary image to permanent storage
      await FileSystem.copyAsync({
        from: tempImageUri,
        to: permanentPath
      });

      console.log('✅ Receipt image saved successfully:', filename);
      return permanentPath;

    } catch (error) {
      console.error('❌ Failed to save receipt image:', error);
      throw new Error(`Failed to save receipt image: ${error}`);
    }
  }

  /**
   * Get the file extension from a URI
   */
  private getFileExtension(uri: string): string | null {
    const match = uri.match(/\.([^./?#]+)(?:\?|#|$)/);
    return match ? match[1].toLowerCase() : null;
  }

  /**
   * Check if an image file exists
   */
  async imageExists(imagePath: string): Promise<boolean> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(imagePath);
      return fileInfo.exists;
    } catch (error) {
      console.error('Error checking image existence:', error);
      return false;
    }
  }

  /**
   * Delete a receipt image
   */
  async deleteReceiptImage(imagePath: string): Promise<boolean> {
    try {
      const exists = await this.imageExists(imagePath);
      if (exists) {
        await FileSystem.deleteAsync(imagePath);
        console.log('🗑️ Deleted receipt image:', imagePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Failed to delete receipt image:', error);
      return false;
    }
  }

  /**
   * Get the receipts directory path
   */
  getReceiptsDirectory(): string {
    return this.receiptsDir;
  }

  /**
   * List all receipt images
   */
  async listReceiptImages(): Promise<string[]> {
    try {
      await this.initialize();
      const files = await FileSystem.readDirectoryAsync(this.receiptsDir);
      return files.filter(file => 
        file.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/)
      );
    } catch (error) {
      console.error('❌ Failed to list receipt images:', error);
      return [];
    }
  }

  /**
   * Get image info (size, modification date, etc.)
   */
  async getImageInfo(imagePath: string): Promise<FileSystem.FileInfo | null> {
    try {
      return await FileSystem.getInfoAsync(imagePath);
    } catch (error) {
      console.error('❌ Failed to get image info:', error);
      return null;
    }
  }

  /**
   * Clean up old images (older than specified days)
   */
  async cleanupOldImages(olderThanDays: number = 90): Promise<number> {
    try {
      const images = await this.listReceiptImages();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
      
      let deletedCount = 0;
      
      for (const imageFile of images) {
        const imagePath = `${this.receiptsDir}${imageFile}`;
        const info = await this.getImageInfo(imagePath);
        
        if (info && info.modificationTime && info.modificationTime < cutoffDate.getTime()) {
          const deleted = await this.deleteReceiptImage(imagePath);
          if (deleted) deletedCount++;
        }
      }
      
      console.log(`🧹 Cleaned up ${deletedCount} old receipt images`);
      return deletedCount;
      
    } catch (error) {
      console.error('❌ Failed to cleanup old images:', error);
      return 0;
    }
  }
}

export default ImageManager.getInstance();