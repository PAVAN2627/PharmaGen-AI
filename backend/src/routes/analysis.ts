import { Router, Request, Response } from 'express';
import multer from 'multer';
import { AnalysisService } from '../services/analysisService';
import { validateAnalysisRequest } from '../middleware/validation';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../utils/logger';

const router = Router();
const analysisService = new AnalysisService();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10)
  }
});

/**
 * POST /api/analysis/analyze
 * Analyze VCF file for pharmacogenomic risks
 */
router.post(
  '/analyze',
  upload.single('vcfFile'),
  validateAnalysisRequest,
  asyncHandler(async (req: Request, res: Response) => {
    logger.info('Received analysis request', {
      drugs: req.body.drugs,
      patientId: req.body.patientId,
      filename: req.file?.originalname
    });

    const results = await analysisService.analyzeVCF({
      vcfFile: req.file!,
      drugs: req.body.drugs,
      patientId: req.body.patientId
    });

    logger.info(`Analysis completed successfully. Returning ${results.length} results`);

    const response = {
      success: true,
      data: results,
      metadata: {
        analyzed_drugs: results.length,
        timestamp: new Date().toISOString()
      }
    };

    logger.info('Sending response to client');
    res.json(response);
  })
);

/**
 * GET /api/analysis/supported-drugs
 * Get list of supported drugs
 */
router.get(
  '/supported-drugs',
  asyncHandler(async (_req: Request, res: Response) => {
    const drugs = analysisService.getSupportedDrugs();
    
    res.json({
      success: true,
      data: {
        drugs,
        count: drugs.length
      }
    });
  })
);

/**
 * POST /api/analysis/validate-drugs
 * Validate drug names
 */
router.post(
  '/validate-drugs',
  asyncHandler(async (req: Request, res: Response) => {
    const { drugs } = req.body;

    if (!drugs || !Array.isArray(drugs)) {
      res.status(400).json({
        success: false,
        error: { message: 'Drugs array is required' }
      });
      return;
    }

    const validation = analysisService.validateDrugs(drugs);

    res.json({
      success: true,
      data: validation
    });
  })
);

/**
 * GET /api/analysis/health
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'pharmagenai-backend'
    }
  });
});

export default router;
