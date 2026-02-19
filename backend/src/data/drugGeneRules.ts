import { DrugGeneRule, RiskLabel, Severity, Phenotype } from '../types';

/**
 * Drug-gene interaction rules based on CPIC guidelines
 * Defines risk assessment and recommendations for each phenotype
 */

export const DRUG_GENE_RULES: DrugGeneRule[] = [
  // CODEINE - CYP2D6
  {
    drug: 'CODEINE',
    gene: 'CYP2D6',
    phenotypes: {
      'PM': {
        risk: 'Ineffective',
        severity: 'high',
        recommendation: 'Avoid codeine. Use alternative analgesics such as morphine or non-opioid analgesics.'
      },
      'IM': {
        risk: 'Adjust Dosage',
        severity: 'moderate',
        recommendation: 'Reduce dose by 50% or consider alternative analgesics. Monitor for reduced efficacy.'
      },
      'NM': {
        risk: 'Safe',
        severity: 'none',
        recommendation: 'Use standard dosing. Normal codeine metabolism expected.'
      },
      'RM': {
        risk: 'Safe',
        severity: 'low',
        recommendation: 'Use standard dosing with monitoring. Slightly increased metabolism possible.'
      },
      'URM': {
        risk: 'Toxic',
        severity: 'critical',
        recommendation: 'Avoid codeine due to risk of toxicity. Use alternative analgesics.'
      }
    }
  },

  // CLOPIDOGREL - CYP2C19
  {
    drug: 'CLOPIDOGREL',
    gene: 'CYP2C19',
    phenotypes: {
      'PM': {
        risk: 'Ineffective',
        severity: 'high',
        recommendation: 'Avoid clopidogrel. Use alternative antiplatelet agents such as prasugrel or ticagrelor.'
      },
      'IM': {
        risk: 'Adjust Dosage',
        severity: 'moderate',
        recommendation: 'Consider alternative antiplatelet therapy or increased clopidogrel dose (150mg/day).'
      },
      'NM': {
        risk: 'Safe',
        severity: 'none',
        recommendation: 'Use standard dosing (75mg/day). Normal clopidogrel activation expected.'
      },
      'RM': {
        risk: 'Safe',
        severity: 'none',
        recommendation: 'Use standard dosing. Enhanced clopidogrel activation expected.'
      },
      'URM': {
        risk: 'Safe',
        severity: 'low',
        recommendation: 'Use standard dosing. Monitor for increased bleeding risk.'
      }
    }
  },

  // WARFARIN - CYP2C9
  {
    drug: 'WARFARIN',
    gene: 'CYP2C9',
    phenotypes: {
      'PM': {
        risk: 'Toxic',
        severity: 'critical',
        recommendation: 'Reduce initial dose by 50-75%. Frequent INR monitoring required. Consider alternative anticoagulants.'
      },
      'IM': {
        risk: 'Adjust Dosage',
        severity: 'high',
        recommendation: 'Reduce initial dose by 25-50%. Increase INR monitoring frequency.'
      },
      'NM': {
        risk: 'Safe',
        severity: 'none',
        recommendation: 'Use standard dosing with routine INR monitoring.'
      },
      'RM': {
        risk: 'Safe',
        severity: 'none',
        recommendation: 'Use standard dosing with routine INR monitoring.'
      }
    }
  },

  // SIMVASTATIN - SLCO1B1
  {
    drug: 'SIMVASTATIN',
    gene: 'SLCO1B1',
    phenotypes: {
      'PM': {
        risk: 'Toxic',
        severity: 'high',
        recommendation: 'Avoid simvastatin doses >20mg/day. Consider alternative statins (pravastatin, rosuvastatin).'
      },
      'IM': {
        risk: 'Adjust Dosage',
        severity: 'moderate',
        recommendation: 'Limit simvastatin dose to ≤40mg/day. Monitor for myopathy symptoms.'
      },
      'NM': {
        risk: 'Safe',
        severity: 'none',
        recommendation: 'Use standard dosing up to 80mg/day with routine monitoring.'
      }
    }
  },

  // AZATHIOPRINE - TPMT
  {
    drug: 'AZATHIOPRINE',
    gene: 'TPMT',
    phenotypes: {
      'PM': {
        risk: 'Toxic',
        severity: 'critical',
        recommendation: 'Reduce dose to 10% of standard dose or avoid. Consider alternative immunosuppressants.'
      },
      'IM': {
        risk: 'Adjust Dosage',
        severity: 'high',
        recommendation: 'Reduce dose to 30-70% of standard dose. Monitor CBC weekly for 4 weeks, then monthly.'
      },
      'NM': {
        risk: 'Safe',
        severity: 'none',
        recommendation: 'Use standard dosing with routine CBC monitoring.'
      },
      'RM': {
        risk: 'Safe',
        severity: 'none',
        recommendation: 'Use standard dosing with routine monitoring.'
      }
    }
  },

  // FLUOROURACIL - DPYD
  {
    drug: 'FLUOROURACIL',
    gene: 'DPYD',
    phenotypes: {
      'PM': {
        risk: 'Toxic',
        severity: 'critical',
        recommendation: 'Avoid fluorouracil. Select alternative chemotherapy regimen.'
      },
      'IM': {
        risk: 'Adjust Dosage',
        severity: 'high',
        recommendation: 'Reduce starting dose by 50%. Increase dose based on toxicity and therapeutic drug monitoring.'
      },
      'NM': {
        risk: 'Safe',
        severity: 'none',
        recommendation: 'Use standard dosing with routine toxicity monitoring.'
      }
    }
  }
];

