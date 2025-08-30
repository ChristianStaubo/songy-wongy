import { S3Service } from '../src/s3/s3.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

// Helper function to check if AWS credentials are available
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

describeS3('S3Service Integration Tests', () => {
  let s3Service: S3Service;
  let configService: ConfigService;
  let testBucket: string;
  const testObjects: string[] = []; // Track objects for cleanup

  beforeAll(() => {
    s3Service = global.testApp.get<S3Service>(S3Service);
    configService = global.testApp.get<ConfigService>(ConfigService);
    testBucket = configService.get<string>('AWS_S3_MUSIC_BUCKET');

    console.log('🧪 S3 Integration Tests Setup');
    console.log(`Test bucket: ${testBucket}`);
    console.log(`AWS Region: ${configService.get('AWS_S3_REGION')}`);
  });

  afterAll(async () => {
    // Clean up all test objects
    console.log('🧹 Cleaning up S3 test objects...');

    for (const key of testObjects) {
      try {
        await s3Service.deleteObject(testBucket, key);
        console.log(`🗑️ Deleted test object: ${key}`);
      } catch (error) {
        console.warn(`⚠️ Failed to delete test object ${key}:`, error.message);
      }
    }

    console.log('✅ S3 test cleanup completed');
  });

  describe('Presigned URLs', () => {
    it('should generate a valid presigned upload URL', async () => {
      const testKey = `test-uploads/${crypto.randomUUID()}.txt`;
      const contentType = 'text/plain';
      const expiresIn = 300; // 5 minutes

      testObjects.push(testKey); // Track for cleanup

      const presignedUrl = await s3Service.getPresignedUploadUrl(
        testBucket,
        testKey,
        contentType,
        expiresIn,
      );

      // Validate the URL structure
      expect(presignedUrl).toBeTruthy();
      expect(presignedUrl).toContain(testBucket);
      expect(presignedUrl).toContain(encodeURIComponent(testKey));
      expect(presignedUrl).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
      expect(presignedUrl).toContain('X-Amz-Credential');
      expect(presignedUrl).toContain('X-Amz-Signature');

      console.log('✅ Generated valid presigned upload URL');
    }, 10000);

    it('should generate a valid presigned download URL', async () => {
      // First, upload a test file to have something to download
      const testKey = `test-downloads/${crypto.randomUUID()}.txt`;
      const testContent = 'This is a test file for download URL testing';
      const contentType = 'text/plain';

      testObjects.push(testKey); // Track for cleanup

      // Upload test file
      const uploadedUrl = await s3Service.uploadBuffer(
        testBucket,
        testKey,
        Buffer.from(testContent),
        contentType,
        {
          testFile: 'true',
          createdBy: 'integration-test',
        },
      );

      expect(uploadedUrl).toBeTruthy();

      // Generate presigned download URL
      const presignedDownloadUrl = await s3Service.getPresignedDownloadUrl(
        testBucket,
        testKey,
        300, // 5 minutes
      );

      // Validate the URL structure
      expect(presignedDownloadUrl).toBeTruthy();
      expect(presignedDownloadUrl).toContain(testBucket);
      expect(presignedDownloadUrl).toContain(encodeURIComponent(testKey));
      expect(presignedDownloadUrl).toContain(
        'X-Amz-Algorithm=AWS4-HMAC-SHA256',
      );

      // Test that we can actually fetch the content
      const response = await fetch(presignedDownloadUrl);
      expect(response.ok).toBe(true);

      const downloadedContent = await response.text();
      expect(downloadedContent).toBe(testContent);

      console.log(
        '✅ Generated valid presigned download URL and verified content',
      );
    }, 15000);

    it('should handle different content types correctly', async () => {
      const testCases = [
        { ext: 'mp3', contentType: 'audio/mpeg' },
        { ext: 'wav', contentType: 'audio/wav' },
        { ext: 'json', contentType: 'application/json' },
        { ext: 'txt', contentType: 'text/plain' },
      ];

      for (const testCase of testCases) {
        const testKey = `test-content-types/${crypto.randomUUID()}.${testCase.ext}`;
        testObjects.push(testKey);

        const presignedUrl = await s3Service.getPresignedUploadUrl(
          testBucket,
          testKey,
          testCase.contentType,
          300,
        );

        expect(presignedUrl).toBeTruthy();
        expect(presignedUrl).toContain(
          'Content-Type=' + encodeURIComponent(testCase.contentType),
        );
      }

      console.log('✅ Validated presigned URLs for different content types');
    }, 10000);
  });

  describe('Direct Upload Operations', () => {
    it('should upload a buffer to S3 successfully', async () => {
      const testKey = `test-buffer-upload/${crypto.randomUUID()}.txt`;
      const testContent = 'This is a test buffer upload';
      const contentType = 'text/plain';
      const metadata = {
        testType: 'buffer-upload',
        timestamp: new Date().toISOString(),
      };

      testObjects.push(testKey);

      const s3Url = await s3Service.uploadBuffer(
        testBucket,
        testKey,
        Buffer.from(testContent),
        contentType,
        metadata,
      );

      expect(s3Url).toBeTruthy();
      expect(s3Url).toContain(testBucket);
      expect(s3Url).toContain(testKey);

      // Verify the file was uploaded by trying to download it
      const downloadUrl = await s3Service.getPresignedDownloadUrl(
        testBucket,
        testKey,
      );
      const response = await fetch(downloadUrl);
      const downloadedContent = await response.text();

      expect(downloadedContent).toBe(testContent);

      console.log('✅ Successfully uploaded and verified buffer content');
    }, 10000);

    it('should upload a stream to S3 successfully', async () => {
      const testKey = `test-stream-upload/${crypto.randomUUID()}.txt`;
      const testContent =
        'This is a test stream upload with multiple lines\nLine 2\nLine 3';
      const contentType = 'text/plain';
      const metadata = {
        testType: 'stream-upload',
        lines: '3',
      };

      testObjects.push(testKey);

      // Create a readable stream from the test content
      const { Readable } = await import('stream');
      const testStream = Readable.from([testContent]);

      const s3Url = await s3Service.uploadStream(
        testBucket,
        testKey,
        testStream,
        contentType,
        metadata,
      );

      expect(s3Url).toBeTruthy();
      expect(s3Url).toContain(testBucket);
      expect(s3Url).toContain(testKey);

      // Verify the file was uploaded correctly
      const downloadUrl = await s3Service.getPresignedDownloadUrl(
        testBucket,
        testKey,
      );
      const response = await fetch(downloadUrl);
      const downloadedContent = await response.text();

      expect(downloadedContent).toBe(testContent);

      console.log('✅ Successfully uploaded and verified stream content');
    }, 10000);
  });

  describe('Object Management', () => {
    it('should list objects with prefix correctly', async () => {
      const testPrefix = `test-list-objects/${crypto.randomUUID()}`;
      const testFiles = ['file1.txt', 'file2.txt', 'subfolder/file3.txt'];

      // Upload test files
      for (const fileName of testFiles) {
        const key = `${testPrefix}/${fileName}`;
        testObjects.push(key);

        await s3Service.uploadBuffer(
          testBucket,
          key,
          Buffer.from(`Content of ${fileName}`),
          'text/plain',
          { testFile: 'true' },
        );
      }

      // List objects with prefix
      const objects = await s3Service.listObjects(testBucket, testPrefix);

      expect(objects).toBeTruthy();
      expect(objects.length).toBe(testFiles.length);

      // Verify all our test files are listed
      const listedKeys = objects.map((obj) => obj.Key);
      for (const fileName of testFiles) {
        const expectedKey = `${testPrefix}/${fileName}`;
        expect(listedKeys).toContain(expectedKey);
      }

      console.log('✅ Successfully listed objects with prefix');
    }, 15000);

    it('should delete an object successfully', async () => {
      const testKey = `test-delete/${crypto.randomUUID()}.txt`;

      // Upload a test file
      await s3Service.uploadBuffer(
        testBucket,
        testKey,
        Buffer.from('This file will be deleted'),
        'text/plain',
      );

      // Verify file exists by trying to get a download URL
      const downloadUrl = await s3Service.getPresignedDownloadUrl(
        testBucket,
        testKey,
      );
      const response = await fetch(downloadUrl);
      expect(response.ok).toBe(true);

      // Delete the file
      await s3Service.deleteObject(testBucket, testKey);

      // Verify file is deleted by trying to get download URL again
      const downloadUrlAfterDelete = await s3Service.getPresignedDownloadUrl(
        testBucket,
        testKey,
      );
      const responseAfterDelete = await fetch(downloadUrlAfterDelete);
      expect(responseAfterDelete.ok).toBe(false);
      expect(responseAfterDelete.status).toBe(404);

      console.log('✅ Successfully deleted object');
      // Don't add to testObjects since we already deleted it
    }, 10000);
  });

  describe('Error Handling', () => {
    it('should handle invalid bucket name gracefully', async () => {
      const invalidBucket = 'this-bucket-definitely-does-not-exist-12345';
      const testKey = 'test.txt';

      await expect(
        s3Service.getPresignedUploadUrl(invalidBucket, testKey, 'text/plain'),
      ).rejects.toThrow();

      console.log('✅ Properly handled invalid bucket name');
    });

    it('should handle invalid object key for download', async () => {
      const nonExistentKey = `non-existent/${crypto.randomUUID()}.txt`;

      // This should not throw, but the resulting URL should return 404
      const downloadUrl = await s3Service.getPresignedDownloadUrl(
        testBucket,
        nonExistentKey,
      );
      expect(downloadUrl).toBeTruthy();

      const response = await fetch(downloadUrl);
      expect(response.ok).toBe(false);
      expect(response.status).toBe(404);

      console.log('✅ Properly handled non-existent object key');
    });
  });

  describe('Music Generation Use Case', () => {
    it('should simulate the full music generation S3 workflow', async () => {
      // Simulate the workflow that music generation will use
      const musicId = crypto.randomUUID();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const musicName = 'Test Song';
      const sanitizedName = musicName.replace(/[^a-zA-Z0-9-_]/g, '_');

      const testKey = `music/${timestamp}_${sanitizedName}.mp3`;
      const fakeAudioContent = Buffer.alloc(1024 * 10); // 10KB of fake audio data
      fakeAudioContent.fill('A'); // Fill with 'A' characters to simulate binary data

      const contentType = 'audio/mpeg';
      const metadata = {
        musicId,
        name: musicName,
        prompt: 'A cheerful pop song with electronic beats',
        outputFormat: 'mp3_44100_128',
        modelId: 'music_v1',
        generatedAt: new Date().toISOString(),
      };

      testObjects.push(testKey);

      // Upload the "generated" music file
      const s3Url = await s3Service.uploadBuffer(
        testBucket,
        testKey,
        fakeAudioContent,
        contentType,
        metadata,
      );

      expect(s3Url).toBeTruthy();
      expect(s3Url).toContain(testBucket);
      expect(s3Url).toContain(testKey);

      // Generate a download URL for the music file
      const downloadUrl = await s3Service.getPresignedDownloadUrl(
        testBucket,
        testKey,
        3600,
      );
      expect(downloadUrl).toBeTruthy();

      // Verify we can download the file
      const response = await fetch(downloadUrl);
      expect(response.ok).toBe(true);
      expect(response.headers.get('content-type')).toBe(contentType);

      const downloadedBuffer = await response.arrayBuffer();
      expect(downloadedBuffer.byteLength).toBe(fakeAudioContent.length);

      console.log(
        '✅ Successfully simulated complete music generation S3 workflow',
      );
    }, 15000);
  });
});
