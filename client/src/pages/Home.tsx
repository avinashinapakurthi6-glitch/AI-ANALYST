import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { Shield, Lock, Zap, BarChart3, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";
import { useEffect } from "react";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated) {
      setLocation('/dashboard');
    }
  }, [isAuthenticated, setLocation]);

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div className="text-center">
          <div className="inline-block mb-4 p-3 bg-blue-500/10 rounded-full border border-blue-500/20 animate-pulse">
            <Shield className="w-8 h-8 text-blue-400" />
          </div>
          <p className="text-slate-300">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-block mb-6 p-3 bg-blue-500/10 rounded-full border border-blue-500/20">
              <Shield className="w-8 h-8 text-blue-400" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Privacy-First AI Data Analytics
            </h1>
            <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
              Secure, intelligent data analysis with military-grade encryption. Your data never leaves your machine.
            </p>
            <a href={getLoginUrl()}>
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
            <Card className="bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition-colors">
              <CardContent className="pt-6">
                <Lock className="w-8 h-8 text-blue-400 mb-3" />
                <h3 className="font-semibold mb-2">AES-256 Encryption</h3>
                <p className="text-sm text-slate-400">Military-grade encryption for all sensitive data</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition-colors">
              <CardContent className="pt-6">
                <Shield className="w-8 h-8 text-cyan-400 mb-3" />
                <h3 className="font-semibold mb-2">PII Detection</h3>
                <p className="text-sm text-slate-400">Automatic detection and anonymization</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition-colors">
              <CardContent className="pt-6">
                <Zap className="w-8 h-8 text-yellow-400 mb-3" />
                <h3 className="font-semibold mb-2">AI-Powered</h3>
                <p className="text-sm text-slate-400">Advanced LLM for intelligent insights</p>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition-colors">
              <CardContent className="pt-6">
                <BarChart3 className="w-8 h-8 text-green-400 mb-3" />
                <h3 className="font-semibold mb-2">Visualizations</h3>
                <p className="text-sm text-slate-400">Interactive Plotly charts and dashboards</p>
              </CardContent>
            </Card>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-8 mb-16">
            <h2 className="text-2xl font-bold mb-6">Key Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Secure File Upload</h3>
                  <p className="text-slate-400 text-sm">Upload CSV and Excel files with automatic validation</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Data Cleaning</h3>
                  <p className="text-slate-400 text-sm">Automatic duplicate removal and missing value handling</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Natural Language Queries</h3>
                  <p className="text-slate-400 text-sm">Ask questions about your data in plain English</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Role-Based Access</h3>
                  <p className="text-slate-400 text-sm">Admin, Analyst, and Viewer roles for fine-grained control</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Interactive Dashboard</h3>
                  <p className="text-slate-400 text-sm">Customizable charts and real-time data visualization</p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0 mt-1">
                  <div className="w-2 h-2 rounded-full bg-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Owner Notifications</h3>
                  <p className="text-slate-400 text-sm">Real-time alerts for uploads, PII detection, and analysis</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-slate-400 mb-6">Ready to analyze your data securely?</p>
            <a href={getLoginUrl()}>
              <Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white">
                Start Free
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
