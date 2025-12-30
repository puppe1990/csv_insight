import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { CsvRow } from '../types';
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Trash2, Plus, Calculator } from 'lucide-react';
import { Button } from './Button';
import * as d3 from 'd3';

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

interface SelectionPoint {
  rowIndex: number; // Index in the current visible (sorted/filtered) list
  colIndex: number;
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
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  
  // Selection State
  const [selectionStart, setSelectionStart] = useState<SelectionPoint | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<SelectionPoint | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

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

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const strA = String(aValue).toLowerCase();
      const strB = String(bValue).toLowerCase();
      
      if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortConfig]);

  // --- Selection Logic ---
  const handleCellMouseDown = (rowIndex: number, colIndex: number, e: React.MouseEvent) => {
    if (editingCell) return;
    
    // Check if clicking the index column for row selection
    if (colIndex === -1) {
      setSelectionStart({ rowIndex, colIndex: 0 });
      setSelectionEnd({ rowIndex, colIndex: columns.length - 1 });
      setIsSelecting(true);
      return;
    }

    if (e.shiftKey && selectionStart) {
      setSelectionEnd({ rowIndex, colIndex });
    } else {
      setSelectionStart({ rowIndex, colIndex });
      setSelectionEnd({ rowIndex, colIndex });
      setIsSelecting(true);
    }
  };

  const handleColumnHeaderClick = (colIndex: number, e: React.MouseEvent) => {
    // Select whole column if not clicking on the sort button area specifically
    // but typically Excel-like implies clicking the header selects the column.
    // We'll allow Shift+Click for column range selection.
    if (e.altKey || e.ctrlKey || e.metaKey) {
       // Allow sorting via standard click, selection via modifier or vice versa?
       // Let's make sorting the primary click, but adding a specific "selection" behavior
    }
  };

  const handleCellMouseEnter = (rowIndex: number, colIndex: number) => {
    if (isSelecting) {
      setSelectionEnd({ rowIndex, colIndex });
    }
  };

  const handleMouseUp = useCallback(() => {
    setIsSelecting(false);
  }, []);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const isCellSelected = (rowIndex: number, colIndex: number) => {
    if (!selectionStart || !selectionEnd) return false;
    
    const minRow = Math.min(selectionStart.rowIndex, selectionEnd.rowIndex);
    const maxRow = Math.max(selectionStart.rowIndex, selectionEnd.rowIndex);
    const minCol = Math.min(selectionStart.colIndex, selectionEnd.colIndex);
    const maxCol = Math.max(selectionStart.colIndex, selectionEnd.colIndex);

    return (
      rowIndex >= minRow && 
      rowIndex <= maxRow && 
      colIndex >= minCol && 
      colIndex <= maxCol
    );
  };

  // Calculate Statistics for Selection
  const stats = useMemo(() => {
    if (!selectionStart || !selectionEnd) return null;

    const minRow = Math.min(selectionStart.rowIndex, selectionEnd.rowIndex);
    const maxRow = Math.max(selectionStart.rowIndex, selectionEnd.rowIndex);
    const minCol = Math.min(selectionStart.colIndex, selectionEnd.colIndex);
    const maxCol = Math.max(selectionStart.colIndex, selectionEnd.colIndex);

    const values: number[] = [];
    let cellCount = 0;

    for (let r = minRow; r <= maxRow; r++) {
      const row = sortedData[r];
      if (!row) continue;
      for (let c = minCol; c <= maxCol; c++) {
        cellCount++;
        const colName = columns[c];
        const val = row[colName];
        const num = typeof val === 'number' ? val : parseFloat(String(val));
        if (!isNaN(num)) {
          values.push(num);
        }
      }
    }

    if (values.length === 0) return { cellCount, numericCount: 0 };

    const sum = d3.sum(values);
    const avg = d3.mean(values);
    const median = d3.median(values);
    const min = d3.min(values);
    const max = d3.max(values);

    return {
      cellCount,
      numericCount: values.length,
      sum,
      avg,
      median,
      min,
      max
    };
  }, [selectionStart, selectionEnd, sortedData, columns]);

  // --- Editing Handlers ---
  const startEditing = (row: any, col: string) => {
    if (!isEditable) return;
    setEditingCell({ rowIndex: row._originalIndex, col });
    setEditValue(row[col] === null ? '' : String(row[col]));
    setSelectionStart(null);
    setSelectionEnd(null);
  };

  const cancelEditing = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const saveEditing = () => {
    if (!editingCell || !onDataChange) return;

    const { rowIndex, col } = editingCell;
    const newData = [...data];
    
    let finalValue: string | number | null = editValue;
    if (editValue.trim() === '') {
       finalValue = ''; 
    } else {
        const numVal = Number(editValue);
        if (!isNaN(numVal) && !editValue.endsWith('.') && editValue.trim() !== '') {
            finalValue = numVal;
        }
    }

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

  const formatStat = (val: number | undefined) => {
    if (val === undefined) return '-';
    return Number.isInteger(val) ? val.toLocaleString() : val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const handleSelectWholeColumn = (colIndex: number) => {
    setSelectionStart({ rowIndex: 0, colIndex });
    setSelectionEnd({ rowIndex: sortedData.length - 1, colIndex });
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
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-4">
            <div className="hidden md:block text-xs text-slate-400 bg-slate-100 px-2 py-1 rounded border border-slate-200 font-medium">
                Drag index for row / Header for column
            </div>
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
              Total {sortedData.length} rows
            </div>
        </div>
      </div>

      {/* Table Area - Full Dataset */}
      <div className="flex-1 overflow-auto relative select-none">
        <table className="w-full text-left text-sm border-separate border-spacing-0">
          <thead className="bg-slate-50 sticky top-0 z-20 shadow-sm">
            <tr>
              <th className="px-3 py-3 font-semibold text-slate-400 w-12 border-b border-r border-slate-200 bg-slate-50 text-center sticky left-0 z-30">
                #
              </th>
              {columns.map((col, colIdx) => (
                <th 
                  key={col} 
                  className="px-6 py-3 font-semibold text-slate-700 whitespace-nowrap border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors group select-none relative"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 flex items-center space-x-1" onClick={() => {
                      let direction: SortDirection = 'asc';
                      if (sortConfig && sortConfig.key === col && sortConfig.direction === 'asc') {
                        direction = 'desc';
                      }
                      setSortConfig({ key: col, direction });
                    }}>
                      <span>{col}</span>
                      <span className="text-slate-400 group-hover:text-slate-600 transition-opacity">
                        {sortConfig?.key === col ? (
                          sortConfig.direction === 'asc' ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />
                        ) : (
                          <ArrowUpDown className="w-4 h-4 opacity-0 group-hover:opacity-50" />
                        )}
                      </span>
                    </div>
                    {/* Invisible hit-area to select column */}
                    <div 
                      className="w-4 h-4 ml-2 hover:bg-slate-200 rounded flex items-center justify-center text-[10px] text-slate-400 opacity-0 group-hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectWholeColumn(colIdx);
                      }}
                      title="Select whole column"
                    >
                      ▼
                    </div>
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
            {sortedData.length > 0 ? (
              sortedData.map((row, rowIndex) => (
                <tr 
                  key={row._originalIndex}
                  className={`hover:bg-slate-50/50 transition-colors group ${onRowClick && !isEditable ? 'cursor-pointer' : ''}`}
                >
                  <td 
                    className="px-3 py-3 text-slate-400 text-xs text-center select-none bg-slate-50/30 sticky left-0 z-10 border-r border-slate-100 cursor-pointer hover:bg-blue-50 active:bg-blue-100"
                    onMouseDown={(e) => handleCellMouseDown(rowIndex, -1, e)}
                  >
                    {row._originalIndex + 1}
                  </td>

                  {columns.map((col, colIndex) => {
                    const isEditing = editingCell?.rowIndex === row._originalIndex && editingCell?.col === col;
                    const isSelected = isCellSelected(rowIndex, colIndex);
                    
                    return (
                        <td 
                            key={`${row._originalIndex}-${colIndex}`} 
                            className={`px-6 py-3 text-slate-600 whitespace-nowrap max-w-xs truncate border-x border-transparent transition-all
                              ${isSelected ? 'bg-blue-100/70 border-blue-200 z-[1] ring-1 ring-blue-300 ring-inset' : ''}
                              ${isEditable ? 'cursor-cell' : 'cursor-default'}`}
                            onMouseDown={(e) => handleCellMouseDown(rowIndex, colIndex, e)}
                            onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
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
                  No data found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Excel Stats Bar */}
      {stats && stats.numericCount > 0 && (
        <div className="bg-blue-600 text-white px-6 py-2.5 flex items-center space-x-6 text-xs font-medium border-t border-blue-500 shadow-lg z-20">
          <div className="flex items-center opacity-80">
            <Calculator className="w-3.5 h-3.5 mr-2" />
            <span className="uppercase tracking-wider">Quick Stats</span>
          </div>
          <div className="h-4 w-px bg-white/20"></div>
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <div>Average: <span className="font-bold">{formatStat(stats.avg)}</span></div>
            <div>Count: <span className="font-bold">{stats.numericCount}</span></div>
            <div>Sum: <span className="font-bold">{formatStat(stats.sum)}</span></div>
            <div>Median: <span className="font-bold">{formatStat(stats.median)}</span></div>
            <div>Min: <span className="font-bold">{formatStat(stats.min)}</span></div>
            <div>Max: <span className="font-bold">{formatStat(stats.max)}</span></div>
          </div>
        </div>
      )}
      
      {!stats || stats.numericCount === 0 && (
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
           <span>{sortedData.length} records loaded</span>
           <span className="font-medium">Excel View Active</span>
        </div>
      )}
    </div>
  );
};
