# 💼 Employee Budget Management System

A comprehensive Angular application built with **Kendo UI for Angular Spreadsheet** for managing employee budget plans with advanced filtering, data validation, and export capabilities.

## 🚀 Overview

This project is an Employee Budget Management System that leverages the powerful Kendo Spreadsheet component to provide an Excel-like interface for managing budget allocations, project assignments, and employee time tracking. The application features real-time data validation, bulk operations, and seamless integration with backend APIs.

## 🛠 Technology Stack

### Core Technologies
- **Angular 17.3.0** - Modern frontend framework
- **TypeScript** - Type-safe development
- **SCSS** - Enhanced styling capabilities

### Kendo UI Components
- **@progress/kendo-angular-spreadsheet** - Core spreadsheet functionality
- **@progress/kendo-angular-toolbar** - Action buttons and navigation
- **@progress/kendo-angular-buttons** - Interactive UI buttons
- **@progress/kendo-angular-dropdowns** - Multi-select filters
- **@progress/kendo-angular-inputs** - Form controls
- **@progress/kendo-svg-icons** - Icon system
- **@progress/kendo-theme-default** - Consistent theming

### Additional Libraries
- **xlsx** - Excel file processing
- **jspdf** + **jspdf-autotable** - PDF export functionality
- **html2canvas** - Screenshot capabilities
- **rxjs** - Reactive programming

## 📋 Key Features & Implementations

### 1. Kendo Spreadsheet Core Implementation

#### Workbook Configuration
```typescript
workbook: WorkbookModel = {
  sheets: [
    {
      name: 'Budget',
      rows: [],
      columns: Array(10).fill({ width: 150 }),
      frozenRows: 1,
      frozenColumns: 1
    }
  ]
};
```

**Features Implemented:**
- **Frozen Rows/Columns**: Header row and first column are frozen for better navigation
- **Custom Column Widths**: All columns set to 150px width for optimal display
- **Dynamic Sheet Management**: Single sheet named 'Budget' for data management

#### Spreadsheet Component Integration
```typescript
@ViewChild('spreadsheet', { static: false }) spreadsheet!: KendoSpreadsheetComponent;
```

**Methods Used:**
- `onSheetChange()` - Real-time change tracking
- `onSelect()` - Cell/range selection handling
- `activeSheet()` - Active sheet management
- `selection()` - Selection range detection
- `toJSON()` - Sheet data serialization
- `fromJSON()` - Sheet data restoration

### 2. Advanced Data Validation

#### Dropdown Cell Validation
```typescript
private createDropdownCell(value: any, list: string[], allowEdit: boolean) {
  return allowEdit ? {
    value,
    background: '#fef0cd',
    validation: {
      dataType: 'list',
      showButton: true,
      comparerType: 'list',
      from: `"${list.join(',')}"`,
      allowNulls: true,
      type: 'reject'
    }
  } : { value, background: '#f0f0f0', locked: true };
}
```

**Validation Features:**
- **List Validation**: Dropdown cells with predefined options
- **Data Type Enforcement**: Numeric validation for budget and hours
- **Visual Feedback**: Color-coded cells for different states
- **Error Highlighting**: Invalid cells highlighted in red

#### Status Cell with Color Coding
```typescript
private createStatusCell(value: string, list: string[], allowEdit: boolean) {
  let background = allowEdit ? '#fef0cd' : '#f0f0f0';
  let color: string | undefined;

  switch (value) {
    case 'Planned': background = '#edb80cff'; break;
    case 'Approved': background = '#d4edda'; break;
    case 'Over Budget': color = '#dc3545'; break;
  }
  // ... validation configuration
}
```

### 3. Dynamic Data Loading & Filtering

#### Comprehensive Filtering System
```typescript
// Filter Properties
selectedProjects: number[] = [];
selectedEmployees: number[] = [];
selectedMonths: number[] = [];
selectedStatuses: number[] = [];
searchText: string = '';
minBudget?: number;
maxBudget?: number;
minHours?: number;
maxHours?: number;

// Paging & Sorting
pageNumber: number = 1;
pageSize: number = 10;
sortColumn: string = 'ProjectName';
sortDirection: string = 'ASC';
```

