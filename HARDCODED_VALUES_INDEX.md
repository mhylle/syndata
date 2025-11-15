# Hardcoded Values Quick Reference Index

## File-by-File Directory

### Backend Files with Hardcoded Values

#### Status & Type Values
- **generation-job.entity.ts:14** - Default status 'pending'
- **generation.service.ts:49,58,108,112** - Status strings: 'running', 'failed', 'completed'
- **validation.service.ts:18** - Field types array: ['string', 'number', 'date', 'boolean', 'email']
- **simple-data-generator.service.ts:72-100** - Type matching switch statement
- **simple-data-generator.service.ts:16-32** - Source types with confidence scores
- **annotation.service.ts:20,34,45,54,62,70,77** - Annotation types: 'record', 'field', 'source', 'confidence', 'generation_type'

#### Error Messages (Critical - Duplicated)
- **production-auth.service.ts:35,43,74** - Auth errors: 'Passwords do not match', 'User with this email already exists', 'Invalid credentials'
- **register.dto.ts:11,27,37,47** - Validation messages (duplicated in login.dto.ts)
- **validation.service.ts:8,13-14,20-21** - Schema validation errors
- **generation.service.ts:122,146** - Not found errors for jobs and records
- **dataset.service.ts:34,55** - Not found errors for datasets and elements
- **project.service.ts:27** - Project not found error
- **http-exception.filter.ts:103,111** - 'Internal server error' (appears twice)
- **local.strategy.ts:18,25** - Auth strategy errors
- **jwt.strategy.ts:16** - JWT_SECRET error
- **auth.controller.ts:102** - User not found error

#### Configuration Values (Hardcoded Defaults)
- **auth.controller.ts:30,50** - Rate limit: limit:10, ttl:60000
- **app.module.ts:64-65** - Global rate limits: ttl:60000, limit:100
- **configuration.ts:30,33-34** - CORS origins, rate limit defaults
- **generation.controller.ts:35-36** - Pagination: skip:0, take:10
- **generation.service.ts:79** - isComposite:false default
- **production-auth.service.ts:47** - BCrypt salt rounds: 10
- **health.controller.ts:89-91** - Memory thresholds: 300 * 1024 * 1024

#### Password & Validation
- **password.constants.ts** - Regex, min:8, max:32 length
- **register.dto.ts** - Max length for names: 50

#### Response Structures
- **auth-response.util.ts:17-20** - {user, accessToken}
- **jwt-token.util.ts:13** - {sub, email}

#### API Examples (Swagger)
- **app.controller.ts:17** - 'Hello World!'
- **auth.controller.ts:58-64** - JWT example, user UUID, username
- **health.controller.ts:29-76** - Status examples
- **user-response.dto.ts** - User UUID, email examples
- **login.dto.ts, register.dto.ts** - Example credentials

---

### Frontend Files with Hardcoded Values

#### UI Text & Labels (Priority: Move to i18n)
- **sidebar.component.ts:20-25** - Nav items: Dashboard, Projects, Datasets, Generation
- **header.component.html:4** - App title: 'Syndata'
- **projects-list.component.html:5** - Button labels: 'New Project', 'Cancel'
- **generation.component.html:26** - Button text: 'Generate Data', 'Generating...'

#### Section Headers & Form Labels
- **generation.component.html:2,35** - Titles: 'Synthetic Data Generation', 'Generation Jobs'
- **generation.component.html:7,14,21** - Form labels: 'Project:', 'Dataset:', 'Record Count:'

#### Error Messages (Duplicated in Multiple Components)
- **projects-list.component.ts:38,52,63** - Failed to load/create/delete projects
- **datasets-list.component.ts:52,78** - Failed to load/create datasets
- **generation.component.ts:76,98** - Dataset selection, generation start errors
- **login-dialog.component.ts:77,98** - Login/registration failure messages
- **dataset-detail.component.ts:51,67** - Dataset and elements load errors
- **project-detail.component.ts:40** - Project load error

#### Placeholders & Messages
- **projects-list.component.html:16** - 'Search projects...'
- **projects-list.component.ts:59** - Delete confirmation: 'Are you sure you want to delete this project?'
- **projects-list.component.html:22,31** - Empty states and defaults
- **generation.component.html:38** - 'No generation jobs yet.'

