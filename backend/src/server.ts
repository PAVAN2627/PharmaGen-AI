// Load environment variables FIRST
import './config/env';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import analysisRoutes from './routes/analysis';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import logger from './utils/logger';
import path from 'path';
import fs from 'fs';

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Create necessary directories
const logsDir = path.join(__dirname, '../logs');
const uploadsDir = path.join(__dirname, '../uploads');

[logsDir, uploadsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Security middleware
app.use(helmet());

// CORS configuration
const allowedOrigins = [
  process.env.CORS_ORIGIN?.replace(/\/$/, ''), // Remove trailing slash
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:5173'
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Remove trailing slash from origin for comparison
    const normalizedOrigin = origin.replace(/\/$/, '');
    
    if (allowedOrigins.some(allowed => allowed === normalizedOrigin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Request logging
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// API Routes
app.use('/api/analysis', analysisRoutes);

// Root endpoint
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'PharmaGenAI Backend API',
    version: '1.0.0',
    endpoints: {
      analyze: 'POST /api/analysis/analyze',
      supportedDrugs: 'GET /api/analysis/supported-drugs',
      validateDrugs: 'POST /api/analysis/validate-drugs',
      health: 'GET /api/analysis/health'
    }
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 CORS enabled for: ${process.env.CORS_ORIGIN || 'http://localhost:8080'}`);
  
  // Check Gemini API key
  if (!process.env.GEMINI_API_KEY) {
    logger.warn('⚠️  GEMINI_API_KEY not set - LLM explanations will use fallback mode');
  } else {
    logger.info('✅ Gemini API key configured');
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  process.exit(0);
});

// Unhandled rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

export default app;
