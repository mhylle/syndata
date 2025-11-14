import { RegisterDto, LoginDto, UserResponseDto } from '../dto';
import { User } from '../../../shared/entities';
import { AuthResponse } from '../../../common/utils';

export interface IAuthService {
  register(registerDto: RegisterDto): Promise<AuthResponse>;
  login(loginDto: LoginDto): Promise<AuthResponse>;
  validateUser(email: string, password: string): Promise<User | null>;
  getUserById(id: string): Promise<UserResponseDto | null>;
}
