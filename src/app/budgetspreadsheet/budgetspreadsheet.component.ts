import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import {
  SpreadsheetComponent as KendoSpreadsheetComponent,
  SpreadsheetModule
} from '@progress/kendo-angular-spreadsheet';
import { CommonModule } from '@angular/common';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { MyservicesService } from '../myservices.service';
import { BudgetExtends, BudgetResource } from '../budgetresource';
import {
  SVGIcon,
  pencilIcon,
  saveIcon,
  lockIcon,
  trashIcon,
  filePdfIcon,
  fileExcelIcon
} from '@progress/kendo-svg-icons';
import { forkJoin, firstValueFrom } from 'rxjs';
import { WorkbookModel } from '../model';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ToolBarModule } from '@progress/kendo-angular-toolbar';
import * as XLSX from 'xlsx';

@Component({
  selector: 'app-budgetspreadsheet',
  standalone: true,
  imports: [SpreadsheetModule, CommonModule, ButtonsModule, ToolBarModule],
  templateUrl: './budgetspreadsheet.component.html',
  styleUrls: ['./budgetspreadsheet.component.scss']
})
export class BudgetspreadsheetComponent {
  @ViewChild('spreadsheet', { static: false }) spreadsheet!: KendoSpreadsheetComponent;

  workbook: WorkbookModel = {
    sheets: [
      {
        name: 'Budget',
        rows: [],
        columns: Array(10).fill({ width: 150 }),
        frozenRows: 1,
        frozenColumns: 1
      },
    ],
  };

  // icons
  public editSvg: SVGIcon = pencilIcon;
  public saveSvg: SVGIcon = saveIcon;
  public lockSvg: SVGIcon = lockIcon;
  public deleteSvg: SVGIcon = trashIcon;
  public pdfSvg: SVGIcon = filePdfIcon;
  public excelSvg: SVGIcon = fileExcelIcon;

  // dropdown sources
  months: { id: number; name: string }[] = [];
  statuses: { id: number; name: string }[] = [];
  projects: { id: number; name: string }[] = [];
  employees: { id: number; name: string }[] = [];

  // main data
  budgetPlans: BudgetExtends[] = [];

  // state
  isEditable = true;
  latestSheetJson: any;
  selectedBudgetPlanIds: number[] = [];

  // excel import buffer
  private importedExcelData: any[] = [];

  constructor(private myservice: MyservicesService, private cdr: ChangeDetectorRef) { }

  async ngOnInit(): Promise<void> {
    await this.loadDropdowns();
  }

  /** 🔹 Load dropdowns + existing plans */
  private async loadDropdowns() {
    try {
      const { projects, employees, months, statuses, data } = await firstValueFrom(
        forkJoin({
          projects: this.myservice.getProjects(),
          employees: this.myservice.getEmployees(),
          months: this.myservice.getMonths(),
          statuses: this.myservice.getStatuses(),
          data: this.myservice.getdata()
        })
      );
      this.projects = projects;
      this.employees = employees;
      this.months = months;
      this.statuses = statuses;
      this.budgetPlans = data;
      this.setupSpreadsheet(this.budgetPlans);
    } catch (err) {
      console.error("❌ Error loading dropdowns/data:", err);
    }
  }

  toggleEdit() {
    this.isEditable = !this.isEditable;
    this.setupSpreadsheet(this.budgetPlans);
  }

