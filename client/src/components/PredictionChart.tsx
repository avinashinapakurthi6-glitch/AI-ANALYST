import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import {
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface PredictionChartProps {
  datasetId: number;
  column: string;
}

export function PredictionChart({ datasetId, column }: PredictionChartProps) {
  const [method, setMethod] = useState<"linear" | "exponential" | "moving_average">("linear");
  const [periods, setPeriods] = useState(10);

  const forecastMutation = trpc.prediction.forecast.useMutation({
    onError: (error) => {
      toast.error(error.message || "Forecast failed");
    },
  });

  const metricsQuery = trpc.prediction.getMetrics.useQuery({ datasetId });

  const handleForecast = () => {
    forecastMutation.mutate({
      datasetId,
      column,
      periods,
      method,
    });
  };

  const data = forecastMutation.data;

  // Combine historical and forecast data for visualization
  const chartData = data
    ? [
        ...data.historical.map((value, i) => ({
          period: `T-${data.historical.length - i}`,
          actual: Number(value.toFixed(2)),
          type: "historical",
        })),
        ...data.forecast.map((value, i) => ({
          period: `T+${i + 1}`,
          forecast: Number(value.toFixed(2)),
          upper: Number(data.confidence[i].upper.toFixed(2)),
          lower: Number(data.confidence[i].lower.toFixed(2)),
          type: "forecast",
        })),
      ]
    : [];

  return (
    <div className="space-y-6">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Future Trend Prediction
          </CardTitle>
          <CardDescription>
            Machine learning-based forecasting for {column}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Forecasting Method
              </label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as any)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="linear">Linear Regression</option>
                <option value="exponential">Exponential Smoothing</option>
                <option value="moving_average">Moving Average</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">
                Forecast Periods
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={periods}
                onChange={(e) => setPeriods(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleForecast}
                disabled={forecastMutation.isPending}
                className="w-full"
              >
                {forecastMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Forecasting...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Generate Forecast
                  </>
                )}
              </Button>
            </div>
          </div>

          {data && (
            <>
              <div className="w-full h-96 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="actual"
                      stroke="#10b981"
                      fillOpacity={1}
                      fill="url(#colorActual)"
                      name="Historical Data"
                    />
                    <Area
                      type="monotone"
                      dataKey="forecast"
                      stroke="#3b82f6"
                      fillOpacity={1}
                      fill="url(#colorForecast)"
                      name="Forecast"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {metricsQuery.data && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-blue-600 font-medium">MAE</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {metricsQuery.data.mae.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <p className="text-sm text-green-600 font-medium">RMSE</p>
                    <p className="text-2xl font-bold text-green-900">
                      {metricsQuery.data.rmse.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <p className="text-sm text-purple-600 font-medium">MAPE</p>
                    <p className="text-2xl font-bold text-purple-900">
                      {metricsQuery.data.mape.toFixed(2)}%
                    </p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                    <p className="text-sm text-amber-600 font-medium">Accuracy</p>
                    <p className="text-2xl font-bold text-amber-900">
                      {metricsQuery.data.accuracy.toFixed(1)}%
                    </p>
                  </div>
                </div>
              )}

              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <h3 className="font-semibold text-indigo-900 mb-2">Forecast Insights</h3>
                <p className="text-sm text-indigo-800">
                  Using <span className="font-medium">{method}</span> method, the model predicts{" "}
                  <span className="font-medium">{periods} periods</span> into the future with{" "}
                  <span className="font-medium">95% confidence intervals</span>. The shaded area shows
                  the range of expected values.
                </p>
              </div>
            </>
          )}

          {!data && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-8 text-center">
              <TrendingUp className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">
                Click "Generate Forecast" to predict future trends based on historical data
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
