export type PatientRecord = {
  id: string;
  patient_id: string;
  date: string;
  drugs_analyzed: number;
  high_risk: number;
  status: "completed" | "processing" | "failed";
  risk_summary: { safe: number; adjust: number; toxic: number };
};

export const mockPatientHistory: PatientRecord[] = [
  {
    id: "1",
    patient_id: "PATIENT_001",
    date: "2026-02-19T10:30:00Z",
    drugs_analyzed: 6,
    high_risk: 2,
    status: "completed",
    risk_summary: { safe: 2, adjust: 2, toxic: 2 },
  },
  {
    id: "2",
    patient_id: "PATIENT_002",
    date: "2026-02-18T14:15:00Z",
    drugs_analyzed: 4,
    high_risk: 1,
    status: "completed",
    risk_summary: { safe: 2, adjust: 1, toxic: 1 },
  },
  {
    id: "3",
    patient_id: "PATIENT_003",
    date: "2026-02-17T09:45:00Z",
    drugs_analyzed: 3,
    high_risk: 0,
    status: "completed",
    risk_summary: { safe: 3, adjust: 0, toxic: 0 },
  },
  {
    id: "4",
    patient_id: "PATIENT_004",
    date: "2026-02-16T16:20:00Z",
    drugs_analyzed: 5,
    high_risk: 3,
    status: "completed",
    risk_summary: { safe: 1, adjust: 1, toxic: 3 },
  },
  {
    id: "5",
    patient_id: "PATIENT_005",
    date: "2026-02-15T11:00:00Z",
    drugs_analyzed: 2,
    high_risk: 0,
    status: "processing",
    risk_summary: { safe: 0, adjust: 0, toxic: 0 },
  },
  {
    id: "6",
    patient_id: "PATIENT_006",
    date: "2026-02-14T08:30:00Z",
    drugs_analyzed: 6,
    high_risk: 1,
    status: "completed",
    risk_summary: { safe: 4, adjust: 1, toxic: 1 },
  },
];
