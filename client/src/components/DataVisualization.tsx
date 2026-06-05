import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, LineChart as LineChartIcon, Activity } from "lucide-react";

interface DataVisualizationProps {
  data: Record<string, any>[];
  columns: string[];
  title?: string;
  description?: string;
}

type ChartType = "bar" | "line" | "scatter" | "histogram";

export function DataVisualization({
  data,
  columns,
  title = "Data Visualization",
  description = "Interactive charts for data analysis",
}: DataVisualizationProps) {
  const [chartType, setChartType] = useState<ChartType>("bar");
  const [xAxis, setXAxis] = useState<string>(columns[0] || "");
  const [yAxis, setYAxis] = useState<string>(columns[1] || "");

  const numericColumns = useMemo(() => {
    if (data.length === 0) return [];
    return columns.filter((col) => {
      const val = data[0][col];
      return typeof val === "number" || !isNaN(parseFloat(val));
    });
  }, [data, columns]);

  const chartData = useMemo(() => {
    if (!xAxis || !yAxis) return data;
    return data.slice(0, 100).map((row) => ({
      [xAxis]: row[xAxis],
      [yAxis]: row[yAxis],
    }));
  }, [data, xAxis, yAxis]);

  if (data.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500">
            No data available for visualization
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            variant={chartType === "bar" ? "default" : "outline"}
            onClick={() => setChartType("bar")}
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            Bar
          </Button>
          <Button
            size="sm"
            variant={chartType === "line" ? "default" : "outline"}
            onClick={() => setChartType("line")}
          >
            <LineChartIcon className="w-4 h-4 mr-1" />
            Line
          </Button>
          <Button
            size="sm"
            variant={chartType === "scatter" ? "default" : "outline"}
            onClick={() => setChartType("scatter")}
          >
            <Activity className="w-4 h-4 mr-1" />
            Scatter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">X-Axis</label>
              <select
                value={xAxis}
                onChange={(e) => setXAxis(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                {columns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 block mb-2">Y-Axis</label>
              <select
                value={yAxis}
                onChange={(e) => setYAxis(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
              >
                {numericColumns.map((col) => (
                  <option key={col} value={col}>
                    {col}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="w-full h-96 bg-slate-50 rounded-lg p-4">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === "bar" ? (
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={xAxis} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey={yAxis} fill="#3b82f6" />
                </BarChart>
              ) : chartType === "line" ? (
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={xAxis} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey={yAxis} stroke="#3b82f6" />
                </LineChart>
              ) : (
                <ScatterChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey={xAxis} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Scatter name={yAxis} dataKey={yAxis} fill="#3b82f6" />
                </ScatterChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
