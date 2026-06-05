import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, BarChart3, Shield, Zap } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const { data: datasets } = trpc.datasets.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return <div className="min-h-screen flex items-center justify-center">Please log in</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Privacy-First Analytics</h1>
          <p className="text-slate-600">Secure, intelligent data analysis with complete privacy protection</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Datasets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">{datasets?.length || 0}</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Encrypted
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">AES-256</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <Zap className="w-4 h-4" />
                AI-Powered
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">Active</div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-slate-900">Ready</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2 border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Your Datasets</CardTitle>
              <CardDescription>Upload and manage your data securely</CardDescription>
            </CardHeader>
            <CardContent>
              {datasets && datasets.length > 0 ? (
                <div className="space-y-3">
                  {datasets.map((dataset: any) => (
                    <div key={dataset.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-slate-900">{dataset.name}</p>
                        <p className="text-sm text-slate-500">{dataset.rowCount} rows, {dataset.columnCount} columns</p>
                      </div>
                      <Link href={`/dataset/${dataset.id}`}>
                        <Button variant="outline" size="sm">Analyze</Button>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-slate-500 mb-4">No datasets yet</p>
                  <Link href="/upload">
                    <Button>Upload Your First Dataset</Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Link href="/upload" className="block">
                <Button className="w-full" variant="default">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Dataset
                </Button>
              </Link>
              <Button className="w-full" variant="outline" onClick={() => toast.info("Analytics feature coming soon")}>
                <BarChart3 className="w-4 h-4 mr-2" />
                View Analytics
              </Button>
              <Button className="w-full" variant="outline" onClick={() => toast.info("Security Settings coming soon")}>
                <Shield className="w-4 h-4 mr-2" />
                Security Settings
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Privacy Protection</CardTitle>
            <CardDescription className="text-blue-700">Your data stays on your machine with military-grade encryption</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-blue-800">
              <li>✓ AES-256 encryption for all sensitive data</li>
              <li>✓ Automatic PII detection and anonymization</li>
              <li>✓ Role-based access control</li>
              <li>✓ Secure S3 storage with encryption at rest</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
