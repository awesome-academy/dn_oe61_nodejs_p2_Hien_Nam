import { getQueueToken } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MailQueueService } from '../src/mail/mail-queue.service';
import { MailJobDataDto } from '@app/common/dto/mail.dto';

describe('MailQueueService', () => {
  let service: MailQueueService;

  const mockMailQueue = {
    add: jest.fn(),
  };

  const mockLogger = {
    warn: jest.fn(),
    error: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailQueueService,
        {
          provide: getQueueToken('mailQueue'),
          useValue: mockMailQueue,
        },
        {
          provide: Logger,
          useValue: mockLogger,
        },
      ],
    }).compile();

    service = module.get<MailQueueService>(MailQueueService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('enqueueMailJob', () => {
    const jobName = 'send-email';
    const data: MailJobDataDto = {
      to: 'test@example.com',
      subject: 'Test Email',
      template: 'test-template',
      context: { name: 'Test' },
    };

    it('should log a warning and return if jobName is not provided', async () => {
      await service.enqueueMailJob('', data);

      expect(mockLogger.warn).toHaveBeenCalledWith('Missing required jobName');
      expect(mockMailQueue.add).not.toHaveBeenCalled();
    });

    it('should add a job to the mail queue', async () => {
      mockMailQueue.add.mockResolvedValue(undefined);

      await service.enqueueMailJob(jobName, data);

      expect(mockMailQueue.add).toHaveBeenCalledWith(jobName, data, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 60000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });
    });

    it('should log an error and re-throw if adding to queue fails', async () => {
      const error = new Error('Queue Error');
      mockMailQueue.add.mockRejectedValue(error);

      await expect(service.enqueueMailJob(jobName, data)).rejects.toThrow(error);

      expect(mockLogger.error).toHaveBeenCalledWith(
        `Failed to add mail job '${jobName}' for recipient: ${data.to}`,
        error.stack,
      );
    });
  });
});
