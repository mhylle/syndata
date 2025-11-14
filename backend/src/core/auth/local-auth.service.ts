import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { RegisterDto, LoginDto, UserResponseDto } from './dto';
import { IAuthService } from './interfaces/auth-service.interface';
import { User } from '../../shared/entities';
import {
  UserMapper,
  JwtTokenUtil,
  AuthResponseUtil,
  AuthResponse,
} from '../../common/utils';

@Injectable()
export class LocalAuthService implements IAuthService {
  private readonly authServiceUrl: string;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    // Use mhylle.com auth service for local development
    this.authServiceUrl =
      this.configService.get<string>('auth.serviceUrl') ||
      'https://mhylle.com/api/auth';
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    try {
      const response = await axios.post(
        `${this.authServiceUrl}/register`,
        registerDto,
      );

      // Transform external response and generate token
      const userResponse = UserMapper.fromExternalAuthData(response.data.data);
      const accessToken = JwtTokenUtil.generateAccessToken(
        this.jwtService,
        userResponse,
      );

      return AuthResponseUtil.createAuthResponse(userResponse, accessToken);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new UnauthorizedException(
          error.response.data.message || 'Registration failed',
        );
      }
      throw error;
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    try {
      const response = await axios.post(
        `${this.authServiceUrl}/login`,
        loginDto,
      );

      // Transform external response and generate token
      const userResponse = UserMapper.fromExternalAuthData(response.data.data);
      const accessToken = JwtTokenUtil.generateAccessToken(
        this.jwtService,
        userResponse,
      );

      return AuthResponseUtil.createAuthResponse(userResponse, accessToken);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        throw new UnauthorizedException(
          error.response.data.message || 'Login failed',
        );
      }
      throw error;
    }
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    try {
      const response = await axios.post(`${this.authServiceUrl}/login`, {
        email,
        password,
      });

      // Transform external response to User entity
      return UserMapper.toUserEntity(response.data.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return null;
      }
      throw error;
    }
  }

  async getUserById(id: string): Promise<UserResponseDto | null> {
    try {
      const response = await axios.get(`${this.authServiceUrl}/users/${id}`);

      // Transform external response to our format
      return UserMapper.fromExternalAuthData(response.data.data);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }
}
