import {
  Controller,
  Post,
  Delete,
  Param,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StorageService } from './storage.service';

@ApiTags('Storage & Uploads')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max limit (supports both photos and video clips)
    }),
  )
  @ApiOperation({ summary: 'Upload single product photo or video' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }
    return this.storageService.saveFile(file);
  }

  @Post('upload-multiple')
  @UseInterceptors(
    FilesInterceptor('files', 12, {
      limits: { fileSize: 50 * 1024 * 1024 }, // Up to 12 files, 50 MB each
    }),
  )
  @ApiOperation({ summary: 'Upload multiple product photos and videos in one batch' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: {
            type: 'string',
            format: 'binary',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Batch files uploaded successfully' })
  async uploadMultipleFiles(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files were provided');
    }
    return this.storageService.saveMultipleFiles(files);
  }

  @Delete(':filename')
  @ApiOperation({ summary: 'Delete file from storage' })
  async deleteFile(@Param('filename') filename: string) {
    const success = await this.storageService.deleteFile(filename);
    return { success, filename };
  }
}
