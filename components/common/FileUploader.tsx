import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, FileText, Image as ImageIcon, File, Download } from 'lucide-react';

interface FileUploaderProps {
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  accept?: Record<string, string[]>;
  existingFiles?: FileData[];
  onDownload?: (file: FileData) => void;
  onDelete?: (file: FileData) => void;
}

export interface FileData {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  url?: string;
  uploaded_at?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  onFilesChange,
  maxFiles = 5,
  maxSize = 10 * 1024 * 1024, // 10MB
  accept = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/gif': ['.gif'],
    'application/pdf': ['.pdf'],
    'application/msword': ['.doc'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
  },
  existingFiles = [],
  onDownload,
  onDelete
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [errors, setErrors] = useState<string[]>([]);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setErrors([]);

    if (rejectedFiles.length > 0) {
      const newErrors = rejectedFiles.map(file => {
        if (file.errors[0]?.code === 'file-too-large') {
          return `${file.file.name} is too large (max ${maxSize / 1024 / 1024}MB)`;
        }
        if (file.errors[0]?.code === 'file-invalid-type') {
          return `${file.file.name} has an invalid file type`;
        }
        return `${file.file.name} could not be uploaded`;
      });
      setErrors(newErrors);
    }

    const newFiles = [...files, ...acceptedFiles].slice(0, maxFiles);
    setFiles(newFiles);
    onFilesChange(newFiles);
  }, [files, maxFiles, maxSize, onFilesChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    accept,
    multiple: true
  });

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    setFiles(newFiles);
    onFilesChange(newFiles);
  };

  const getFileIcon = (fileName: string, mimeType?: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();

    if (mimeType?.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) {
      return ImageIcon;
    }
    if (mimeType === 'application/pdf' || ext === 'pdf') {
      return FileText;
    }
    return File;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-300 hover:border-slate-400'
          }
        `}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
        {isDragActive ? (
          <p className="text-slate-600">Drop the files here...</p>
        ) : (
          <div>
            <p className="text-slate-600 mb-2">
              Drag & drop files here, or click to select files
            </p>
            <p className="text-sm text-slate-400">
              Maximum {maxFiles} files, up to {maxSize / 1024 / 1024}MB each
            </p>
            <p className="text-xs text-slate-300 mt-1">
              Accepted: Images, PDF, DOC, DOCX
            </p>
          </div>
        )}
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          {errors.map((error, index) => (
            <p key={index} className="text-red-600 text-sm">❌ {error}</p>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-700">New Files</h4>
          {files.map((file, index) => {
            const FileIcon = getFileIcon(file.name, file.type);
            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex items-center space-x-3">
                  <FileIcon className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">{file.name}</p>
                    <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-slate-400 hover:text-red-600 transition-colors"
                  type="button"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {existingFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-700">Existing Files</h4>
          {existingFiles.map((file, index) => {
            const FileIcon = getFileIcon(file.name, file.mime_type);
            return (
              <div
                key={file.id || index}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
              >
                <div className="flex items-center space-x-3">
                  <FileIcon className="w-5 h-5 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">{file.name}</p>
                    <p className="text-xs text-slate-400">{formatFileSize(file.size)}</p>
                    {file.uploaded_at && (
                      <p className="text-xs text-slate-400">
                        Uploaded: {new Date(file.uploaded_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {onDownload && file.url && (
                    <button
                      onClick={() => onDownload(file)}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                      type="button"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(file)}
                      className="text-slate-400 hover:text-red-600 transition-colors"
                      type="button"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FileUploader;