  /** 🔹 Build spreadsheet structure */
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
        { value: 'Cost', bold: true },
      ],
    };

    const dataRows = budgetPlans.map((bp) => {
      const allowEdit = this.isEditable;
      return {
        cells: [
          { value: bp.budgetPlanId, enable: false },
          this.createDropdownCell(bp.projectName, this.projects.map(p => p.name), allowEdit),
          this.createDropdownCell(bp.employeeName, this.employees.map(e => e.name), allowEdit),
          this.createDropdownCell(bp.month, this.months.map(m => m.name), allowEdit),
          this.createStatusCell(bp.statusName, this.statuses.map(s => s.name), allowEdit),
          this.createTextCell(bp.budgetAllocated, allowEdit),
          this.createTextCell(bp.hoursPlanned, allowEdit),
          this.createTextCell(bp.comments, allowEdit),
          { value: bp.cost, enable: false },
        ],
      };
    });

    const emptyRows = Array.from({ length: 1000 }).map(() => ({
      cells: [
        { value: '', enable: false },
        this.createDropdownCell('', this.projects.map(p => p.name), true),
        this.createDropdownCell('', this.employees.map(e => e.name), true),
        this.createDropdownCell('', this.months.map(m => m.name), true),
        this.createStatusCell('', this.statuses.map(s => s.name), true),
        this.createTextCell('', true),
        this.createTextCell('', true),
        this.createTextCell('', true),
        { value: '', enable: false },
      ],
    }));

    this.workbook = {
      sheets: [
        {
          name: 'Budget',
          rows: [headerRow, ...dataRows, ...emptyRows],
          columns: Array(10).fill({ width: 150 }),
          frozenRows: 1, // keep header frozen
          frozenColumns: 1
        },
      ],
    };

    this.cdr.detectChanges();
  }

  /** 🔹 Excel Upload */
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

  /** 🔹 Process Excel (Upsert) */
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

      // ✅ Only upsert if valid
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

    if (plans.length === 0) {
      alert("⚠️ No valid rows found in Excel.");
      return;
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

  /** 🔹 Track changes */
  onSheetChange(event: any) {
    const sheet = event.sender.activeSheet();
    if (sheet) {
      this.latestSheetJson = sheet.toJSON();
      this.validateSheet(sheet);
    }
  }

  /** 🔹 Bulk Save (Upsert from sheet) */
  async saveData() {
    if (!this.latestSheetJson) return;

    const rows = this.latestSheetJson.rows;
    const plans: BudgetResource[] = [];
    const errors: string[] = [];

    for (let i = 1; i < rows.length; i++) {
      const cells = rows[i]?.cells;
      if (!cells) continue;

      const budgetPlanId = this.getCellValue(cells, 0, true);
      const projectName = this.getCellValue(cells, 1);
      const employeeName = this.getCellValue(cells, 2);
      const monthName = this.getCellValue(cells, 3);
      const statusName = this.getCellValue(cells, 4);
      const budgetAllocated = this.getCellValue(cells, 5, true);
      const hoursPlanned = this.getCellValue(cells, 6, true);
      const comments = this.getCellValue(cells, 7);

      if (!projectName && !employeeName && !monthName && !statusName && !budgetAllocated && !hoursPlanned && !comments) {
        continue;
      }

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

    if (plans.length === 0) {
      alert("No rows to save.");
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


  /** 🔹 Selection → Collect IDs */
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


  /** 🔹 Bulk Delete */
  async onDelete() {
    if (!this.selectedBudgetPlanIds.length) {
      alert("No rows selected for deletion.");
      return;
    }

    try {
      await firstValueFrom(this.myservice.bulkdelete(this.selectedBudgetPlanIds));
      alert(`✅ Deleted ${this.selectedBudgetPlanIds.length} rows.`);
      this.selectedBudgetPlanIds = [];
      this.loadDropdowns();
    } catch (err) {
      console.error("❌ Delete Error:", err);
      alert("Bulk delete failed.");
    }
  }

  /** 🔹 Helpers */
  /** 🔹 Helpers */
  private createTextCell(value: any, allowEdit: boolean) {
    return {
      value,
      background: allowEdit ? '#fff' : '#f0f0f0',
      locked: !allowEdit,
      color: undefined as string | undefined   // 🔹 added for consistency
    };
  }

  private createStatusCell(value: string, list: string[], allowEdit: boolean) {
    let background = allowEdit ? '#fef0cd' : '#f0f0f0';
    let color: string | undefined;

    switch (value) {
      case 'Planned':
        background = '#edb80cff';
        break;
      case 'Approved':
        background = '#d4edda';
        break;
      case 'Over Budget':
        color = '#dc3545';
        break;
    }

    return allowEdit
      ? {
        value,
        background,
        color,
        validation: {
          dataType: 'list',
          showButton: true,
          comparerType: 'list',
          from: `"${list.join(',')}"`,
          allowNulls: true,
          type: 'reject'
        }
      }
      : { value, background, color, locked: true };
  }

  private createDropdownCell(value: any, list: string[], allowEdit: boolean) {
    return allowEdit
      ? {
        value,
        background: '#fef0cd',
        color: undefined as string | undefined,   // 🔹 added
        validation: {
          dataType: 'list',
          showButton: true,
          comparerType: 'list',
          from: `"${list.join(',')}"`,
          allowNulls: true,
          type: 'reject',
        },
      }
      : { value, background: '#f0f0f0', locked: true, color: undefined as string | undefined };
  }


  private getCellValue(cells: any[], index: number): string;
  private getCellValue(cells: any[], index: number, asNumber: true): number;
  private getCellValue(cells: any[], index: number, asNumber = false): string | number {
    if (!cells?.[index] || cells[index].value == null) {
      return asNumber ? 0 : '';
    }
    return asNumber ? Number(cells[index].value) || 0 : String(cells[index].value);
  }

  /** 🔹 Export PDF */
  exportToPDF() {
    if (!this.budgetPlans || this.budgetPlans.length === 0) {
      alert("⚠️ No data available to export.");
      return;
    }
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const head = [[
      'BudgetPlanId', 'Project', 'Employee', 'Month', 'Status',
      'Budget Allocated', 'Hours Planned', 'Comments','Cost'
    ]];
    const body = this.budgetPlans.map(p => [
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

  /** 🔹 Export Excel */
  exportToExcel() {
    if (!this.budgetPlans || this.budgetPlans.length === 0) {
      alert("⚠️ No data available to export.");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(this.budgetPlans);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'BudgetPlans');
    XLSX.writeFile(workbook, 'BudgetPlans.xlsx');
  }


  private validateSheet(sheet: any) {
    if (!this.latestSheetJson?.rows) return;

    const errors: string[] = [];

    // reset styles before validation
    this.latestSheetJson.rows.forEach((row: any, rowIndex: number) => {
      if (rowIndex === 0) return; // skip header
      row.cells?.forEach((cell: any, colIndex: number) => {
        if (cell) {
          // reset background
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

      const month = cells[3]?.value;
      const status = cells[4]?.value;
      const budget = Number(cells[5]?.value || 0);
      const hours = Number(cells[6]?.value || 0);
      const comments = String(cells[7]?.value || '');

      // Month required
      // if (!month) {
      //   errors.push(`Row ${i + 1}: Month is required.`);
      //   cells[3].background = '#f8d7da';
      // }

      // Budget must be > 0
      if (budget < 0) {
        errors.push(`Row ${i + 1}: Budget must be greater than 0.`);
        cells[5].background = '#f8d7da';
      }

      // Hours must be > 0
      if (hours < 0) {
        errors.push(`Row ${i + 1}: Hours must be greater than 0.`);
        cells[6].background = '#f8d7da';
      }

      // Comments max 200
      if (comments.length > 200) {
        errors.push(`Row ${i + 1}: Comments exceed 200 characters.`);
        cells[7].background = '#f8d7da';
      }
    }

    if (errors.length > 0) {
      alert("Validation Errors:\n" + errors.join("\n"));
    }

    // re-apply sheet data so styles update
    sheet.fromJSON(this.latestSheetJson);
  }

}
