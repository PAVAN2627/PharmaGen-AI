import { getFirestore, isFirebaseAvailable } from '../config/firebase';
import { AnalysisResult } from '../types';
import logger from '../utils/logger';

export class StorageService {
  private db: any;

  constructor() {
    this.db = getFirestore();
  }

  /**
   * Save analysis result to Firestore
   */
  async saveAnalysisResult(result: AnalysisResult): Promise<string | null> {
    if (!this.db || !isFirebaseAvailable()) {
      logger.warn('Firebase not available - skipping result storage', {
        hasDb: !!this.db,
        firebaseAvailable: isFirebaseAvailable()
      });
      return null;
    }

    try {
      logger.info('Saving analysis result to Firestore', {
        patient_id: result.patient_id,
        drug: result.drug,
        risk_label: result.risk_assessment.risk_label,
        phenotype: result.pharmacogenomic_profile?.phenotype
      });

      const docRef = await this.db.collection('analyses').add({
        ...result,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      logger.info(`✅ Analysis result saved with ID: ${docRef.id}`, {
        patient_id: result.patient_id,
        drug: result.drug,
        firebaseId: docRef.id
      });
      return docRef.id;
    } catch (error) {
      logger.error('❌ Failed to save analysis result to Firestore', {
        patient_id: result.patient_id,
        drug: result.drug,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return null;
    }
  }

  /**
   * Get analysis results for a patient
   */
  async getPatientAnalyses(patientId: string): Promise<AnalysisResult[]> {
    if (!this.db || !isFirebaseAvailable()) {
      logger.warn('Firebase not available - returning empty results', {
        patientId,
        hasDb: !!this.db,
        firebaseAvailable: isFirebaseAvailable()
      });
      return [];
    }

    try {
      logger.info('Fetching patient analyses from Firestore', {
        patientId,
        query: 'where patient_id == ? orderBy created_at desc limit 50'
      });

      const snapshot = await this.db
        .collection('analyses')
        .where('patient_id', '==', patientId)
        .orderBy('created_at', 'desc')
        .limit(50)
        .get();

      const results: AnalysisResult[] = [];
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        results.push({
          ...data,
          id: doc.id,
          timestamp: data.timestamp || data.created_at // Support both fields
        } as AnalysisResult);
      });

      logger.info(`✅ Fetched ${results.length} analyses for patient ${patientId}`, {
        patientId,
        count: results.length,
        drugs: results.map(r => r.drug)
      });

      return results;
    } catch (error) {
      logger.error('❌ Failed to fetch patient analyses:', {
        patientId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return [];
    }
  }

  /**
   * Get a specific analysis by ID
   */
  async getAnalysisById(analysisId: string): Promise<AnalysisResult | null> {
    if (!this.db || !isFirebaseAvailable()) {
      return null;
    }

    try {
      const doc = await this.db.collection('analyses').doc(analysisId).get();
      
      if (!doc.exists) {
        return null;
      }

      return {
        ...doc.data(),
        id: doc.id
      } as AnalysisResult;
    } catch (error) {
      logger.error('Failed to fetch analysis:', error);
      return null;
    }
  }

  /**
   * Get recent analyses (for history view)
   */
  async getRecentAnalyses(limit: number = 20): Promise<AnalysisResult[]> {
    if (!this.db || !isFirebaseAvailable()) {
      logger.warn('Firebase not available - returning empty results for recent analyses', {
        limit,
        hasDb: !!this.db
      });
      return [];
    }

    try {
      logger.info('Fetching recent analyses from Firestore', {
        limit,
        query: 'orderBy created_at desc limit ?'
      });

      const snapshot = await this.db
        .collection('analyses')
        .orderBy('created_at', 'desc')
        .limit(limit)
        .get();

      const results: AnalysisResult[] = [];
      snapshot.forEach((doc: any) => {
        const data = doc.data();
        results.push({
          ...data,
          id: doc.id,
          timestamp: data.timestamp || data.created_at // Support both fields
        } as AnalysisResult);
      });

      logger.info(`✅ Fetched ${results.length} recent analyses`, {
        limit,
        count: results.length,
        drugs: results.map(r => r.drug),
        patients: Array.from(new Set(results.map(r => r.patient_id)))
      });

      return results;
    } catch (error) {
      logger.error('❌ Failed to fetch recent analyses:', {
        limit,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return [];
    }
  }

  /**
   * Delete an analysis
   */
  async deleteAnalysis(analysisId: string): Promise<boolean> {
    if (!this.db || !isFirebaseAvailable()) {
      return false;
    }

    try {
      await this.db.collection('analyses').doc(analysisId).delete();
      logger.info(`Analysis ${analysisId} deleted`);
      return true;
    } catch (error) {
      logger.error('Failed to delete analysis:', error);
      return false;
    }
  }

  /**
   * Get statistics
   */
  async getStatistics(): Promise<{
    totalAnalyses: number;
    uniquePatients: number;
    analysesByDrug: Record<string, number>;
  }> {
    if (!this.db || !isFirebaseAvailable()) {
      return {
        totalAnalyses: 0,
        uniquePatients: 0,
        analysesByDrug: {}
      };
    }

    try {
      const snapshot = await this.db.collection('analyses').get();
      
      const uniquePatients = new Set<string>();
      const drugCounts: Record<string, number> = {};

      snapshot.forEach((doc: any) => {
        const data = doc.data();
        uniquePatients.add(data.patient_id);
        
        const drug = data.drug;
        drugCounts[drug] = (drugCounts[drug] || 0) + 1;
      });

      return {
        totalAnalyses: snapshot.size,
        uniquePatients: uniquePatients.size,
        analysesByDrug: drugCounts
      };
    } catch (error) {
      logger.error('Failed to fetch statistics:', error);
      return {
        totalAnalyses: 0,
        uniquePatients: 0,
        analysesByDrug: {}
      };
    }
  }
}
