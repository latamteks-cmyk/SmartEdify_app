import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as crypto from 'crypto';

export interface UploadResult {
  s3Key: string;
  s3Bucket: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  fileHash: string;
  isEncrypted: boolean;
  encryptionMetadata?: Record<string, any>;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly encryptionEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.s3Client = new S3Client({
      region: this.configService.get<string>('s3.region'),
      credentials: {
        accessKeyId: this.configService.get<string>('s3.accessKeyId'),
        secretAccessKey: this.configService.get<string>('s3.secretAccessKey'),
      },
    });

    this.bucket = this.configService.get<string>('s3.bucket');
    this.encryptionEnabled = this.configService.get<boolean>('s3.encryption.enabled', true);
  }

  async uploadFile(
    buffer: Buffer,
    fileName: string,
    mimeType: string,
    tenantId: string,
    metadata?: Record<string, any>,
  ): Promise<UploadResult> {
    // Generate unique key
    const timestamp = Date.now();
    const randomId = crypto.randomUUID();
    const s3Key = `${tenantId}/documents/${timestamp}-${randomId}-${fileName}`;

    // Calculate file hash
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

    let uploadBuffer = buffer;
    let encryptionMetadata: Record<string, any> | undefined;

    // Encrypt if enabled
    if (this.encryptionEnabled) {
      const encryptionResult = this.encryptBuffer(buffer);
      uploadBuffer = encryptionResult.encryptedBuffer;
      encryptionMetadata = encryptionResult.metadata;
    }

    // Prepare upload parameters
    const uploadParams = {
      Bucket: this.bucket,
      Key: s3Key,
      Body: uploadBuffer,
      ContentType: mimeType,
      Metadata: {
        'original-filename': fileName,
        'tenant-id': tenantId,
        'file-hash': fileHash,
        'upload-timestamp': timestamp.toString(),
        ...metadata,
      },
    };

    // Add server-side encryption if configured
    const encryptionConfig = this.configService.get('s3.encryption');
    if (encryptionConfig.enabled) {
      if (encryptionConfig.kmsKeyId) {
        uploadParams['ServerSideEncryption'] = 'aws:kms';
        uploadParams['SSEKMSKeyId'] = encryptionConfig.kmsKeyId;
      } else {
        uploadParams['ServerSideEncryption'] = encryptionConfig.algorithm || 'AES256';
      }
    }

    try {
      const command = new PutObjectCommand(uploadParams);
      await this.s3Client.send(command);

      this.logger.log(`File uploaded successfully: ${s3Key}`);

      return {
        s3Key,
        s3Bucket: this.bucket,
        fileName,
        fileSize: buffer.length,
        mimeType,
        fileHash,
        isEncrypted: this.encryptionEnabled,
        encryptionMetadata,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  async getPresignedUrl(s3Key: string, s3Bucket?: string, expiresIn?: number): Promise<string> {
    const bucket = s3Bucket || this.bucket;
    const expires = expiresIn || this.configService.get<number>('s3.presignedUrl.expiresIn', 3600);

    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: s3Key,
      });

      const url = await getSignedUrl(this.s3Client, command, { expiresIn: expires });
      return url;
    } catch (error) {
      this.logger.error(`Failed to generate presigned URL: ${error.message}`, error.stack);
      throw new Error(`Failed to generate download URL: ${error.message}`);
    }
  }

  async downloadFile(s3Key: string, s3Bucket?: string): Promise<Buffer> {
    const bucket = s3Bucket || this.bucket;

    try {
      const command = new GetObjectCommand({
        Bucket: bucket,
        Key: s3Key,
      });

      const response = await this.s3Client.send(command);
      const chunks: Uint8Array[] = [];

      for await (const chunk of response.Body as any) {
        chunks.push(chunk);
      }

      let buffer = Buffer.concat(chunks);

      // Decrypt if needed
      if (this.encryptionEnabled && response.Metadata?.['encryption-key']) {
        buffer = this.decryptBuffer(buffer, {
          key: response.Metadata['encryption-key'],
          iv: response.Metadata['encryption-iv'],
        });
      }

      return buffer;
    } catch (error) {
      this.logger.error(`Failed to download file: ${error.message}`, error.stack);
      throw new Error(`File download failed: ${error.message}`);
    }
  }

  async deleteFile(s3Key: string, s3Bucket?: string): Promise<void> {
    const bucket = s3Bucket || this.bucket;

    try {
      const command = new DeleteObjectCommand({
        Bucket: bucket,
        Key: s3Key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted successfully: ${s3Key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file: ${error.message}`, error.stack);
      throw new Error(`File deletion failed: ${error.message}`);
    }
  }

  async validateFile(buffer: Buffer, fileName: string, mimeType: string): Promise<boolean> {
    const maxFileSize = this.configService.get<number>('s3.upload.maxFileSize');
    const allowedMimeTypes = this.configService.get<string[]>('s3.upload.allowedMimeTypes');

    // Check file size
    if (buffer.length > maxFileSize) {
      throw new Error(`File size exceeds maximum allowed size of ${maxFileSize} bytes`);
    }

    // Check MIME type
    if (!allowedMimeTypes.includes(mimeType)) {
      throw new Error(`File type ${mimeType} is not allowed`);
    }

    // Additional security checks could be added here
    // - Virus scanning
    // - Content validation
    // - File signature verification

    return true;
  }

  private encryptBuffer(buffer: Buffer): { encryptedBuffer: Buffer; metadata: Record<string, any> } {
    const algorithm = 'aes-256-gcm';
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipher(algorithm, key);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      encryptedBuffer: encrypted,
      metadata: {
        algorithm,
        key: key.toString('base64'),
        iv: iv.toString('base64'),
        authTag: authTag.toString('base64'),
      },
    };
  }

  private decryptBuffer(encryptedBuffer: Buffer, metadata: { key: string; iv: string; authTag?: string }): Buffer {
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(metadata.key, 'base64');
    const iv = Buffer.from(metadata.iv, 'base64');

    const decipher = crypto.createDecipher(algorithm, key);
    
    if (metadata.authTag) {
      decipher.setAuthTag(Buffer.from(metadata.authTag, 'base64'));
    }

    const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);
    return decrypted;
  }
}