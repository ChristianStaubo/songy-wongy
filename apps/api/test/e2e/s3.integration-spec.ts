import { S3Service } from '../../src/s3/s3.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Helper to check AWS credentials availability
const hasAwsCredentials = () => {
  const awsVars = [
    'AWS_S3_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_S3_MUSIC_BUCKET',
  ];
  return awsVars.every((varName) => process.env[varName]);
};

// Conditionally run S3 tests only if AWS credentials are available
const describeS3 = hasAwsCredentials() ? describe : describe.skip;

describeS3('S3Service E2E Tests', () => {
  let s3Service: S3Service;
  let testBucket: string;
  const testObjects: string[] = [];

  beforeAll(() => {
    // Arrange: Get services from shared test app
    s3Service = global.testApp.get<S3Service>(S3Service);
    const configService = global.testApp.get<ConfigService>(ConfigService);
    testBucket = configService.get<string>('AWS_S3_MUSIC_BUCKET');
  });

  afterAll(async () => {
    // Cleanup: Remove all test objects
    for (const key of testObjects) {
      try {
        await s3Service.deleteObject(testBucket, key);
      } catch (error) {
        console.warn(`Failed to cleanup ${key}:`, error.message);
      }
    }
  });

  describe('Presigned URLs', () => {
    it('should generate valid upload URL', async () => {
      // Arrange
      const testKey = `test-uploads/${crypto.randomUUID()}.txt`;
      const contentType = 'text/plain';
      testObjects.push(testKey);

      // Act
      const presignedUrl = await s3Service.getPresignedUploadUrl(
        testBucket,
        testKey,
        contentType,
        300,
      );

      // Assert
      expect(presignedUrl).toBeTruthy();
      expect(presignedUrl).toContain(testBucket);
      expect(presignedUrl).toContain(testKey);
      expect(presignedUrl).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
    });

    it('should generate valid download URL and fetch content', async () => {
      // Arrange
      const testKey = `test-downloads/${crypto.randomUUID()}.txt`;
      const testContent = 'Download test content';
      testObjects.push(testKey);

      await s3Service.uploadBuffer(
        testBucket,
        testKey,
        Buffer.from(testContent),
        'text/plain',
      );

      // Act
      const downloadUrl = await s3Service.getPresignedDownloadUrl(
        testBucket,
        testKey,
      );
      const response = await fetch(downloadUrl);
      const downloadedContent = await response.text();

      // Assert
      expect(downloadUrl).toContain(testBucket);
      expect(downloadUrl).toContain(testKey);
      expect(response.ok).toBe(true);
      expect(downloadedContent).toBe(testContent);
    });
  });

  describe('Direct Uploads', () => {
    it('should upload buffer with metadata', async () => {
      // Arrange
      const testKey = `test-buffer/${crypto.randomUUID()}.txt`;
      const testContent = 'Buffer upload test';
      const metadata = {
        testType: 'buffer',
        timestamp: new Date().toISOString(),
      };
      testObjects.push(testKey);

      // Act
      const s3Url = await s3Service.uploadBuffer(
        testBucket,
        testKey,
        Buffer.from(testContent),
        'text/plain',
        metadata,
      );

      // Assert
      expect(s3Url).toContain(testBucket);
      expect(s3Url).toContain(testKey);

      // Verify content by downloading
      const downloadUrl = await s3Service.getPresignedDownloadUrl(
        testBucket,
        testKey,
      );
      const response = await fetch(downloadUrl);
      const downloadedContent = await response.text();
      expect(downloadedContent).toBe(testContent);
    });

    it('should upload stream successfully', async () => {
      // Arrange
      const testKey = `test-stream/${crypto.randomUUID()}.txt`;
      const testContent = 'Stream upload test\nMultiple lines\nTest data';
      const { Readable } = await import('stream');
      const testStream = Readable.from([testContent]);
      testObjects.push(testKey);

      // Act
      const s3Url = await s3Service.uploadStream(
        testBucket,
        testKey,
        testStream,
        'text/plain',
        { testType: 'stream' },
      );

      // Assert
      expect(s3Url).toContain(testBucket);
      expect(s3Url).toContain(testKey);

      // Verify content
      const downloadUrl = await s3Service.getPresignedDownloadUrl(
        testBucket,
        testKey,
      );
      const response = await fetch(downloadUrl);
      const downloadedContent = await response.text();
      expect(downloadedContent).toBe(testContent);
    });
  });

  describe('Object Management', () => {
    it('should list objects with prefix', async () => {
      // Arrange
      const testPrefix = `test-list/${crypto.randomUUID()}`;
      const testFiles = ['file1.txt', 'file2.txt', 'folder/file3.txt'];

      // Upload test files
      for (const fileName of testFiles) {
        const key = `${testPrefix}/${fileName}`;
        testObjects.push(key);
        await s3Service.uploadBuffer(
          testBucket,
          key,
          Buffer.from(`Content of ${fileName}`),
          'text/plain',
        );
      }

      // Act
      const objects = await s3Service.listObjects(testBucket, testPrefix);

      // Assert
      expect(objects).toHaveLength(testFiles.length);
      const listedKeys = objects.map((obj) => obj.Key);
      testFiles.forEach((fileName) => {
        expect(listedKeys).toContain(`${testPrefix}/${fileName}`);
      });
    });

    it('should delete object successfully', async () => {
      // Arrange
      const testKey = `test-delete/${crypto.randomUUID()}.txt`;
      await s3Service.uploadBuffer(
        testBucket,
        testKey,
        Buffer.from('Delete me'),
        'text/plain',
      );

      // Verify file exists
      const downloadUrl = await s3Service.getPresignedDownloadUrl(
        testBucket,
        testKey,
      );
      const response = await fetch(downloadUrl);
      expect(response.ok).toBe(true);

      // Act
      await s3Service.deleteObject(testBucket, testKey);

      // Assert
      const downloadUrlAfterDelete = await s3Service.getPresignedDownloadUrl(
        testBucket,
        testKey,
      );
      const responseAfterDelete = await fetch(downloadUrlAfterDelete);
      expect(responseAfterDelete.ok).toBe(false);
      expect(responseAfterDelete.status).toBe(404);
    });
  });

  describe('Music Generation Workflow', () => {
    it('should handle complete music upload workflow', async () => {
      // Arrange
      const musicId = crypto.randomUUID();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const musicName = 'Test Song';
      const sanitizedName = musicName.replace(/[^a-zA-Z0-9-_]/g, '_');
      const testKey = `music/${timestamp}_${sanitizedName}.mp3`;
      const fakeAudioData = Buffer.alloc(1024 * 10); // 10KB fake audio
      fakeAudioData.fill('A');

      const metadata = {
        musicId,
        name: musicName,
        prompt: 'Test music generation',
        outputFormat: 'mp3_44100_128',
        modelId: 'music_v1',
        generatedAt: new Date().toISOString(),
      };
      testObjects.push(testKey);

      // Act
      const s3Url = await s3Service.uploadBuffer(
        testBucket,
        testKey,
        fakeAudioData,
        'audio/mpeg',
        metadata,
      );

      const downloadUrl = await s3Service.getPresignedDownloadUrl(
        testBucket,
        testKey,
      );
      const response = await fetch(downloadUrl);

      // Assert
      expect(s3Url).toContain(testBucket);
      expect(s3Url).toContain(testKey);
      expect(downloadUrl).toBeTruthy();
      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toBe('audio/mpeg');

      const downloadedBuffer = await response.arrayBuffer();
      expect(downloadedBuffer.byteLength).toBe(fakeAudioData.length);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle non-existent object download', async () => {
      // Arrange
      const nonExistentKey = `non-existent/${crypto.randomUUID()}.txt`;

      // Act
      const downloadUrl = await s3Service.getPresignedDownloadUrl(
        testBucket,
        nonExistentKey,
      );
      const response = await fetch(downloadUrl);

      // Assert
      expect(downloadUrl).toBeTruthy();
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);
    });

    it('should generate URL for invalid bucket (error on use)', async () => {
      // Arrange
      const invalidBucket = 'this-bucket-does-not-exist-12345';
      const testKey = 'test.txt';

      // Act
      const presignedUrl = await s3Service.getPresignedUploadUrl(
        invalidBucket,
        testKey,
        'text/plain',
      );

      // Assert
      expect(presignedUrl).toBeTruthy();
      expect(presignedUrl).toContain(invalidBucket);
      // Note: AWS generates URLs for non-existent buckets; error occurs on actual use
    });
  });
});
