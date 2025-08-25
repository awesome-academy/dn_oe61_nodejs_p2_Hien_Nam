import { LoginSummaryResponse } from './login-summary.response';

export class LoginResponse {
  accessToken: string;
  user: LoginSummaryResponse;
}
