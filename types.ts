export interface CsvRow {
  [key: string]: string | number | null;
}

export interface ParseResult {
  data: CsvRow[];
  columns: string[];
  meta: {
    rowCount: number;
    fileSize: number;
    fileName: string;
  };
}

export enum AppView {
  UPLOAD = 'UPLOAD',
  DASHBOARD = 'DASHBOARD'
}

export enum DashboardTab {
  DATA = 'DATA',
  CHARTS = 'CHARTS',
  INSIGHTS = 'INSIGHTS',
  COMPARISON = 'COMPARISON'
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isError?: boolean;
}
