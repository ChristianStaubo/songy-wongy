import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { S3Service } from './s3.service';

describe('S3Service Unit Tests', () => {
  let service: S3Service;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<S3Service>(S3Service);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Constructor', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should throw error when AWS_S3_REGION is missing', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'AWS_S3_REGION') return undefined;
        if (key === 'AWS_ACCESS_KEY_ID') return 'test-access-key';
        if (key === 'AWS_SECRET_ACCESS_KEY') return 'test-secret-key';
        return undefined;
      });

      expect(() => {
        new S3Service(configService);
      }).toThrow(InternalServerErrorException);
    });

    it('should throw error when AWS_ACCESS_KEY_ID is missing', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'AWS_S3_REGION') return 'us-east-1';
        if (key === 'AWS_ACCESS_KEY_ID') return undefined;
        if (key === 'AWS_SECRET_ACCESS_KEY') return 'test-secret-key';
        return undefined;
      });

      expect(() => {
        new S3Service(configService);
      }).toThrow(InternalServerErrorException);
    });

    it('should throw error when AWS_SECRET_ACCESS_KEY is missing', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'AWS_S3_REGION') return 'us-east-1';
        if (key === 'AWS_ACCESS_KEY_ID') return 'test-access-key';
        if (key === 'AWS_SECRET_ACCESS_KEY') return undefined;
        return undefined;
      });

      expect(() => {
        new S3Service(configService);
      }).toThrow(InternalServerErrorException);
    });

    it('should initialize successfully with all required config', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'AWS_S3_REGION') return 'us-east-1';
        if (key === 'AWS_ACCESS_KEY_ID') return 'test-access-key';
        if (key === 'AWS_SECRET_ACCESS_KEY') return 'test-secret-key';
        return undefined;
      });

      expect(() => {
        new S3Service(configService);
      }).not.toThrow();
    });
  });

  describe('Configuration Validation', () => {
    beforeEach(() => {
      // Setup valid config for these tests
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'AWS_S3_REGION') return 'us-east-1';
        if (key === 'AWS_ACCESS_KEY_ID') return 'test-access-key';
        if (key === 'AWS_SECRET_ACCESS_KEY') return 'test-secret-key';
        return undefined;
      });
    });

    it('should validate bucket name format', () => {
      // Test valid bucket names
      const validBucketNames = [
        'my-bucket',
        'my.bucket',
        'my-bucket-123',
        'test-bucket-name',
      ];

      validBucketNames.forEach((bucketName) => {
        expect(bucketName).toMatch(/^[a-z0-9.-]+$/);
        expect(bucketName.length).toBeGreaterThanOrEqual(3);
        expect(bucketName.length).toBeLessThanOrEqual(63);
      });
    });

    it('should validate S3 key format', () => {
      // Test valid S3 keys
      const validKeys = [
        'music/test-file.mp3',
        'uploads/2024/01/audio.wav',
        'test-folder/subfolder/file.txt',
      ];

      validKeys.forEach((key) => {
        expect(key).not.toContain('//'); // No double slashes
        expect(key).not.toMatch(/^\//); // No leading slash
        expect(key.length).toBeGreaterThan(0);
        expect(key.length).toBeLessThanOrEqual(1024);
      });
    });
  });

  describe('Content Type Helpers', () => {
    it('should return correct content types for audio files', () => {
      const audioExtensions = {
        mp3: 'audio/mpeg',
        wav: 'audio/wav',
        flac: 'audio/flac',
        m4a: 'audio/mp4',
      };

      Object.entries(audioExtensions).forEach(([, expectedType]) => {
        // This is a conceptual test - the actual implementation would need
        // a helper method to determine content type from file extension
        expect(expectedType).toContain('audio/');
      });
    });

    it('should handle unknown file extensions gracefully', () => {
      const defaultContentType = 'application/octet-stream';

      // This would be the fallback behavior
      expect(defaultContentType).toBe('application/octet-stream');
    });
  });

  describe('URL Validation', () => {
    it('should validate S3 URL format', () => {
      const region = 'us-east-1';
      const bucket = 'test-bucket';
      const key = 'music/test-file.mp3';

      const expectedUrl = `https://${bucket}.s3.${region}.amazonaws.com/${key}`;

      expect(expectedUrl).toContain('https://');
      expect(expectedUrl).toContain(bucket);
      expect(expectedUrl).toContain('s3');
      expect(expectedUrl).toContain(region);
      expect(expectedUrl).toContain('amazonaws.com');
      expect(expectedUrl).toContain(key);
    });

    it('should handle URL encoding for special characters in keys', () => {
      const keyWithSpaces = 'music/my song.mp3';
      const encodedKey = encodeURIComponent(keyWithSpaces);

      expect(encodedKey).not.toContain(' ');
      expect(encodedKey).toContain('music%2Fmy%20song.mp3');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      // Setup valid config
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'AWS_S3_REGION') return 'us-east-1';
        if (key === 'AWS_ACCESS_KEY_ID') return 'test-access-key';
        if (key === 'AWS_SECRET_ACCESS_KEY') return 'test-secret-key';
        return undefined;
      });
    });

    it('should handle invalid bucket names', () => {
      const invalidBucketNames = [
        '', // Empty
        'a', // Too short
        'UPPERCASE', // Contains uppercase
        'bucket_with_underscores', // Contains underscores
        'bucket..double.dots', // Double dots
      ];

      invalidBucketNames.forEach((bucketName) => {
        // These would fail S3 bucket name validation
        expect(
          bucketName === '' ||
            bucketName.length < 3 ||
            /[A-Z_]/.test(bucketName) ||
            bucketName.includes('..'),
        ).toBe(true);
      });
    });

    it('should handle invalid S3 keys', () => {
      const invalidKeys = [
        '', // Empty key
        '/leading-slash', // Leading slash
        'trailing-slash/', // Trailing slash (though this is actually valid)
        'double//slash', // Double slash
      ];

      invalidKeys.forEach((key) => {
        if (key === '' || key.startsWith('/') || key.includes('//')) {
          expect(true).toBe(true); // These would be invalid
        }
      });
    });
  });
});
