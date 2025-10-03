export interface BudgetPlanFilter {
  PageNumber?: number;     // 📜 page numbe
  PageSize?: number;     // 📜 items per
  SortColumn?: string;     // 📜 sort column
  SortDirection?: string;  // 📜 sort direction
  Search?: string;
  ProjectIds?: number[];
  EmployeeIds?: number[];
  MonthIds?: number[];
  StatusIds?: number[];
           // 🔍 text search
  BudgetMin?: number | null;      // 💰 budget range
  BudgetMax?: number | null;
  HoursMin?: number | null;        // ⏱ hours range
  HoursMax?: number | null;
 
}
