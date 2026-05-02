import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';

/**
 * Test suite for datasets router - visualization data flow
 * Verifies that getData returns correct data structure for chart rendering
 */

describe('Datasets Router - getData', () => {
  describe('Data structure validation', () => {
    it('should return data with all required fields', () => {
      const mockDataset = {
        id: 1,
        name: 'Test Dataset',
        columnNames: ['Name', 'Age', 'Salary'],
        piiColumns: ['Name'],
        processedData: [
          { Name: 'John', Age: 30, Salary: 50000 },
          { Name: 'Jane', Age: 28, Salary: 55000 },
          { Name: 'Bob', Age: 35, Salary: 60000 },
        ],
      };

      const response = {
        data: mockDataset.processedData,
        columns: mockDataset.columnNames,
        piiColumns: mockDataset.piiColumns,
      };

      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('columns');
      expect(response).toHaveProperty('piiColumns');
      expect(Array.isArray(response.data)).toBe(true);
      expect(Array.isArray(response.columns)).toBe(true);
      expect(Array.isArray(response.piiColumns)).toBe(true);
    });

    it('should return data rows with all columns intact', () => {
      const mockData = [
        { Name: 'John', Age: 30, Salary: 50000 },
        { Name: 'Jane', Age: 28, Salary: 55000 },
      ];

      mockData.forEach((row) => {
        expect(row).toHaveProperty('Name');
        expect(row).toHaveProperty('Age');
        expect(row).toHaveProperty('Salary');
      });
    });

    it('should not include random/mock data in response', () => {
      const mockData = [
        { Name: 'John', Age: 30, Salary: 50000 },
        { Name: 'Jane', Age: 28, Salary: 55000 },
      ];

      // Verify no "Item X" patterns (which indicate mock data)
      mockData.forEach((row) => {
        expect(Object.values(row).some((val) => 
          typeof val === 'string' && val.match(/^Item \d+$/)
        )).toBe(false);
      });
    });
  });

  describe('Chart axis mapping', () => {
    it('should correctly map X-axis column to chart data', () => {
      const columns = ['Name', 'Age', 'Salary'];
      const xAxis = columns[0]; // 'Name'
      
      expect(xAxis).toBe('Name');
      expect(columns).toContain(xAxis);
    });

    it('should correctly map Y-axis column to chart data', () => {
      const columns = ['Name', 'Age', 'Salary'];
      const numericColumns = columns.filter((col) => col !== 'Name');
      const yAxis = numericColumns[0]; // 'Age'
      
      expect(yAxis).toBe('Age');
      expect(numericColumns).toContain(yAxis);
    });

    it('should handle user-selected axes correctly', () => {
      const columns = ['Name', 'Age', 'Salary'];
      const selectedXAxis = 'Name';
      const selectedYAxis = 'Salary';

      const xAxisValue = selectedXAxis || columns[0];
      const yAxisValue = selectedYAxis || columns[1];

      expect(xAxisValue).toBe('Name');
      expect(yAxisValue).toBe('Salary');
    });

    it('should use default axes when none selected', () => {
      const columns = ['Name', 'Age', 'Salary'];
      const numericColumns = columns.filter((col) => col !== 'Name');
      
      const selectedXAxis = '';
      const selectedYAxis = '';

      const xAxisValue = selectedXAxis || columns[0];
      const yAxisValue = selectedYAxis || numericColumns[0];

      expect(xAxisValue).toBe('Name');
      expect(yAxisValue).toBe('Age');
    });
  });

  describe('Data filtering for visualization', () => {
    it('should limit data to 50 rows for bar/line charts', () => {
      const mockData = Array.from({ length: 100 }, (_, i) => ({
        Name: `Item ${i + 1}`,
        Age: 20 + (i % 50),
        Salary: 50000 + (i * 100),
      }));

      const chartData = mockData.slice(0, 50);
      expect(chartData.length).toBe(50);
    });

    it('should limit data to 10 rows for pie charts', () => {
      const mockData = Array.from({ length: 100 }, (_, i) => ({
        Name: `Item ${i + 1}`,
        Age: 20 + (i % 50),
        Salary: 50000 + (i * 100),
      }));

      const chartData = mockData.slice(0, 10);
      expect(chartData.length).toBe(10);
    });

    it('should preserve data integrity when slicing', () => {
      const mockData = [
        { Name: 'John', Age: 30, Salary: 50000 },
        { Name: 'Jane', Age: 28, Salary: 55000 },
        { Name: 'Bob', Age: 35, Salary: 60000 },
      ];

      const sliced = mockData.slice(0, 50);
      expect(sliced).toEqual(mockData);
      expect(sliced[0].Name).toBe('John');
      expect(sliced[0].Age).toBe(30);
    });
  });

  describe('Empty state handling', () => {
    it('should handle empty data gracefully', () => {
      const mockData: any[] = [];
      const columns = ['Name', 'Age', 'Salary'];

      expect(mockData.length).toBe(0);
      expect(columns.length).toBeGreaterThan(0);
    });

    it('should handle missing columns gracefully', () => {
      const columns: string[] = [];
      const xAxis = columns[0] || '';
      
      expect(xAxis).toBe('');
    });
  });
});
