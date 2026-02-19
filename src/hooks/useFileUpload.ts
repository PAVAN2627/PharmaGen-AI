import { useState, useCallback } from 'react';
import { FILE_UPLOAD } from '@/lib/constants';

interface UseFileUploadReturn {
  file: File | null;
  error: string | null;
  dragOver: boolean;
  setFile: (file: File | null) => void;
  setDragOver: (dragOver: boolean) => void;
  validateFile: (file: File) => boolean;
  handleDrop: (e: React.DragEvent) => void;
  handleFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
  clearFile: () => void;
}

export const useFileUpload = (): UseFileUploadReturn => {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const validateFile = useCallback((f: File): boolean => {
    const hasValidExtension = FILE_UPLOAD.ACCEPTED_EXTENSIONS.some(ext => 
      f.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      setError(`Invalid file format. Only ${FILE_UPLOAD.ACCEPTED_EXTENSIONS.join(', ')} files are accepted.`);
      return false;
    }

    if (f.size > FILE_UPLOAD.MAX_SIZE) {
      setError(`File too large. Maximum size is ${FILE_UPLOAD.MAX_SIZE / (1024 * 1024)}MB.`);
      return false;
    }

    setError(null);
    return true;
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f && validateFile(f)) {
      setFile(f);
    }
  }, [validateFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f && validateFile(f)) {
      setFile(f);
    }
  }, [validateFile]);

  const clearFile = useCallback(() => {
    setFile(null);
    setError(null);
  }, []);

  return {
    file,
    error,
    dragOver,
    setFile,
    setDragOver,
    validateFile,
    handleDrop,
    handleFileInput,
    clearFile,
  };
};
