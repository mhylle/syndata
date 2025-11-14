# Phase 5 Quick Reference Guide

## 🚀 Quick Access

### Swagger API Documentation
```
http://localhost:3000/api/docs
```

### Health Check Endpoint
```
GET http://localhost:3000/health
```

## 📝 Environment Variables

Add to `.env`:
```env
# CORS Configuration
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:11001

# Rate Limiting
RATE_LIMIT_TTL=60        # seconds
RATE_LIMIT_MAX=100       # requests per window

# Environment
NODE_ENV=development     # or production
```

## 🔧 Testing Commands

### Test Health Check
```bash
curl http://localhost:3000/health
```

### Test Rate Limiting
```bash
# Auth endpoints: 10 requests per minute
for i in {1..12}; do curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'; done
```

### Test CORS
```bash
curl http://localhost:3000/health \
  -H "Origin: http://localhost:4200" -v 2>&1 | grep "access-control"
```

### Run Tests
```bash
npm test
```

## 🗄️ Database Migrations

### Auto-run in Production
Set `NODE_ENV=production` and migrations run automatically on startup.

### Add New Migration
1. Edit `src/core/migrations/database-migrations.service.ts`
2. Add method: `migration00X_description()`
3. Register in `runMigrations()`:
   ```typescript
   await this.runMigration('00X_description', () =>
     this.migration00X_description()
   );
   ```

## 🛡️ Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| POST /auth/register | 10 | 60s |
| POST /auth/login | 10 | 60s |
| All others | 100 | 60s |

## 📊 Health Check Response

```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" },
    "memory_heap": { "status": "up" },
    "memory_rss": { "status": "up" }
  }
}
```

## 🔐 Swagger Auth

1. Get JWT token from `/auth/login`
2. Click "Authorize" in Swagger UI
3. Enter: `Bearer <your-token>`
4. Test protected endpoints

## 📦 New Packages

```json
{
  "@nestjs/terminus": "^11.0.0",
  "@nestjs/throttler": "^6.4.0",
  "@nestjs/swagger": "^11.2.0"
}
```

## 🎯 Key Files

### Configuration
- `src/config/configuration.ts` - App config
- `src/main.ts` - Bootstrap & Swagger setup
- `src/app.module.ts` - Module imports

### Health Check
- `src/core/health/health.controller.ts`
- `src/core/health/health.module.ts`

### Migrations
- `src/core/migrations/database-migrations.service.ts`
- `src/core/migrations/migrations.module.ts`

### Enhanced Controllers
- `src/core/auth/auth.controller.ts` - Swagger + Rate limit
- `src/hello-world/hello-world.controller.ts` - Swagger docs
- `src/app.controller.ts` - Swagger docs

## 🐛 Troubleshooting

### Build Errors
```bash
# Stop dev server first
lsof -ti :3000 | xargs kill -9
npm run build
```

### Health Check 503
```bash
# Check database
docker-compose ps postgres
```

### CORS Errors
```bash
# Verify ALLOWED_ORIGINS in .env
echo $ALLOWED_ORIGINS
```

## ✅ Verification Checklist

- [ ] Tests passing: `npm test`
- [ ] Swagger accessible: http://localhost:3000/api/docs
- [ ] Health check works: `curl http://localhost:3000/health`
- [ ] Rate limiting active: Test with multiple requests
- [ ] CORS configured: Check browser console
- [ ] Migrations ready: `NODE_ENV=production npm start`

## 🚀 Production Deployment

1. Set environment variables
2. Run migrations: `NODE_ENV=production`
3. Monitor health: `/health` endpoint
4. Check logs for migration status
5. Verify rate limits in place
6. Test API documentation

## 📚 Documentation

Full details: `PHASE5_ARCHITECTURE_ENHANCEMENTS.md`
