import React, { useState, useCallback } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import * as d3 from 'd3';
import { ParseResult } from '../types';

interface FileUploadProps {
  onDataLoaded: (result: ParseResult) => void;
  label?: string;
  variant?: 'default' | 'compact';
}

export const FileUpload: React.FC<FileUploadProps> = ({ 
  onDataLoaded, 
  label = "Upload your data",
  variant = 'default'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const isCompact = variant === 'compact';

  const processFile = useCallback((file: File) => {
    if (file.type !== "text/csv" && !file.name.endsWith('.csv')) {
      setError("Please upload a valid CSV file.");
      return;
    }

    setError(null);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setError("File is empty.");
        setIsLoading(false);
        return;
      }

      try {
        const data = d3.csvParse(text, (d) => {
          // Attempt to convert numeric strings to numbers automatically
          const row: any = {};
          for (const key in d) {
            const val = d[key];
            const num = parseFloat(val as string);
            // Lowercase key for consistent matching
            const lowerKey = key.toLowerCase();
            row[lowerKey] = !isNaN(num) && isFinite(num) ? num : val;
          }
          return row;
        });
        
        // Ensure columns are also lowercased to match row keys
        const columns = (data.columns || []).map(col => col.toLowerCase());

        onDataLoaded({
          data: data,
          columns: columns,
          meta: {
            rowCount: data.length,
            fileSize: file.size,
            fileName: file.name
          }
        });
      } catch (err) {
        console.error(err);
        setError("Failed to parse CSV file. Please check the format.");
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setError("Error reading file.");
      setIsLoading(false);
    };

    reader.readAsText(file);
  }, [onDataLoaded]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center w-full mx-auto ${isCompact ? 'p-2' : 'min-h-[400px] max-w-2xl p-6'}`}>
      {!isCompact && (
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">CSV Insight</h1>
          <p className="text-slate-500 text-lg">{label}</p>
        </div>
      )}

      <div
        className={`relative group w-full border-2 border-dashed rounded-3xl transition-all duration-300 ease-in-out flex flex-col items-center justify-center bg-white 
          ${isCompact ? 'h-48' : 'h-80'}
          ${isDragging 
            ? 'border-blue-500 bg-blue-50 shadow-xl scale-[1.02]' 
            : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50 shadow-sm'
          }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".csv"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        
        {isLoading ? (
          <div className="flex flex-col items-center animate-pulse">
            <div className={`border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4 ${isCompact ? 'h-8 w-8 border-2' : 'h-12 w-12'}`}></div>
            <p className="text-blue-600 font-medium text-sm">Parsing...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center pointer-events-none p-4 text-center">
            <div className={`rounded-full mb-3 transition-colors ${isDragging ? 'bg-blue-200' : 'bg-blue-100 group-hover:bg-blue-200'} ${isCompact ? 'p-3' : 'p-4'}`}>
              <Upload className={`${isDragging ? 'text-blue-700' : 'text-blue-600'} ${isCompact ? 'w-5 h-5' : 'w-8 h-8'}`} />
            </div>
            <h3 className={`font-semibold text-slate-800 mb-1 ${isCompact ? 'text-sm' : 'text-xl'}`}>
              {label || (isDragging ? 'Drop it here!' : 'Drag & Drop CSV')}
            </h3>
            {!isCompact && <p className="text-slate-500 mb-4 text-sm">or click to browse</p>}
            
            <div className={`flex items-center space-x-2 text-slate-400 bg-slate-50 rounded-full border border-slate-200 ${isCompact ? 'text-[10px] px-2 py-1' : 'text-xs px-3 py-1.5'}`}>
              <FileText className={`${isCompact ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} />
              <span>.csv</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-4 flex items-center p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 shadow-sm animate-fade-in-up w-full text-sm">
          <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};