#### Status Color Mapping (Should be Constants)
- **generation.component.ts:105-113** - Status colors: pending:#ffd700, running:#667eea, completed:#28a745, failed:#dc3545

#### API Endpoints (Environment-Based)
- **environment.ts:5** - 'http://localhost:3000'
- **environment.docker.ts:5** - 'http://localhost:11002'
- **environment.production.ts:5** - '/api'

#### UI State Defaults
- **datasets-list.component.ts:20** - Form structure: {name, schemaDefinition}
- **generation.component.ts:20** - Default record count: 100
- **generation.component.ts:36** - Auto-refresh delay: 2000ms
- **datasets-list.component.ts:64** - Validation alert: 'Dataset name is required'

---

## Quick Fix Priority Matrix

### HIGH PRIORITY (Security/Data Integrity)
1. BCrypt salt rounds (production-auth.service.ts:47) - Move to config
2. Memory thresholds (health.controller.ts:89-91) - Move to config
3. Status strings without enum (generation.service.ts) - Create enum
4. Field type validation (validation.service.ts:18) - Create enum

### MEDIUM PRIORITY (Maintainability)
1. Centralize error messages (25+ locations) - Create constants file
2. Rate limit overrides (auth.controller.ts) - Use global config
3. Pagination defaults (generation.controller.ts:35-36) - Move to config
4. Status-to-color mapping (generation.component.ts) - Create constants
5. Navigation items (sidebar.component.ts) - Create configuration

### LOW PRIORITY (Quality/UX)
1. UI labels and text - Setup i18n
2. API example values - Already in docs
3. Placeholder texts - Consider i18n
4. Validation messages - Move to shared constants

---

## By Severity

### CRITICAL (5 findings)
- [ ] No enum for job status values
- [ ] No enum for field types
- [ ] BCrypt salt hardcoded
- [ ] Memory thresholds hardcoded
- [ ] Password validation rules hardcoded

### HIGH (10+ findings)
- [ ] 25+ error messages duplicated
- [ ] Rate limit overrides
- [ ] Default pagination size
- [ ] Auth response structure
- [ ] Pagination parameters

### MEDIUM (20+ findings)
- [ ] Status-to-color mapping
- [ ] Navigation items
- [ ] Form labels
- [ ] Button text
- [ ] Placeholder text

### LOW (10+ findings)
- [ ] API documentation examples
- [ ] Validation error messages
- [ ] Empty state messages
- [ ] Confirmation dialogs

---

## Refactoring Checklist

### Step 1: Create Constants Files
- [ ] `backend/src/constants/job-status.enum.ts`
- [ ] `backend/src/constants/field-type.enum.ts`
- [ ] `backend/src/constants/error-messages.constants.ts`
- [ ] `backend/src/constants/annotation-types.enum.ts`
- [ ] `frontend/src/app/shared/constants/ui-labels.constants.ts`
- [ ] `frontend/src/app/shared/constants/status-colors.constants.ts`

### Step 2: Move Configuration to Environment
- [ ] Database connection strings (already done)
- [ ] Memory thresholds (health.controller.ts)
- [ ] BCrypt salt rounds (production-auth.service.ts)
- [ ] Pagination size (generation.controller.ts)
- [ ] Rate limits (auth.controller.ts)
- [ ] Auto-refresh delays (generation.component.ts)

### Step 3: Create Configuration Schema
- [ ] Document all environment variables
- [ ] Document default values
- [ ] Add validation on app startup
- [ ] Create .env.example with all vars

### Step 4: Setup I18n (Frontend)
- [ ] Install @angular/localize
- [ ] Extract hardcoded strings to i18n files
- [ ] Create messages.en.json
- [ ] Setup language switching

### Step 5: Refactor Components
- [ ] Import constants instead of hardcoding
- [ ] Use dependency injection for config
- [ ] Update tests to use constants
- [ ] Update documentation

---

## Testing Checklist

After refactoring, verify:
- [ ] Status enums match database values
- [ ] Field type validation still works
- [ ] Error messages display correctly
- [ ] Rate limits are enforced
- [ ] Color mappings are correct
- [ ] No broken links or UI layout issues
- [ ] Tests still pass with new constants
- [ ] Config validation catches missing env vars

