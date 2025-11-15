# Syndata Codebase - Hardcoded Values Analysis Report

## Summary
This report documents all hardcoded values found in the Syndata application across backend (NestJS) and frontend (Angular) components. These include response structures, status values, constants, error messages, UI text, and configuration values.

---

## BACKEND HARDCODED VALUES

### 1. STATUS VALUES (Hardcoded Strings)

#### Generation Job Status States
- **File**: `/home/mnh/projects/syndata/backend/src/shared/entities/generation-job.entity.ts:14`
- **Value**: `'pending'` (database default)
- **Location**: `@Column({ type: 'varchar', nullable: false, default: 'pending' })`
- **Issue**: Hardcoded default status string. No type safety or enum validation.
- **Related**: Status strings also hardcoded in generation.service.ts

#### Generation Job Status Updates
- **File**: `/home/mnh/projects/syndata/backend/src/features/generation/services/generation.service.ts`
- **Lines**: 49, 58, 108, 112
- **Values**: 
  - Line 49: `'running'`
  - Line 58: `'failed'`
  - Line 108: `'completed'`
  - Line 112: `'failed'`
- **Issue**: Status strings hardcoded in business logic. No centralized status constants or enum.

#### Valid Field Types
- **File**: `/home/mnh/projects/syndata/backend/src/features/generation/services/validation.service.ts:18`
- **Value**: `['string', 'number', 'date', 'boolean', 'email']`
- **Issue**: Hardcoded array of valid field types. Should be moved to constants.

#### Data Generation Types (Field-Based Generation)
- **File**: `/home/mnh/projects/syndata/backend/src/features/generation/services/simple-data-generator.service.ts`
- **Lines**: 72-100 (switch statement)
- **Values**: 
  - `'string'`, `'number'`, `'email'`, `'date'`, `'boolean'`, `'default'`
- **Issue**: Type matching hardcoded in switch statement. No centralized type mapping.

#### Data Source Annotations
- **File**: `/home/mnh/projects/syndata/backend/src/features/generation/services/simple-data-generator.service.ts`
- **Lines**: 16-32
- **Values**:
  - `'sequential_rule'`, confidence: 0.99
  - `'pattern_rule'`, confidence: 0.95
  - `'fixed_rule'`, confidence: 1.0
  - `'distribution_rule'`, confidence: 0.9
  - `'type_based'`, confidence: 0.7-0.8
  - `'default'`, confidence: 0.5
- **Issue**: Source type strings and confidence scores hardcoded. Should be configurable.

#### Annotation Target Types
- **File**: `/home/mnh/projects/syndata/backend/src/features/generation/services/annotation.service.ts`
- **Lines**: 20, 34, 45, 54
- **Values**: `'record'`, `'field'`
- **Issue**: Target type strings hardcoded in service methods.

#### Annotation Type Labels
- **File**: `/home/mnh/projects/syndata/backend/src/features/generation/services/annotation.service.ts`
- **Lines**: 62, 70, 77
- **Values**: `'source'`, `'confidence'`, `'generation_type'`
- **Issue**: Annotation type strings hardcoded in methods.

---

### 2. ERROR MESSAGES (Hardcoded Strings)

#### Password-Related
- **File**: `/home/mnh/projects/syndata/backend/src/core/auth/production-auth.service.ts:35`
- **Value**: `'Passwords do not match'`
- **Issue**: Error message hardcoded in service.

- **File**: `/home/mnh/projects/syndata/backend/src/core/auth/production-auth.service.ts:43`
- **Value**: `'User with this email already exists'`
- **Issue**: Conflict error message hardcoded.

- **File**: `/home/mnh/projects/syndata/backend/src/core/auth/production-auth.service.ts:74`
- **Value**: `'Invalid credentials'`
- **Issue**: Authentication error message hardcoded.

