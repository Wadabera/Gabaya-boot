import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

export interface UploadedMediaResult {
  url: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  type: 'IMAGE' | 'VIDEO';
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private uploadDir = path.resolve(process.cwd(), 'uploads');

  private readonly allowedImageExts = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg']);
  private readonly allowedVideoExts = new Set(['.mp4', '.webm', '.ogg', '.mov', '.mkv']);

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Optional Cloudinary CDN upload with signed HMAC/SHA1
   */
  private async uploadToCloudinary(
    file: Express.Multer.File,
    isVideo: boolean,
  ): Promise<UploadedMediaResult | null> {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return null;
    }

    try {
      const timestamp = Math.round(Date.now() / 1000);
      const resourceType = isVideo ? 'video' : 'image';

      const crypto = await import('crypto');
      const signatureString = `folder=gebeya_boot&timestamp=${timestamp}${apiSecret}`;
      const signature = crypto.createHash('sha1').update(signatureString).digest('hex');

      const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

      const res = await axios.post(
        `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
        {
          file: dataUri,
          api_key: apiKey,
          timestamp,
          signature,
          folder: 'gebeya_boot',
        },
      );

      this.logger.log(`[STORAGE] Uploaded to Cloudinary CDN: ${res.data.secure_url}`);
      return {
        url: res.data.secure_url,
        filename: res.data.public_id,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        type: isVideo ? 'VIDEO' : 'IMAGE',
      };
    } catch (err: any) {
      this.logger.warn(`[STORAGE] Cloudinary upload failed (${err.message}). Falling back to local storage.`);
      return null;
    }
  }

  /**
   * Save uploaded file buffer to disk (or Cloudinary if configured) and classify as IMAGE or VIDEO
   */
  async saveFile(file: Express.Multer.File): Promise<UploadedMediaResult> {
    const rawExt = path.extname(file.originalname).toLowerCase();
    const isVideo =
      file.mimetype.startsWith('video/') ||
      this.allowedVideoExts.has(rawExt);
    const isImage =
      file.mimetype.startsWith('image/') ||
      this.allowedImageExts.has(rawExt);

    if (!isVideo && !isImage) {
      throw new BadRequestException(
        `Unsupported media format (${rawExt || file.mimetype}). Please upload an image (.jpg, .png, .webp) or video (.mp4, .webm).`,
      );
    }

    // Try Cloudinary first if configured
    if (process.env.STORAGE_ADAPTER === 'cloudinary' || process.env.CLOUDINARY_CLOUD_NAME) {
      const cloudResult = await this.uploadToCloudinary(file, isVideo);
      if (cloudResult) {
        return cloudResult;
      }
    }

    // Local file storage
    const ext = rawExt || (isVideo ? '.mp4' : '.jpg');
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
    const filePath = path.join(this.uploadDir, filename);

    await fs.promises.writeFile(filePath, file.buffer);

    const baseUrl = process.env.STORAGE_PUBLIC_URL || 'http://localhost:3000/uploads';
    const url = `${baseUrl}/${filename}`;

    const mediaType: 'IMAGE' | 'VIDEO' = isVideo ? 'VIDEO' : 'IMAGE';

    this.logger.log(`[STORAGE] Local upload saved: ${filename} (${mediaType}, ${file.size} bytes)`);

    return {
      url,
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      type: mediaType,
    };
  }

  /**
   * Save multiple uploaded files concurrently
   */
  async saveMultipleFiles(files: Express.Multer.File[]): Promise<UploadedMediaResult[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files were provided for upload');
    }
    return Promise.all(files.map((file) => this.saveFile(file)));
  }

  /**
   * Delete file from uploads directory
   */
  async deleteFile(filename: string): Promise<boolean> {
    try {
      const safeName = path.basename(filename);
      const filePath = path.join(this.uploadDir, safeName);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
        this.logger.log(`[STORAGE] Deleted file: ${safeName}`);
        return true;
      }
      return false;
    } catch (err: any) {
      this.logger.warn(`[STORAGE] Could not delete file: ${err.message}`);
      return false;
    }
  }
}
