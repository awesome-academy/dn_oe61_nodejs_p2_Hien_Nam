import { ChatWorkSentStatus } from '@app/common/enums/chat-work.enum';

export class SendChatworkResponse {
  status: ChatWorkSentStatus;
  messageId: string;
}
