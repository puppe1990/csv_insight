import React, { useState, useMemo, useEffect, useRef } from 'react';
import { CsvRow } from '../types';
import { ChevronLeft, ChevronRight, Search, ArrowUpDown, ArrowUp, ArrowDown, Trash2, Plus } from 'lucide-react';
import { Button } from './Button';

interface DataTableProps {
  data: CsvRow[];
  columns: string[];
  onRowClick?: (row: CsvRow) => void;
  onDataChange?: (newData: CsvRow[]) => void;
  onRowDelete?: (originalIndex: number) => void;
  onRowAdd?: () => void;
  isEditable?: boolean;
}

type SortDirection = 'asc' | 'desc';

interface SortConfig {
  key: string;
  direction: SortDirection;
}

interface EditingCell {
  rowIndex: number; // correlates to _originalIndex
  col: string;
}

export const DataTable: React.FC<DataTableProps> = ({ 
  data, 
  columns, 
  onRowClick,
  onDataChange,
  onRowDelete,
  onRowAdd,
  isEditable = false
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(15);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  
  // Editing State
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Attach original index to data to track rows through sort/filter
  const indexedData = useMemo(() => {
    return data.map((row, idx) => ({ ...row, _originalIndex: idx }));
  }, [data]);

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchTerm) return indexedData;
    const lowerTerm = searchTerm.toLowerCase();
    return indexedData.filter(row => 
      columns.some(col => String(row[col]).toLowerCase().includes(lowerTerm))
    );
  }, [indexedData, columns, searchTerm]);

  // Sort data based on sortConfig
  const sortedData = useMemo(() => {
    if (!sortConfig) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      // Handle null values
      if (aValue === null) return 1;
      if (bValue === null) return -1;

      // Check if values are numbers for correct numeric sorting
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // String sorting
      const strA = String(aValue).toLowerCase();
      const strB = String(bValue).toLowerCase();
      
      if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // Pagination logic
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return sortedData.slice(start, start + rowsPerPage);
  }, [sortedData, currentPage, rowsPerPage]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editingCell]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleSort = (key: string) => {
    let direction: SortDirection = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Editing Handlers
  const startEditing = (row: any, col: string) => {
    if (!isEditable) return;
    setEditingCell({ rowIndex: row._originalIndex, col });
    setEditValue(row[col] === null ? '' : String(row[col]));
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveEditing = () => {
    if (!editingCell || !onDataChange) return;

    const { rowIndex, col } = editingCell;
    const newData = [...data];
    
    // Attempt to preserve type (number vs string)
    let finalValue: string | number | null = editValue;
    
    if (editValue.trim() === '') {
       finalValue = ''; 
    } else {
        const numVal = Number(editValue);
        if (!isNaN(numVal) && !editValue.endsWith('.') && editValue.trim() !== '') {
            finalValue = numVal;
        }
    }

    // Update specific row using original index
    newData[rowIndex] = { ...newData[rowIndex], [col]: finalValue };
    
    onDataChange(newData);
    setEditingCell(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEditing();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
        <div className="relative w-full sm:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </div>
          <input
            type="text"
            placeholder="Search data..."
            className="pl-10 pr-4 py-2 w-full border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
            value={searchTerm}
            onChange={handleSearch}
          />
        </div>
        <div className="flex items-center space-x-4">
            {isEditable && (
                <div className="flex items-center space-x-3">
                  <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200 font-medium">
                      Double-click to edit
                  </div>
                  {onRowAdd && (
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={onRowAdd}
                      icon={<Plus className="w-4 h-4" />}
                    >
                      Add Row
                    </Button>
                  )}
                </div>
            )}
            <div className="text-sm text-slate-500 font-medium">
            Showing {filteredData.length} rows
            </div>
        </div>
      </div>

      {/* Table Area */}
      <div className="flex-1 overflow-auto relative">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
            <tr>
              {/* Index Column */}
              <th className="px-3 py-3 font-semibold text-slate-400 w-12 border-b border-slate-200 bg-slate-50 text-center">
                #
              </th>
              {columns.map((col) => (
                <th 
                  key={col} 
                  className="px-6 py-3 font-semibold text-slate-700 whitespace-nowrap border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors select-none group"
                  onClick={() => handleSort(col)}
                >
                  <div className="flex items-center space-x-1">
                    <span>{col}</span>
                    <span className="text-slate-400 group-hover:text-slate-600 transition-opacity">
                      {sortConfig?.key === col ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                      ) : (
                        <ArrowUpDown className="w-4 h-4 opacity-0 group-hover:opacity-50" />
                      )}
                    </span>
                  </div>
                </th>
              ))}
              {isEditable && (
                <th className="px-4 py-3 font-semibold text-slate-700 w-16 border-b border-slate-200 bg-slate-50">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIndex) => (
                <tr 
                  key={row._originalIndex}
                  className={`hover:bg-blue-50/50 transition-colors group ${onRowClick && !isEditable ? 'cursor-pointer active:bg-blue-100' : ''}`}
                  onClick={() => onRowClick && !isEditable && onRowClick(row)}
                >
                  {/* Row Number */}
                  <td className="px-3 py-3 text-slate-400 text-xs text-center select-none bg-slate-50/30">
                    {row._originalIndex + 1}
                  </td>

                  {columns.map((col, colIndex) => {
                    const isEditing = editingCell?.rowIndex === row._originalIndex && editingCell?.col === col;
                    
                    return (
                        <td 
                            key={`${row._originalIndex}-${colIndex}`} 
                            className={`px-6 py-3 text-slate-600 whitespace-nowrap max-w-xs truncate ${isEditable ? 'cursor-cell' : ''}`}
                            title={!isEditing ? String(row[col]) : ''}
                            onDoubleClick={() => startEditing(row, col)}
                        >
                        {isEditing ? (
                            <input
                                ref={inputRef}
                                type="text"
                                className="w-full px-2 py-1 -mx-2 -my-1 border-2 border-blue-500 rounded focus:outline-none bg-white text-slate-900 shadow-sm"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={saveEditing}
                                onKeyDown={handleKeyDown}
                            />
                        ) : (
                            row[col] !== null && row[col] !== '' ? String(row[col]) : <span className="inline-block w-full h-4"></span>
                        )}
                        </td>
                    );
                  })}
                  
                  {isEditable && (
                    <td className="px-4 py-3 text-right">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onRowDelete) onRowDelete(row._originalIndex);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete row"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length + (isEditable ? 2 : 1)} className="px-6 py-12 text-center text-slate-500">
                  No matches found for "{searchTerm}"
                </td>
              </tr>
            )}
            
            {/* Quick Add Row Button at bottom of table if on last page and editable */}
            {isEditable && onRowAdd && paginatedData.length > 0 && currentPage === totalPages && (
               <tr>
                 <td colSpan={columns.length + 2} className="px-0 py-0">
                    <button 
                      onClick={onRowAdd}
                      className="w-full py-3 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors border-t border-dashed border-slate-200 text-sm font-medium"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add New Row
                    </button>
                 </td>
               </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
        <div className="text-xs text-slate-500 hidden sm:block">
          Page {currentPage} of {totalPages || 1}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            icon={<ChevronLeft className="w-4 h-4" />}
          >
            Prev
          </Button>
          <div className="text-sm font-medium text-slate-700 sm:hidden">
            {currentPage} / {totalPages || 1}
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
          >
            Next <ChevronRight className="w-4 h-4 ml-1 inline-block" />
          </Button>
        </div>
      </div>
    </div>
  );
};