**Filter Features:**
- **Multi-select Filters**: Projects, Employees, Months, Statuses
- **Range Filters**: Budget and Hours min/max values
- **Text Search**: Global search across all fields
- **Pagination**: Configurable page sizes (5, 10, 20, 50)
- **Dynamic Sorting**: Sort by any column in ASC/DESC order

#### Real-time Data Updates
```typescript
loadBudgetPlans(): void {
  const filter: BudgetPlanFilter = {
    PageNumber: this.pageNumber,
    PageSize: this.pageSize,
    SortColumn: this.sortColumn,
    SortDirection: this.sortDirection,
    Search: this.searchText,
    ProjectIds: this.selectedProjects,
    EmployeeIds: this.selectedEmployees,
    MonthIds: this.selectedMonths,
    StatusIds: this.selectedStatuses,
    BudgetMin: this.minBudget,
    BudgetMax: this.maxBudget,
    HoursMin: this.minHours,
    HoursMax: this.maxHours
  };
  
  this.myservice.getBudgetPlans(filter).subscribe({
    next: (res: BudgetPlanResponse) => {
      this.budgetPlansResponse = res;
      this.setupSpreadsheet(res.data);
    }
  });
}
```

### 4. Spreadsheet Data Management

#### Dynamic Sheet Population
```typescript
private setupSpreadsheet(budgetPlans: BudgetExtends[]) {
  const headerRow = {
    type: 'header',
    cells: [
      { value: 'BudgetPlanId', bold: true },
      { value: 'Project Name', bold: true },
      { value: 'Employee Name', bold: true },
      { value: 'Month', bold: true },
      { value: 'Status', bold: true },
      { value: 'Budget Allocated', bold: true },
      { value: 'Hours Planned', bold: true },
      { value: 'Comments', bold: true },
      { value: 'Cost', bold: true }
    ]
  };

  const dataRows = (budgetPlans || []).map((bp) => ({
    cells: [
      { value: bp.budgetPlanId, enable: false, locked: true, background: '#f0f0f0' },
      this.createDropdownCell(bp.projectName, this.projects.map(p => p.name), this.isEditable),
      this.createDropdownCell(bp.employeeName, this.employees.map(e => e.name), this.isEditable),
      this.createDropdownCell(bp.month, this.months.map(m => m.name), this.isEditable),
      this.createStatusCell(bp.statusName, this.statuses.map(s => s.name), this.isEditable),
      this.createTextCell(bp.budgetAllocated, this.isEditable),
      this.createTextCell(bp.hoursPlanned, this.isEditable),
      this.createTextCell(bp.comments, this.isEditable),
      { value: bp.cost, enable: false, locked: true, background: '#f0f0f0' }
    ]
  }));

  // Add 10 empty editable rows for new entries
  const emptyRows = Array.from({ length: 10 }).map(() => ({
    cells: [/* empty row configuration */]
  }));
}
```

**Data Management Features:**
- **Header Row**: Bold, frozen header with all column names
- **Data Rows**: Dynamic population from API data
- **Empty Rows**: 10 additional rows for new data entry
- **Cell Locking**: ID and Cost columns are read-only
- **Cell Styling**: Background colors and validation rules

### 5. Bulk Operations

#### Bulk Save (Upsert) Functionality
```typescript
async saveData() {
  if (!this.latestSheetJson) return;

  const rows = this.latestSheetJson.rows;
  const plans: BudgetResource[] = [];
  const errors: string[] = [];

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i]?.cells;
    if (!cells) continue;

    // Extract and validate data from each row
    const budgetPlanId = this.getCellValue(cells, 0, true);
    const projectName = this.getCellValue(cells, 1);
    // ... other field extractions

    // Validation logic
    if (!projectName || !employeeName || !monthName || !statusName) {
      errors.push(`Row ${i + 1}: Missing required dropdown values.`);
      continue;
    }

    if (isNaN(budgetAllocated) || isNaN(hoursPlanned)) {
      errors.push(`Row ${i + 1}: Budget Allocated and Hours Planned must be numeric.`);
      continue;
    }

    plans.push({
      budgetPlanId: budgetPlanId || 0,
      projectId: this.projects.find(p => p.name === projectName)?.id || 0,
      employeeId: this.employees.find(e => e.name === employeeName)?.id || 0,
      monthId: this.months.find(m => m.name === monthName)?.id || 0,
      statusId: this.statuses.find(s => s.name === statusName)?.id || 0,
      budgetAllocated,
      hoursPlanned,
      comments
    });
  }

  if (errors.length > 0) {
    alert("Validation Errors:\n" + errors.join("\n"));
    return;
  }

  try {
    await firstValueFrom(this.myservice.Addupdate(plans));
    alert("✅ Bulk Save Successful!");
    this.isEditable = false;
    this.loadDropdowns();
  } catch (err) {
    console.error("❌ Save Error:", err);
    alert("Save failed.");
  }
}
```