#### Auth DTO Validation Messages
- **File**: `/home/mnh/projects/syndata/backend/src/core/auth/dto/register.dto.ts`
- **Lines**: 11, 27, 37, 47
- **Values**:
  - `'Please provide a valid email address'`
  - `'Passwords do not match'`
  - `'First name must not exceed 50 characters'`
  - `'Last name must not exceed 50 characters'`
- **Issue**: Validation error messages hardcoded in DTO validators.

- **File**: `/home/mnh/projects/syndata/backend/src/core/auth/dto/login.dto.ts`
- **Lines**: 9, 16
- **Values**:
  - `'Please provide a valid email address'`
  - `'Password is required'`
- **Issue**: Validation messages duplicated across DTOs.

#### Schema Validation Errors
- **File**: `/home/mnh/projects/syndata/backend/src/features/generation/services/validation.service.ts`
- **Lines**: 8, 13-14, 20-21
- **Values**:
  - `'Schema must contain fields array'`
  - `'Field at index ${index} must have name and type'`
  - `'Field ${field.name} has invalid type: ${field.type}'`
  - `'Rule for unknown field: ${fieldName}'`
- **Issue**: Validation error messages hardcoded.

#### Resource Not Found Errors
- **File**: `/home/mnh/projects/syndata/backend/src/features/generation/services/generation.service.ts:122`
- **Value**: `` `Job ${jobId} not found` ``
- **Issue**: 404 error message hardcoded with template literal.

- **File**: `/home/mnh/projects/syndata/backend/src/features/generation/services/generation.service.ts:146`
- **Value**: `` `Record ${recordId} not found` ``
- **Issue**: 404 error message hardcoded.

- **File**: `/home/mnh/projects/syndata/backend/src/features/datasets/services/dataset.service.ts`
- **Lines**: 34, 55
- **Values**:
  - `` `Dataset with ID ${id} not found` ``
  - `` `Element with ID ${elementId} not found` ``
- **Issue**: Not found error messages hardcoded.

- **File**: `/home/mnh/projects/syndata/backend/src/features/projects/services/project.service.ts:27`
- **Value**: `` `Project with ID ${id} not found` ``
- **Issue**: 404 error message hardcoded.

#### Generic Errors
- **File**: `/home/mnh/projects/syndata/backend/src/common/filters/http-exception.filter.ts`
- **Lines**: 103, 111
- **Value**: `'Internal server error'`
- **Issue**: Generic error message hardcoded in exception filter (appears twice).

- **File**: `/home/mnh/projects/syndata/backend/src/core/auth/strategies/local.strategy.ts`
- **Lines**: 18, 25
- **Values**:
  - `'Invalid credentials'`
  - `'Authentication failed'`
- **Issue**: Auth error messages hardcoded.

#### Environment Variable Errors
- **File**: `/home/mnh/projects/syndata/backend/src/core/auth/jwt.strategy.ts:16`
- **Value**: `'JWT_SECRET is not defined in environment variables'`
- **Issue**: Configuration error message hardcoded.

- **File**: `/home/mnh/projects/syndata/backend/src/core/auth/auth.module.ts:21`
- **Value**: `'JWT_SECRET is not defined in environment variables'`
- **Issue**: Same error message duplicated.

#### User Profile Errors
- **File**: `/home/mnh/projects/syndata/backend/src/core/auth/auth.controller.ts:102`
- **Value**: `'User not found'`
- **Issue**: Error message hardcoded in controller.

---

### 3. API RESPONSE EXAMPLES (Swagger/Documentation)

#### Welcome Message
- **File**: `/home/mnh/projects/syndata/backend/src/app.controller.ts:17`
- **Value**: `'Hello World!'`
- **Issue**: Example response text hardcoded in Swagger docs and service.

#### Authentication Response Example
- **File**: `/home/mnh/projects/syndata/backend/src/core/auth/auth.controller.ts:58-64`
- **Values**:
  - JWT example: `'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'`
  - User ID example: `'123e4567-e89b-12d3-a456-426614174000'`
  - Username example: `'johndoe'`
  - Email example: `'john@example.com'`
