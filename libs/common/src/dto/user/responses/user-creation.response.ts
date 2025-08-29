export class UserCreationResponse {
  id: number;
  name: string;
  userName: string;
  email: string | null;
  imageUrl: string | null;
  phone: string | null;
  address: string | null;
  dateOfBirth: Date | null;
  role: string;
  createdAt: Date;
}
