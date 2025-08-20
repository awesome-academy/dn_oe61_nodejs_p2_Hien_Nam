export class UpdateUserProfileResponse {
  id: number;
  name: string;
  userName: string;
  email: string | null;
  imageUrl: string | null;
  updatedAt: Date | null;

  // Profile information
  profile: {
    id: number;
    address: string | null;
    phoneNumber: string | null;
    dateOfBirth: Date | null;
    updatedAt: Date | null;
  } | null;
}