- **Issue**: Example data hardcoded in Swagger response schemas.

#### Health Check Response Examples
- **File**: `/home/mnh/projects/syndata/backend/src/core/health/health.controller.ts:29-76`
- **Values**:
  - Status: `'ok'`, `'up'` (repeated 6 times)
  - Database status: `'up'`
  - Memory heap/rss status: `'up'`
- **Issue**: Health check response examples hardcoded multiple times.

#### User Response DTO Examples
- **File**: `/home/mnh/projects/syndata/backend/src/core/auth/dto/user-response.dto.ts`
- **Lines**: 6, 12, 18, 24
- **Values**:
  - ID: `'123e4567-e89b-12d3-a456-426614174000'`
  - Email: `'john.doe@example.com'`
  - First name: `'John'`
  - Last name: `'Doe'`
- **Issue**: Example values hardcoded in DTOs.

#### Login/Register DTO Examples
- **File**: `/home/mnh/projects/syndata/backend/src/core/auth/dto/login.dto.ts`
- **Lines**: 7, 14
- **Values**:
  - Email: `'john.doe@example.com'`
  - Password: `'MySecureP@ss123'`
- **Issue**: Example credentials hardcoded in DTOs.

- **File**: `/home/mnh/projects/syndata/backend/src/core/auth/dto/register.dto.ts`
- **Lines**: 9, 16, 24, 32, 42
- **Values**: Same as above plus first/last names
- **Issue**: Example values hardcoded in DTOs (duplicated).

---

### 4. VALIDATION CONSTRAINTS (Hardcoded Rules)

#### Password Requirements
- **File**: `/home/mnh/projects/syndata/backend/src/common/constants/password.constants.ts`
- **Values**:
  - Regex: `/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/`
  - Min length: `8`
  - Max length: `32`
  - Message: `'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'`
- **Issue**: Validation rules hardcoded. Could be configurable.

#### Name Field Constraints
- **File**: `/home/mnh/projects/syndata/backend/src/core/auth/dto/register.dto.ts`
- **Value**: `50` (max length for first/last names)
- **Issue**: Max length hardcoded in decorator.

---

### 5. RATE LIMITING CONFIGURATION

#### Auth Endpoint Rate Limits (Hardcoded)
- **File**: `/home/mnh/projects/syndata/backend/src/core/auth/auth.controller.ts`
- **Lines**: 30, 50
- **Values**: `{ limit: 10, ttl: 60000 }` (10 requests per 60 seconds)
- **Issue**: Rate limit hardcoded on decorators. Overrides global config.

#### Global Rate Limits (Configurable but with Hardcoded Defaults)
- **File**: `/home/mnh/projects/syndata/backend/src/app.module.ts:64-65`
- **Values**:
  - Default TTL: `60000` (60 seconds)
  - Default Limit: `100` requests
- **Issue**: Default values hardcoded, though configurable via env vars.

- **File**: `/home/mnh/projects/syndata/backend/src/config/configuration.ts:33-34`
- **Values**:
  - Rate limit TTL default: `'60'`
  - Rate limit max default: `'100'`
- **Issue**: Default config values hardcoded.

---

### 6. DATABASE CONFIGURATION

#### Default Pagination
- **File**: `/home/mnh/projects/syndata/backend/src/features/generation/controllers/generation.controller.ts:35-36`
- **Values**: `skip: number = 0, take: number = 10`
- **Issue**: Default pagination size hardcoded (10 records per page).

#### Generated Record Defaults
- **File**: `/home/mnh/projects/syndata/backend/src/features/generation/services/generation.service.ts:79`
- **Value**: `isComposite: false`
- **Issue**: Default field value hardcoded.

#### Password Hashing
- **File**: `/home/mnh/projects/syndata/backend/src/core/auth/production-auth.service.ts:47`
- **Value**: `await bcrypt.hash(password, 10)`
- **Issue**: BCrypt salt rounds (10) hardcoded. Should be configurable.

