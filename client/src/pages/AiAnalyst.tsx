import React, { useState, useEffect, useRef, useMemo } from "react";
import { useLocation } from "wouter";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Upload,
  Database,
  Brain,
  MessageSquare,
  Send,
  ArrowLeft,
  Settings,
  RefreshCw,
  FileText,
  BarChart3,
  LineChart,
  PieChart as PieIcon,
  HelpCircle,
  Info,
  X,
  Key,
  Check,
  Sparkles,
  AlertTriangle,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts";

// Interface Definitions
interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  chartConfig?: ChartConfig | null;
  error?: boolean;
}

interface ChartConfig {
  type: "bar" | "line" | "pie";
  title: string;
  xKey: string;
  yKey: string;
  data: Array<Record<string, any>>;
}

interface FileMetadata {
  name: string;
  size: number;
  rowCount: number;
  columnCount: number;
  columns: string[];
  dataTypes: Record<string, string>;
}

// Chart Colors
const COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#f97316", // Orange
  "#14b8a6", // Teal
  "#6366f1"  // Indigo
];

export default function AiAnalyst() {
  const [, setLocation] = useLocation();

  // App State
  const [apiKey, setApiKey] = useState<string>(() => localStorage.getItem("anthropic_api_key") || "");
  const [useProxy, setUseProxy] = useState<boolean>(() => localStorage.getItem("anthropic_use_proxy") === "true" || true);
  const [customEndpoint, setCustomEndpoint] = useState<string>(() => localStorage.getItem("anthropic_custom_endpoint") || "/api/claude");
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  // Data State
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [parsedData, setParsedData] = useState<Array<Record<string, any>> | null>(null);
  const [previewRows, setPreviewRows] = useState<Array<Record<string, any>>>([]);
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  
  // Chat / Insights State
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [inputQuery, setInputQuery] = useState<string>("");
  const [insights, setInsights] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [insightsLoading, setInsightsLoading] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);
  
  // Scroll anchor for chat
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Save Settings to LocalStorage
  useEffect(() => {
    localStorage.setItem("anthropic_api_key", apiKey);
    localStorage.setItem("anthropic_use_proxy", useProxy ? "true" : "false");
    localStorage.setItem("anthropic_custom_endpoint", customEndpoint);
  }, [apiKey, useProxy, customEndpoint]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory, isLoading]);

  // Handle Drag & Drop
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Main File Processor
  const processFile = (selectedFile: File) => {
    const isCsv = selectedFile.name.endsWith(".csv");
    const isExcel = selectedFile.name.endsWith(".xlsx") || selectedFile.name.endsWith(".xls");

    if (!isCsv && !isExcel) {
      toast.error("Invalid file format. Please upload a CSV or Excel file.");
      return;
    }

    setFile(selectedFile);
    setIsParsing(true);
    setParsedData(null);
    setPreviewRows([]);
    setMetadata(null);
    setInsights([]);
    setChatHistory([]);

    const reader = new FileReader();

    if (isCsv) {
      reader.onload = (e) => {
        const text = e.target?.result as string;
        Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: (results) => {
            handleParsedContent(selectedFile.name, selectedFile.size, results.data as Array<Record<string, any>>);
          },
          error: (err) => {
            setIsParsing(false);
            toast.error(`Error parsing CSV: ${err.message}`);
          }
        });
      };
      reader.readAsText(selectedFile);
    } else {
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "binary" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as Array<Record<string, any>>;
          handleParsedContent(selectedFile.name, selectedFile.size, json);
        } catch (err: any) {
          setIsParsing(false);
          toast.error(`Error parsing Excel: ${err.message || err}`);
        }
      };
      reader.readAsBinaryString(selectedFile);
    }
  };

  // Calculate metadata & setup state
  const handleParsedContent = (name: string, size: number, data: Array<Record<string, any>>) => {
    if (!data || data.length === 0) {
      setIsParsing(false);
      toast.error("The uploaded file contains no data.");
      return;
    }

    // Capture Columns
    const columns = Object.keys(data[0]);
    const rowCount = data.length;
    const columnCount = columns.length;

    // Detect Data Types (based on checking up to 20 rows)
    const dataTypes: Record<string, string> = {};
    columns.forEach(col => {
      let numericCount = 0;
      let dateCount = 0;
      let totalChecked = 0;

      for (let i = 0; i < Math.min(20, rowCount); i++) {
        const val = data[i][col];
        if (val === null || val === undefined || val === "") continue;

        totalChecked++;
        if (typeof val === "number" || (!isNaN(Number(val)) && !isNaN(parseFloat(val)))) {
          numericCount++;
        } else if (val instanceof Date || !isNaN(Date.parse(val))) {
          // Double check it's not a short number string that accidentally parses as date
          if (typeof val === "string" && /^\d+$/.test(val) && val.length < 5) {
            // Probably an ID or year, treat as string/number
          } else {
            dateCount++;
          }
        }
      }

      if (totalChecked === 0) {
        dataTypes[col] = "string";
      } else if (numericCount / totalChecked > 0.8) {
        dataTypes[col] = "number";
      } else if (dateCount / totalChecked > 0.8) {
        dataTypes[col] = "date";
      } else {
        dataTypes[col] = "string";
      }
    });

    setParsedData(data);
    setPreviewRows(data.slice(0, 10));
    setMetadata({
      name,
      size,
      rowCount,
      columnCount,
      columns,
      dataTypes
    });
    setIsParsing(false);
    toast.success("File parsed successfully!");

    // Automatically trigger insights generation
    generateInitialInsights(data.slice(0, 50), columns);
  };

  // Helper to construct Anthropic payload
  const callClaudeAPI = async (systemPrompt: string, userMessage: string) => {
    const targetUrl = useProxy ? customEndpoint : "https://api.anthropic.com/v1/messages";
    
    // Check if key is needed and present
    if (!useProxy && !apiKey) {
      throw new Error("Anthropic API Key is required. Please set it in the settings panel (cog icon).");
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    if (!useProxy) {
      headers["X-API-Key"] = apiKey;
      headers["anthropic-version"] = "2023-06-01";
      // This enables browser access for local dev when using direct call
      headers["anthropic-dangerous-direct-browser-access"] = "true";
    } else {
      // Pass the API key to the proxy if entered
      if (apiKey) {
        headers["X-API-Key"] = apiKey;
      }
    }

    const payload = {
      model: "claude-3-5-sonnet-20241022", // Anthropic recommended model for coding/reasoning
      max_tokens: 4000,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userMessage
        }
      ]
    };

    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorMsg = `API Request failed with status ${response.status}`;
      try {
        const errorJson = await response.json();
        errorMsg = errorJson.error?.message || errorJson.error || errorMsg;
      } catch (e) {
        try {
          const errorText = await response.text();
          errorMsg = errorText || errorMsg;
        } catch (e2) {}
      }
      throw new Error(errorMsg);
    }

    const result = await response.json();
    return result.content[0]?.text || "";
  };

  // Generate 3-5 insights on upload
  const generateInitialInsights = async (sampleData: Array<Record<string, any>>, columns: string[]) => {
    setInsightsLoading(true);
    setInsights([]);

    const systemPrompt = `You are a professional data analyst AI. The user has uploaded a dataset. Analyze the sample data, identify patterns, anomalies, and distributions, and return a JSON object containing a list of 3 to 5 high-value quantitative insights about the data.
Always respond in this JSON format:
{
  "insights": [
    "Insight 1 (e.g. Sales increased by 12% in December...)",
    "Insight 2 (e.g. Region X represents 45% of total transactions...)",
    "Insight 3 (e.g. Product Category Y has the lowest average margin...)"
  ]
}`;

    const userMessage = `Data (First 50 Rows): ${JSON.stringify(sampleData)}
Columns & Types: ${JSON.stringify(columns)}

Please review the data and output the JSON format with 3-5 key bullet point insights.`;

    try {
      const responseText = await callClaudeAPI(systemPrompt, userMessage);
      
      // Parse JSON from response
      const sanitized = sanitizeJsonString(responseText);
      const parsed = JSON.parse(sanitized);
      
      if (parsed && Array.isArray(parsed.insights)) {
        setInsights(parsed.insights);
      } else {
        throw new Error("Invalid response format");
      }
    } catch (err: any) {
      console.error("Insights Error:", err);
      toast.error(`Could not generate auto-insights: ${err.message || err}`);
      // Add mock fallback insights so UI doesn't look empty if API key is not configured yet
      setInsights([
        "Configure your Anthropic API Key in the settings (top-right cog) to unlock automated data insights.",
        `Uploaded file: "${metadata?.name || 'Dataset'}" with ${metadata?.rowCount || 0} rows and ${metadata?.columnCount || 0} columns.`,
        "You can still preview the data table and ask questions once your API Key is configured."
      ]);
    } finally {
      setInsightsLoading(false);
    }
  };

  // Chat Q&A Submission
  const handleQuerySubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputQuery.trim() || !parsedData) return;

    const userQuery = inputQuery;
    setInputQuery("");

    // Add user message to history
    const userMessageId = Math.random().toString(36).substring(7);
    const userMsg: Message = {
      id: userMessageId,
      role: "user",
      content: userQuery,
      timestamp: new Date()
    };
    
    setChatHistory(prev => [...prev, userMsg]);
    setIsLoading(true);

    const systemPrompt = `You are a data analyst AI. The user will give you tabular data and ask questions.
Analyze the data carefully. You must return your response in this JSON format:
{
  "answer": "A clear, well-written analysis answering the user's question, including numbers and percentages where appropriate. Markdown formatting like bold text and bullet points is encouraged.",
  "chartConfig": {
    "type": "bar" | "line" | "pie",
    "title": "A descriptive title for the visualization",
    "xKey": "The column name to be used for the X-axis (or Pie labels)",
    "yKey": "The column name to be used for the Y-axis values (or Pie values)",
    "data": [
      { "xKeyVal": "Category A", "yKeyVal": 120 },
      { "xKeyVal": "Category B", "yKeyVal": 200 }
    ]
  }
}
If a chart is not applicable or helpful for the question, set "chartConfig" to null.
Ensure the keys inside "data" match EXACTLY the values you specify for xKey and yKey. For example, if xKey is "Region" and yKey is "Revenue", each item in "data" must be like: {"Region": "East", "Revenue": 45000}.
Limit the "data" array to a maximum of 15-20 aggregated data points so the chart remains readable. Sum or average values if necessary. Do not output raw un-aggregated data if it contains dozens of rows. Output numbers for the yKey values (not strings with currency symbols or commas).`;

    // Extract first 50 rows as context
    const sampleRows = parsedData.slice(0, 50);
    const userMessage = `Data: ${JSON.stringify(sampleRows)}

Question: ${userQuery}`;

    try {
      const responseText = await callClaudeAPI(systemPrompt, userMessage);
      
      const sanitized = sanitizeJsonString(responseText);
      const parsed = JSON.parse(sanitized);

      if (parsed && typeof parsed.answer === "string") {
        setChatHistory(prev => [
          ...prev,
          {
            id: Math.random().toString(36).substring(7),
            role: "assistant",
            content: parsed.answer,
            chartConfig: parsed.chartConfig || null,
            timestamp: new Date()
          }
        ]);
      } else {
        throw new Error("Invalid response JSON structure.");
      }
    } catch (err: any) {
      console.error("Query Error:", err);
      toast.error(`Error querying AI: ${err.message || err}`);
      setChatHistory(prev => [
        ...prev,
        {
          id: Math.random().toString(36).substring(7),
          role: "assistant",
          content: `Sorry, I encountered an error while analyzing your question. Please ensure your Anthropic API Key is correct and that the CORS Proxy settings are properly configured.\n\n**Details:** ${err.message || err}`,
          error: true,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to extract JSON from Claude's markdown response
  const sanitizeJsonString = (str: string): string => {
    // Look for content inside ```json ... ``` blocks first
    const jsonBlockRegex = /```json\s*([\s\S]*?)\s*```/;
    const match = str.match(jsonBlockRegex);
    let candidate = match ? match[1] : str;

    // If no markdown block, search for first '{' and last '}'
    if (!match) {
      const firstCurly = candidate.indexOf("{");
      const lastCurly = candidate.lastIndexOf("}");
      if (firstCurly !== -1 && lastCurly !== -1 && lastCurly > firstCurly) {
        candidate = candidate.substring(firstCurly, lastCurly + 1);
      }
    }

    return candidate.trim();
  };

  // Auto-fill a question helper
  const selectExampleQuestion = (question: string) => {
    setInputQuery(question);
  };

  // Render Recharts Visualizations
  const renderChart = (config: ChartConfig) => {
    const { type, title, xKey, yKey, data } = config;

    if (!data || !Array.isArray(data) || data.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center p-6 h-64 bg-slate-800/40 rounded-xl border border-slate-700 text-slate-400">
          <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
          <p className="text-sm font-medium">Visualization Empty or Invalid</p>
        </div>
      );
    }

    // Format data: ensure numeric values are numbers
    const formattedData = data.map(item => {
      const parsedVal = Number(item[yKey]);
      return {
        ...item,
        [yKey]: isNaN(parsedVal) ? item[yKey] : parsedVal
      };
    });

    const CustomTooltip = ({ active, payload, label }: any) => {
      if (active && payload && payload.length) {
        return (
          <div className="bg-slate-900 border border-slate-700 p-3 rounded-lg shadow-xl text-xs font-mono">
            <p className="text-slate-400 font-semibold mb-1">{`${xKey}: ${label}`}</p>
            <p className="text-blue-400 font-bold">
              {`${yKey}: ${typeof payload[0].value === 'number' ? payload[0].value.toLocaleString() : payload[0].value}`}
            </p>
          </div>
        );
      }
      return null;
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full mt-4 p-4 bg-slate-950/60 border border-slate-800 rounded-xl shadow-inner"
      >
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            {type === "bar" && <BarChart3 className="w-4 h-4 text-blue-500" />}
            {type === "line" && <LineChart className="w-4 h-4 text-emerald-500" />}
            {type === "pie" && <PieIcon className="w-4 h-4 text-amber-500" />}
            {title}
          </h4>
          <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full uppercase">
            {type} chart
          </span>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {type === "bar" ? (
              <BarChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey={xKey} 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false}
                  tickFormatter={(val) => typeof val === 'number' ? val.toLocaleString() : val}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey={yKey} fill="#3b82f6" radius={[4, 4, 0, 0]}>
                  {formattedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            ) : type === "line" ? (
              <LineChart data={formattedData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis 
                  dataKey={xKey} 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false}
                  dy={10}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={10} 
                  tickLine={false}
                  tickFormatter={(val) => typeof val === 'number' ? val.toLocaleString() : val}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey={yKey}
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ fill: "#10b981", r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            ) : (
              <PieChart>
                <Pie
                  data={formattedData}
                  dataKey={yKey}
                  nameKey={xKey}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  labelLine={{ stroke: '#475569', strokeWidth: 1 }}
                >
                  {formattedData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            )}
          </ResponsiveContainer>
        </div>
      </motion.div>
    );
  };

  // Generate formatted bytes
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setLocation("/")}
            className="p-2 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-400">
              <Brain className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
                AI Data Analyst Agent
              </h1>
              <p className="text-[10px] font-mono text-slate-400 tracking-widest uppercase">
                Privacy-First / Client-Side Q&A
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg border transition-all ${
              showSettings 
                ? "bg-blue-500/10 border-blue-500/40 text-blue-400" 
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-100 hover:bg-slate-850"
            }`}
            title="Configure Claude API Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Layout Container */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden relative min-h-[calc(100vh-130px)]">
        
        {/* Settings Overlay Panel */}
        <AnimatePresence>
          {showSettings && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-0 left-0 right-0 bg-slate-950/95 border-b border-slate-800 z-40 p-6 shadow-2xl backdrop-blur-sm"
            >
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-md font-bold text-slate-200 flex items-center gap-2 uppercase tracking-wider font-mono">
                    <Key className="w-4 h-4 text-blue-500" />
                    Anthropic API Configuration
                  </h3>
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="p-1 hover:bg-slate-900 rounded-full text-slate-400 hover:text-slate-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* API Key Input */}
                  <div className="space-y-2">
                    <label className="block text-xs font-mono uppercase text-slate-400">Anthropic API Key</label>
                    <div className="relative">
                      <input
                        type="password"
                        placeholder="sk-ant-..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Saved locally in your browser cache. Never uploaded to our server database.
                    </p>
                  </div>

                  {/* CORS Bypass Setting */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <label className="block text-xs font-mono uppercase text-slate-400">Use API Proxy (CORS Bypass)</label>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Anthropic blocks client-side browser calls. Keep checked to use fallback proxy.
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={useProxy}
                        onChange={(e) => setUseProxy(e.target.checked)}
                        className="w-4 h-4 rounded accent-blue-500 bg-slate-900 border-slate-800"
                      />
                    </div>

                    {useProxy && (
                      <div className="space-y-2">
                        <label className="block text-xs font-mono uppercase text-slate-400">Proxy Route / Endpoint</label>
                        <input
                          type="text"
                          value={customEndpoint}
                          onChange={(e) => setCustomEndpoint(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm font-mono text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-900 flex justify-end">
                  <button
                    onClick={() => {
                      setShowSettings(false);
                      toast.success("Settings saved!");
                    }}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Save & Close
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Left Side: Upload & Preview */}
        <section className="w-full lg:w-1/2 p-6 flex flex-col border-r border-slate-900 overflow-y-auto max-h-screen lg:max-h-[calc(100vh-130px)]">
          <div className="mb-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 font-mono mb-2 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-blue-500" />
              Dataset Source
            </h2>
            <p className="text-xs text-slate-500">
              Upload a .csv, .xlsx, or .xls file to analyze. The data parsing runs entirely in your browser.
            </p>
          </div>

          {/* Upload Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all relative ${
              dragActive 
                ? "border-blue-500 bg-blue-500/5" 
                : file 
                  ? "border-slate-800 bg-slate-900/10 hover:border-slate-700" 
                  : "border-slate-850 bg-slate-900/30 hover:border-blue-500/20 hover:border-dashed"
            }`}
          >
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              id="csv-upload"
              onChange={handleFileChange}
              className="hidden"
            />

            <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center justify-center">
              <div className={`p-4 rounded-full mb-3 ${file ? "bg-emerald-500/10 text-emerald-400" : "bg-blue-500/10 text-blue-400"}`}>
                {isParsing ? (
                  <RefreshCw className="w-8 h-8 animate-spin" />
                ) : file ? (
                  <FileText className="w-8 h-8" />
                ) : (
                  <Upload className="w-8 h-8" />
                )}
              </div>

              {file ? (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-200">{file.name}</p>
                  <p className="text-xs text-slate-400">{formatBytes(file.size)}</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-bold text-slate-300">Drag and drop your spreadsheet here</p>
                  <p className="text-xs text-slate-500">Supports CSV, Excel (.xlsx, .xls) up to 20MB</p>
                </div>
              )}
            </label>

            {!file && !isParsing && (
              <label 
                htmlFor="csv-upload" 
                className="mt-4 px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-350 hover:text-slate-100 rounded-lg text-xs font-semibold inline-block cursor-pointer border border-slate-800 hover:border-slate-700 transition-all"
              >
                Browse Files
              </label>
            )}
          </div>

          {/* File Metadata Overview */}
          {metadata && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 bg-slate-900/30 border border-slate-900 p-4 rounded-xl"
            >
              <h3 className="text-xs font-mono uppercase text-slate-400 mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                Dataset Summary
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-900">
                  <p className="text-[10px] uppercase font-mono text-slate-500">Rows</p>
                  <p className="text-lg font-mono font-bold text-slate-200">{metadata.rowCount.toLocaleString()}</p>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-900">
                  <p className="text-[10px] uppercase font-mono text-slate-500">Columns</p>
                  <p className="text-lg font-mono font-bold text-slate-200">{metadata.columnCount}</p>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-900 col-span-2 text-left px-3">
                  <p className="text-[10px] uppercase font-mono text-slate-500 mb-1">Detect Types</p>
                  <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-1">
                    {Object.entries(metadata.dataTypes).slice(0, 8).map(([col, type]) => (
                      <span key={col} className="text-[9px] font-mono bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">
                        {col}:<span className="text-blue-400">{type}</span>
                      </span>
                    ))}
                    {metadata.columns.length > 8 && (
                      <span className="text-[9px] font-mono text-slate-500 px-1.5 py-0.5">
                        +{metadata.columns.length - 8} more
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Table Preview */}
          {previewRows.length > 0 && (
            <div className="mt-6 flex-1 flex flex-col min-h-0">
              <h3 className="text-xs font-mono uppercase text-slate-400 mb-3 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-400" />
                Table Preview (First 10 rows)
              </h3>
              
              <div className="flex-1 overflow-auto border border-slate-900 rounded-xl bg-slate-950/40">
                <table className="w-full text-left text-xs font-mono border-collapse">
                  <thead className="bg-slate-900/60 sticky top-0 border-b border-slate-900">
                    <tr>
                      {metadata?.columns.map(col => (
                        <th key={col} className="p-3 text-slate-350 font-bold border-r border-slate-900 last:border-0 whitespace-nowrap min-w-[120px]">
                          <div className="flex items-center justify-between">
                            <span>{col}</span>
                            <span className="text-[9px] font-normal text-slate-500 capitalize">
                              ({metadata.dataTypes[col]})
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {previewRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-900/25 transition-colors odd:bg-slate-950/20">
                        {metadata?.columns.map(col => (
                          <td key={col} className="p-3 text-slate-300 border-r border-slate-900 last:border-0 truncate max-w-[200px]" title={String(row[col] ?? "")}>
                            {String(row[col] ?? "")}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State Left */}
          {!file && (
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-600">
              <Database className="w-12 h-12 mb-3 stroke-[1.5] text-slate-800" />
              <p className="text-sm font-medium">No spreadsheet parsed yet.</p>
              <p className="text-xs max-w-xs text-center mt-1">Upload a sales spreadsheet, customer logs, or financial sheets to begin parsing.</p>
            </div>
          )}
        </section>

        {/* Right Side: Chat & Visualizations */}
        <section className="w-full lg:w-1/2 flex flex-col max-h-screen lg:max-h-[calc(100vh-130px)] bg-slate-900/10">
          
          {/* Active Chats Frame */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 flex flex-col">
            
            {chatHistory.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-500">
                <Brain className="w-12 h-12 text-slate-800 mb-4 animate-bounce" />
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider font-mono">
                  Agent Analyst Console
                </h3>
                <p className="text-xs text-slate-500 mt-2 max-w-sm">
                  {parsedData 
                    ? "Spreadsheet loaded! Ask natural language questions in the box below to generate text summaries and Recharts visualization charts."
                    : "Upload a data file on the left and set your Anthropic API Key in the settings (top-right cog) to initiate analysis."}
                </p>

                {/* Example Quick Questions */}
                {parsedData && (
                  <div className="mt-8 max-w-md">
                    <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-3">Example queries to click</p>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => selectExampleQuestion("Which category generated the highest sales value?")}
                        className="text-xs bg-slate-900 hover:bg-slate-850 hover:text-slate-100 text-slate-400 px-3.5 py-2.5 rounded-xl border border-slate-850 hover:border-slate-700 transition-all text-left flex items-center justify-between group"
                      >
                        <span>"Which category generated the highest sales value?"</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                      </button>
                      <button
                        onClick={() => selectExampleQuestion("Show me monthly sales trend")}
                        className="text-xs bg-slate-900 hover:bg-slate-850 hover:text-slate-100 text-slate-400 px-3.5 py-2.5 rounded-xl border border-slate-850 hover:border-slate-700 transition-all text-left flex items-center justify-between group"
                      >
                        <span>"Show me monthly sales trend"</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                      </button>
                      <button
                        onClick={() => selectExampleQuestion("What is the average order value by category?")}
                        className="text-xs bg-slate-900 hover:bg-slate-850 hover:text-slate-100 text-slate-400 px-3.5 py-2.5 rounded-xl border border-slate-850 hover:border-slate-700 transition-all text-left flex items-center justify-between group"
                      >
                        <span>"What is the average order value by category?"</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-blue-500 group-hover:translate-x-0.5 transition-all" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                {chatHistory.map((message) => (
                  <div
                    key={message.id}
                    className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
                  >
                    {/* Speaker Header */}
                    <div className="flex items-center gap-1.5 mb-1.5 px-1">
                      {message.role === "assistant" ? (
                        <>
                          <div className="w-5 h-5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-[10px]">
                            🤖
                          </div>
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">AI Analyst</span>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">You</span>
                          <div className="w-5 h-5 rounded bg-slate-800 text-slate-350 flex items-center justify-center text-[10px]">
                            👤
                          </div>
                        </>
                      )}
                    </div>

                    {/* Chat Bubble */}
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed border shadow-sm ${
                        message.role === "user"
                          ? "bg-blue-650 hover:bg-blue-600 border-blue-500/35 text-white rounded-tr-none"
                          : message.error
                            ? "bg-red-500/5 border-red-500/20 text-red-200 rounded-tl-none font-mono text-xs"
                            : "bg-slate-900 hover:bg-slate-850/80 border-slate-800 text-slate-200 rounded-tl-none"
                      }`}
                    >
                      <div className="whitespace-pre-wrap">
                        {message.content}
                      </div>

                      {/* Render auto chart if exists */}
                      {message.chartConfig && renderChart(message.chartConfig)}
                    </div>
                    
                    <span className="text-[9px] font-mono text-slate-500 mt-1 px-1">
                      {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}

                {/* Loading Bubble */}
                {isLoading && (
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-1.5 mb-1.5 px-1">
                      <div className="w-5 h-5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center text-[10px]">
                        🤖
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Analyzing Data</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl rounded-tl-none p-4 text-slate-400 text-sm shadow-sm flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                      <span>Claude is crunching numbers & preparing charts...</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Form Input */}
          <div className="p-4 border-t border-slate-900 bg-slate-950/40 backdrop-blur-md">
            <form onSubmit={handleQuerySubmit} className="flex gap-2 max-w-4xl mx-auto">
              <input
                type="text"
                placeholder={
                  !parsedData
                    ? "Please upload a CSV or Excel sheet first..."
                    : !apiKey && !useProxy
                      ? "Configure API Key in settings cog to query..."
                      : "e.g., Which product generates the highest average sales?"
                }
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                disabled={!parsedData || isLoading}
                className="flex-1 px-4 py-3 bg-slate-950 border border-slate-850 rounded-xl text-sm text-slate-100 placeholder-slate-550 focus:outline-none focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="submit"
                disabled={!parsedData || isLoading || !inputQuery.trim()}
                className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-blue-500/10"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </form>
          </div>
        </section>
      </main>

      {/* Bottom Insights Strip */}
      <AnimatePresence>
        {parsedData && (
          <motion.footer 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="border-t border-slate-900 bg-slate-950 p-4 sticky bottom-0 z-40"
          >
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center gap-4">
              <div className="flex items-center gap-2 flex-shrink-0 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-lg text-blue-400">
                <Sparkles className="w-4 h-4 animate-spin-slow" />
                <span className="text-xs font-mono font-bold uppercase tracking-wider">AI Insights Strip</span>
              </div>

              <div className="flex-1 overflow-x-auto w-full">
                {insightsLoading ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
                    <span>Analyzing column distributions and correlations for insights...</span>
                  </div>
                ) : insights.length > 0 ? (
                  <div className="flex flex-col md:flex-row gap-3 md:divide-x md:divide-slate-800 text-xs text-slate-350">
                    {insights.map((insight, idx) => (
                      <div key={idx} className={`${idx > 0 ? "md:pl-4" : ""} flex items-start gap-1.5`}>
                        <span className="text-blue-500 font-bold">•</span>
                        <p className="font-mono text-[11px] leading-relaxed text-slate-300">{insight}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    Upload a file to automatically generate insights here.
                  </p>
                )}
              </div>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>
    </div>
  );
}
