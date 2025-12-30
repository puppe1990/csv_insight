
import React, { useState, useMemo } from 'react';
import { CsvRow, ParseResult } from '../types';
import { DataTable } from './DataTable';
import { Button } from './Button';
import * as d3 from 'd3';
import * as XLSX from 'xlsx';
import { ArrowLeftRight, Check, X, FileMinus, AlertCircle, Calculator, Download, Table2 } from 'lucide-react';

interface DataComparatorProps {
  data1: ParseResult;
  data2: ParseResult;
}

type ViewMode = 'matches' | 'unique1' | 'unique2';

export const DataComparator: React.FC<DataComparatorProps> = ({ data1, data2 }) => {
  // Find common columns
  const commonColumns = useMemo(() => {
    return data1.columns.filter(col => data2.columns.includes(col));
  }, [data1, data2]);

  const [joinKey, setJoinKey] = useState<string>(commonColumns.length > 0 ? commonColumns[0] : '');
  const [viewMode, setViewMode] = useState<ViewMode>('matches');
  const [selectedRow, setSelectedRow] = useState<CsvRow | null>(null);

  // Compute comparison
  const comparisonResult = useMemo(() => {
    if (!joinKey) return { matches: [], unique1: [], unique2: [] };

    const map2 = new Map<string, CsvRow>();
    
    // Index data2 by key
    // We convert key to string to ensure matching works across types (e.g. number vs string)
    data2.data.forEach(row => {
      const keyVal = String(row[joinKey]);
      map2.set(keyVal, row);
    });

    const matches: CsvRow[] = [];
    const unique1: CsvRow[] = [];
    const matchedKeys = new Set<string>();

    // Iterate data1
    data1.data.forEach(row1 => {
      const keyVal = String(row1[joinKey]);
      if (map2.has(keyVal)) {
        const row2 = map2.get(keyVal)!;
        matchedKeys.add(keyVal);
        
        // Merge rows for matches view
        // We prefix columns to avoid collision, except the join key
        const mergedRow: CsvRow = { [joinKey]: row1[joinKey] }; // Start with key
        
        // Add File 1 columns
        Object.keys(row1).forEach(k => {
          if (k !== joinKey) mergedRow[`(File 1) ${k}`] = row1[k];
        });
        
        // Add File 2 columns
        Object.keys(row2).forEach(k => {
          if (k !== joinKey) mergedRow[`(File 2) ${k}`] = row2[k];
        });

        matches.push(mergedRow);
      } else {
        unique1.push(row1);
      }
    });

    // Find unique in data2
    const unique2 = data2.data.filter(row => !matchedKeys.has(String(row[joinKey])));

    return { matches, unique1, unique2 };
  }, [data1, data2, joinKey]);

  // Determine specific column order for matches view to place common columns side-by-side
  const matchViewColumns = useMemo(() => {
    if (!joinKey) return [];
    
    const cols = [joinKey];
    const processedBaseCols = new Set<string>([joinKey]);

    // 1. Process columns from Data 1
    data1.columns.forEach(col => {
      if (col === joinKey) return;
      
      // Add File 1 column
      cols.push(`(File 1) ${col}`);
      
      // If this column also exists in Data 2, add it right next to it
      if (data2.columns.includes(col)) {
        cols.push(`(File 2) ${col}`);
      }
      
      processedBaseCols.add(col);
    });

    // 2. Process remaining columns from Data 2 (those not in Data 1)
    data2.columns.forEach(col => {
      if (!processedBaseCols.has(col)) {
        cols.push(`(File 2) ${col}`);
      }
    });

    return cols;
  }, [data1, data2, joinKey]);

  // Determine columns for the current view
  const currentColumns = useMemo(() => {
    if (viewMode === 'matches') {
      return matchViewColumns;
    } else if (viewMode === 'unique1') {
      return data1.columns;
    } else {
      return data2.columns;
    }
  }, [viewMode, matchViewColumns, data1, data2]);

  // Prepare comparison data for the selected row modal
  const selectedRowComparison = useMemo(() => {
    if (!selectedRow || viewMode !== 'matches') return null;

    const allOriginalColumns = Array.from(new Set([...data1.columns, ...data2.columns]));
    
    return allOriginalColumns.map(col => {
      if (col === joinKey) {
        return { 
          col, 
          val1: selectedRow[joinKey], 
          val2: selectedRow[joinKey], 
          isMatch: true, 
          diff: null 
        };
      }

      const val1 = selectedRow[`(File 1) ${col}`];
      const val2 = selectedRow[`(File 2) ${col}`];
      
      // Check if values exist (they might be undefined if column is only present in one file)
      const hasVal1 = val1 !== undefined;
      const hasVal2 = val2 !== undefined;

      let isMatch = false;
      let diff: string | number | null = null;

      if (hasVal1 && hasVal2) {
        if (typeof val1 === 'number' && typeof val2 === 'number') {
           isMatch = val1 === val2;
           if (!isMatch) diff = val2 - val1;
        } else {
           isMatch = String(val1) === String(val2);
        }
      } else if (!hasVal1 && !hasVal2) {
        isMatch = true; // Both missing (unlikely given logic but possible)
      } else {
        isMatch = false; // One missing
      }

      return {
        col,
        val1: hasVal1 ? val1 : <span className="text-slate-300 text-xs uppercase">Missing</span>,
        val2: hasVal2 ? val2 : <span className="text-slate-300 text-xs uppercase">Missing</span>,
        isMatch,
        diff
      };
    }).sort((a, b) => {
        // Put mismatches first
        if (a.isMatch === b.isMatch) return 0;
        return a.isMatch ? 1 : -1;
    });

  }, [selectedRow, viewMode, data1.columns, data2.columns, joinKey]);

  const getExportData = () => {
    return viewMode === 'matches' ? comparisonResult.matches :
           viewMode === 'unique1' ? comparisonResult.unique1 :
           comparisonResult.unique2;
  };

  const getExportFileName = (ext: string) => {
    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 12);
    let baseName = 'export';
    if (viewMode === 'matches') baseName = 'comparison_matches';
    else if (viewMode === 'unique1') baseName = `unique_to_${data1.meta.fileName.replace('.csv', '')}`;
    else baseName = `unique_to_${data2.meta.fileName.replace('.csv', '')}`;
    return `${baseName}_${timestamp}.${ext}`;
  };

  const handleExportCsv = () => {
    const dataToExport = getExportData();
    if (dataToExport.length === 0) return;

    const csv = d3.csvFormat(dataToExport, currentColumns);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', getExportFileName('csv'));
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportExcel = () => {
    const dataToExport = getExportData();
    if (dataToExport.length === 0) return;

    // We use the currentColumns to ensure the Excel has the same order as shown
    const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: currentColumns });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Comparison");
    XLSX.writeFile(workbook, getExportFileName('xlsx'));
  };

  if (commonColumns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-500">
        <FileMinus className="w-16 h-16 mb-4 text-slate-300" />
        <h3 className="text-lg font-semibold text-slate-700">No Common Columns</h3>
        <p>These two CSV files do not share any column names, so they cannot be automatically compared.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 space-y-4 p-4">
      {/* Configuration Header */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
             <ArrowLeftRight className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Compare Logic</h2>
            <div className="flex items-center space-x-2">
              <span className="text-slate-700">Match rows where</span>
              <select
                value={joinKey}
                onChange={(e) => setJoinKey(e.target.value)}
                className="bg-slate-100 border-none font-semibold text-indigo-700 rounded-md py-1 px-3 focus:ring-2 focus:ring-indigo-500 cursor-pointer hover:bg-slate-200 transition-colors"
              >
                {commonColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
              <span className="text-slate-700">is the same.</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={handleExportCsv}
            icon={<Download className="w-4 h-4" />}
            disabled={getExportData().length === 0}
          >
            CSV
          </Button>
          <Button 
            variant="secondary" 
            size="sm"
            className="text-green-700 border-green-200 bg-green-50/30 hover:bg-green-50 hover:border-green-300"
            onClick={handleExportExcel}
            icon={<Table2 className="w-4 h-4" />}
            disabled={getExportData().length === 0}
          >
            Excel
          </Button>
        </div>
      </div>

      {/* Stats Cards / Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setViewMode('matches')}
          className={`p-4 rounded-xl border transition-all duration-200 text-left relative overflow-hidden
            ${viewMode === 'matches' 
              ? 'bg-white border-green-500 ring-1 ring-green-500 shadow-md' 
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
            }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Matches Found</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{comparisonResult.matches.length}</h3>
              <p className="text-xs text-slate-400 mt-1">Rows in both files</p>
            </div>
            <div className={`p-2 rounded-full ${viewMode === 'matches' ? 'bg-green-100' : 'bg-slate-100'}`}>
              <Check className={`w-5 h-5 ${viewMode === 'matches' ? 'text-green-600' : 'text-slate-400'}`} />
            </div>
          </div>
        </button>

        <button
          onClick={() => setViewMode('unique1')}
          className={`p-4 rounded-xl border transition-all duration-200 text-left relative overflow-hidden
            ${viewMode === 'unique1' 
              ? 'bg-white border-blue-500 ring-1 ring-blue-500 shadow-md' 
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
            }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Unique to {data1.meta.fileName}</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{comparisonResult.unique1.length}</h3>
              <p className="text-xs text-slate-400 mt-1">Rows only in File 1</p>
            </div>
            <div className={`p-2 rounded-full ${viewMode === 'unique1' ? 'bg-blue-100' : 'bg-slate-100'}`}>
              <FileMinus className={`w-5 h-5 ${viewMode === 'unique1' ? 'text-blue-600' : 'text-slate-400'}`} />
            </div>
          </div>
        </button>

        <button
          onClick={() => setViewMode('unique2')}
          className={`p-4 rounded-xl border transition-all duration-200 text-left relative overflow-hidden
            ${viewMode === 'unique2' 
              ? 'bg-white border-orange-500 ring-1 ring-orange-500 shadow-md' 
              : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-sm'
            }`}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase">Unique to {data2.meta.fileName}</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{comparisonResult.unique2.length}</h3>
              <p className="text-xs text-slate-400 mt-1">Rows only in File 2</p>
            </div>
            <div className={`p-2 rounded-full ${viewMode === 'unique2' ? 'bg-orange-100' : 'bg-slate-100'}`}>
              <FileMinus className={`w-5 h-5 ${viewMode === 'unique2' ? 'text-orange-600' : 'text-slate-400'}`} />
            </div>
          </div>
        </button>
      </div>

      {/* Results Table */}
      <div className="flex-1 min-h-0 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
        <DataTable 
          data={
            viewMode === 'matches' ? comparisonResult.matches :
            viewMode === 'unique1' ? comparisonResult.unique1 : 
            comparisonResult.unique2
          } 
          columns={currentColumns} 
          onRowClick={viewMode === 'matches' ? (row) => setSelectedRow(row) : undefined}
        />
      </div>

      {/* Comparison Modal */}
      {selectedRow && selectedRowComparison && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <Calculator className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Row Difference Analysis</h3>
                  <p className="text-sm text-slate-500">Comparing <span className="font-medium text-indigo-600">{joinKey}: {String(selectedRow[joinKey])}</span></p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedRow(null)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-0">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50 sticky top-0 shadow-sm z-10">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-slate-600 border-b border-slate-200">Column</th>
                    <th className="px-6 py-3 font-semibold text-slate-600 border-b border-slate-200">{data1.meta.fileName}</th>
                    <th className="px-6 py-3 font-semibold text-slate-600 border-b border-slate-200">{data2.meta.fileName}</th>
                    <th className="px-6 py-3 font-semibold text-slate-600 border-b border-slate-200 text-right">Difference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedRowComparison.map((row, idx) => (
                    <tr 
                      key={row.col} 
                      className={`${!row.isMatch ? 'bg-red-50/50' : 'bg-white'} hover:bg-slate-50 transition-colors`}
                    >
                      <td className="px-6 py-3 font-medium text-slate-700 border-r border-slate-100/50">{row.col}</td>
                      <td className={`px-6 py-3 ${!row.isMatch ? 'text-red-700 bg-red-50/30' : 'text-slate-600'}`}>
                        {row.val1}
                      </td>
                      <td className={`px-6 py-3 ${!row.isMatch ? 'text-red-700 bg-red-50/30' : 'text-slate-600'}`}>
                        {row.val2}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {row.isMatch ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Match
                          </span>
                        ) : (
                          <div className="flex flex-col items-end">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 mb-1">
                              Mismatch
                            </span>
                            {row.diff !== null && (
                              <span className="text-xs font-mono font-semibold text-red-600">
                                {typeof row.diff === 'number' && row.diff > 0 ? '+' : ''}{row.diff}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
               <button 
                onClick={() => setSelectedRow(null)}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium shadow-sm transition-colors"
               >
                 Close Analysis
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
