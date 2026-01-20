// Configuration settings for the backend server
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = {
  // Server settings
  port: process.env.PORT || 3000,
  host: process.env.HOST || 'localhost',
  
  // JWT settings
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  
  // Database
  dbPath: process.env.DB_PATH || join(__dirname, '..', 'database', 'cronjobs.db'),
  
  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
  logDir: process.env.LOG_DIR || join(__dirname, '..', 'logs'),
  
  // CORS
  corsOrigins: process.env.CORS_ORIGINS ? 
    process.env.CORS_ORIGINS.split(',') : 
    ['http://localhost:5173', 'http://localhost:3000'],
  
  // Rate limiting
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  
  // Default admin credentials (change in production!)
  defaultAdmin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123'
  },
  
  // Crontab settings
  crontab: {
    // Mock mode for Windows development
    mockMode: process.platform === 'win32',
    // User whose crontab to manage
    user: process.env.CRON_USER || null // null means current user
  }
};

export default config;
