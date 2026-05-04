import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus, Filter } from "lucide-react";

export type FilterOperator = "equals" | "contains" | "gt" | "lt" | "gte" | "lte" | "between" | "in" | "not_equals";

export interface FilterCondition {
  id: string;
  column: string;
  operator: FilterOperator;
  value: string | number | [number, number];
}

interface DataFilterProps {
  columns: string[];
  data: Record<string, any>[];
  onFilterChange: (filteredData: Record<string, any>[]) => void;
}

const OPERATORS: { value: FilterOperator; label: string }[] = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "contains", label: "Contains" },
  { value: "gt", label: "Greater Than" },
  { value: "lt", label: "Less Than" },
  { value: "gte", label: "Greater or Equal" },
  { value: "lte", label: "Less or Equal" },
  { value: "between", label: "Between" },
  { value: "in", label: "In List" },
];

// Helper function to apply filters
const applyFilters = (filters: FilterCondition[], dataToFilter: Record<string, any>[]) => {
  if (filters.length === 0) return dataToFilter;

  return dataToFilter.filter((row) => {
    return filters.every((filter) => {
      const value = row[filter.column];
      if (value === null || value === undefined) return false;

      switch (filter.operator) {
        case "equals":
          return String(value).toLowerCase() === String(filter.value).toLowerCase();
        case "not_equals":
          return String(value).toLowerCase() !== String(filter.value).toLowerCase();
        case "contains":
          return String(value).toLowerCase().includes(String(filter.value).toLowerCase());
        case "gt":
          return Number(value) > Number(filter.value);
        case "lt":
          return Number(value) < Number(filter.value);
        case "gte":
          return Number(value) >= Number(filter.value);
        case "lte":
          return Number(value) <= Number(filter.value);
        case "between": {
          const [min, max] = filter.value as [number, number];
          return Number(value) >= min && Number(value) <= max;
        }
        case "in": {
          const values = String(filter.value).split(",").map((v) => v.trim().toLowerCase());
          return values.includes(String(value).toLowerCase());
        }
        default:
          return true;
      }
    });
  });
};

export function DataFilter({ columns, data, onFilterChange }: DataFilterProps) {
  const [filters, setFilters] = useState<FilterCondition[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Apply filters to data
  const filteredData = useMemo(() => {
    return applyFilters(filters, data);
  }, [filters, data]);

  // Notify parent whenever filtered data changes
  useEffect(() => {
    onFilterChange(filteredData);
  }, [filteredData, onFilterChange]);

  const handleFilterChange = (newFilters: FilterCondition[]) => {
    setFilters(newFilters);
  };

  const addFilter = () => {
    const newFilter: FilterCondition = {
      id: Date.now().toString(),
      column: columns[0] || "",
      operator: "equals",
      value: "",
    };
    handleFilterChange([...filters, newFilter]);
  };

  const removeFilter = (id: string) => {
    handleFilterChange(filters.filter((f) => f.id !== id));
  };

  const updateFilter = (id: string, updates: Partial<FilterCondition>) => {
    handleFilterChange(
      filters.map((f) => (f.id === id ? { ...f, ...updates } : f))
    );
  };

  const clearAllFilters = () => {
    handleFilterChange([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <Filter className="w-4 h-4" />
          Filters {filters.length > 0 && `(${filters.length})`}
        </button>
        {filters.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={clearAllFilters}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            Clear All
          </Button>
        )}
      </div>

      {showFilters && (
        <Card className="border-0 shadow-sm bg-slate-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Filter Rows</CardTitle>
            <CardDescription>Add conditions to filter your data before visualization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filters.map((filter) => (
              <div key={filter.id} className="flex gap-2 items-end bg-white p-3 rounded-lg border border-slate-200">
                <div className="flex-1">
                  <label className="text-xs font-medium text-slate-600 block mb-1">Column</label>
                  <select
                    value={filter.column}
                    onChange={(e) => updateFilter(filter.id, { column: e.target.value })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {columns.map((col) => (
                      <option key={col} value={col}>
                        {col}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <label className="text-xs font-medium text-slate-600 block mb-1">Operator</label>
                  <select
                    value={filter.operator}
                    onChange={(e) => updateFilter(filter.id, { operator: e.target.value as FilterOperator })}
                    className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {OPERATORS.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                </div>

                {filter.operator === "between" ? (
                  <div className="flex-1 space-y-1">
                    <label className="text-xs font-medium text-slate-600 block">Range</label>
                    <div className="flex gap-1">
                      <input
                        type="number"
                        placeholder="Min"
                        value={Array.isArray(filter.value) ? filter.value[0] : ""}
                        onChange={(e) => {
                          const min = Number(e.target.value);
                          const max = Array.isArray(filter.value) ? filter.value[1] : 0;
                          updateFilter(filter.id, { value: [min, max] });
                        }}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="number"
                        placeholder="Max"
                        value={Array.isArray(filter.value) ? filter.value[1] : ""}
                        onChange={(e) => {
                          const min = Array.isArray(filter.value) ? filter.value[0] : 0;
                          const max = Number(e.target.value);
                          updateFilter(filter.id, { value: [min, max] });
                        }}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="flex-1">
                    <label className="text-xs font-medium text-slate-600 block mb-1">Value</label>
                    <input
                      type={filter.operator.includes("gt") || filter.operator.includes("lt") ? "number" : "text"}
                      placeholder={filter.operator === "in" ? "Comma-separated values" : "Enter value"}
                      value={Array.isArray(filter.value) ? "" : filter.value}
                      onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <button
                  onClick={() => removeFilter(filter.id)}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}

            <Button
              onClick={addFilter}
              variant="outline"
              size="sm"
              className="w-full"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Filter
            </Button>
          </CardContent>
        </Card>
      )}

      {filters.length > 0 && (
        <div className="text-xs text-slate-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          Showing {filteredData.length} of {data.length} rows
        </div>
      )}
    </div>
  );
}
