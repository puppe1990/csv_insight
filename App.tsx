import React, { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { DataTable } from './components/DataTable';
import { DataVisualizer } from './components/DataVisualizer';
import { AiAssistant } from './components/AiAssistant';
import { DataComparator } from './components/DataComparator';
import { AppView, DashboardTab, CsvRow, ParseResult } from './types';
import { LayoutGrid, Table as TableIcon, BarChart2, MessageSquare, Database, X, ArrowLeftRight, Check, FileSpreadsheet, Play, Download } from 'lucide-react';
import { Button } from './components/Button';
import * as d3 from 'd3';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.UPLOAD);
  const [data, setData] = useState<ParseResult | null>(null);
  const [data2, setData2] = useState<ParseResult | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>(DashboardTab.DATA);

  // Upload Screen State
  const [uploadMode, setUploadMode] = useState<'single' | 'compare'>('single');
  const [compareData1, setCompareData1] = useState<ParseResult | null>(null);
  const [compareData2, setCompareData2] = useState<ParseResult | null>(null);

  const handleDataLoaded = (result: ParseResult) => {
    setData(result);
    setView(AppView.DASHBOARD);
  };

  const handleData2Loaded = (result: ParseResult) => {
    setData2(result);
  };

  const handleStartComparison = () => {
    if (compareData1 && compareData2) {
      setData(compareData1);
      setData2(compareData2);
      setView(AppView.DASHBOARD);
      setActiveTab(DashboardTab.COMPARISON);
    }
  };

  const handleReset = () => {
    setData(null);
    setData2(null);
    setCompareData1(null);
    setCompareData2(null);
    setView(AppView.UPLOAD);
    setActiveTab(DashboardTab.DATA);
    setUploadMode('single');
  };

  const handleClearComparison = (e: React.MouseEvent) => {
    e.stopPropagation();
    setData2(null);
    if (activeTab === DashboardTab.COMPARISON) {
      setActiveTab(DashboardTab.DATA);
    }
  };

  const handleDataUpdate = (newData: CsvRow[]) => {
    if (data) {
      setData({
        ...data,
        data: newData
      });
    }
  };

  const handleAddRow = () => {
    if (!data) return;
    const newRow: CsvRow = {};
    // Initialize with empty strings or reasonable defaults
    data.columns.forEach(col => newRow[col] = '');
    
    const newData = [...data.data, newRow];
    
    setData({
      ...data,
      data: newData,
      meta: { ...data.meta, rowCount: newData.length }
    });
  };

  const handleDeleteRow = (originalIndex: number) => {
    if (!data) return;
    const newData = [...data.data];
    if (originalIndex >= 0 && originalIndex < newData.length) {
      newData.splice(originalIndex, 1);
      setData({
        ...data,
        data: newData,
        meta: { ...data.meta, rowCount: newData.length }
      });
    }
  };

  const handleExportCsv = () => {
    if (!data) return;
    
    // Generate CSV string
    const csv = d3.csvFormat(data.data, data.columns);
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    // Prefix filename with "edited_" if it exists, otherwise "export.csv"
    const originalName = data.meta.fileName || 'export.csv';
    const filename = originalName.startsWith('edited_') ? originalName : `edited_${originalName}`;
    
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const TabButton = ({ tab, label, icon }: { tab: DashboardTab, label: string, icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200
        ${activeTab === tab 
          ? 'bg-blue-600 text-white shadow-md' 
          : 'text-slate-600 hover:bg-slate-200'
        }`}
    >
      <span className="mr-2">{icon}</span>
      {label}
    </button>
  );

  return (
    <div className="h-full flex flex-col bg-slate-50">
      {/* Header */}
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm z-20">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Database className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">CSV Insight</h1>
        </div>
        
        {view === AppView.DASHBOARD && data && (
          <div className="flex items-center space-x-6">
            <div className="hidden md:flex items-center text-sm text-slate-500 space-x-4 border-r border-slate-200 pr-6">
              <span className="flex items-center">
                <span className="font-semibold text-slate-700 mr-1">{data.meta.rowCount}</span> Rows
              </span>
              <span className="flex items-center">
                <span className="font-semibold text-slate-700 mr-1">{data.columns.length}</span> Columns
              </span>
              <span className="truncate max-w-[150px]" title={data.meta.fileName}>
                {data.meta.fileName}
              </span>
            </div>
            
            <button 
              onClick={handleExportCsv}
              className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors flex items-center text-sm font-medium"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Export CSV
            </button>

            <button 
              onClick={handleReset}
              className="text-slate-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center text-sm font-medium"
            >
              <X className="w-4 h-4 mr-1.5" />
              Close File
            </button>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden relative">
        {view === AppView.UPLOAD ? (
          <div className="h-full flex items-center justify-center animate-fade-in p-4 relative">
             <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0 opacity-40">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200 rounded-full blur-[100px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-200 rounded-full blur-[100px]"></div>
             </div>
             
             <div className="z-10 w-full max-w-4xl flex flex-col items-center">
               
               {/* Mode Switcher */}
               <div className="bg-white p-1.5 rounded-full shadow-sm border border-slate-200 mb-8 flex items-center space-x-1">
                 <button
                   onClick={() => setUploadMode('single')}
                   className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center ${
                     uploadMode === 'single' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
                   }`}
                 >
                   <FileSpreadsheet className="w-4 h-4 mr-2" />
                   Analyze Single File
                 </button>
                 <button
                   onClick={() => setUploadMode('compare')}
                   className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 flex items-center ${
                     uploadMode === 'compare' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-700'
                   }`}
                 >
                   <ArrowLeftRight className="w-4 h-4 mr-2" />
                   Compare Two Files
                 </button>
               </div>

               {uploadMode === 'single' ? (
                 <div className="w-full max-w-2xl animate-in fade-in zoom-in duration-300">
                   <FileUpload onDataLoaded={handleDataLoaded} label="Upload your data to analyze" />
                 </div>
               ) : (
                 <div className="w-full animate-in fade-in zoom-in duration-300 flex flex-col items-center">
                   <div className="grid md:grid-cols-2 gap-6 w-full mb-8">
                     {/* File 1 Uploader */}
                     <div className="relative">
                       {compareData1 ? (
                         <div className="h-48 bg-white rounded-3xl border-2 border-green-100 flex flex-col items-center justify-center p-6 shadow-sm relative overflow-hidden group">
                           <div className="absolute inset-0 bg-green-50/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                           <div className="z-10 flex flex-col items-center">
                             <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                               <Check className="w-6 h-6" />
                             </div>
                             <h3 className="font-semibold text-slate-800 line-clamp-1 text-center max-w-[200px]" title={compareData1.meta.fileName}>
                               {compareData1.meta.fileName}
                             </h3>
                             <p className="text-xs text-slate-500 mt-1">{compareData1.meta.rowCount} rows</p>
                             <button 
                               onClick={() => setCompareData1(null)}
                               className="mt-3 text-xs font-medium text-red-500 hover:text-red-700 hover:underline"
                             >
                               Change File
                             </button>
                           </div>
                         </div>
                       ) : (
                         <FileUpload 
                           onDataLoaded={setCompareData1} 
                           label="Upload Base File" 
                           variant="compact"
                         />
                       )}
                     </div>

                     {/* File 2 Uploader */}
                     <div className="relative">
                       {compareData2 ? (
                         <div className="h-48 bg-white rounded-3xl border-2 border-green-100 flex flex-col items-center justify-center p-6 shadow-sm relative overflow-hidden group">
                           <div className="absolute inset-0 bg-green-50/50 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                           <div className="z-10 flex flex-col items-center">
                             <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-3">
                               <Check className="w-6 h-6" />
                             </div>
                             <h3 className="font-semibold text-slate-800 line-clamp-1 text-center max-w-[200px]" title={compareData2.meta.fileName}>
                               {compareData2.meta.fileName}
                             </h3>
                             <p className="text-xs text-slate-500 mt-1">{compareData2.meta.rowCount} rows</p>
                             <button 
                               onClick={() => setCompareData2(null)}
                               className="mt-3 text-xs font-medium text-red-500 hover:text-red-700 hover:underline"
                             >
                               Change File
                             </button>
                           </div>
                         </div>
                       ) : (
                         <FileUpload 
                           onDataLoaded={setCompareData2} 
                           label="Upload Comparison File" 
                           variant="compact"
                         />
                       )}
                     </div>
                   </div>

                   <Button 
                     size="lg" 
                     className="px-12 py-4 text-lg rounded-2xl shadow-xl shadow-indigo-200"
                     disabled={!compareData1 || !compareData2}
                     onClick={handleStartComparison}
                     variant={(!compareData1 || !compareData2) ? 'secondary' : 'primary'}
                   >
                     <Play className="w-5 h-5 mr-2 fill-current" />
                     Start Comparison
                   </Button>
                 </div>
               )}
             </div>
          </div>
        ) : (
          <div className="h-full flex flex-col max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
            {/* Dashboard Navigation */}
            <div className="flex items-center space-x-2 mb-6 bg-white/50 p-1 rounded-xl w-fit backdrop-blur-sm border border-slate-200/60 overflow-x-auto max-w-full">
              <TabButton tab={DashboardTab.DATA} label="Data Grid" icon={<TableIcon className="w-4 h-4" />} />
              <TabButton tab={DashboardTab.CHARTS} label="Visualization" icon={<BarChart2 className="w-4 h-4" />} />
              <TabButton tab={DashboardTab.INSIGHTS} label="AI Insights" icon={<MessageSquare className="w-4 h-4" />} />
              
              <div className="w-px h-6 bg-slate-300 mx-1"></div>
              
              <button
                onClick={() => setActiveTab(DashboardTab.COMPARISON)}
                className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 group
                  ${activeTab === DashboardTab.COMPARISON 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                  }`}
              >
                <ArrowLeftRight className="w-4 h-4 mr-2" />
                Compare
                {data2 && (
                  <span 
                    onClick={handleClearComparison}
                    className={`ml-2 p-0.5 rounded-full hover:bg-white/20 transition-colors ${activeTab === DashboardTab.COMPARISON ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'}`}
                    title="Remove comparison file"
                  >
                    <X className="w-3 h-3" />
                  </span>
                )}
              </button>
            </div>

            {/* Dashboard Content Area */}
            <div className="flex-1 min-h-0 animate-fade-in">
              {data && (
                <>
                  <div className={`h-full ${activeTab === DashboardTab.DATA ? 'block' : 'hidden'}`}>
                    <DataTable 
                      data={data.data} 
                      columns={data.columns} 
                      isEditable={true}
                      onDataChange={handleDataUpdate}
                      onRowAdd={handleAddRow}
                      onRowDelete={handleDeleteRow}
                    />
                  </div>
                  <div className={`h-full ${activeTab === DashboardTab.CHARTS ? 'block' : 'hidden'}`}>
                    <DataVisualizer data={data.data} columns={data.columns} />
                  </div>
                  <div className={`h-full ${activeTab === DashboardTab.INSIGHTS ? 'block' : 'hidden'}`}>
                    <AiAssistant 
                      data={data.data} 
                      columns={data.columns} 
                      fileName={data.meta.fileName} 
                      data2={data2?.data}
                      columns2={data2?.columns}
                      fileName2={data2?.meta.fileName}
                    />
                  </div>
                  <div className={`h-full ${activeTab === DashboardTab.COMPARISON ? 'block' : 'hidden'}`}>
                    {data2 ? (
                      <DataComparator data1={data} data2={data2} />
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200 shadow-sm p-8">
                        <div className="max-w-xl w-full">
                          <h2 className="text-xl font-semibold text-center text-slate-800 mb-6">Compare with another CSV</h2>
                          <div className="border-2 border-dashed border-indigo-200 rounded-2xl bg-indigo-50/50 p-4">
                            <FileUpload onDataLoaded={handleData2Loaded} label="Upload a second CSV to compare rows" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
