/**
 * Format a date string to a readable format
 */
export const formatDate = (iso: string): string => {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Format file size in bytes to KB
 */
export const formatFileSize = (bytes: number): string => {
  return `${(bytes / 1024).toFixed(1)} KB`;
};

/**
 * Format confidence score as percentage
 */
export const formatConfidence = (score: number): string => {
  return `${(score * 100).toFixed(0)}%`;
};

/**
 * Download JSON data as a file
 */
export const downloadJSON = (data: unknown, filename: string): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Copy text to clipboard
 */
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
};