#### Bulk Delete with Selection
```typescript
async onDelete() {
  if (!this.selectedBudgetPlanIds.length) {
    alert("No rows selected for deletion.");
    return;
  }

  try {
    await firstValueFrom(this.myservice.bulkdelete(this.selectedBudgetPlanIds));
    alert(`✅ Deleted ${this.selectedBudgetPlanIds.length} rows.`);
    this.loadBudgetPlans();
    this.selectedBudgetPlanIds = [];
    this.loadDropdowns();
  } catch (err) {
    console.error("❌ Delete Error:", err);
    alert("Bulk delete failed.");
  }
}
```

**Selection Tracking:**
```typescript
onSelect(e: any): void {
  try {
    const sheet = e.sender.activeSheet();
    const selection = sheet.selection();
    if (!selection) return;

    const ranges = selection.ranges || [selection];
    const ids: number[] = [];

    ranges.forEach((range: any) => {
      const ref = range._ref;
      if (!ref?.topLeft || !ref?.bottomRight) return;

      for (let r = ref.topLeft.row; r <= ref.bottomRight.row; r++) {
        if (r === 0) continue; // skip header
        const id = sheet.range(r, 0).value();
        if (id) ids.push(Number(id));
      }
    });

    this.selectedBudgetPlanIds = Array.from(new Set(ids));
    console.log("✅ Selected IDs:", this.selectedBudgetPlanIds);
  } catch (err) {
    console.error("❌ onSelect Error:", err);
  }
}
```

### 6. Excel Import/Export Functionality

#### Excel Import with Validation
```typescript
onExcelUpload(event: any) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e: any) => {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    this.importedExcelData = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
    alert(`✅ Excel imported. ${this.importedExcelData.length} rows ready for processing.`);
  };
  reader.readAsArrayBuffer(file);
}

async processExcelData() {
  if (!this.importedExcelData.length) {
    alert("⚠️ No Excel data to process.");
    return;
  }

  const plans: BudgetResource[] = [];

  for (const row of this.importedExcelData) {
    const budgetPlanId = Number(row["BudgetPlanId"] || 0);
    const projectName = row["Project Name"];
    const employeeName = row["Employee Name"];
    const monthName = row["Month"];
    const statusName = row["Status"];
    const budgetAllocated = Number(row["Budget Allocated"] || 0);
    const hoursPlanned = Number(row["Hours Planned"] || 0);
    const comments = row["Comments"] || '';

    // Validation
    if (!projectName || !employeeName || !monthName || !statusName) continue;

    plans.push({
      budgetPlanId,
      projectId: this.projects.find(p => p.name === projectName)?.id || 0,
      employeeId: this.employees.find(e => e.name === employeeName)?.id || 0,
      monthId: this.months.find(m => m.name === monthName)?.id || 0,
      statusId: this.statuses.find(s => s.name === statusName)?.id || 0,
      budgetAllocated,
      hoursPlanned,
      comments
    });
  }

  try {
    await firstValueFrom(this.myservice.Addupdate(plans));
    alert("✅ Excel data processed and upserted successfully!");
    this.loadDropdowns();
  } catch (err) {
    console.error("❌ Excel process error:", err);
    alert("Excel processing failed.");
  }
}
```

#### Excel Export
```typescript
exportToExcel() {
  if (!this.budgetPlansResponse.data || this.budgetPlansResponse.data.length === 0) {
    alert("⚠️ No data available to export.");
    return;
  }
  const worksheet = XLSX.utils.json_to_sheet(this.budgetPlansResponse.data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'BudgetPlans');
  XLSX.writeFile(workbook, 'BudgetPlans.xlsx');
}
```

### 7. PDF Export with Styling

