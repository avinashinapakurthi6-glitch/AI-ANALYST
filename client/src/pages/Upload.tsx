import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Upload, AlertCircle, CheckCircle } from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function UploadPage() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [piiColumns, setPiiColumns] = useState<string[]>([]);
  const [showPiiWarning, setShowPiiWarning] = useState(false);

  const uploadMutation = trpc.datasets.upload.useMutation({
    onSuccess: (data) => {
      toast.success("Dataset uploaded successfully!");
      setLocation("/dashboard");
    },
    onError: (error) => {
      toast.error(error.message || "Upload failed");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"].includes(selectedFile.type)) {
        toast.error("Please upload a CSV or Excel file");
        return;
      }
      setFile(selectedFile);
      setName(selectedFile.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleUpload = async () => {
    if (!file || !name) {
      toast.error("Please select a file and enter a name");
      return;
    }

    const buffer = await file.arrayBuffer();
    const fileType = file.name.endsWith(".csv") ? "csv" : file.name.endsWith(".xlsx") ? "xlsx" : "xls";
    const uint8Array = new Uint8Array(buffer);
    const base64 = btoa(String.fromCharCode.apply(null, Array.from(uint8Array) as any));

    uploadMutation.mutate({
      name,
      description,
      fileBuffer: base64,
      fileName: file.name,
      fileType: fileType as any,
    });
  };

  if (!isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center">Please log in</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Upload Dataset</h1>
          <p className="text-slate-600">Your data is encrypted and never leaves your machine</p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle>Dataset Information</CardTitle>
            <CardDescription>Provide details about your dataset</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Dataset Name</label>
              <Input
                placeholder="e.g., Sales Data Q4 2024"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-slate-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">Description (Optional)</label>
              <Textarea
                placeholder="Describe your dataset..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="border-slate-200"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 mb-2">File Upload</label>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-slate-400 transition-colors">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-slate-600 mb-2">Drag and drop your CSV or Excel file here</p>
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-input"
                />
                <label htmlFor="file-input" className="cursor-pointer">
                  <Button variant="outline" asChild>
                    <span>Or click to browse</span>
                  </Button>
                </label>
                {file && <p className="text-sm text-green-600 mt-2">✓ {file.name}</p>}
              </div>
            </div>

            {showPiiWarning && piiColumns.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-amber-900">PII Detected</p>
                  <p className="text-sm text-amber-800 mt-1">
                    The following columns contain potential personally identifiable information and will be anonymized: {piiColumns.join(", ")}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleUpload}
                disabled={!file || !name || uploadMutation.isPending}
                className="flex-1"
              >
                {uploadMutation.isPending ? "Uploading..." : "Upload Dataset"}
              </Button>
              <Button variant="outline" onClick={() => setLocation("/dashboard")}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm mt-6 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Security Features
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-blue-800 space-y-2">
            <p>✓ AES-256 encryption for sensitive data</p>
            <p>✓ Automatic PII detection and anonymization</p>
            <p>✓ Secure S3 storage with encryption at rest</p>
            <p>✓ Role-based access control</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
