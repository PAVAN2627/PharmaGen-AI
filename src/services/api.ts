import { AnalysisResult } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Analyze VCF file for pharmacogenomic risks
 */
export async function analyzeVCF(
  file: File,
  drugs: string[],
  patientId?: string
): Promise<AnalysisResult[]> {
  const formData = new FormData();
  formData.append('vcfFile', file);
  formData.append('drugs', drugs.join(','));
  
  if (patientId) {
    formData.append('patientId', patientId);
  }

  const response = await fetch(`${API_BASE_URL}/api/analysis/analyze`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
    throw new ApiError(
      error.error?.message || 'Analysis failed',
      response.status,
      error
    );
  }

  const data = await response.json();
  return data.data;
}

/**
 * Get list of supported drugs
 */
export async function getSupportedDrugs(): Promise<string[]> {
  const response = await fetch(`${API_BASE_URL}/api/analysis/supported-drugs`);

  if (!response.ok) {
    throw new ApiError('Failed to fetch supported drugs', response.status);
  }

  const data = await response.json();
  return data.data.drugs;
}

/**
 * Validate drug names
 */
export async function validateDrugs(drugs: string[]): Promise<{
  valid: boolean;
  invalidDrugs: string[];
}> {
  const response = await fetch(`${API_BASE_URL}/api/analysis/validate-drugs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ drugs }),
  });

  if (!response.ok) {
    throw new ApiError('Failed to validate drugs', response.status);
  }

  const data = await response.json();
  return data.data;
}

/**
 * Check API health
 */
export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/analysis/health`);
    return response.ok;
  } catch {
    return false;
  }
}
