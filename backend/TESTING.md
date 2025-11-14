# Testing Infrastructure - Phase 4 Implementation

This document provides comprehensive guidance for the automated testing infrastructure implemented for the MyNotes backend application.

## Test Suite Overview

The testing infrastructure includes:
- **E2E Tests**: End-to-end tests for authentication flows
- **Integration Tests**: Service-level tests for ProductionAuthService
- **Unit Tests**: Component-level tests (existing)

## Test Statistics

- **Total Test Suites**: 4 (2 E2E + 2 Unit/Integration)
- **Total Tests**: 33 (17 E2E + 16 Integration/Unit)
- **Coverage**: Production auth service has 100% coverage

### Test Breakdown

**E2E Tests (auth.e2e-spec.ts)**:
- 17 tests covering complete authentication workflows
- Registration: 6 tests (success, validation, duplicates)
- Login: 5 tests (success, invalid credentials, validation)
- Profile: 6 tests (authenticated access, unauthorized access)

**Integration Tests (auth-service.integration.spec.ts)**:
- 15 tests for ProductionAuthService
- Registration: 5 tests
- Login: 3 tests
- Validation: 3 tests
- User retrieval: 2 tests
- Password hashing: 2 tests

## Running Tests

### Prerequisites

1. **Database Setup**: Ensure PostgreSQL is running
   ```bash
   docker compose up -d postgres
   ```

2. **Test Database**: Create the test database
   ```bash
   # Using Docker (recommended)
   docker exec mynotes-postgres psql -U mynotes_user -d postgres -c "DROP DATABASE IF EXISTS mynotes_test;"
   docker exec mynotes-postgres psql -U mynotes_user -d postgres -c "CREATE DATABASE mynotes_test;"

   # Or using the setup script (requires psql on host)
   bash scripts/setup-test-db.sh
   ```

### Running Tests

```bash
# Run all unit and integration tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:cov

# Run E2E tests
npm run test:e2e

# Run specific test file
npm test -- auth-service.integration.spec
npm test -- --testPathPattern=integration
```

### Test Coverage

Generate and view coverage report:
```bash
npm run test:cov

# Coverage report is generated in ./coverage directory
# Open coverage/lcov-report/index.html in browser
```

## Test Configuration

### Environment Variables

Tests use the `.env.test` file for configuration:

```env
NODE_ENV=test
PORT=3001
DATABASE_HOST=localhost
DATABASE_PORT=11003
DATABASE_NAME=mynotes_test
DATABASE_USER=mynotes_user
DATABASE_PASSWORD=mynotes_password
AUTH_MODE=production  # Tests always use production mode
JWT_SECRET=test-secret-key-for-testing-only
LOG_LEVEL=error
LOG_CONSOLE=false
LOG_FILE=false
```

### Test Database

- **Database Name**: `mynotes_test` (separate from development database)
- **Connection**: PostgreSQL on port 11003
- **Auto-cleanup**: Tests clean up data after each test run
- **Schema**: Automatically synchronized by TypeORM

### Jest Configuration

**Unit/Integration Tests** (`package.json`):
- Root: Current directory
- Test Pattern: `*.spec.ts`
- Coverage: Excludes DTOs, modules, interfaces, and main.ts

**E2E Tests** (`test/jest-e2e.json`):
- Root: `test` directory
- Test Pattern: `.e2e-spec.ts`
- Setup: Loads `.env.test` and forces `AUTH_MODE=production`
- Timeout: 30 seconds

## Test Architecture

### E2E Test Structure

```typescript
describe('Auth Controller (e2e)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;

  beforeAll(async () => {
    // Initialize NestJS application
    // Apply validation pipes
    // Get repository reference
  });

  afterAll(async () => {
    // Close application
  });

  afterEach(async () => {
    // Clean up test data
    await userRepository.query('DELETE FROM users');
  });

  describe('/auth/register (POST)', () => {
    // Test cases for registration
  });
});
```

### Integration Test Structure

```typescript
describe('ProductionAuthService (Integration)', () => {
  let service: ProductionAuthService;
  let mockUserRepository: MockType<Repository<User>>;
  let mockJwtService: MockType<JwtService>;

  beforeEach(async () => {
    // Setup test module with mocked dependencies
    // Get service instance
    // Clear mocks
  });

  describe('register', () => {
    // Test cases for registration logic
  });
});
```

## Test Coverage Report

Current coverage (unit + integration tests):

```
----------------------------------|---------|----------|---------|---------|
File                              | % Stmts | % Branch | % Funcs | % Lines |
----------------------------------|---------|----------|---------|---------|
All files                         |   21.46 |    20.32 |   16.42 |   22.04 |
 src/core/auth                    |   42.10 |    26.92 |   35.71 |   42.69 |
  production-auth.service.ts      |     100 |      100 |     100 |     100 |
 src/shared/entities              |     100 |      100 |      50 |     100 |
  user.entity.ts                  |     100 |      100 |     100 |     100 |
 src/common/utils                 |   29.09 |    11.76 |      30 |   30.18 |
  auth-response.util.ts           |     100 |      100 |     100 |     100 |
  jwt-token.util.ts               |     100 |      100 |     100 |     100 |
  user-mapper.util.ts             |   27.27 |       50 |   33.33 |   27.27 |
----------------------------------|---------|----------|---------|---------|
```

