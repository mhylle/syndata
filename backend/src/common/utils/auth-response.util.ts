import { UserResponseDto } from '../../core/auth/dto';

export interface AuthResponse {
  user: UserResponseDto;
  accessToken: string;
}

export class AuthResponseUtil {
  /**
   * Create standardized auth response
   * Ensures consistent response format across all auth endpoints
   */
  static createAuthResponse(
    user: UserResponseDto,
    accessToken: string,
  ): AuthResponse {
    return {
      user,
      accessToken,
    };
  }
}