---

### 7. HEALTH CHECK THRESHOLDS

#### Memory Limits (Hardcoded)
- **File**: `/home/mnh/projects/syndata/backend/src/core/health/health.controller.ts:89-91`
- **Values**: `300 * 1024 * 1024` (300 MB)
- **Issue**: Memory threshold hardcoded (for both heap and RSS). Should be configurable.

---

### 8. RESPONSE STRUCTURE FIELDS

#### Auth Response Fields (Hardcoded Structure)
- **File**: `/home/mnh/projects/syndata/backend/src/common/utils/auth-response.util.ts:17-20`
- **Fields**: `user`, `accessToken`
- **Issue**: Response object structure hardcoded. Not documented as contract.

#### JWT Payload Fields
- **File**: `/home/mnh/projects/syndata/backend/src/common/utils/jwt-token.util.ts:13`
- **Fields**: `sub`, `email`
- **Issue**: JWT payload structure hardcoded.

---

### 9. CORS ALLOWED ORIGINS (Hardcoded Defaults)

- **File**: `/home/mnh/projects/syndata/backend/src/config/configuration.ts:30`
- **Values**: `['http://localhost:4200', 'http://localhost:11001']`
- **Issue**: Default allowed origins hardcoded. 
- **Note**: Configurable via env vars but defaults to localhost only.

---

### 10. LOGGING CONFIGURATION

#### Logging Levels (Environment-Based)
- **File**: `/home/mnh/projects/syndata/backend/src/config/configuration.ts:20-22`
- **Values**:
  - Production: `'warn'`
  - Development: `'debug'`
- **Issue**: Log level logic hardcoded based on NODE_ENV.

---

## FRONTEND HARDCODED VALUES

### 1. UI TEXT AND LABELS (Hardcoded Strings)

#### Navigation Menu Items
- **File**: `/home/mnh/projects/syndata/frontend/src/app/layout/sidebar/sidebar.component.ts:20-25`
- **Values**:
  - `'Dashboard'`, `'/dashboard'`, `'📊'`
  - `'Projects'`, `'/projects'`, `'📁'`
  - `'Datasets'`, `'/datasets'`, `'📋'`
  - `'Generation'`, `'/generation'`, `'⚙️'`
- **Issue**: Navigation items hardcoded in component. No centralized nav configuration.

#### Header Title
- **File**: `/home/mnh/projects/syndata/frontend/src/app/layout/header/header.component.html:4`
- **Value**: `'Syndata'`
- **Issue**: App title hardcoded in template.

#### Button Labels
- **File**: `/home/mnh/projects/syndata/frontend/src/app/features/projects/projects-list.component.html:5`
- **Values**: `'New Project'`, `'Cancel'`
- **Issue**: Button labels hardcoded.

- **File**: `/home/mnh/projects/syndata/frontend/src/app/features/generation/generation.component.html:26`
- **Value**: `'Generate Data'`, `'Generating...'`
- **Issue**: Button text hardcoded.

#### Section Headers
- **File**: `/home/mnh/projects/syndata/frontend/src/app/features/generation/generation.component.html:2, 35`
- **Values**: `'Synthetic Data Generation'`, `'Generation Jobs'`
- **Issue**: Section titles hardcoded.

#### Form Labels
- **File**: `/home/mnh/projects/syndata/frontend/src/app/features/generation/generation.component.html:7, 14, 21`
- **Values**: `'Project:'`, `'Dataset:'`, `'Record Count:'`
- **Issue**: Form labels hardcoded.

---

### 2. ERROR MESSAGES (Frontend)

#### Project Operations
- **File**: `/home/mnh/projects/syndata/frontend/src/app/features/projects/projects-list.component.ts:38, 52, 63`
- **Values**:
  - `'Failed to load projects'`
  - `'Failed to create project'`
  - `'Failed to delete project'`