Key achievements:
- **ProductionAuthService**: 100% coverage
- **Auth utilities**: 100% coverage
- **User entity**: 100% coverage

## Test Data Management

### Test User Cleanup

E2E tests automatically clean up user data after each test:
```typescript
afterEach(async () => {
  await userRepository.query('DELETE FROM users');
});
```

### Mock Data Patterns

Integration tests use consistent mock data:
```typescript
const mockUser: User = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  password: 'hashed-password',
  firstName: 'John',
  lastName: 'Doe',
  createdAt: new Date(),
  updatedAt: new Date(),
};
```

## Common Test Scenarios

### Testing Authentication Flow

```typescript
it('should successfully register and login', async () => {
  // 1. Register user
  const registerResponse = await request(app.getHttpServer())
    .post('/auth/register')
    .send(registerDto)
    .expect(201);

  // 2. Verify token received
  expect(registerResponse.body.accessToken).toBeDefined();

  // 3. Login with credentials
  const loginResponse = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email: registerDto.email, password: registerDto.password })
    .expect(201);

  // 4. Verify same user
  expect(loginResponse.body.user.id).toBe(registerResponse.body.user.id);
});
```

### Testing Validation

```typescript
it('should fail with weak password', async () => {
  const response = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email: 'test@example.com', password: 'weak' })
    .expect(400);

  expect(response.body.message).toBeDefined();
});
```

### Testing Protected Routes

```typescript
it('should access protected route with valid token', async () => {
  const { accessToken } = registerResponse.body;

  const response = await request(app.getHttpServer())
    .get('/auth/me')
    .set('Authorization', `Bearer ${accessToken}`)
    .expect(200);

  expect(response.body.email).toBe(testUser.email);
});
```

## Troubleshooting

### Database Connection Issues

**Problem**: Tests fail with "Cannot connect to database"

**Solution**:
1. Ensure PostgreSQL is running: `docker compose ps`
2. Verify test database exists:
   ```bash
   docker exec mynotes-postgres psql -U mynotes_user -l | grep mynotes_test
   ```
3. Recreate test database: `bash scripts/setup-test-db.sh`

### Test Timeout Issues

**Problem**: Tests timeout after 30 seconds

**Solution**:
1. Increase timeout in `test/jest-e2e.json`:
   ```json
   "testTimeout": 60000
   ```
2. Check for hanging database connections
3. Ensure proper cleanup in `afterEach` hooks

### Type Errors in Tests

**Problem**: TypeScript errors with User entity nullable fields

**Solution**: The User entity uses explicit type annotations for nullable fields:
```typescript
@Column({ type: 'varchar', nullable: true })
firstName: string | null;
```

### Mock Data Issues

**Problem**: Tests fail with type mismatches

**Solution**: Ensure mock data matches entity types:
```typescript
const mockUser: User = {
  firstName: validDto.firstName ?? null, // Handle optional fields
  lastName: validDto.lastName ?? null,
  // ... other fields
};
```

## Best Practices

### Test Organization

1. **Group Related Tests**: Use `describe` blocks for logical grouping
2. **Clear Test Names**: Use descriptive test names explaining what is being tested
3. **Setup/Teardown**: Use `beforeEach`/`afterEach` for consistent test state
4. **Test Independence**: Each test should be independent and not rely on others

### Assertion Patterns

```typescript
// ✅ Good: Specific assertions
expect(response.body.user.email).toBe('test@example.com');
expect(response.body.accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);

// ❌ Bad: Vague assertions
expect(response.body).toBeDefined();
expect(response.status).toBeLessThan(500);
```

### Mock Management

```typescript
// ✅ Good: Clear mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// ✅ Good: Specific mock implementations
mockUserRepository.findOne.mockResolvedValue(mockUser);

// ❌ Bad: Reusing mocks without clearing
```

## Future Enhancements

1. **Performance Tests**: Add tests for response time and throughput
2. **Security Tests**: Add tests for security vulnerabilities (XSS, SQL injection)
3. **Load Tests**: Add tests for concurrent user scenarios
4. **Contract Tests**: Add API contract tests
5. **Visual Regression**: Add screenshot comparison tests for UI

## Additional Resources

- [NestJS Testing Documentation](https://docs.nestjs.com/fundamentals/testing)
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [TypeORM Testing](https://typeorm.io/#/testing)

## Test Maintenance

### Adding New Tests

1. Create test file following naming convention (`*.spec.ts` or `*.e2e-spec.ts`)
2. Set up test module with required dependencies
3. Write test cases covering happy path and error cases
4. Verify test passes and update coverage

### Updating Existing Tests

1. Run affected tests: `npm test -- <test-name>`
2. Update test expectations based on changes
3. Verify all tests still pass
4. Check coverage hasn't decreased

### Test Quality Checklist

- [ ] Tests cover both success and failure scenarios
- [ ] Edge cases are tested (empty strings, null values, etc.)
- [ ] Error messages are validated
- [ ] Response structure is validated
- [ ] Authorization is tested (protected routes)
- [ ] Data cleanup is implemented
- [ ] Tests are independent and can run in any order
- [ ] Coverage meets minimum threshold (80% for critical paths)
