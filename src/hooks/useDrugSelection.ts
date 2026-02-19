import { useState, useCallback } from 'react';
import { SUPPORTED_DRUGS } from '@/lib/constants';
import { useToast } from './use-toast';

interface UseDrugSelectionReturn {
  drugInput: string;
  selectedDrugs: string[];
  setDrugInput: (input: string) => void;
  addDrug: (drug: string) => void;
  removeDrug: (drug: string) => void;
  toggleDrug: (drug: string) => void;
  clearDrugs: () => void;
}

export const useDrugSelection = (): UseDrugSelectionReturn => {
  const [drugInput, setDrugInput] = useState('');
  const [selectedDrugs, setSelectedDrugs] = useState<string[]>([]);
  const { toast } = useToast();

  const addDrug = useCallback((drug: string) => {
    const normalized = drug.trim();
    if (!normalized) return;

    const matched = SUPPORTED_DRUGS.find(
      (d) => d.toLowerCase() === normalized.toLowerCase()
    );

    if (!matched) {
      toast({
        title: 'Unsupported drug',
        description: `"${normalized}" is not in the supported drug list.`,
        variant: 'destructive',
      });
      return;
    }

    if (!selectedDrugs.includes(matched)) {
      setSelectedDrugs((prev) => [...prev, matched]);
    }
    setDrugInput('');
  }, [selectedDrugs, toast]);

  const removeDrug = useCallback((drug: string) => {
    setSelectedDrugs((prev) => prev.filter((d) => d !== drug));
  }, []);

  const toggleDrug = useCallback((drug: string) => {
    setSelectedDrugs((prev) =>
      prev.includes(drug) ? prev.filter((d) => d !== drug) : [...prev, drug]
    );
  }, []);

  const clearDrugs = useCallback(() => {
    setSelectedDrugs([]);
  }, []);

  return {
    drugInput,
    selectedDrugs,
    setDrugInput,
    addDrug,
    removeDrug,
    toggleDrug,
    clearDrugs,
  };
};