```typescript
exportToPDF() {
  if (!this.budgetPlansResponse.data || this.budgetPlansResponse.data.length === 0) {
    alert("⚠️ No data available to export.");
    return;
  }
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const head = [[
    'BudgetPlanId', 'Project', 'Employee', 'Month', 'Status',
    'Budget Allocated', 'Hours Planned', 'Comments', 'Cost'
  ]];
  const body = this.budgetPlansResponse.data.map(p => [
    p.budgetPlanId, p.projectName, p.employeeName, p.month, p.statusName,
    p.budgetAllocated, p.hoursPlanned, p.comments || '', p.cost
  ]);
  autoTable(doc, {
    head, body, startY: 20, theme: 'grid',
    styles: { fontSize: 8 },
    headStyles: { fillColor: [22, 160, 133] }
  });
  doc.save('BudgetPlans.pdf');
}
```

### 8. Real-time Validation & Error Handling

#### Sheet Validation
```typescript
private validateSheet(sheet: any) {
  if (!this.latestSheetJson?.rows) return;

  const errors: string[] = [];

  // Reset styles before validation
  this.latestSheetJson.rows.forEach((row: any, rowIndex: number) => {
    if (rowIndex === 0) return; // skip header
    row.cells?.forEach((cell: any, colIndex: number) => {
      if (cell) {
        // Reset background
        const original = (colIndex === 4)
          ? this.createStatusCell(cell.value, this.statuses.map(s => s.name), this.isEditable)
          : this.createTextCell(cell.value, this.isEditable);
        cell.background = original.background;
        cell.color = original.color;
      }
    });
  });

  for (let i = 1; i < this.latestSheetJson.rows.length; i++) {
    const cells = this.latestSheetJson.rows[i]?.cells;
    if (!cells) continue;

    const budget = Number(cells[5]?.value || 0);
    const hours = Number(cells[6]?.value || 0);
    const comments = String(cells[7]?.value || '');

    // Budget validation
    if (budget < 0) {
      errors.push(`Row ${i + 1}: Budget must be greater than 0.`);
      cells[5].background = '#f8d7da';
    }

    // Hours validation
    if (hours < 0) {
      errors.push(`Row ${i + 1}: Hours must be greater than 0.`);
      cells[6].background = '#f8d7da';
    }

    // Comments validation
    if (comments.length > 200) {
      errors.push(`Row ${i + 1}: Comments exceed 200 characters.`);
      cells[7].background = '#f8d7da';
    }
  }

  if (errors.length > 0) {
    alert("Validation Errors:\n" + errors.join("\n"));
  }

  // Re-apply sheet data so styles update
  sheet.fromJSON(this.latestSheetJson);
}
```

### 9. Edit Mode Toggle

```typescript
toggleEdit() {
  this.isEditable = !this.isEditable;
  this.setupSpreadsheet(this.budgetPlansResponse.data);
}
```

**Edit Mode Features:**
- **Lock/Unlock Toggle**: Visual indicator with lock/edit icons
- **Conditional Cell Editing**: Cells become read-only in lock mode
- **Background Color Changes**: Visual feedback for edit state
- **Button State Management**: Save/Delete buttons disabled in lock mode

### 10. Service Layer Architecture

#### API Service Methods
```typescript
export class MyservicesService {
  private baseUrl = environment.baseApiUrl;

  // Data retrieval
  getBudgetPlans(filter: BudgetPlanFilter): Observable<BudgetPlanResponse>
  getProjects(): Observable<any>
  getEmployees(): Observable<any>
  getMonths(): Observable<any>
  getStatuses(): Observable<any>

  // CRUD operations
  deleteData(id: number): Observable<any>
  bulkdelete(data: number[]): Observable<any>
  Addupdate(data: BudgetResource[]): Observable<any>
}
```

**Service Features:**
- **Centralized API Management**: All HTTP calls through service layer
- **Observable-based**: RxJS for reactive programming
- **Type Safety**: Strong typing with TypeScript interfaces
- **Error Handling**: Comprehensive error management

## 🎨 UI/UX Features

