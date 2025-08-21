import { UserByEmailRequest } from '@app/common/dto/user/requests/user-by-email.request';
import { UserResponse } from '@app/common/dto/user/responses/user.response';
import { UserMsgPattern } from '@app/common/enums/message-patterns/user.pattern';
import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user-service.service';
import { ProfileFacebookUser } from '@app/common/dto/user/requests/facebook-user-dto.request';
import { CreateUserDto } from '@app/common/dto/user/create-user.dto';

@Controller()
export class UserServiceController {
  constructor(private readonly userService: UserService) {}
  @MessagePattern(UserMsgPattern.USER_GET_BY_EMAIL)
  async findUserByEmail(@Payload() dto: UserByEmailRequest): Promise<UserResponse | null> {
    return this.userService.getUserByEmail(dto);
  }
  @MessagePattern(UserMsgPattern.FIND_OR_CREATE_USER_FROM_FACEBOOK)
  async findOrCreateUserFromFacebook(
    @Payload() dto: ProfileFacebookUser,
  ): Promise<UserResponse | null> {
    return this.userService.findOrCreateUserFromFacebook(dto);
  }

  @MessagePattern({ cmd: UserMsgPattern.CHECK_USERE_EXISTS })
  async checkUserExists(@Payload() providerId: string) {
    const result = await this.userService.checkUserExists(providerId);
    return result;
  }

  @MessagePattern({ cmd: UserMsgPattern.CREATE_USER })
  async createUser(@Payload() data: CreateUserDto) {
    const result = await this.userService.createUser(data);
    return result;
  }
}
