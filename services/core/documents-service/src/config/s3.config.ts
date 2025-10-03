import { registerAs } from '@nestjs/config';

export default registerAs('s3', () => ({
  region: process.env.AWS_REGION || 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  bucket: process.env.S3_BUCKET || 'smartedify-documents',
  
  // Encryption
  encryption: {
    enabled: process.env.S3_ENCRYPTION_ENABLED === 'true',
    kmsKeyId: process.env.S3_KMS_KEY_ID,
    algorithm: process.env.S3_ENCRYPTION_ALGORITHM || 'AES256',
  },
  
  // Upload settings
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 50 * 1024 * 1024, // 50MB
    allowedMimeTypes: process.env.ALLOWED_MIME_TYPES?.split(',') || [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
  },
  
  // Presigned URLs
  presignedUrl: {
    expiresIn: parseInt(process.env.PRESIGNED_URL_EXPIRES, 10) || 3600, // 1 hour
  },
}));