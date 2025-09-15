import { Test, TestingModule } from '@nestjs/testing';
import { TaskService } from '../src/task/task.service';
import { NotificationService } from '../src/notification-service.service';
import { GetStatisticByMonthRequest } from '@app/common/dto/product/requests/get-statistic-by-month.request';

describe('TaskService', () => {
  let service: TaskService;
  let notificationService: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: NotificationService,
          useValue: {
            sendStatisticOrderMonthly: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    notificationService = module.get<NotificationService>(NotificationService);
  });
  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });
  describe('handleSendStatisticOrderMonthly', () => {
    it('should call sendStatisticOrderMonthly when tomorrow is the 1st', async () => {
      // Giả lập hôm nay là 30/04/2023 → ngày mai 01/05
      const mockDate = new Date('2023-04-30T10:00:00Z');
      jest.useFakeTimers().setSystemTime(mockDate);
      await service.handleSendStatisticOrderMonthly();
      const expectedDto: GetStatisticByMonthRequest = {
        month: 5,
        year: 2023,
      };
      const notificationServiceSpy = jest.spyOn(notificationService, 'sendStatisticOrderMonthly');
      expect(notificationServiceSpy).toHaveBeenCalledWith('en', expectedDto);
    });

    it('should not call sendStatisticOrderMonthly when tomorrow is not the 1st', async () => {
      // Giả lập hôm nay là 28/04/2023 → ngày mai 29/04
      const mockDate = new Date('2023-04-28T10:00:00Z');
      jest.useFakeTimers().setSystemTime(mockDate);
      await service.handleSendStatisticOrderMonthly();
      const notificationServiceSpy = jest.spyOn(notificationService, 'sendStatisticOrderMonthly');
      expect(notificationServiceSpy).not.toHaveBeenCalled();
    });

    it('should handle year change correctly (31/12 → 01/01)', async () => {
      // Giả lập hôm nay là 31/12/2023 → ngày mai 01/01/2024
      const mockDate = new Date('2023-12-31T10:00:00Z');
      jest.useFakeTimers().setSystemTime(mockDate);
      await service.handleSendStatisticOrderMonthly();
      const expectedDto: GetStatisticByMonthRequest = {
        month: 1,
        year: 2024,
      };
      const notificationServiceSpy = jest.spyOn(notificationService, 'sendStatisticOrderMonthly');
      expect(notificationServiceSpy).toHaveBeenCalledWith('en', expectedDto);
    });
  });
});
