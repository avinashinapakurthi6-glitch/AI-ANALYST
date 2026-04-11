import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface DataPreviewProps {
  data: Record<string, any>[];
  piiColumns: string[];
  maxRows?: number;
}

export function DataPreview({ data, piiColumns, maxRows = 10 }: DataPreviewProps) {
  const [showPII, setShowPII] = useState(false);

  if (!data || data.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="pt-6">
          <p className="text-slate-600 text-center py-8">No data available to preview</p>
        </CardContent>
      </Card>
    );
  }

  const columns = Object.keys(data[0]);
  const displayData = data.slice(0, maxRows);

  const maskValue = (value: any, column: string): string => {
    if (!piiColumns.includes(column) || showPII) {
      return String(value);
    }
    if (typeof value === "string") {
      if (value.includes("@")) return "***@***.***";
      if (value.match(/^\d{3}-\d{2}-\d{4}$/)) return "***-**-****";
      if (value.length > 4) return "*".repeat(value.length - 4) + value.slice(-4);
    }
    return "***";
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Data Preview</CardTitle>
            <CardDescription>
              Showing {displayData.length} of {data.length} rows
            </CardDescription>
          </div>
          {piiColumns.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPII(!showPII)}
              className="gap-2"
            >
              {showPII ? (
                <>
                  <EyeOff className="w-4 h-4" />
                  Hide PII
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4" />
                  Show PII
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                {columns.map((col) => (
                  <th key={col} className="text-left py-3 px-4 font-semibold text-slate-700">
                    <div className="flex items-center gap-2">
                      {col}
                      {piiColumns.includes(col) && (
                        <div title="Contains sensitive data">
                          <Shield className="w-4 h-4 text-amber-600" />
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayData.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                  {columns.map((col) => (
                    <td key={`${idx}-${col}`} className="py-3 px-4 text-slate-600">
                      <span
                        className={
                          piiColumns.includes(col) && !showPII
                            ? "font-mono text-amber-600"
                            : ""
                        }
                      >
                        {maskValue(row[col], col)}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {piiColumns.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <Shield className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800">
              <span className="font-semibold">{piiColumns.length} column(s)</span> contain sensitive
              data and are protected by default. Click "Show PII" to reveal masked values.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