- **Issue**: Error messages hardcoded in component.

#### Dataset Operations
- **File**: `/home/mnh/projects/syndata/frontend/src/app/features/datasets/datasets-list.component.ts:52, 78`
- **Values**:
  - `'Failed to load datasets'`
  - `'Failed to create dataset'`
- **Issue**: Error messages hardcoded.

#### Generation Operations
- **File**: `/home/mnh/projects/syndata/frontend/src/app/features/generation/generation.component.ts:76, 98`
- **Values**:
  - `'Please select a dataset'`
  - `'Failed to start generation'`
- **Issue**: Error messages hardcoded.

#### Auth Dialog
- **File**: `/home/mnh/projects/syndata/frontend/src/app/features/auth/components/login-dialog.component.ts:77, 98`
- **Values**:
  - `'Login failed. Please try again.'`
  - `'Registration failed. Please try again.'`
- **Issue**: Error messages hardcoded as fallback messages.

#### Dataset Detail
- **File**: `/home/mnh/projects/syndata/frontend/src/app/features/datasets/dataset-detail.component.ts:51, 67`
- **Values**:
  - `'Failed to load dataset'`
  - `'Failed to load elements'`
- **Issue**: Error messages hardcoded.

#### Project Detail
- **File**: `/home/mnh/projects/syndata/frontend/src/app/features/projects/project-detail.component.ts:40`
- **Value**: `'Failed to load project'`
- **Issue**: Error message hardcoded.

---

### 3. PLACEHOLDER TEXTS

- **File**: `/home/mnh/projects/syndata/frontend/src/app/features/projects/projects-list.component.html:16`
- **Value**: `'Search projects...'`
- **Issue**: Placeholder text hardcoded.

---

### 4. CONFIRMATION DIALOGS

- **File**: `/home/mnh/projects/syndata/frontend/src/app/features/projects/projects-list.component.ts:59`
- **Value**: `'Are you sure you want to delete this project?'`
- **Issue**: Confirmation message hardcoded.

---

### 5. FALLBACK/EMPTY STATE MESSAGES

- **File**: `/home/mnh/projects/syndata/frontend/src/app/features/projects/projects-list.component.html:22`
- **Value**: `'No projects found. Create one to get started!'`
- **Issue**: Empty state message hardcoded.

- **File**: `/home/mnh/projects/syndata/frontend/src/app/features/projects/projects-list.component.html:31`
- **Value**: `'No description'`
- **Issue**: Default fallback text hardcoded.

- **File**: `/home/mnh/projects/syndata/frontend/src/app/features/generation/generation.component.html:38`
- **Value**: `'No generation jobs yet.'`
- **Issue**: Empty state message hardcoded.

---

### 6. STATUS COLOR MAPPING

- **File**: `/home/mnh/projects/syndata/frontend/src/app/features/generation/generation.component.ts:105-113`
- **Values**:
  ```typescript
  {
    'pending': '#ffd700',   // Gold
    'running': '#667eea',   // Blue
    'completed': '#28a745',  // Green
    'failed': '#dc3545'      // Red
  }
  ```
- **Issue**: Status-to-color mapping hardcoded. Should be configurable or in constants.

---

### 7. API ENDPOINTS (Environment-Based)

#### Local Development
- **File**: `/home/mnh/projects/syndata/frontend/src/environments/environment.ts:5`
- **Value**: `'http://localhost:3000'`
- **Issue**: Backend URL hardcoded for development.

#### Docker Development
- **File**: `/home/mnh/projects/syndata/frontend/src/environments/environment.docker.ts:5`
- **Value**: `'http://localhost:11002'`
- **Issue**: Backend URL hardcoded for Docker environment.

#### Production
- **File**: `/home/mnh/projects/syndata/frontend/src/environments/environment.production.ts:5`
- **Value**: `'/api'` (relative URL)
- **Issue**: Relative API path hardcoded for production.

