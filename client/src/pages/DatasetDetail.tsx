import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, BarChart3, Shield, Loader2, ArrowLeft } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

export default function DatasetDetail() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/dataset/:id");
  const datasetId = params?.id ? parseInt(params.id) : null;
  const [query, setQuery] = useState("");
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

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
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analysis">AI Analysis</TabsTrigger>
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
                  placeholder="e.g., What are the top 5 trends in this dataset?"
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
              <Card className="border-0 shadow-sm bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-900">Analysis Result</CardTitle>
                </CardHeader>
                <CardContent className="text-blue-900">
                  <Streamdown>{analysisResult}</Streamdown>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="columns" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Dataset Columns</CardTitle>
                <CardDescription>Overview of your dataset structure</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(dataset.columnNames as string[])?.map((col) => (
                    <div key={col} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <span className="font-medium text-slate-900">{col}</span>
                      {piiColumns.includes(col) && (
                        <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                          <Shield className="w-3 h-3" />
                          Protected
                        </span>
                      )}
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
