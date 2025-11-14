# Syndata MVP - Quick Start Guide

## 🚀 Start the Application

### Option 1: Docker Compose (Recommended)
```bash
cd /home/mnh/projects/syndata
docker compose up -d
```

Access:
- **Frontend:** http://localhost:11001
- **Backend API:** http://localhost:11002
- **API Docs:** http://localhost:11002/api/docs

### Option 2: Local Development

**Terminal 1: Start Database**
```bash
cd /home/mnh/projects/syndata
docker compose up -d postgres
```

**Terminal 2: Start Backend**
```bash
cd /home/mnh/projects/syndata/backend
npm install
npm run start:dev
```
Backend runs on http://localhost:3000

**Terminal 3: Start Frontend**
```bash
cd /home/mnh/projects/syndata/frontend
npm install
npm start
```
Frontend runs on http://localhost:4200

---

## 🧪 Test the Application

### 1. Create a Project
**Backend API:**
```bash
curl -X POST http://localhost:3000/projects \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Project", "description": "My first project"}'
```

**Or use Frontend:**
- Navigate to http://localhost:4200/projects
- Click "New Project"
- Fill in name and description
- Click "Create Project"

### 2. Create a Dataset
**Backend API:**
```bash
curl -X POST http://localhost:3000/projects/{projectId}/datasets \
  -H "Content-Type: application/json" \
  -d '{
    "name": "User Data",
    "schema": {
      "fields": [
        {"name": "id", "type": "string"},
        {"name": "email", "type": "email"},
        {"name": "age", "type": "number"}
      ]
    }
  }'
```

**Or use Frontend:**
- Go to Datasets page
- Select a project
- Click "New Dataset"
- Fill in dataset name
- Click "Create Dataset"

### 3. Generate Synthetic Data
**Backend API:**
```bash
curl -X POST http://localhost:3000/projects/{projectId}/generate \
  -H "Content-Type: application/json" \
  -d '{
    "datasetId": "{datasetId}",
    "count": 100
  }'
```

**Or use Frontend:**
- Go to Generation page
- Select project and dataset
- Enter number of records (1-10,000)
- Click "Generate Data"

### 4. View Results
**Backend API:**
```bash
curl http://localhost:3000/projects/{projectId}/records?jobId={jobId}&skip=0&take=10
```

**Or use Frontend:**
- See job status in Generation page
- View generated records once completed

---

## 📊 Swagger API Documentation

Open browser to:
```
http://localhost:3000/api/docs
```

This shows all available endpoints with:
- Request/response schemas
- Try-it-out functionality
- Authentication requirements
- Error examples

---

## 🛑 Stop the Application

### Docker Compose
```bash
docker compose down
```

### Local Development
- Stop Terminal 1 (Ctrl+C) - Frontend
- Stop Terminal 2 (Ctrl+C) - Backend
- Stop Docker: `docker compose down postgres`

---

## 🐛 Troubleshooting

### Port Already in Use
If you get "port already in use" error:

```bash
# Find process using port 3000
lsof -i :3000

# Kill process
kill -9 <PID>
```

### Database Connection Error
Ensure PostgreSQL is running:
```bash
docker ps | grep postgres
```

If not running:
```bash
docker compose up -d postgres
```

### Frontend Can't Connect to Backend
Check that backend is running and environment is correct:

**Frontend environment:** `src/environments/environment.ts`
```typescript
export const environment = {
  apiUrl: 'http://localhost:3000'
};
```

For Docker: Update to `http://localhost:11002`

### Tests Failing
Run tests individually:

**Backend:**
```bash
cd backend
npm run test -- project.service.spec.ts
```

**Frontend:**
```bash
cd frontend
npm test
```

---

## 📁 Project Structure

```
syndata/
├── backend/
│   ├── src/
│   │   ├── features/        # Feature modules
│   │   ├── shared/entities/ # Database entities
│   │   └── app.module.ts    # Root module
│   ├── dist/                # Compiled code
│   └── package.json
│
├── frontend/
│   ├── src/app/
│   │   ├── features/        # Feature components
│   │   ├── layout/          # Layout components
│   │   └── app.routes.ts    # Routes
│   ├── dist/frontend        # Built app
│   └── package.json
│
├── docker-compose.yml       # Docker configuration
├── IMPLEMENTATION_SUMMARY.md # Full documentation
└── QUICK_START.md          # This file
```

---

## 📚 More Information

- **Full Documentation:** See `IMPLEMENTATION_SUMMARY.md`
- **Development Guide:** See `CLAUDE.md`
- **Architecture:** See `docs/plans/2024-11-14-syndata-mvp-design.md`
- **Implementation Plan:** See `docs/plans/2024-11-14-syndata-implementation.md`

---

## ✅ Verification

After starting, verify everything is working:

1. **Backend:**
   ```bash
   curl http://localhost:3000/api/docs
   ```
   Should return Swagger UI

2. **Frontend:**
   - Visit http://localhost:4200
   - Should see Dashboard with stats
   - Navigation should work

3. **API Integration:**
   - Create project from frontend
   - Should appear in projects list
   - No console errors

---

## 🎯 What's Been Implemented

✅ Backend Foundation (Phase 1)
- 8 TypeORM entities
- 5 DTOs with validation
- 3 Controllers with 16 endpoints
- 2 Core services (Project, Dataset)

✅ Backend Generation (Phase 2)
- Validation engine
- Pattern analyzer
- Data generator with faker.js
- Generation orchestrator
- Annotation service

✅ Frontend (Phase 4)
- Header & Sidebar navigation
- Project management (list, create, detail)
- Dataset management
- Generation interface
- Dashboard with stats
- 15 Angular components
- Complete API integration

---

## 🚀 What's Next

1. **Test the MVP:** Follow the test steps above
2. **Explore the UI:** Navigate all pages and features
3. **Review Code:** Check implementation in `/backend/src` and `/frontend/src`
4. **Phase 5:** Testing, optimization, export features

---

**Happy coding! 🎉**
