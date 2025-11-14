import { UserResponseDto } from '../../core/auth/dto';
import { User } from '../../shared/entities';

interface ExternalUserData {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export class UserMapper {
  /**
   * Transform User entity to UserResponseDto
   * Used for consistent user response across all endpoints
   */
  static toUserResponse(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
    };
  }

  /**
   * Transform external auth service response to UserResponseDto
   * Used when integrating with external authentication services
   */
  static fromExternalAuthData(userData: ExternalUserData): UserResponseDto {
    return {
      id: userData.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
    };
  }

  /**
   * Transform external auth service response to User entity
   * Used when validating users from external services
   */
  static toUserEntity(userData: ExternalUserData): User {
    const user = new User();
    user.id = userData.id;
    user.email = userData.email;
    user.firstName = userData.firstName ?? null;
    user.lastName = userData.lastName ?? null;
    user.password = ''; // Don't store password from external service
    return user;
  }
}

