import * as fs from 'fs';
import * as path from 'path';

// Load test environment variables from .env.test
const envTestPath = path.resolve(__dirname, '../.env.test');
if (fs.existsSync(envTestPath)) {
  const envConfig = fs.readFileSync(envTestPath, 'utf-8');
  envConfig.split('\n').forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=');
      const value = valueParts.join('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    }
  });
}

// Ensure AUTH_MODE is set to production for E2E tests
process.env.AUTH_MODE = 'production';
