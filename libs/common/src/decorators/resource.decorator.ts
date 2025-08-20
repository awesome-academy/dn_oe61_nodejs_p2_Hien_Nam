import { applyDecorators, SetMetadata } from '@nestjs/common';
export const MESSAGE_RESOURCE_KEY = 'message_resource_key';
export const MESSAGE_RESOURCE_ACTION = 'message_resource_action';
export const MessageResource = (resource: string, context?: string) => {
  return applyDecorators(
    SetMetadata(MESSAGE_RESOURCE_KEY, resource),
    SetMetadata(MESSAGE_RESOURCE_ACTION, context),
  );
};
