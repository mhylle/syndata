import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../../shared/entities';
import { RegisterDto, LoginDto, UserResponseDto } from './dto';
import { IAuthService } from './interfaces/auth-service.interface';
import {
  UserMapper,
  JwtTokenUtil,
  AuthResponseUtil,
  AuthResponse,
} from '../../common/utils';

@Injectable()
export class ProductionAuthService implements IAuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { email, password, confirmPassword, firstName, lastName } =
      registerDto;

    // Validate password confirmation
    if (password !== confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });
    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
    });

    await this.userRepository.save(user);

    // Transform to response and generate token
    const userResponse = UserMapper.toUserResponse(user);
    const accessToken = JwtTokenUtil.generateAccessToken(
      this.jwtService,
      userResponse,
    );

    return AuthResponseUtil.createAuthResponse(userResponse, accessToken);
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    const user = await this.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Transform to response and generate token
    const userResponse = UserMapper.toUserResponse(user);
    const accessToken = JwtTokenUtil.generateAccessToken(
      this.jwtService,
      userResponse,
    );

    return AuthResponseUtil.createAuthResponse(userResponse, accessToken);
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  async getUserById(id: string): Promise<UserResponseDto | null> {
    const user = await this.userRepository.findOne({ where: { id } });
    return user ? UserMapper.toUserResponse(user) : null;
  }
}
