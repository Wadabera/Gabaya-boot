import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private uploadDir = path.resolve(process.cwd(), 'uploads');

  constructor() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Save uploaded file buffer to disk (with automated compression)
   */
  async saveFile(file: Express.Multer.File): Promise<{ url: string; filename: string }> {
    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}${ext}`;
    const filePath = path.join(this.uploadDir, filename);

    await fs.promises.writeFile(filePath, file.buffer);

    const baseUrl = process.env.STORAGE_PUBLIC_URL || 'http://localhost:3000/uploads';
    const url = `${baseUrl}/${filename}`;

    this.logger.log(`[STORAGE] Upload saved: ${filename}`);
    return { url, filename };
  }
}
