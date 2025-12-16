import React, { useMemo } from 'react';
import { CsvRow } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import * as d3 from 'd3';

interface DataVisualizerProps {
  data: CsvRow[];
  columns: string[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export const DataVisualizer: React.FC<DataVisualizerProps> = ({ data, columns }) => {
  // Identify numeric columns for visualization
  const numericColumns = useMemo(() => {
    if (data.length === 0) return [];
    return columns.filter(col => {
      // Check first 10 rows to see if mostly numeric
      const sample = data.slice(0, 10);
      return sample.every(row => {
        const val = row[col];
        return typeof val === 'number' || (typeof val === 'string' && !isNaN(parseFloat(val)));
      });
    });
  }, [data, columns]);

  const categoricalColumns = useMemo(() => {
    return columns.filter(col => !numericColumns.includes(col));
  }, [columns, numericColumns]);

  // Aggregate data for a categorical breakdown (if a category column exists)
  const categoryChartData = useMemo(() => {
    if (categoricalColumns.length === 0) return null;
    
    // Pick the first categorical column with low cardinality (< 20 unique values) ideally
    let bestCatCol = categoricalColumns[0];
    for (const col of categoricalColumns) {
       const unique = new Set(data.map(d => d[col])).size;
       if (unique > 1 && unique <= 10) {
         bestCatCol = col;
         break;
       }
    }

    // Group by this column
    const rolledUp = d3.rollups(
      data,
      v => v.length,
      d => String(d[bestCatCol])
    ).map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // Top 10

    return { col: bestCatCol, data: rolledUp };
  }, [data, categoricalColumns]);

  // Prepare simple numeric data (taking first 50 rows for clarity in line/bar charts)
  const numericChartData = useMemo(() => {
    return data.slice(0, 50).map((row, i) => ({
      index: i,
      ...row
    }));
  }, [data]);

  if (numericColumns.length === 0 && !categoryChartData) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 p-10">
        <p>No clear numeric or categorical patterns found to visualize automatically.</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto p-4 space-y-8">
      
      {/* 1. Categorical Distribution (Pie) */}
      {categoryChartData && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Distribution by {categoryChartData.col}</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryChartData.data}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryChartData.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 2. Numeric Trends (Line) - If multiple numeric cols */}
      {numericColumns.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Numeric Trends (First 50 rows)</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={numericChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="index" hide />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                />
                <Legend />
                {numericColumns.slice(0, 3).map((col, idx) => (
                  <Line 
                    key={col} 
                    type="monotone" 
                    dataKey={col} 
                    stroke={COLORS[idx % COLORS.length]} 
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

       {/* 3. Bar Chart Comparison (first numeric col) */}
       {numericColumns.length > 0 && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">{numericColumns[0]} Values</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={numericChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="index" hide />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip cursor={{fill: '#f1f5f9'}} />
                <Bar dataKey={numericColumns[0]} fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};
