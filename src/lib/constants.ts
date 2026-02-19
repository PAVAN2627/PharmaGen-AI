// Animation constants
export const ANIMATION_DELAYS = {
  FAST: 0.1,
  MEDIUM: 0.2,
  SLOW: 0.3,
} as const;

export const ANIMATION_DURATIONS = {
  FAST: 0.3,
  MEDIUM: 0.5,
  SLOW: 0.8,
} as const;

// Motion variants
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export const fadeInLeft = {
  initial: { opacity: 0, x: -15 },
  animate: { opacity: 1, x: 0 },
};

export const fadeIn = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
};

// File upload constants
export const FILE_UPLOAD = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ACCEPTED_EXTENSIONS: ['.vcf', '.vcf.gz'],
  ACCEPTED_MIME_TYPES: '.vcf,.vcf.gz',
} as const;

// Risk colors
export const RISK_COLORS = {
  safe: 'hsl(var(--risk-safe))',
  adjust: 'hsl(var(--risk-adjust))',
  toxic: 'hsl(var(--risk-toxic))',
  unknown: 'hsl(var(--risk-unknown))',
} as const;

// Supported drugs
export const SUPPORTED_DRUGS = [
  'Codeine',
  'Clopidogrel',
  'Warfarin',
  'Simvastatin',
  'Azathioprine',
  'Fluorouracil',
] as const;
