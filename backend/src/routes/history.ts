import { Router, Request, Response } from 'express';
import { AnalysisService } from '../services/analysisService';
import { asyncHandler } from '../middleware/errorHandler';
import logger from '../utils/logger';

const router = Router();
const analysisService = new AnalysisService();

/**
 * GET /api/history/patient/:patientId
 * Get analysis history for a specific patient
 */
router.get(
  '/patient/:patientId',
  asyncHandler(async (req: Request, res: Response) => {
    const { patientId } = req.params;
    
    logger.info(`Fetching history for patient: ${patientId}`);
    
    const results = await analysisService.getPatientHistory(patientId);
    
    res.json({
      success: true,
      data: {
        patient_id: patientId,
        analyses: results,
        count: results.length
      }
    });
  })
);

/**
 * GET /api/history/recent
 * Get recent analyses across all patients
 */
router.get(
  '/recent',
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 20;
    
    logger.info(`Fetching ${limit} recent analyses`);
    
    const results = await analysisService.getRecentAnalyses(limit);
    
    res.json({
      success: true,
      data: {
        analyses: results,
        count: results.length
      }
    });
  })
);

/**
 * GET /api/history/analysis/:analysisId
 * Get a specific analysis by ID
 */
router.get(
  '/analysis/:analysisId',
  asyncHandler(async (req: Request, res: Response) => {
    const { analysisId } = req.params;
    
    logger.info(`Fetching analysis: ${analysisId}`);
    
    const result = await analysisService.getAnalysisById(analysisId);
    
    if (!result) {
      res.status(404).json({
        success: false,
        error: { message: 'Analysis not found' }
      });
      return;
    }
    
    res.json({
      success: true,
      data: result
    });
  })
);

export default router;
