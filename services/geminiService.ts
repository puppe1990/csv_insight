import { GoogleGenAI } from "@google/genai";
import { CsvRow } from "../types";

// Initialize Gemini Client
// CRITICAL: The API key must be available in process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export interface ComparisonContext {
  fileName1: string;
  fileName2: string;
  columns2: string[];
  dataSample2: CsvRow[];
  totalRows2: number;
}

/**
 * Generates an insight or answers a question about the CSV data.
 * To optimize tokens, we send the headers and a sample of the data (first 50 rows).
 */
export const askGeminiAboutData = async (
  question: string,
  columns: string[],
  dataSample: CsvRow[],
  totalRows: number,
  comparisonContext?: ComparisonContext
): Promise<string> => {
  try {
    const model = "gemini-2.5-flash";
    
    // Construct a context-aware prompt
    const dataString1 = JSON.stringify(dataSample.slice(0, 50));
    
    let prompt = "";

    if (comparisonContext) {
      const dataString2 = JSON.stringify(comparisonContext.dataSample2.slice(0, 50));
      prompt = `
        You are an expert data analyst assistant.
        I have loaded TWO CSV files for comparison.
        
        File 1: "${comparisonContext.fileName1}"
        - Total Rows: ${totalRows}
        - Columns: ${columns.join(', ')}
        - Sample Data (first 50 rows):
        ${dataString1}
        
        File 2: "${comparisonContext.fileName2}"
        - Total Rows: ${comparisonContext.totalRows2}
        - Columns: ${comparisonContext.columns2.join(', ')}
        - Sample Data (first 50 rows):
        ${dataString2}
        
        User Question: ${question}
        
        Please provide a concise, helpful answer. Compare the structures, columns, or values if asked.
        Since you only have a sample, if the question requires full data analysis (like "find exact duplicates across all rows"), explain the limitation or provide an answer based on the samples.
        Format your response with Markdown.
      `;
    } else {
      prompt = `
        You are an expert data analyst assistant.
        I have loaded a CSV file with ${totalRows} rows.
        The columns are: ${columns.join(', ')}.
        
        Here is a sample of the data (first 50 rows in JSON format):
        ${dataString1}
        
        User Question: ${question}
        
        Please provide a concise, helpful answer based on the data sample provided. 
        If the answer requires analyzing all rows (which you don't have), explain how one might analyze it 
        or give an answer based on the trends seen in the sample. 
        Format your response with Markdown.
      `;
    }

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: "You are a helpful data analyst. Use Markdown for formatting tables or lists.",
      }
    });

    return response.text || "I couldn't generate a response.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to communicate with Gemini.");
  }
};
