export class UserProfileResponse {
  id: number;
  name: string;
  userName: string;
  email: string | null;
  imageUrl: string | null;
  isActive: boolean;
  status: string;
  createdAt: Date;
  updatedAt: Date | null;

  // Role information
  role: {
    id: number;
    name: string;
  };

  // Profile information
  profile: {
    id: number;
    address: string | null;
    phoneNumber: string | null;
    dateOfBirth: Date | null;
    createdAt: Date;
    updatedAt: Date | null;
  } | null;

  // Auth providers information
  authProviders: Array<{
    id: number;
    provider: string;
    providerId: string | null;
    hasPassword: boolean;
    createdAt: Date;
  }>;
}
