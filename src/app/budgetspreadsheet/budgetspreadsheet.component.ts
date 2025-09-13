import { ChangeDetectorRef, Component, ViewChild, OnInit } from '@angular/core';
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
import { forkJoin, lastValueFrom } from 'rxjs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ToolBarModule } from '@progress/kendo-angular-toolbar';

/**
 * Local sheet type that includes frozenRows / frozenColumns
 * and allows additional sheet properties without TypeScript errors.
 */
type KendoSheet = {
  name?: string;
  rows?: any[];
  columns?: any[];
  frozenRows?: number;
  frozenColumns?: number;
  [key: string]: any;
};

@Component({
  selector: 'app-budgetspreadsheet',
  standalone: true,
  imports: [SpreadsheetModule, CommonModule, ButtonsModule, ToolBarModule],
  templateUrl: './budgetspreadsheet.component.html',
  styleUrls: ['./budgetspreadsheet.component.scss']
})
export class BudgetspreadsheetComponent implements OnInit {
  @ViewChild('spreadsheet', { static: false }) spreadsheet!: KendoSpreadsheetComponent;

  workbook: { sheets: KendoSheet[] } = {
    sheets: [
      {
        name: 'Budget',
        rows: [],
        columns: Array(9).fill({ width: 150 }), // 9 visible cols in current model
        frozenRows: 1, // freeze header row
        frozenColumns: 1
      }
    ]
  };

  // icons (SVG)
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

  constructor(private myservice: MyservicesService, private cdr: ChangeDetectorRef) {}

  async ngOnInit(): Promise<void> {
    await this.loadDropdowns();
  }

  /** 🔹 Load dropdowns + existing plans (async/await) */
  private async loadDropdowns(): Promise<void> {
    try {
      const results = await lastValueFrom(
        forkJoin({
          projects: this.myservice.getProjects(),
          employees: this.myservice.getEmployees(),
          months: this.myservice.getMonths(),
          statuses: this.myservice.getStatuses(),
          data: this.myservice.getdata()
        })
      );

      this.projects = results.projects;
      this.employees = results.employees;
      this.months = results.months;
      this.statuses = results.statuses;
      this.budgetPlans = results.data;

      this.setupSpreadsheet(this.budgetPlans);
    } catch (err) {
      console.error('❌ Error loading dropdowns/data:', err);
    }
  }

  toggleEdit(): void {
    this.isEditable = !this.isEditable;
    this.setupSpreadsheet(this.budgetPlans);
  }