---

### 8. UI STATE DEFAULT VALUES

#### Form Initialization
- **File**: `/home/mnh/projects/syndata/frontend/src/app/features/datasets/datasets-list.component.ts:20`
- **Value**: `{ name: '', schemaDefinition: {} }`
- **Issue**: Default form structure hardcoded.

#### Record Count Default
- **File**: `/home/mnh/projects/syndata/frontend/src/app/features/generation/generation.component.ts:20`
- **Value**: `100`
- **Issue**: Default record generation count hardcoded.

#### Pagination Defaults
- **File**: `/home/mnh/projects/syndata/frontend/src/app/features/generation/generation.component.ts:36`
- **Value**: Auto-refresh timeout: `2000` ms
- **Issue**: Hardcoded auto-refresh delay.

---

### 9. FORM VALIDATION MESSAGES

- **File**: `/home/mnh/projects/syndata/frontend/src/app/features/datasets/datasets-list.component.ts:64`
- **Value**: `'Dataset name is required'`
- **Issue**: Validation message hardcoded in alert.

---

## SUMMARY TABLE

| Category | Count | Severity | Location |
|----------|-------|----------|----------|
| Status Values | 6 | High | Service/Entity |
| Error Messages | 25+ | Medium | Controllers/Services/Components |
| API Response Examples | 15+ | Low | DTO/Controllers |
| Validation Messages | 10+ | Medium | DTOs/Services |
| Rate Limiting | 3 | Medium | Controllers/Config |
| UI Text/Labels | 15+ | Medium | Components/Templates |
| Color Mappings | 1 | Low | Components |
| Configuration Defaults | 5 | Medium | Config/Services |
| Memory Thresholds | 1 | Medium | Health Controller |
| Password Hashing Rounds | 1 | High | Auth Service |
| **TOTAL** | **80+** | **Mixed** | **Multiple** |

---

## KEY FINDINGS

### Critical Issues:

1. **No Status Constants**: Job status values are hardcoded strings without enum or constant definitions
2. **No Enum for Field Types**: Field types hardcoded as strings in switch statements
3. **Duplicated Error Messages**: Same error messages defined in multiple places
4. **Password Hashing**: BCrypt salt rounds hardcoded (should be configurable)
5. **Memory Thresholds**: Health check memory limits hardcoded without configuration

### Medium Priority Issues:

1. **Hardcoded Rate Limits**: Auth endpoints override global config with hardcoded values
2. **Status-to-Color Mapping**: Frontend color scheme hardcoded in component
3. **Navigation Items**: Menu structure hardcoded in sidebar component
4. **Default Pagination**: Hardcoded to 10 records per page

### Low Priority Issues:

1. **Example Data in Swagger**: Documentation examples hardcoded but acceptable
2. **UI Labels**: Button text and form labels hardcoded (consider i18n for multi-language support)
3. **Placeholder Texts**: Form placeholders hardcoded

---

## RECOMMENDATIONS

1. **Create Enums/Constants**:
   - `JobStatus.PENDING`, `JobStatus.RUNNING`, etc.
   - `FieldType.STRING`, `FieldType.EMAIL`, etc.
   - `AnnotationType` enum
   - `SourceType` enum with confidence scores

2. **Centralize Error Messages**:
   - Create `error-messages.constants.ts`
   - Use I18n library for multi-language support

3. **Move Configuration to Env Vars**:
   - Memory thresholds
   - BCrypt salt rounds
   - Pagination defaults
   - Auto-refresh delays

4. **Create UI Constants**:
   - Navigation items configuration
   - Status color mappings
   - Validation messages

5. **Use DTOs for Response Contracts**:
   - Define explicit response types instead of relying on implicit structure

6. **Consider Feature Flags**:
   - For toggling features without code changes

7. **Create Configuration Schema**:
   - Document all configurable values
   - Provide sensible defaults
   - Validate configuration on startup

