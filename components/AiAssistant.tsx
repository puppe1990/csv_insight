import React, { useState, useRef, useEffect } from 'react';
import { CsvRow, ChatMessage } from '../types';
import { askGeminiAboutData } from '../services/geminiService';
import { Send, Bot, User, Sparkles } from 'lucide-react';
import { Button } from './Button';
import ReactMarkdown from 'react-markdown';

interface AiAssistantProps {
  data: CsvRow[];
  columns: string[];
  fileName: string;
  data2?: CsvRow[];
  columns2?: string[];
  fileName2?: string;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ 
  data, 
  columns, 
  fileName,
  data2,
  columns2,
  fileName2
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize welcome message
  useEffect(() => {
    let welcomeText = `Hi! I'm your data assistant. I've analyzed **${fileName}**. Ask me anything about the data structure, summary, or specific values!`;
    
    if (data2 && fileName2) {
      welcomeText = `Hi! I see you have loaded two files:
1. **${fileName}**
2. **${fileName2}**

I can help you compare them! Ask me about column differences, structure matching, or potential data overlaps.`;
    }

    setMessages([{
      id: 'welcome',
      role: 'model',
      text: welcomeText,
      timestamp: Date.now()
    }]);
  }, [fileName, fileName2, data2]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const comparisonContext = (data2 && columns2 && fileName2) ? {
        fileName1: fileName,
        fileName2: fileName2,
        columns2: columns2,
        dataSample2: data2,
        totalRows2: data2.length
      } : undefined;

      const responseText = await askGeminiAboutData(
        userMsg.text, 
        columns, 
        data, 
        data.length,
        comparisonContext
      );
      
      const modelMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, modelMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "Sorry, I encountered an error analyzing the data. Please try again.",
        timestamp: Date.now(),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-purple-50 flex items-center">
        <Sparkles className="w-5 h-5 text-indigo-600 mr-2" />
        <h2 className="font-semibold text-slate-800">AI Data Analyst {data2 ? '& Comparator' : ''}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center mx-2 ${msg.role === 'user' ? 'bg-blue-100' : 'bg-indigo-100'}`}>
                {msg.role === 'user' ? <User className="w-5 h-5 text-blue-600" /> : <Bot className="w-5 h-5 text-indigo-600" />}
              </div>
              
              <div
                className={`p-3 rounded-2xl text-sm leading-relaxed shadow-sm
                  ${msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                  } ${msg.isError ? 'bg-red-50 text-red-600 border-red-200' : ''}`}
              >
                 {msg.role === 'model' ? (
                   <div className="markdown prose prose-sm max-w-none prose-slate">
                     <ReactMarkdown>{msg.text}</ReactMarkdown>
                   </div>
                 ) : (
                   msg.text
                 )}
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
           <div className="flex justify-start w-full">
             <div className="flex flex-row max-w-[85%]">
               <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center mx-2">
                 <Bot className="w-5 h-5 text-indigo-600" />
               </div>
               <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex space-x-2 items-center">
                 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce"></div>
                 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-75"></div>
                 <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce delay-150"></div>
               </div>
             </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-200 bg-white">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={data2 ? "Ask about comparison or data structure..." : "Ask a question about your data..."}
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
          <Button type="submit" variant="primary" disabled={isLoading || !input.trim()} className="!px-3 bg-indigo-600 hover:bg-indigo-700">
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
};
