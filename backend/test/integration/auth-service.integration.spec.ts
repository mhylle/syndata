import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ProductionAuthService } from '../../src/core/auth/production-auth.service';
import { User } from '../../src/shared/entities';
import { RegisterDto, LoginDto } from '../../src/core/auth/dto';
import * as bcrypt from 'bcrypt';

describe('ProductionAuthService (Integration)', () => {
  let service: ProductionAuthService;
  let userRepository: Repository<User>;
  let jwtService: JwtService;

  // Mock repository
  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
  };

  // Mock JWT service
  const mockJwtService = {
    sign: jest.fn(),
    verify: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductionAuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<ProductionAuthService>(ProductionAuthService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('register', () => {
    const validRegisterDto: RegisterDto = {
      email: 'test@example.com',
      password: 'Test@123456',
      confirmPassword: 'Test@123456',
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should successfully register a new user', async () => {
      const hashedPassword = await bcrypt.hash(validRegisterDto.password, 10);
      const mockUser: User = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: validRegisterDto.email,
        password: hashedPassword,
        firstName: validRegisterDto.firstName ?? null,
        lastName: validRegisterDto.lastName ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.register(validRegisterDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result.user.email).toBe(validRegisterDto.email);
      expect(result.user.firstName).toBe(validRegisterDto.firstName);
      expect(result.user.lastName).toBe(validRegisterDto.lastName);
      expect(result.user).not.toHaveProperty('password');
      expect(result.accessToken).toBe('mock-jwt-token');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: validRegisterDto.email },
      });
      expect(mockUserRepository.create).toHaveBeenCalled();
      expect(mockUserRepository.save).toHaveBeenCalled();
      expect(mockJwtService.sign).toHaveBeenCalled();
    });

    it('should throw BadRequestException when passwords do not match', async () => {
      const invalidDto: RegisterDto = {
        ...validRegisterDto,
        confirmPassword: 'DifferentPassword@123',
      };

      await expect(service.register(invalidDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.register(invalidDto)).rejects.toThrow(
        'Passwords do not match',
      );

      expect(mockUserRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when user already exists', async () => {
      const existingUser: User = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: validRegisterDto.email,
        password: 'hashed-password',
        firstName: 'Existing',
        lastName: 'User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(existingUser);

      await expect(service.register(validRegisterDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.register(validRegisterDto)).rejects.toThrow(
        'User with this email already exists',
      );

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: validRegisterDto.email },
      });
      expect(mockUserRepository.create).not.toHaveBeenCalled();
    });

    it('should hash password before storing', async () => {
      const mockUser: User = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: validRegisterDto.email,
        password: 'will-be-hashed',
        firstName: validRegisterDto.firstName ?? null,
        lastName: validRegisterDto.lastName ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockImplementation((userData) => ({
        ...mockUser,
        password: userData.password,
      }));
      mockUserRepository.save.mockImplementation((user) => Promise.resolve(user));
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      await service.register(validRegisterDto);

      const createCall = mockUserRepository.create.mock.calls[0][0];
      expect(createCall.password).not.toBe(validRegisterDto.password);
      expect(await bcrypt.compare(validRegisterDto.password, createCall.password)).toBe(true);
    });

    it('should register user without optional fields', async () => {
      const minimalDto: RegisterDto = {
        email: 'minimal@example.com',
        password: 'Test@123456',
        confirmPassword: 'Test@123456',
      };

      const mockUser: User = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: minimalDto.email,
        password: 'hashed-password',
        firstName: null,
        lastName: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.register(minimalDto);

      expect(result.user.email).toBe(minimalDto.email);
      expect(result.user.firstName).toBeUndefined();
      expect(result.user.lastName).toBeUndefined();
    });
  });

  describe('login', () => {
    const validLoginDto: LoginDto = {
      email: 'test@example.com',
      password: 'Test@123456',
    };

    it('should successfully login with valid credentials', async () => {
      const hashedPassword = await bcrypt.hash(validLoginDto.password, 10);
      const mockUser: User = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: validLoginDto.email,
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const result = await service.login(validLoginDto);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result.user.email).toBe(validLoginDto.email);
      expect(result.user).not.toHaveProperty('password');
      expect(result.accessToken).toBe('mock-jwt-token');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: validLoginDto.email },
      });
      expect(mockJwtService.sign).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException with invalid email', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      await expect(service.login(validLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(validLoginDto)).rejects.toThrow(
        'Invalid credentials',
      );

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: validLoginDto.email },
      });
    });

    it('should throw UnauthorizedException with invalid password', async () => {
      const mockUser: User = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: validLoginDto.email,
        password: await bcrypt.hash('DifferentPassword@123', 10),
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.login(validLoginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.login(validLoginDto)).rejects.toThrow(
        'Invalid credentials',
      );
    });
  });

  describe('validateUser', () => {
    it('should return user with valid credentials', async () => {
      const password = 'Test@123456';
      const hashedPassword = await bcrypt.hash(password, 10);
      const mockUser: User = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        password: hashedPassword,
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', password);

      expect(result).toEqual(mockUser);
      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should return null with invalid email', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.validateUser('nonexistent@example.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null with invalid password', async () => {
      const mockUser: User = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        password: await bcrypt.hash('CorrectPassword@123', 10),
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@example.com', 'WrongPassword@123');

      expect(result).toBeNull();
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const mockUser: User = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        password: 'hashed-password',
        firstName: 'John',
        lastName: 'Doe',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserById(mockUser.id);

      expect(result).toBeDefined();
      expect(result).not.toBeNull();
      expect(result!.id).toBe(mockUser.id);
      expect(result!.email).toBe(mockUser.email);
      expect(result).not.toHaveProperty('password');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockUser.id },
      });
    });

    it('should return null when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.getUserById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('password hashing and comparison', () => {
    it('should correctly hash and verify passwords', async () => {
      const plainPassword = 'Test@123456';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
      const isNotMatch = await bcrypt.compare('WrongPassword@123', hashedPassword);

      expect(isMatch).toBe(true);
      expect(isNotMatch).toBe(false);
    });

    it('should generate different hashes for same password', async () => {
      const plainPassword = 'Test@123456';
      const hash1 = await bcrypt.hash(plainPassword, 10);
      const hash2 = await bcrypt.hash(plainPassword, 10);

      expect(hash1).not.toBe(hash2);
      expect(await bcrypt.compare(plainPassword, hash1)).toBe(true);
      expect(await bcrypt.compare(plainPassword, hash2)).toBe(true);
    });
  });
});
