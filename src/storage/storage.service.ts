import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

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

  /**
   * Generates a presigned URL for uploading a file directly to R2.
   * @param fileName Optional original filename to derive extension
   * @param contentType MIME type of the file
   * @param folder Destination folder (e.g. 'products', 'banners')
   */
  async getPresignedPutUrl(
    fileName: string,
    contentType: string,
    folder: string = 'uploads',
  ) {
    const extension = fileName.split('.').pop();
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