  /** 🔹 Build spreadsheet structure */
  private setupSpreadsheet(budgetPlans: BudgetExtends[]): void {
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
        { value: 'Cost', bold: true },
        { value: 'Comments', bold: true }
      ]
    };

    const dataRows = budgetPlans.map((bp) => {
      const allowEdit = this.isEditable;
      return {
        cells: [
          { value: bp.budgetPlanId, enable: false },
          this.createDropdownCell(bp.projectName, this.projects.map((p) => p.name), allowEdit),
          this.createDropdownCell(bp.employeeName, this.employees.map((e) => e.name), allowEdit),
          this.createDropdownCell(bp.month, this.months.map((m) => m.name), allowEdit),
          this.createStatusCell(bp.statusName, this.statuses.map((s) => s.name), allowEdit),
          this.createTextCell(bp.budgetAllocated, allowEdit),
          this.createTextCell(bp.hoursPlanned, allowEdit),
          { value: bp.cost, enable: false },
          this.createTextCell(bp.comments, allowEdit)
        ]
      };
    });

    const emptyRows = Array.from({ length: 200 }).map(() => ({
      cells: [
        { value: '', enable: false },
        this.createDropdownCell('', this.projects.map((p) => p.name), true),
        this.createDropdownCell('', this.employees.map((e) => e.name), true),
        this.createDropdownCell('', this.months.map((m) => m.name), true),
        this.createStatusCell('', this.statuses.map((s) => s.name), true),
        this.createTextCell('', true),
        this.createTextCell('', true),
        { value: '', enable: false },
        this.createTextCell('', true)
      ]
    }));

    this.workbook = {
      sheets: [
        {
          name: 'Budget',
          rows: [headerRow, ...dataRows, ...emptyRows],
          columns: Array(9).fill({ width: 150 }),
          frozenRows: 1, // keep header frozen
          frozenColumns: 1
        }
      ]
    };

    // ensure the spreadsheet UI updates
    this.cdr.detectChanges();
  }

  /** 🔹 Track changes */
  onSheetChange(event: any): void {
    const sheet = event.sender.activeSheet();
    if (sheet) {
      this.latestSheetJson = sheet.toJSON();
    }
  }

  /** 🔹 Bulk Save (Upsert) */
  async saveData(): Promise<void> {
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
      const comments = this.getCellValue(cells, 8);

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
        projectId: this.projects.find((p) => p.name === projectName)?.id || 0,
        employeeId: this.employees.find((e) => e.name === employeeName)?.id || 0,
        monthId: this.months.find((m) => m.name === monthName)?.id || 0,
        statusId: this.statuses.find((s) => s.name === statusName)?.id || 0,
        budgetAllocated,
        hoursPlanned,
        comments
      });
    }

    if (errors.length > 0) {
      alert('Validation Errors:\n' + errors.join('\n'));
      return;
    }

    if (plans.length === 0) {
      alert('No rows to save.');
      return;
    }

    try {
      await lastValueFrom(this.myservice.Addupdate(plans));
      alert('✅ Bulk Save Successful!');
      this.isEditable = false;
      await this.loadDropdowns();
    } catch (err) {
      console.error('❌ Save Error:', err);
      alert('Save failed.');
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
          if (r === 0) continue;
          const id = sheet.range(r, 0).value();
          if (id) ids.push(Number(id));
        }
      });

      this.selectedBudgetPlanIds = Array.from(new Set(ids));
      console.log('✅ Selected IDs:', this.selectedBudgetPlanIds);
    } catch (err) {
      console.error('❌ onSelect Error:', err);
    }
  }

  /** 🔹 Bulk Delete */
  async onDelete(): Promise<void> {
    if (!this.selectedBudgetPlanIds.length) {
      alert('No rows selected for deletion.');
      return;
    }

    try {
      await lastValueFrom(this.myservice.bulkdelete(this.selectedBudgetPlanIds));
      alert(`✅ Deleted ${this.selectedBudgetPlanIds.length} rows.`);
      this.selectedBudgetPlanIds = [];
      await this.loadDropdowns();
    } catch (err) {
      console.error('❌ Delete Error:', err);
      alert('Bulk delete failed.');
    }
  }

  /** 🔹 Helpers */
  private createTextCell(value: any, allowEdit: boolean) {
    return { value, background: allowEdit ? '#fff' : '#f0f0f0', locked: !allowEdit };
  }

  private createStatusCell(value: string, list: string[], allowEdit: boolean) {
    let background = allowEdit ? '#fef0cd' : '#f0f0f0';
    let color: string | undefined;

    switch (value) {
      case 'Planned':
        background = '#fff3cd';
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
          validation: {
            dataType: 'list',
            showButton: true,
            comparerType: 'list',
            from: `"${list.join(',')}"`,
            allowNulls: true,
            type: 'reject'
          }
        }
      : { value, background: '#f0f0f0', locked: true };
  }

  private getCellValue(cells: any[], index: number): string;
  private getCellValue(cells: any[], index: number, asNumber: true): number;
  private getCellValue(cells: any[], index: number, asNumber = false): string | number {
    if (!cells?.[index] || cells[index].value == null) {
      return asNumber ? 0 : '';
    }
    return asNumber ? Number(cells[index].value) || 0 : String(cells[index].value);
  }

  exportToPDF(): void {
    if (!this.budgetPlans || this.budgetPlans.length === 0) {
      alert('⚠️ No data available to export.');
      return;
    }

    const doc = new jsPDF('landscape', 'mm', 'a4');
    const head = [
      [
        'BudgetPlanId',
        'Project',
        'Employee',
        'Month',
        'Status',
        'Budget Allocated',
        'Hours Planned',
        'Cost',
        'Comments'
      ]
    ];

    const body = this.budgetPlans.map((p) => [
      p.budgetPlanId,
      p.projectName,
      p.employeeName,
      p.month,
      p.statusName,
      p.budgetAllocated,
      p.hoursPlanned,
      p.cost,
      p.comments || ''
    ]);

    autoTable(doc, {
      head,
      body,
      startY: 20,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 160, 133] }
    });

    doc.save('BudgetPlans.pdf');
  }

  exportToExcel(): void {
    // SpreadsheetComponent exposes saveAsExcel in Kendo — guard for safety
    const widget = (this.spreadsheet as any);
    console.log(widget);
    
    if (widget && typeof widget.saveAsExcel === 'function') {
      widget.saveAsExcel();
    } else {
      alert('Excel export is not available in this runtime.');
    }
  }
}
