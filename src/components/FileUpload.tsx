import React, { useState, useRef } from 'react';
import { Upload, X, File, Image as ImageIcon, FileText, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface FileUploadProps {
  onUploadComplete?: (files: UploadedFile[]) => void;
  uploadType?: 'image' | 'document' | 'file';
  multiple?: boolean;
  maxFiles?: number;
  accept?: string;
}

interface UploadedFile {
  url: string;
  publicId: string;
  size: number;
  format: string;
  originalName?: string;
  width?: number;
  height?: number;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onUploadComplete,
  uploadType = 'file',
  multiple = false,
  maxFiles = 10,
  accept
}) => {
  const { token } = useAuth();
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getAcceptType = () => {
    if (accept) return accept;
    switch (uploadType) {
      case 'image':
        return 'image/*';
      case 'document':
        return '.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx';
      default:
        return '*';
    }
  };

  const getMaxSize = () => {
    switch (uploadType) {
      case 'image':
        return 5 * 1024 * 1024; // 5MB
      case 'document':
        return 10 * 1024 * 1024; // 10MB
      default:
        return 20 * 1024 * 1024; // 20MB
    }
  };

  const validateFile = (file: File): string | null => {
    const maxSize = getMaxSize();
    if (file.size > maxSize) {
      return `File size must be less than ${maxSize / (1024 * 1024)}MB`;
    }
    return null;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      handleFiles(selectedFiles);
    }
  };

  const handleFiles = (newFiles: File[]) => {
    setError('');
    
    // Validate file count
    const totalFiles = files.length + newFiles.length;
    if (totalFiles > maxFiles) {
      setError(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate each file
    for (const file of newFiles) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    if (multiple) {
      setFiles([...files, ...newFiles]);
    } else {
      setFiles(newFiles.slice(0, 1));
    }
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setError('');
    const uploaded: UploadedFile[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        
        const fieldName = uploadType === 'image' ? 'image' :
                         uploadType === 'document' ? 'document' : 'file';
        formData.append(fieldName, file);

        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));

        const endpoint = `/api/upload/${uploadType}`;
        
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const data = await response.json();
        uploaded.push(data.file);
        
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
      }

      setUploadedFiles([...uploadedFiles, ...uploaded]);
      setFiles([]);
      setUploadProgress({});
      onUploadComplete?.(uploaded);
      
    } catch (err: any) {
      setError(err.message || 'Upload failed');
      console.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext || '')) {
      return <ImageIcon className="w-6 h-6 text-blue-600" />;
    } else if (['pdf'].includes(ext || '')) {
      return <FileText className="w-6 h-6 text-red-600" />;
    } else if (['doc', 'docx'].includes(ext || '')) {
      return <FileText className="w-6 h-6 text-blue-600" />;
    }
    return <File className="w-6 h-6 text-gray-600" />;
  };

  return (
    <div className="space-y-4">
      {/* Drag and Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className={`w-12 h-12 mx-auto mb-4 ${dragActive ? 'text-blue-600' : 'text-gray-400'}`} />
        <p className="text-lg font-medium text-gray-700 mb-2">
          Drag and drop files here
        </p>
        <p className="text-sm text-gray-500 mb-4">
          or click to browse
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={getAcceptType()}
          onChange={handleFileInput}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Choose Files
        </button>
        <p className="text-xs text-gray-400 mt-4">
          {uploadType === 'image' && 'JPG, PNG, GIF up to 5MB'}
          {uploadType === 'document' && 'PDF, DOC, DOCX up to 10MB'}
          {uploadType === 'file' && 'Any file up to 20MB'}
          {multiple && ` • Max ${maxFiles} files`}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Selected Files List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-gray-700">Selected Files ({files.length})</h3>
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
            >
              <div className="flex items-center space-x-3 flex-1">
                {getFileIcon(file.name)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  {uploadProgress[file.name] !== undefined && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                      <div
                        className="bg-blue-600 h-1.5 rounded-full transition-all"
                        style={{ width: `${uploadProgress[file.name]}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
              {!uploading && (
                <button
                  onClick={() => removeFile(index)}
                  className="ml-2 p-1 hover:bg-gray-200 rounded transition"
                >
                  <X className="w-4 h-4 text-gray-600" />
                </button>
              )}
              {uploadProgress[file.name] === 100 && (
                <Check className="w-5 h-5 text-green-600 ml-2" />
              )}
            </div>
          ))}

          <button
            onClick={uploadFiles}
            disabled={uploading || files.length === 0}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : `Upload ${files.length} file${files.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-medium text-gray-700">Uploaded Files ({uploadedFiles.length})</h3>
          {uploadedFiles.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between bg-green-50 border border-green-200 p-3 rounded-lg"
            >
              <div className="flex items-center space-x-3 flex-1">
                <Check className="w-5 h-5 text-green-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {file.originalName || 'Uploaded file'}
                  </p>
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    View file
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
