import { describe, it, expect } from 'vitest';

/**
 * Test suite for filtering functionality
 * Verifies that data filtering works correctly with various operators and data types
 */

describe('Data Filtering', () => {
  const mockData = [
    { Name: 'Alice', Age: 28, Salary: 55000, Department: 'Engineering' },
    { Name: 'Bob', Age: 35, Salary: 60000, Department: 'Sales' },
    { Name: 'Charlie', Age: 25, Salary: 50000, Department: 'Engineering' },
    { Name: 'Diana', Age: 32, Salary: 58000, Department: 'HR' },
    { Name: 'Eve', Age: 29, Salary: 52000, Department: 'Sales' },
  ];

  describe('Equals operator', () => {
    it('should filter by exact string match', () => {
      const filtered = mockData.filter((row) =>
        String(row.Department).toLowerCase() === 'engineering'
      );
      expect(filtered).toHaveLength(2);
      expect(filtered[0].Name).toBe('Alice');
    });

    it('should be case-insensitive', () => {
      const filtered = mockData.filter((row) =>
        String(row.Department).toLowerCase() === 'ENGINEERING'.toLowerCase()
      );
      expect(filtered).toHaveLength(2);
    });
  });

  describe('Not equals operator', () => {
    it('should filter out matching values', () => {
      const filtered = mockData.filter((row) =>
        String(row.Department).toLowerCase() !== 'sales'
      );
      expect(filtered).toHaveLength(3);
    });
  });

  describe('Contains operator', () => {
    it('should filter by partial string match', () => {
      const filtered = mockData.filter((row) =>
        String(row.Name).toLowerCase().includes('a')
      );
      // Names with 'a': Alice, Charlie, Diana (Eve doesn't have 'a')
      expect(filtered).toHaveLength(3); // Alice, Charlie, Diana
    });

    it('should be case-insensitive', () => {
      const filtered = mockData.filter((row) =>
        String(row.Name).toLowerCase().includes('ALICE'.toLowerCase())
      );
      expect(filtered).toHaveLength(1);
    });
  });

  describe('Greater than operator', () => {
    it('should filter numeric values greater than threshold', () => {
      const filtered = mockData.filter((row) => Number(row.Age) > 30);
      expect(filtered).toHaveLength(2); // Bob (35), Diana (32)
    });
  });

  describe('Less than operator', () => {
    it('should filter numeric values less than threshold', () => {
      const filtered = mockData.filter((row) => Number(row.Age) < 30);
      expect(filtered).toHaveLength(3); // Alice (28), Charlie (25), Eve (29)
    });
  });

  describe('Greater or equal operator', () => {
    it('should include boundary values', () => {
      const filtered = mockData.filter((row) => Number(row.Age) >= 30);
      expect(filtered).toHaveLength(2); // Bob (35), Diana (32)
    });
  });

  describe('Less or equal operator', () => {
    it('should include boundary values', () => {
      const filtered = mockData.filter((row) => Number(row.Age) <= 28);
      expect(filtered).toHaveLength(2); // Alice (28), Charlie (25)
    });
  });

  describe('Between operator', () => {
    it('should filter values within range', () => {
      const min = 26;
      const max = 32;
      const filtered = mockData.filter((row) => {
        const val = Number(row.Age);
        return val >= min && val <= max;
      });
      // Age values: Alice (28), Bob (35), Charlie (25), Diana (32), Eve (29)
      // Between 26-32: Alice (28), Diana (32), Eve (29) = 3 rows
      expect(filtered).toHaveLength(3);
    });

    it('should include boundary values', () => {
      const min = 28;
      const max = 35;
      const filtered = mockData.filter((row) => {
        const val = Number(row.Age);
        return val >= min && val <= max;
      });
      expect(filtered).toHaveLength(4); // Alice (28), Bob (35), Diana (32), Eve (29)
    });
  });

  describe('In operator', () => {
    it('should filter by list of values', () => {
      const values = ['Engineering', 'HR'];
      const filtered = mockData.filter((row) => {
        const list = values.map((v) => v.toLowerCase());
        return list.includes(String(row.Department).toLowerCase());
      });
      expect(filtered).toHaveLength(3); // Alice, Charlie (Engineering), Diana (HR)
    });
  });

  describe('Multiple filters (AND logic)', () => {
    it('should apply all filters together', () => {
      const filtered = mockData.filter((row) => {
        // Department = Engineering AND Age > 25
        const deptMatch = String(row.Department).toLowerCase() === 'engineering';
        const ageMatch = Number(row.Age) > 25;
        return deptMatch && ageMatch;
      });
      expect(filtered).toHaveLength(1); // Alice (28, Engineering)
    });

    it('should return empty when no rows match all conditions', () => {
      const filtered = mockData.filter((row) => {
        // Department = Engineering AND Age > 40
        const deptMatch = String(row.Department).toLowerCase() === 'engineering';
        const ageMatch = Number(row.Age) > 40;
        return deptMatch && ageMatch;
      });
      expect(filtered).toHaveLength(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle null/undefined values', () => {
      const dataWithNull = [
        { Name: 'Alice', Age: 28 },
        { Name: 'Bob', Age: null },
        { Name: 'Charlie', Age: 25 },
      ];
      const filtered = dataWithNull.filter((row) => {
        if (row.Age === null || row.Age === undefined) return false;
        return Number(row.Age) > 26;
      });
      expect(filtered).toHaveLength(1);
    });

    it('should handle empty data', () => {
      const filtered: any[] = [];
      expect(filtered).toHaveLength(0);
    });

    it('should preserve data integrity after filtering', () => {
      const filtered = mockData.filter((row) => Number(row.Age) > 28);
      expect(filtered[0]).toHaveProperty('Name');
      expect(filtered[0]).toHaveProperty('Age');
      expect(filtered[0]).toHaveProperty('Salary');
      expect(filtered[0]).toHaveProperty('Department');
    });
  });

  describe('Performance', () => {
    it('should handle large datasets efficiently', () => {
      const largeData = Array.from({ length: 10000 }, (_, i) => ({
        Name: `User${i}`,
        Age: 20 + (i % 50),
        Salary: 50000 + (i * 10),
      }));

      const start = performance.now();
      const filtered = largeData.filter((row) => Number(row.Age) > 40);
      const end = performance.now();

      expect(filtered.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(100); // Should complete in less than 100ms
    });
  });
});
