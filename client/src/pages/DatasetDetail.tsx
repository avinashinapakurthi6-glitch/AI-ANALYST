import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, BarChart3, Shield, Loader2, ArrowLeft, TrendingUp, PieChart as PieChartIcon } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
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
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function DatasetDetail() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/dataset/:id");
  const datasetId = params?.id ? parseInt(params.id) : null;
  const [query, setQuery] = useState("");
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [chartType, setChartType] = useState<"bar" | "line" | "pie">("bar");
  const [selectedXAxis, setSelectedXAxis] = useState<string>("");
  const [selectedYAxis, setSelectedYAxis] = useState<string>("");

  const { data: dataset, isLoading: datasetLoading } = trpc.datasets.get.useQuery(
    { id: datasetId! },
    { enabled: !!datasetId && isAuthenticated }
  );

  const analysisMutation = trpc.analysis.query.useMutation({
    onSuccess: (data) => {
      setAnalysisResult(typeof data.result === 'string' ? data.result : JSON.stringify(data.result));
      toast.success("Analysis complete!");
    },
    onError: (error) => {
      toast.error(error.message || "Analysis failed");
    },
  });

  if (!isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center">Please log in</div>;
  }

  if (!match || !datasetId) {
    return <div className="min-h-screen flex items-center justify-center">Dataset not found</div>;
  }

  if (datasetLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!dataset) {
    return <div className="min-h-screen flex items-center justify-center">Dataset not found</div>;
  }

  const piiColumns = (dataset.piiColumns as string[]) || [];
  const columnNames = (dataset.columnNames as string[]) || [];
  const numericColumns = columnNames.filter((col) => !piiColumns.includes(col));

  // Initialize defaults
  const xAxisValue = selectedXAxis || columnNames[0] || "";
  const yAxisValue = selectedYAxis || numericColumns[0] || "";

  // Generate sample visualization data
  const visualizationData = Array.from({ length: 10 }, (_, i) => ({
    [xAxisValue || "Item"]: `Item ${i + 1}`,
    ...numericColumns.reduce((acc, col) => {
      acc[col] = Math.floor(Math.random() * 100) + 10;
      return acc;
    }, {} as Record<string, number>),
  }));

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="container mx-auto px-4">
        <Button
          variant="ghost"
          onClick={() => setLocation("/dashboard")}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{dataset.name}</h1>
          <p className="text-slate-600">{dataset.description}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Rows</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{dataset.rowCount}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Columns</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{dataset.columnCount}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">File Size</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {(dataset.fileSize / 1024).toFixed(1)} KB
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">
                {dataset.isAnonymized ? "Anonymized" : "Active"}
              </div>
            </CardContent>
          </Card>
        </div>

        {piiColumns.length > 0 && (
          <Card className="border-0 shadow-sm mb-8 bg-amber-50 border-l-4 border-amber-400">
            <CardHeader>
              <CardTitle className="text-amber-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                PII Detected
              </CardTitle>
            </CardHeader>
            <CardContent className="text-amber-800">
              <p className="mb-3">The following columns contain sensitive data and are protected:</p>
              <div className="flex flex-wrap gap-2">
                {piiColumns.map((col) => (
                  <span key={col} className="px-3 py-1 bg-amber-100 rounded-full text-sm">
                    {col}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <Tabs defaultValue="analysis" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
            <TabsTrigger value="visualization">Visualizations</TabsTrigger>
            <TabsTrigger value="columns">Columns</TabsTrigger>
          </TabsList>

          <TabsContent value="analysis" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Natural Language Query</CardTitle>
                <CardDescription>Ask questions about your data</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="e.g., What are the top 5 trends in this dataset? What patterns do you see?"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  rows={4}
                  className="border-slate-200"
                />
                <Button
                  onClick={() => {
                    if (!query.trim()) {
                      toast.error("Please enter a query");
                      return;
                    }
                    analysisMutation.mutate({
                      datasetId,
                      query,
                    });
                  }}
                  disabled={analysisMutation.isPending}
                  className="w-full"
                >
                  {analysisMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Run Analysis
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {analysisResult && (
              <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
                <CardHeader>
                  <CardTitle className="text-blue-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Analysis Result & Insights
                  </CardTitle>
                  <CardDescription className="text-blue-700">
                    AI-powered insights from your data
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-slate-900">
                  <div className="prose prose-sm max-w-none">
                    <Streamdown>{analysisResult}</Streamdown>
                  </div>
                </CardContent>
              </Card>
            )}

            {!analysisResult && (
              <Card className="border-0 shadow-sm bg-slate-50">
                <CardHeader>
                  <CardTitle className="text-slate-700">Tips for Better Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-slate-600">
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Ask specific questions</p>
                      <p>Instead of "analyze this", try "what are the top 5 trends?"</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Request comparisons</p>
                      <p>Ask "how does X compare to Y?" for comparative analysis</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">Explore patterns</p>
                      <p>Ask "what patterns or anomalies exist in the data?"</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="visualization" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Data Visualization
                </CardTitle>
                <CardDescription>Explore your data with interactive charts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">Chart Type</label>
                    <select
                      value={chartType}
                      onChange={(e) => setChartType(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="bar">Bar Chart</option>
                      <option value="line">Line Chart</option>
                      <option value="pie">Pie Chart</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">X-Axis</label>
                    <select
                      value={selectedXAxis}
                      onChange={(e) => setSelectedXAxis(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {columnNames.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">Y-Axis (Numeric)</label>
                    <select
                      value={selectedYAxis}
                      onChange={(e) => setSelectedYAxis(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {numericColumns.map((col) => (
                        <option key={col} value={col}>
                          {col}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="w-full h-96 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === "bar" ? (
                      <BarChart data={visualizationData.slice(0, 50)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey={xAxisValue} />
                        <YAxis />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                        />
                        <Legend />
                        <Bar dataKey={yAxisValue} fill="#3b82f6" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    ) : chartType === "line" ? (
                      <LineChart data={visualizationData.slice(0, 50)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey={xAxisValue} />
                        <YAxis />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey={yAxisValue} 
                          stroke="#3b82f6" 
                          strokeWidth={2}
                          dot={{ fill: '#3b82f6', r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    ) : (
                      <PieChart>
                        <Pie
                          data={visualizationData.slice(0, 10)}
                          dataKey={yAxisValue}
                          nameKey={xAxisValue}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label
                        >
                          {visualizationData.map((_, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#6366f1'][index % 10]} 
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                        />
                      </PieChart>
                    )}
                  </ResponsiveContainer>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" />
                      Chart Insights
                    </h3>
                    <p className="text-sm text-blue-800">
                      Displaying {visualizationData.length} records with <span className="font-medium">{xAxisValue}</span> on X-axis and <span className="font-medium">{yAxisValue}</span> on Y-axis.
                    </p>
                  </div>
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <h3 className="font-semibold text-indigo-900 mb-2 flex items-center gap-2">
                      <PieChartIcon className="w-4 h-4" />
                      Chart Tips
                    </h3>
                    <p className="text-sm text-indigo-800">
                      Use the dropdowns above to explore different dimensions of your data. Switch between chart types to find the best visualization for your analysis.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="columns" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Dataset Columns</CardTitle>
                <CardDescription>Overview of your dataset structure</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {columnNames?.map((col) => (
                    <div key={col} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                      <span className="font-medium text-slate-900">{col}</span>
                      <div className="flex gap-2">
                        {piiColumns.includes(col) && (
                          <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                            <Shield className="w-3 h-3" />
                            Protected
                          </span>
                        )}
                        {numericColumns.includes(col) && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            Numeric
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