### Kendo Toolbar Implementation
```html
<kendo-toolbar class="mb-3">
  <!-- Lock / Edit -->
  <kendo-toolbar-button (click)="toggleEdit()" [svgIcon]="isEditable ? lockSvg : editSvg"
    [text]="isEditable ? 'Lock Sheet' : 'Edit Sheet'">
  </kendo-toolbar-button>

  <!-- Save -->
  <kendo-toolbar-button (click)="saveData()" [disabled]="!isEditable" themeColor="success" [svgIcon]="saveSvg"
    text="Save Data">
  </kendo-toolbar-button>

  <!-- Delete -->
  <kendo-toolbar-button (click)="onDelete()" [disabled]="!isEditable || selectedBudgetPlanIds.length === 0"
    [svgIcon]="deleteSvg" themeColor="warning" text="Delete">
  </kendo-toolbar-button>

  <!-- Export PDF -->
  <kendo-toolbar-button (click)="exportToPDF()" [svgIcon]="pdfSvg" themeColor="primary" text="Export to PDF">
  </kendo-toolbar-button>

  <!-- Export Excel -->
  <kendo-toolbar-button (click)="exportToExcel()" themeColor="info" [svgIcon]="excelSvg" text="Export to Excel">
  </kendo-toolbar-button>

  <!-- Import Excel -->
  <kendo-toolbar-button (click)="excelInput.click()" themeColor="secondary" [svgIcon]="excelSvg" text="Import Excel">
  </kendo-toolbar-button>
</kendo-toolbar>
```

### Icon System
```typescript
// SVG Icons from Kendo
public editSvg: SVGIcon = pencilIcon;
public saveSvg: SVGIcon = saveIcon;
public lockSvg: SVGIcon = lockIcon;
public deleteSvg: SVGIcon = trashIcon;
public pdfSvg: SVGIcon = filePdfIcon;
public excelSvg: SVGIcon = fileExcelIcon;
```

### Responsive Design
- **Bootstrap Integration**: Responsive grid system
- **Mobile-friendly**: Touch-optimized interface
- **Flexible Layout**: Adapts to different screen sizes

## 🔧 Configuration & Setup

### Environment Configuration
```typescript
// environment.ts
export const environment = {
  production: false,
  baseApiUrl: 'your-api-endpoint'
};
```

### Angular Configuration
```json
// angular.json - Kendo Theme Integration
"styles": [
  {
    "input": "node_modules/@progress/kendo-theme-default/dist/all.css"
  },
  "src/styles.scss"
]
```

## 📊 Data Models

### BudgetResource Interface
```typescript
export interface BudgetResource {
  budgetPlanId: number;
  projectId?: number;
  employeeId?: number;
  monthId?: number;
  statusId?: number;
  budgetAllocated: number;
  hoursPlanned: number;
  comments: string;
}
```

### BudgetExtends Interface
```typescript
export interface BudgetExtends extends BudgetResource {
  projectName: string;
  employeeName: string;
  month: string;
  statusName: string;
  cost: number;
}
```

### WorkbookModel Interface
```typescript
export interface WorkbookModel {
  sheets: Sheet[];
}

interface Sheet {
  name: string;
  rows: any[];
  columns: any[];
  protection?: any;
  frozenRows?: number;
  frozenColumns?: number;
}
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or higher)
- Angular CLI (v17.3.17)
- Kendo UI License

### Installation
```bash
# Clone the repository
git clone <repository-url>

# Install dependencies
npm install

# Start development server
ng serve

# Navigate to http://localhost:4200/
```

### Build for Production
```bash
ng build --configuration production
```

## 📝 Key Implementation Highlights

1. **Advanced Spreadsheet Features**: Frozen rows/columns, cell validation, dynamic styling
2. **Real-time Data Synchronization**: Live updates between spreadsheet and backend
3. **Comprehensive Validation**: Client-side validation with visual feedback
4. **Bulk Operations**: Efficient handling of multiple records
5. **Excel Integration**: Seamless import/export functionality
6. **PDF Export**: Professional document generation
7. **Responsive Design**: Mobile-friendly interface
8. **Type Safety**: Full TypeScript implementation
9. **Error Handling**: Robust error management and user feedback
10. **Performance Optimization**: Efficient data loading and rendering

## 🎯 Use Cases

- **Project Management**: Track budget allocations across projects
- **Resource Planning**: Monitor employee hours and costs
- **Financial Reporting**: Generate comprehensive budget reports
- **Data Analysis**: Filter and sort budget data efficiently
- **Collaborative Editing**: Team-based budget management
- **Audit Trail**: Track changes and maintain data integrity

This implementation showcases the full power of Kendo Spreadsheet in creating a professional, feature-rich budget management application with enterprise-grade functionality.