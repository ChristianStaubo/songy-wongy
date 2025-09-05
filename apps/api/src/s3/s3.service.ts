import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  _Object,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';

@Injectable()
export class S3Service {
  private readonly s3Client: S3Client;
  private readonly logger = new Logger(S3Service.name);

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_S3_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );

    if (!region || !accessKeyId || !secretAccessKey) {
      this.logger.error(
        'AWS S3 configuration is incomplete. Check AWS_S3_REGION, AWS_ACCESS_KEY_ID, and AWS_SECRET_ACCESS_KEY.',
      );
      throw new InternalServerErrorException(
        'AWS S3 configuration is incomplete.',
      );
    }

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      // forcePathStyle: true, // Uncomment if you use MinIO or similar local S3-compatible storage
    });
  }

  async getPresignedUploadUrl(
    bucket: string,
    key: string,
    contentType: string,
    expiresIn = 3600, // Default to 1 hour
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType,
    });
    try {
      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });
      this.logger.log(`Generated presigned URL for ${bucket}/${key}`);
      return signedUrl;
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned URL for ${bucket}/${key}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Could not generate presigned S3 URL.',
      );
    }
  }

  async getPresignedDownloadUrl(
    bucket: string,
    key: string,
    expiresIn = 3600, // Default to 1 hour
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    try {
      const signedUrl = await getSignedUrl(this.s3Client, command, {
        expiresIn,
      });
      this.logger.log(`Generated presigned download URL for ${bucket}/${key}`);
      return signedUrl;
    } catch (error) {
      this.logger.error(
        `Failed to generate presigned download URL for ${bucket}/${key}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Could not generate presigned S3 download URL.',
      );
    }
  }

  async deleteObject(bucket: string, key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    });
    try {
      await this.s3Client.send(command);
      this.logger.log(`Successfully deleted object ${bucket}/${key} from S3.`);
    } catch (error) {
      this.logger.error(
        `Failed to delete object ${bucket}/${key} from S3: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException(
        'Could not delete object from S3.',
      );
    }
  }

  async listObjects(bucket: string, prefix: string): Promise<_Object[]> {
    const command = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
    });
    try {
      const response = await this.s3Client.send(command);
      const objects = response.Contents || [];
      this.logger.log(
        `Found ${objects.length} objects in ${bucket} with prefix ${prefix}`,
      );
      return objects;
    } catch (error) {
      this.logger.error(
        `Failed to list objects in ${bucket} with prefix ${prefix}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Could not list objects from S3.');
    }
  }

  /**
   * Upload a buffer or stream directly to S3
   */
  async uploadBuffer(
    bucket: string,
    key: string,
    buffer: Buffer,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      Metadata: metadata,
    });

    try {
      await this.s3Client.send(command);
      const s3Url = `https://${bucket}.s3.${this.configService.get('AWS_S3_REGION')}.amazonaws.com/${key}`;
      this.logger.log(`Successfully uploaded buffer to S3: ${s3Url}`);
      return s3Url;
    } catch (error) {
      this.logger.error(
        `Failed to upload buffer to S3 ${bucket}/${key}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Could not upload file to S3.');
    }
  }

  /**
   * Upload a stream to S3 (converts to buffer first for reliability)
   */
  async uploadStream(
    bucket: string,
    key: string,
    stream: Readable,
    contentType: string,
    metadata?: Record<string, string>,
  ): Promise<string> {
    try {
      // Convert stream to buffer first to avoid AWS SDK stream issues
      const buffer = await this.streamToBuffer(stream);

      // Use the existing uploadBuffer method
      return await this.uploadBuffer(
        bucket,
        key,
        buffer,
        contentType,
        metadata,
      );
    } catch (error) {
      this.logger.error(
        `Failed to upload stream to S3 ${bucket}/${key}: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('Could not upload file to S3.');
    }
  }

  /**
   * Convert a readable stream to buffer (utility method)
   */
  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];

    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }
}
