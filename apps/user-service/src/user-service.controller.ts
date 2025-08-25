import { UserByEmailRequest } from '@app/common/dto/user/requests/user-by-email.request';
import { UserResponse } from '@app/common/dto/user/responses/user.response';
import { UserMsgPattern } from '@app/common/enums/message-patterns/user.pattern';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user-service.service';
@Controller()
export class UserServiceController {
  constructor(private readonly userService: UserService) {}
  @MessagePattern(UserMsgPattern.USER_GET_BY_EMAIL)
  async findUserByEmail(@Payload() dto: UserByEmailRequest): Promise<UserResponse | null> {
    return this.userService.getUserByEmail(dto);
  }
}
