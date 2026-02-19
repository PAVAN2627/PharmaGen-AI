import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { Phenotype } from '../types';
import logger from '../utils/logger';

interface PharmcatGeneCall {
  gene: string;
  diplotype: string;
  phenotype: Phenotype;
}

export class PharmcatService {
  private enabled: boolean;
  private commandTemplate: string;
  private outputDir: string;
  private reportFileName: string;

  constructor() {
    this.enabled = (process.env.PHARMCAT_ENABLED || 'false').toLowerCase() === 'true';
    this.commandTemplate = process.env.PHARMCAT_COMMAND || '';
    this.outputDir = process.env.PHARMCAT_OUTPUT_DIR || path.resolve(__dirname, '../../pharmcat-output');
    this.reportFileName = process.env.PHARMCAT_REPORT_NAME || 'pharmcat.report.json';
  }

  isEnabled(): boolean {
    return this.enabled && Boolean(this.commandTemplate);
  }

  async analyzeVcf(vcfPath: string): Promise<Map<string, PharmcatGeneCall>> {
    if (!this.isEnabled()) {
      return new Map();
    }

    const runId = uuidv4();
    const runDir = path.join(this.outputDir, runId);
    fs.mkdirSync(runDir, { recursive: true });

    const command = this.commandTemplate
      .replace('{vcf}', vcfPath)
      .replace('{outDir}', runDir);

    logger.info('Running PharmCAT', { command, runDir });

    await new Promise<void>((resolve, reject) => {
      const child = spawn(command, { shell: true });
      let stderr = '';

      child.stderr.on('data', data => {
        stderr += data.toString();
      });

      child.on('error', err => {
        reject(err);
      });

      child.on('close', code => {
        if (code !== 0) {
          reject(new Error(`PharmCAT failed with code ${code}: ${stderr}`));
          return;
        }
        resolve();
      });
    });

    const reportPath = path.join(runDir, this.reportFileName);
    if (!fs.existsSync(reportPath)) {
      throw new Error(`PharmCAT report not found at ${reportPath}`);
    }

    const reportRaw = fs.readFileSync(reportPath, 'utf-8');
    const reportJson = JSON.parse(reportRaw) as unknown;
    const calls = this.extractGeneCalls(reportJson);

    const extractedPath = path.join(runDir, 'pharmcat.calls.json');
    fs.writeFileSync(extractedPath, JSON.stringify(calls, null, 2));

    const result = new Map<string, PharmcatGeneCall>();
    for (const call of calls) {
      result.set(call.gene.toUpperCase(), call);
    }

    return result;
  }

  private extractGeneCalls(report: unknown): PharmcatGeneCall[] {
    const calls: PharmcatGeneCall[] = [];

    if (!report || typeof report !== 'object') {
      return calls;
    }

    const asRecord = report as Record<string, any>;
    const candidates: any[] = [];

    if (Array.isArray(asRecord.geneCalls)) {
      candidates.push(...asRecord.geneCalls);
    }

    if (Array.isArray(asRecord.results)) {
      candidates.push(...asRecord.results);
    }

    if (asRecord.diplotypes && typeof asRecord.diplotypes === 'object') {
      for (const [gene, payload] of Object.entries(asRecord.diplotypes)) {
        const payloadRecord = payload && typeof payload === 'object'
          ? (payload as Record<string, unknown>)
          : {};
        candidates.push({ gene, ...payloadRecord });
      }
    }

    if (Array.isArray(report)) {
      candidates.push(...(report as any[]));
    }

    for (const item of candidates) {
      const gene = String(item.gene || item.geneSymbol || item.symbol || '').toUpperCase();
      if (!gene) continue;

      const diplotype = String(item.diplotype || item.starAlleles || item.call || 'Unknown');
      const phenotypeRaw = String(item.phenotype || item.metabolizer || item.pheno || 'Unknown');
      const phenotype = this.normalizePhenotype(phenotypeRaw);

      calls.push({ gene, diplotype, phenotype });
    }

    return calls;
  }

  private normalizePhenotype(value: string): Phenotype {
    const normalized = value.trim().toUpperCase();
    const allowed: Phenotype[] = ['PM', 'IM', 'NM', 'RM', 'URM', 'Unknown'];

    if (allowed.includes(normalized as Phenotype)) {
      return normalized as Phenotype;
    }

    if (normalized.includes('POOR')) return 'PM';
    if (normalized.includes('INTERMEDIATE')) return 'IM';
    if (normalized.includes('NORMAL')) return 'NM';
    if (normalized.includes('RAPID')) return 'RM';
    if (normalized.includes('ULTRA')) return 'URM';

    return 'Unknown';
  }
}
