import { UserByEmailRequest } from '@app/common/dto/user/requests/user-by-email.request';
import { GetUserProfileRequest } from '@app/common/dto/user/requests/get-user-profile.request';
import { UpdatePasswordRequest } from '@app/common/dto/user/requests/update-password.request';
import { UpdateUserProfileRequest } from '@app/common/dto/user/requests/update-user-profile.request';
import { UpdatePasswordResponse } from '@app/common/dto/user/responses/update-password.response';
import { UpdateUserProfileResponse } from '@app/common/dto/user/responses/update-user-profile.response';
import { UserProfileResponse } from '@app/common/dto/user/responses/user-profile.response';
import { UserResponse } from '@app/common/dto/user/responses/user.response';
import { UserMsgPattern } from '@app/common/enums/message-patterns/user.pattern';
import { Controller, UseFilters, UsePipes } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { UserService } from './user-service.service';
import { ProfileFacebookUser } from '@app/common/dto/user/requests/facebook-user-dto.request';
import { CreateUserDto } from '@app/common/dto/user/create-user.dto';
import { UserCreationRequest } from '@app/common/dto/user/requests/user-creation.request';
import { UserUpdateRoleRequest } from '@app/common/dto/user/requests/user-update-role.request';
import { UserUpdateStatusRequest } from '@app/common/dto/user/requests/user-update-status.request';
import { SoftDeleteUserRequest } from '@app/common/dto/user/requests/soft-delete-user.request';
import { I18nRpcValidationPipe } from '@app/common/pipes/rpc-validation-pipe';
import { RpcExceptionsFilter } from '@app/common/filters/rpc-exceptions.filter';

@Controller()
@UseFilters(RpcExceptionsFilter)
export class UserServiceController {
  constructor(private readonly userService: UserService) {}
  @UsePipes(I18nRpcValidationPipe)
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

  @MessagePattern({ cmd: UserMsgPattern.CHECK_USER_EXISTS })
  async checkUserExists(@Payload() providerId: string) {
    const result = await this.userService.checkUserExists(providerId);
    return result;
  }

  @MessagePattern({ cmd: UserMsgPattern.CREATE_OAUTH_USER })
  async createUser(@Payload() data: CreateUserDto): Promise<UserResponse | null> {
    const result = await this.userService.validateOAuthUserCreation(data);
    return result;
  }

  @MessagePattern(UserMsgPattern.REGISTER_USER)
  async register(@Payload() data: CreateUserDto): Promise<UserResponse | null> {
    const result = await this.userService.createUserWithPassword(data);
    return result;
  }

  @MessagePattern(UserMsgPattern.CHANGE_IS_ACTIVE)
  async changeIsActive(@Payload() user: UserResponse): Promise<UserResponse | null> {
    return await this.userService.changeIsActive(user);
  }
  @UsePipes(I18nRpcValidationPipe)
  @MessagePattern(UserMsgPattern.ADMIN_CREATE_USER)
  async adminCreateUser(@Payload() dto: UserCreationRequest) {
    return await this.userService.create(dto);
  }
  @MessagePattern(UserMsgPattern.ADMIN_UPDATE_ROLE)
  async adminUpdateRole(@Payload() dto: UserUpdateRoleRequest) {
    return await this.userService.updateRoles(dto);
  }
  @MessagePattern(UserMsgPattern.ADMIN_UPDATE_STATUS)
  async adminUpdateStatus(@Payload() dto: UserUpdateStatusRequest) {
    return await this.userService.updateStatuses(dto);
  }
  @UseFilters(RpcExceptionsFilter)
  @MessagePattern(UserMsgPattern.ADMIN_DELETE_USER)
  async adminDeleteUser(@Payload() dto: SoftDeleteUserRequest) {
    return await this.userService.softdeleteUser(dto);
  }
  @UsePipes(I18nRpcValidationPipe)
  @MessagePattern(UserMsgPattern.GET_USER_PROFILE)
  async getUserProfile(@Payload() dto: GetUserProfileRequest): Promise<UserProfileResponse> {
    return await this.userService.getUserProfile(dto);
  }

  @UsePipes(I18nRpcValidationPipe)
  @MessagePattern(UserMsgPattern.UPDATE_USER_PROFILE)
  async updateUserProfile(
    @Payload() dto: UpdateUserProfileRequest,
  ): Promise<UpdateUserProfileResponse> {
    return await this.userService.updateUserProfile(dto);
  }

  @UsePipes(I18nRpcValidationPipe)
  @MessagePattern(UserMsgPattern.UPDATE_PASSWORD)
  async updatePassword(@Payload() dto: UpdatePasswordRequest): Promise<UpdatePasswordResponse> {
    return await this.userService.updatePassword(dto);
  }
  @MessagePattern(UserMsgPattern.GET_ALL_ADMIN)
  async getAllAdmin() {
    return await this.userService.getAllAdmin();
  }
}
