import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { Repository } from 'typeorm';
import { User } from '../src/shared/entities';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('Auth Controller (e2e)', () => {
  let app: INestApplication<App>;
  let userRepository: Repository<User>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply the same validation pipe as in main.ts
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();

    userRepository = moduleFixture.get<Repository<User>>(
      getRepositoryToken(User),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    // Clean up test users after each test
    await userRepository.query('DELETE FROM users');
  });

  describe('/auth/register (POST)', () => {
    it('should successfully register a new user', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'Test@123456',
        confirmPassword: 'Test@123456',
        firstName: 'John',
        lastName: 'Doe',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.email).toBe(registerDto.email);
      expect(response.body.user.firstName).toBe(registerDto.firstName);
      expect(response.body.user.lastName).toBe(registerDto.lastName);
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.accessToken).toBeDefined();
    });

    it('should fail with invalid email format', async () => {
      const registerDto = {
        email: 'invalid-email',
        password: 'Test@123456',
        confirmPassword: 'Test@123456',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);

      expect(response.body.message).toContain('Please provide a valid email address');
    });

    it('should fail with weak password', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'weak',
        confirmPassword: 'weak',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should fail when passwords do not match', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'Test@123456',
        confirmPassword: 'Test@123457',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(400);

      expect(response.body.message).toContain('Passwords do not match');
    });

    it('should fail with duplicate email', async () => {
      const registerDto = {
        email: 'test@example.com',
        password: 'Test@123456',
        confirmPassword: 'Test@123456',
      };

      // First registration should succeed
      await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      // Second registration with same email should fail
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(409);

      expect(response.body.message).toContain('User with this email already exists');
    });

    it('should register user without optional fields', async () => {
      const registerDto = {
        email: 'minimal@example.com',
        password: 'Test@123456',
        confirmPassword: 'Test@123456',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body.user.email).toBe(registerDto.email);
      expect(response.body.user.firstName).toBeUndefined();
      expect(response.body.user.lastName).toBeUndefined();
    });
  });

  describe('/auth/login (POST)', () => {
    beforeEach(async () => {
      // Register a test user before login tests
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'login@example.com',
          password: 'Test@123456',
          confirmPassword: 'Test@123456',
          firstName: 'Login',
          lastName: 'Test',
        });
    });

    it('should successfully login with valid credentials', async () => {
      const loginDto = {
        email: 'login@example.com',
        password: 'Test@123456',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(201);

      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.email).toBe(loginDto.email);
      expect(response.body.user).not.toHaveProperty('password');
      expect(response.body.accessToken).toBeDefined();
    });

    it('should fail with invalid email', async () => {
      const loginDto = {
        email: 'nonexistent@example.com',
        password: 'Test@123456',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should fail with invalid password', async () => {
      const loginDto = {
        email: 'login@example.com',
        password: 'WrongPassword@123',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body.message).toContain('Invalid credentials');
    });

    it('should fail with malformed email', async () => {
      const loginDto = {
        email: 'not-an-email',
        password: 'Test@123456',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(400);

      expect(response.body.message).toContain('Please provide a valid email address');
    });

    it('should fail with empty password', async () => {
      const loginDto = {
        email: 'login@example.com',
        password: '',
      };

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(401);

      expect(response.body.message).toBeDefined();
    });
  });

  describe('/auth/me (GET)', () => {
    let accessToken: string;
    let userId: string;

    beforeEach(async () => {
      // Register and login to get a valid token
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'me@example.com',
          password: 'Test@123456',
          confirmPassword: 'Test@123456',
          firstName: 'Current',
          lastName: 'User',
        });

      accessToken = registerResponse.body.accessToken;
      userId = registerResponse.body.user.id;
    });

    it('should return current user with valid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(userId);
      expect(response.body.email).toBe('me@example.com');
      expect(response.body.firstName).toBe('Current');
      expect(response.body.lastName).toBe('User');
      expect(response.body).not.toHaveProperty('password');
    });

    it('should fail without authorization header', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);

      expect(response.body.message).toBeDefined();
    });

    it('should fail with invalid token', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.message).toBeDefined();
    });

    it('should fail with malformed authorization header', async () => {
      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'InvalidFormat')
        .expect(401);

      expect(response.body.message).toBeDefined();
    });

    it('should fail after user is deleted', async () => {
      // Delete the user
      await userRepository.delete({ id: userId });

      const response = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);

      expect(response.body.message).toContain('User not found');
    });
  });
});
