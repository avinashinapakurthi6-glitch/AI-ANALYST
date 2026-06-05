import React, { useState, useEffect, useRef } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const OPENAI_MODEL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_OPENAI_MODEL) ? import.meta.env.VITE_OPENAI_MODEL : 'gpt-4o-mini';
const SYSTEM_PROMPT = `You are a data analyst AI. The user will give you tabular data and ask questions. 
Always respond in this JSON format:
{
  answer: string,
  chartConfig: {
    type: 'bar' | 'line' | 'pie',
    title: string,
    xKey: string,
    yKey: string,
    data: [ { [xKey]: value, [yKey]: value } ]
  } | null
}`;

function Spinner({ size = 24 }) {
  return (
    <svg
      className="animate-spin text-white"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" opacity="0.25" />
      <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

function inferTypes(rows = []) {
  const sample = rows.slice(0, 50);
  if (sample.length === 0) return {};
  const keys = Object.keys(sample[0] || {});
  const types = {};
  keys.forEach((k) => {
    let num = 0,
      date = 0,
      str = 0;
    for (const r of sample) {
      const v = r[k];
      if (v === null || v === undefined || v === "") continue;
      if (typeof v === "number") num++;
      else if (!isNaN(Date.parse(v))) date++;
      else if (!isNaN(Number(String(v).replace(/[, $%]/g, "")))) num++;
      else str++;
    }
    if (num >= date && num >= str) types[k] = "number";
    else if (date >= num && date >= str) types[k] = "date";
    else types[k] = "string";
  });
  return types;
}

function sampleFirst(rows = [], n = 10) {
  return rows.slice(0, n);
}

async function callOpenAI(_apiKey, prompt, maxTokens = 800) {
  // Only proxy-based calls are used. The server reads OPENAI_API_KEY from environment.
  const proxyBody = {
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    max_tokens: maxTokens,
  };

  const proxyRes = await fetch("/api/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(proxyBody),
  });

  if (!proxyRes.ok) {
    const txt = await proxyRes.text().catch(() => "");
    throw new Error(`Proxy API error ${proxyRes.status}: ${txt}`);
  }

  const data = await proxyRes.json();
  const text = data.choices && data.choices[0] && (data.choices[0].message?.content || data.choices[0].text) || data.text || JSON.stringify(data);
  return typeof text === "string" ? text : JSON.stringify(text);
}

export default function AIDataAnalyst() {
  // Using server-side OpenAI API key via /api/openai proxy (no client key required)
  const apiKey = null;
  const [fileName, setFileName] = useState(null);
  const [rows, setRows] = useState([]);
  const [preview, setPreview] = useState([]);
  const [columns, setColumns] = useState([]);
  const [types, setTypes] = useState({});
  const [rowCount, setRowCount] = useState(0);
  const [insights, setInsights] = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [chat, setChat] = useState([]);
  const [query, setQuery] = useState("");
  const [qaLoading, setQaLoading] = useState(false);
  const [chartFade, setChartFade] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef();

  // No client-side API key persisted; server proxy uses environment key.

  useEffect(() => {
    if (rows.length > 0) {
      setPreview(sampleFirst(rows, 10));
      setColumns(rows[0] ? Object.keys(rows[0]) : []);
      setRowCount(rows.length);
      setTypes(inferTypes(rows));
      generateInsights();
    } else {
      setPreview([]);
      setColumns([]);
      setRowCount(0);
      setTypes({});
      setInsights([]);
    }
  }, [rows]);

  async function handleFileFile(file) {
    setError(null);
    setFileName(file.name);
    try {
      const name = file.name.toLowerCase();
      if (name.endsWith(".csv")) {
        await parseCSV(file);
      } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        await parseXLSX(file);
      } else {
        throw new Error("Unsupported file type. Use .csv or .xlsx/.xls");
      }
    } catch (err) {
      setError(String(err));
      setRows([]);
    }
  }

  function parseCSV(file) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true,
        complete: (results) => {
          if (results && results.data) {
            setRows(results.data);
            resolve();
          } else {
            reject(new Error("Failed to parse CSV."));
          }
        },
        error: (err) => reject(err),
      });
    });
  }

  function parseXLSX(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(sheet, { defval: null });
          setRows(json);
          resolve();
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Failed to read Excel file."));
      reader.readAsArrayBuffer(file);
    });
  }

  function computeLocalInsights(rows) {
    const out = [];
    if (!rows || rows.length === 0) return ["No data available for local insights."];
    const cols = Object.keys(rows[0]);
    out.push(`Rows: ${rows.length}, Columns: ${cols.length}`);

    // detect numeric and categorical columns
    const numericCols = [];
    const categoricalCols = [];
    for (const c of cols) {
      let numericCount = 0;
      let total = 0;
      const vals = new Set();
      for (let i = 0; i < Math.min(rows.length, 200); i++) {
        const v = rows[i][c];
        if (v === null || v === undefined || v === "") continue;
        total++;
        if (typeof v === 'number' || !isNaN(Number(String(v)).replace && Number(String(v)))) numericCount++;
        vals.add(String(v));
      }
      if (numericCount / Math.max(1, total) > 0.6 && numericCount > 0) numericCols.push(c);
      else categoricalCols.push({ col: c, unique: vals.size });
    }

    // numeric summaries for up to 3 columns
    const takeNums = numericCols.slice(0, 3);
    for (const c of takeNums) {
      const vals = rows.map(r => r[c]).filter(v => v !== null && v !== undefined && v !== "").map(v => Number(String(v).replace(/[, $%]/g, ''))).filter(v => !isNaN(v));
      if (!vals.length) continue;
      const sum = vals.reduce((a,b)=>a+b,0);
      const mean = sum / vals.length;
      const sorted = vals.slice().sort((a,b)=>a-b);
      const median = sorted[Math.floor(sorted.length/2)];
      const min = sorted[0];
      const max = sorted[sorted.length-1];
      out.push(`${c} — count ${vals.length}, mean ${mean.toFixed(2)}, median ${median}, min ${min}, max ${max}`);
    }

    // categorical top values (up to 3 columns with low cardinality)
    categoricalCols.sort((a,b)=>a.unique-b.unique);
    const takeCats = categoricalCols.slice(0,3).map(x=>x.col);
    for (const c of takeCats) {
      const freq = {};
      for (let i=0;i<Math.min(rows.length,200);i++){
        const v = rows[i][c];
        if (v===null||v===undefined||v==='') continue;
        freq[String(v)] = (freq[String(v)]||0)+1;
      }
      const entries = Object.entries(freq).sort((a,b)=>b[1]-a[1]).slice(0,3);
      const top = entries.map(e=>`${e[0]} (${e[1]})`).join(', ');
      out.push(`${c} top values: ${top}`);
    }

    // basic outlier detection on numeric columns (IQR)
    for (const c of takeNums) {
      const vals = rows.map(r => r[c]).filter(v => v !== null && v !== undefined && v !== "").map(v => Number(String(v).replace(/[, $%]/g, ''))).filter(v => !isNaN(v)).sort((a,b)=>a-b);
      if (vals.length < 4) continue;
      const q1 = vals[Math.floor(vals.length * 0.25)];
      const q3 = vals[Math.floor(vals.length * 0.75)];
      const iqr = q3 - q1;
      const lower = q1 - 1.5 * iqr;
      const upper = q3 + 1.5 * iqr;
      const outliers = vals.filter(v => v < lower || v > upper);
      if (outliers.length) out.push(`${c} has ${outliers.length} suspected outliers (IQR method).`);
    }

    // segmented analysis for up to 2 categorical cols
    const segCandidates = categoricalCols.filter(c=>c.unique>=2 && c.unique<=30).slice(0,2);
    for (const sc of segCandidates) {
      const c = sc.col;
      out.push(`By ${c}:`);
      const groups = {};
      for (let i=0;i<rows.length;i++){
        const v = rows[i][c] ?? 'NULL';
        const key = String(v);
        groups[key] = groups[key] || { count:0, sums: {}, nums:0 };
        groups[key].count++;
        // for numeric cols add to sums
        for (const nc of takeNums) {
          const val = rows[i][nc];
          const num = Number(String(val).replace(/[, $%]/g, ''));
          if (!isNaN(num)) {
            groups[key].sums[nc] = (groups[key].sums[nc]||0) + num;
            groups[key].nums = (groups[key].nums||0) + 1;
          }
        }
      }
      const entries = Object.entries(groups).sort((a,b)=>b[1].count-a[1].count).slice(0,5);
      for (const [k,v] of entries) {
        const parts = [`${k}: ${v.count}`];
        for (const nc of takeNums) {
          if (v.sums[nc]) parts.push(`${nc} avg ${(v.sums[nc]/v.count).toFixed(2)}`);
        }
        out.push(`  ${parts.join(' — ')}`);
      }
    }

    return out.slice(0, 30);
  }

  async function generateInsights() {
    setInsightsLoading(true);
    setError(null);
    try {
      const sample = rows.slice(0, 50);
      const overallMessage = `Data: ${JSON.stringify(sample)}\n\nQuestion: Provide 3-5 concise bullet-point insights about the dataset (e.g., top regions, outliers, strong trends, notable averages). Return only bullets or a JSON array of strings.`;
      const overallPrompt = `System: ${SYSTEM_PROMPT}\n\nUser: ${overallMessage}`;
      const overallText = await callOpenAI(apiKey, overallPrompt, 600);
      let overallBullets = [];
      try {
        const parsed = JSON.parse(overallText);
        if (Array.isArray(parsed)) overallBullets = parsed.slice(0, 5);
        else if (parsed && parsed.insights && Array.isArray(parsed.insights)) overallBullets = parsed.insights.slice(0, 5);
        else if (parsed.answer && typeof parsed.answer === "string") overallBullets = parsed.answer.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0,5);
        else if (parsed && parsed.answer) overallBullets = [String(parsed.answer).slice(0,500)];
      } catch (e) {
        overallBullets = overallText.split(/\r?\n/).map((l) => l.replace(/^[\-\*\d\.\)]\s*/, "").trim()).filter(Boolean).slice(0,5);
      }

      // Segmented analysis: pick up to 2 categorical columns with low cardinality
      const candidateCols = [];
      const colList = Object.keys(rows[0] || {});
      for (const c of colList) {
        const vals = new Set();
        for (let i = 0; i < Math.min(rows.length, 200); i++) {
          const v = rows[i][c];
          if (v === null || v === undefined || v === "") continue;
          vals.add(String(v));
          if (vals.size > 50) break;
        }
        const unique = vals.size;
        const t = types[c] || (unique < 50 ? "string" : "string");
        if ((t === "string" || t === "date") && unique >= 2 && unique <= 20) {
          candidateCols.push({ col: c, unique });
        }
      }
      candidateCols.sort((a, b) => a.unique - b.unique);
      const segments = candidateCols.slice(0, 2).map((x) => x.col);

      let segmentedResults = [];
      for (const seg of segments) {
        const segMessage = `Data: ${JSON.stringify(sample)}\n\nQuestion: Provide segmented insights grouped by the column \"${seg}\". For each distinct value in \"${seg}\" provide 2 concise bullet points describing count, notable averages (for numeric columns), and any outliers or strong signals. Return bullets grouped under headings like \"${seg}: VALUE\".`;
        const segPrompt = `System: ${SYSTEM_PROMPT}\n\nUser: ${segMessage}`;
        try {
          const segText = await callOpenAI(apiKey, segPrompt, 800);
          const parts = segText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
          segmentedResults.push(`By ${seg}:`);
          for (const p of parts.slice(0, 20)) segmentedResults.push(p);
        } catch (e) {
          segmentedResults.push(`By ${seg}: Failed to generate segmented insights (${String(e)})`);
        }
      }

      const combined = [];
      if (overallBullets.length) {
        combined.push("Overall:");
        combined.push(...overallBullets);
      }
      if (segmentedResults.length) {
        combined.push(...segmentedResults);
      }
      if (!combined.length) combined.push("No insights generated.");
      setInsights(combined.slice(0, 25));
    } catch (err) {
      // If API failed due to billing/quota or proxy, fallback to local insights
      const msg = String(err || "");
      if (msg.includes("credit balance") || msg.includes("Proxy API error 400") || msg.includes("invalid_request_error")) {
        setError("OpenAI API unavailable (billing/quota) or proxy error. Showing local insights instead.");
        const local = computeLocalInsights(rows);
        setInsights(local);
      } else {
        setError("Insights error: " + String(err));
        // fallback to local insights as a graceful degradation
        const local = computeLocalInsights(rows);
        setInsights(local);
      }
    } finally {
      setInsightsLoading(false);
    }
  }

  async function askQuestion(e) {
    e && e.preventDefault();
    if (!query || !rows.length) return;
    setQaLoading(true);
    setError(null);
    const userText = query;
    setChat((c) => [...c, { role: "user", text: userText }]);
    setQuery("");
    try {
      const sample = rows.slice(0, 50);
      const userMessage = `Data: ${JSON.stringify(sample)}\n\nQuestion: ${userText}`;
      const prompt = `System: ${SYSTEM_PROMPT}\n\nUser: ${userMessage}`;
      const text = await callOpenAI(null, prompt, 1000);
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        const start = text.indexOf("{");
        const end = text.lastIndexOf("}");
        if (start !== -1 && end !== -1 && end > start) {
          try {
            parsed = JSON.parse(text.slice(start, end + 1));
          } catch {
            parsed = null;
          }
        } else {
          parsed = null;
        }
      }
      let answer = "";
      let chartConfig = null;
      if (parsed && typeof parsed === "object") {
        answer = parsed.answer || parsed.answer_text || JSON.stringify(parsed).slice(0, 1000);
        chartConfig = parsed.chartConfig || parsed.chart || null;
      } else {
        answer = text;
        chartConfig = null;
      }
      setChat((c) => [...c, { role: "ai", text: answer, chartConfig }]);
      setChartFade(false);
      setTimeout(() => setChartFade(true), 50);
    } catch (err) {
      setError("QA error: " + String(err));
      setChat((c) => [...c, { role: "ai", text: "Error: " + String(err), chartConfig: null }]);
    } finally {
      setQaLoading(false);
    }
  }

  function onDrop(e) {
    e.preventDefault();
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    if (f) handleFileFile(f);
  }
  function onDragOver(e) {
    e.preventDefault();
  }

  function openFileDialog() {
    fileInputRef.current && fileInputRef.current.click();
  }

  function renderChart(cfg) {
    if (!cfg || !cfg.type || !cfg.data || !Array.isArray(cfg.data)) return <div className="text-gray-400">No chart to render.</div>;
    const { type, xKey, yKey, title } = cfg;
    const data = cfg.data.map((d) => {
      const out = { ...d };
      if (out[yKey] !== undefined && out[yKey] !== null) {
        const n = Number(String(out[yKey]).replace(/[, $%]/g, ""));
        if (!isNaN(n)) out[yKey] = n;
      }
      return out;
    });
    const COLORS = ["#60A5FA", "#34D399", "#F97316", "#A78BFA", "#F472B6", "#FACC15"];
    return (
      <div
        className={`bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-4 shadow-lg transition-opacity duration-600 ${chartFade ? "opacity-100" : "opacity-0"}`}
        style={{ minHeight: 300 }}
      >
        <div className="text-white font-mono text-lg mb-2">{title || "Chart"}</div>
        <ResponsiveContainer width="100%" height={300}>
          {type === "bar" ? (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey={xKey} stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Legend />
              <Bar dataKey={yKey} fill="#60A5FA" />
            </BarChart>
          ) : type === "line" ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey={xKey} stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={yKey} stroke="#34D399" strokeWidth={2} dot />
            </LineChart>
          ) : type === "pie" ? (
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie data={data} dataKey={yKey} nameKey={xKey} outerRadius={100} fill="#60A5FA" label>
                {data.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : (
            <div className="text-gray-400">Unsupported chart type: {type}</div>
          )}
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans">
      <header className="flex items-center justify-between p-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-sky-400 rounded-md flex items-center justify-center font-mono text-xl">AI</div>
          <div>
            <h1 className="text-xl font-semibold">AI Data Analyst</h1>
            <div className="text-sm text-slate-400">Upload data, ask questions, get charts & insights</div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="text-sm text-slate-400">Using server-side OpenAI key via proxy (/api/openai)</div>
        </div>
      </header>

      <main className="p-4 grid gap-4 grid-cols-1 md:grid-cols-3">
        <section className="md:col-span-1 bg-slate-800 rounded-lg p-4 shadow-md">
          <h2 className="text-lg font-medium mb-2">Upload Data</h2>
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            className="border-2 border-dashed border-slate-700 rounded-md p-4 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-slate-500"
            onClick={openFileDialog}
            role="button"
          >
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => e.target.files[0] && handleFileFile(e.target.files[0])} />
            <div className="text-slate-300">Drag & drop or click to upload</div>
            <div className="text-xs text-slate-500">Accepts .csv, .xlsx, .xls</div>
            {fileName && <div className="text-sm text-slate-200 mt-2">Loaded: {fileName}</div>}
            {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
          </div>

          <div className="mt-4 text-sm text-slate-300">
            <div>Rows: <span className="font-mono text-slate-100">{rowCount}</span></div>
            <div className="mt-2">Columns:</div>
            <div className="flex flex-wrap gap-2 mt-2">
              {columns.map((c) => (
                <div key={c} className="px-2 py-1 bg-slate-700 rounded-md text-xs">
                  <div className="font-mono">{c}</div>
                  <div className="text-slate-400 text-[10px]">{types[c] || "unknown"}</div>
                </div>
              ))}
              {!columns.length && <div className="text-slate-500">No file loaded</div>}
            </div>
          </div>

          <div className="mt-4 overflow-auto">
            <div className="text-sm font-medium mb-2">Preview (first {preview.length} rows)</div>
            <div className="bg-slate-900 rounded-md p-2">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    {columns.map((c) => (
                      <th key={c} className="text-left pr-4 pb-2 text-xs text-slate-400 font-mono">{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i} className="odd:bg-slate-800">
                      {columns.map((c) => (
                        <td key={c} className="pr-4 py-1 text-slate-200 font-mono text-[13px] max-w-xs truncate">{String(r[c] ?? "")}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {!preview.length && <div className="text-slate-500 text-sm p-4">No preview available</div>}
            </div>
          </div>
        </section>

        <section className="md:col-span-2 bg-slate-800 rounded-lg p-4 shadow-md flex flex-col">
          <div className="flex-1 overflow-auto pb-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-medium">Chat & Chart</h2>
              <div className="text-sm text-slate-400">Ask questions about your data</div>
            </div>

            <div className="space-y-3">
              {chat.map((m, i) => (
                <div key={i} className={`${m.role === "user" ? "text-right" : "text-left"}`}>
                  <div className={`${m.role === "user" ? "inline-block bg-indigo-600" : "inline-block bg-slate-700"} rounded-lg px-4 py-2 max-w-full break-words`}>
                    <div className="text-slate-100 text-sm font-medium">{m.role === "user" ? "You" : "AI"}</div>
                    <div className="text-slate-200 text-sm mt-1 whitespace-pre-wrap">{m.text}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <div className="text-sm text-slate-400 mb-2">Chart</div>
              <div>{(() => {
                const lastAi = [...chat].reverse().find((c) => c.role === "ai" && c.chartConfig);
                return lastAi ? renderChart(lastAi.chartConfig) : <div className="text-slate-500">Charts from AI answers will appear here.</div>;
              })()}</div>
            </div>
          </div>

          <form onSubmit={askQuestion} className="mt-4">
            <div className="flex gap-2 items-center">
              <input
                className="flex-1 bg-slate-900 rounded-md px-3 py-2 text-sm text-slate-100 placeholder-slate-500"
                placeholder={rows.length ? "Ask a question about your data..." : "Upload a dataset first"}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                disabled={!rows.length || qaLoading}
              />
              <button
                type="submit"
                disabled={!rows.length || qaLoading}
                className={`px-4 py-2 rounded-md ${qaLoading ? "bg-slate-600" : "bg-emerald-500 hover:bg-emerald-400"}`}
              >
                {qaLoading ? <Spinner size={18} /> : "Ask"}
              </button>
            </div>
            <div className="text-xs text-slate-500 mt-2">Examples: "Which region generated the highest revenue?" "Show me monthly sales trend"</div>
          </form>
        </section>

        <aside className="md:col-span-3 mt-2 bg-slate-800 rounded-lg p-3 flex items-center gap-4 overflow-auto">
          <div className="text-slate-400 text-sm w-28">Insights</div>
          <div className="flex-1 flex gap-3">
            {insightsLoading ? (
              <div className="flex items-center gap-2"><Spinner /> <div>Generating insights...</div></div>
            ) : insights.length ? (
              insights.map((ins, i) => (
                <div key={i} className="bg-slate-900 px-3 py-2 rounded-md shadow-sm text-sm font-mono">
                  {ins}
                </div>
              ))
            ) : (
              <div className="text-slate-500">Upload a file to see automated insights.</div>
            )}
          </div>
        </aside>
      </main>

      <footer className="p-4 text-sm text-slate-400 text-center">
        <div>
          Built with OpenAI (model: {OPENAI_MODEL}). API calls are proxied through the server using the configured OpenAI key.
        </div>
        {error && <div className="mt-2 text-red-400">{error}</div>}
      </footer>
    </div>
  );
}
