import { JwtService } from '@nestjs/jwt';
import { UserResponseDto } from '../../core/auth/dto';

export class JwtTokenUtil {
  /**
   * Generate JWT access token from user data
   * Centralizes token generation logic to ensure consistency
   */
  static generateAccessToken(
    jwtService: JwtService,
    user: UserResponseDto,
  ): string {
    const payload = { sub: user.id, email: user.email };
    return jwtService.sign(payload);
  }
}
