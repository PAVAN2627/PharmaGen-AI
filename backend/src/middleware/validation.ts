import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AppError } from './errorHandler';

// Schema for analysis request
export const analysisRequestSchema = z.object({
  drugs: z.string()
    .min(1, 'At least one drug must be specified')
    .transform(str => str.split(',').map(d => d.trim().toUpperCase()))
    .refine(
      drugs => drugs.length > 0 && drugs.every(d => d.length > 0),
      'Invalid drug list format'
    ),
  patientId: z.string().optional()
});

export const validateAnalysisRequest = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    // Validate file upload
    if (!req.file) {
      throw new AppError('VCF file is required', 400);
    }

    // Check file extension
    const filename = req.file.originalname.toLowerCase();
    if (!filename.endsWith('.vcf') && !filename.endsWith('.vcf.gz')) {
      throw new AppError('Invalid file format. Only .vcf or .vcf.gz files are accepted', 400);
    }

    // Check file size (5MB limit)
    const maxSize = parseInt(process.env.MAX_FILE_SIZE || '5242880', 10);
    if (req.file.size > maxSize) {
      throw new AppError(`File size exceeds maximum limit of ${maxSize / 1024 / 1024}MB`, 400);
    }

    // Validate request body
    const result = analysisRequestSchema.safeParse(req.body);
    
    if (!result.success) {
      const errors = result.error.errors.map(e => e.message).join(', ');
      throw new AppError(`Validation error: ${errors}`, 400);
    }

    // Attach validated data
    req.body.drugs = result.data.drugs;
    req.body.patientId = result.data.patientId;

    next();
  } catch (error) {
    next(error);
  }
};

export const validateDrugsQuery = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const drugs = req.query.drugs;
    
    if (!drugs || typeof drugs !== 'string') {
      throw new AppError('Drugs query parameter is required', 400);
    }

    const drugList = drugs.split(',').map(d => d.trim().toUpperCase());
    
    if (drugList.length === 0) {
      throw new AppError('At least one drug must be specified', 400);
    }

    req.query.drugs = drugList.join(',');
    next();
  } catch (error) {
    next(error);
  }
};
