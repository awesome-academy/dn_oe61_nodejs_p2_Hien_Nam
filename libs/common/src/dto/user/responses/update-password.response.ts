export class UpdatePasswordResponse {
  id: number;
  userName: string;
  email: string | null;
  updatedAt: Date | null;
  message: string;
}
