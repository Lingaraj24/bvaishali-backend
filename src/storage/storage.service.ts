import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// Only these content types are allowed for upload
const ALLOWED_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/gif',
]);

// Only these folder names are allowed — prevents path traversal
const ALLOWED_FOLDERS = new Set([
  'products',
  'banners',
  'campaigns',
  'avatars',
  'misc',
]);

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private configService: ConfigService) {
    const accountId = this.configService.get<string>('R2_ACCOUNT_ID');
    const accessKeyId = this.configService.get<string>('R2_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>('R2_SECRET_ACCESS_KEY');

    this.bucketName = this.configService.get<string>('R2_BUCKET_NAME')!;

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId!,
        secretAccessKey: secretAccessKey!,
      },
    });
  }

  async getPresignedPutUrl(
    fileName: string,
    contentType: string,
    folder: string = 'products',
  ) {
    // Validate content type against whitelist
    if (!ALLOWED_CONTENT_TYPES.has(contentType.toLowerCase())) {
      throw new BadRequestException(
        `Content type "${contentType}" is not allowed. Allowed: ${[...ALLOWED_CONTENT_TYPES].join(', ')}`,
      );
    }

    // Validate folder against whitelist — prevents path traversal
    if (!ALLOWED_FOLDERS.has(folder)) {
      throw new BadRequestException(
        `Folder "${folder}" is not allowed. Allowed: ${[...ALLOWED_FOLDERS].join(', ')}`,
      );
    }

    // Extract only the extension from the original filename — strip any path components
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const extension = safeName.split('.').pop()?.toLowerCase();
    const key = `${folder}/${uuidv4()}${extension ? `.${extension}` : ''}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: contentType,
    });

    // URL expires in 15 minutes
    const signedUrl = await getSignedUrl(this.s3Client, command, { expiresIn: 900 });

    return {
      signedUrl,
      key,
      publicUrl: `${this.configService.get('R2_PUBLIC_URL')}/${key}`,
    };
  }
}