/**
 * Get drug-gene rule
 */
export function getDrugGeneRule(drug: string, gene: string): DrugGeneRule | undefined {
  return DRUG_GENE_RULES.find(
    rule => rule.drug.toUpperCase() === drug.toUpperCase() && 
            rule.gene.toUpperCase() === gene.toUpperCase()
  );
}

/**
 * Get all genes relevant for a drug
 */
export function getGenesForDrug(drug: string): string[] {
  return DRUG_GENE_RULES
    .filter(rule => rule.drug.toUpperCase() === drug.toUpperCase())
    .map(rule => rule.gene);
}

/**
 * Get risk assessment for drug-gene-phenotype combination
 */
export function getRiskAssessment(
  drug: string, 
  gene: string, 
  phenotype: Phenotype
): { risk: RiskLabel; severity: Severity; recommendation: string } | null {
  const rule = getDrugGeneRule(drug, gene);
  if (!rule) return null;

  const assessment = rule.phenotypes[phenotype];
  if (!assessment) {
    return {
      risk: 'Unknown',
      severity: 'none',
      recommendation: 'Insufficient data for this phenotype. Consult pharmacogenomics specialist.'
    };
  }

  return assessment;
}

/**
 * Get CPIC guideline reference
 */
export function getCPICReference(drug: string, gene: string): string {
  const references: Record<string, string> = {
    'CODEINE-CYP2D6': 'CPIC Guideline for CYP2D6 and Codeine Therapy (2014)',
    'CLOPIDOGREL-CYP2C19': 'CPIC Guideline for CYP2C19 and Clopidogrel Therapy (2013)',
    'WARFARIN-CYP2C9': 'CPIC Guideline for CYP2C9 and Warfarin Therapy (2017)',
    'SIMVASTATIN-SLCO1B1': 'CPIC Guideline for SLCO1B1 and Simvastatin Therapy (2014)',
    'AZATHIOPRINE-TPMT': 'CPIC Guideline for TPMT and Thiopurine Therapy (2018)',
    'FLUOROURACIL-DPYD': 'CPIC Guideline for DPYD and Fluoropyrimidine Therapy (2017)'
  };

  const key = `${drug.toUpperCase()}-${gene.toUpperCase()}`;
  return references[key] || `CPIC Guideline for ${gene} and ${drug} Therapy`;
}

/**
 * Get alternative drugs
 */
export function getAlternativeDrugs(drug: string): string[] {
  const alternatives: Record<string, string[]> = {
    'CODEINE': ['Morphine', 'Hydromorphone', 'Oxycodone', 'Non-opioid analgesics'],
    'CLOPIDOGREL': ['Prasugrel', 'Ticagrelor', 'Aspirin'],
    'WARFARIN': ['Apixaban', 'Rivaroxaban', 'Dabigatran', 'Enoxaparin'],
    'SIMVASTATIN': ['Pravastatin', 'Rosuvastatin', 'Atorvastatin', 'Fluvastatin'],
    'AZATHIOPRINE': ['Mycophenolate', 'Methotrexate', 'Cyclosporine'],
    'FLUOROURACIL': ['Capecitabine alternatives', 'Alternative chemotherapy regimens']
  };

  return alternatives[drug.toUpperCase()] || [];
}

/**
 * Export alias for backward compatibility
 */
export const drugGeneRules = DRUG_GENE_RULES;
