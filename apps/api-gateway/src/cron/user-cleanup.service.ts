import { USER_SERVICE } from '@app/common/constant/service.constant';
import { UserMsgPattern } from '@app/common/enums/message-patterns/user.pattern';
import { CustomLogger } from '@app/common/logger/custom-logger.service';
import { Injectable, Inject } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { Cron } from '@nestjs/schedule';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class UserCleanupService {
  constructor(
    @Inject(USER_SERVICE) private readonly userClient: ClientProxy,
    private readonly loggerService: CustomLogger,
  ) {}

  @Cron('0 0 21 * * *', { name: 'cleanup-inactive-users' })
  async cleanupInactiveUsers(): Promise<void> {
    this.loggerService.log('🔄 Cron job cleanup-inactive-users bắt đầu chạy từ API Gateway...');

    try {
      const result = await firstValueFrom<{ deletedCount: number; message: string }>(
        this.userClient.send(UserMsgPattern.CLEANUP_INACTIVE_USERS, {}),
      );

      this.loggerService.log(`✅ Cleanup hoàn thành: ${result.message}`);
    } catch (error) {
      this.loggerService.error('❌ Lỗi khi chạy cleanup inactive users:', String(error));
    }
  }
}
