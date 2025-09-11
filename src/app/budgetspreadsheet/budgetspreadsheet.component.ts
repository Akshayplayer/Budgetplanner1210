import { ChangeDetectorRef, Component, ViewChild } from '@angular/core';
import {
  SpreadsheetComponent as KendoSpreadsheetComponent,
  SpreadsheetModule
} from '@progress/kendo-angular-spreadsheet';
import { CommonModule } from '@angular/common';
import { ButtonsModule } from '@progress/kendo-angular-buttons';
import { MyservicesService } from '../myservices.service';
import { BudgetExtends, BudgetResource } from '../budgetresource';
import { SVGIcon, pencilIcon, saveIcon, lockIcon } from '@progress/kendo-svg-icons';
import { forkJoin } from 'rxjs';
import { WorkbookModel } from '../model';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-budgetspreadsheet',
  standalone: true,
  imports: [SpreadsheetModule, CommonModule, ButtonsModule],
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
        columns: Array(9).fill({ width: 150 }),
      },
    ],
  };

  public editSvg: SVGIcon = pencilIcon;
  public saveSvg: SVGIcon = saveIcon;
  public lockSvg: SVGIcon = lockIcon;

  // dropdown sources (keep full objects with id + name)
  months: { id: number; name: string }[] = [];
  statuses: { id: number; name: string }[] = [];
  projects: { id: number; name: string }[] = [];
  employees: { id: number; name: string }[] = [];

  budgetPlans: BudgetExtends[] = [];

  isEditable = true;
  latestSheetJson: any;

  constructor(private myservice: MyservicesService, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.loadDropdowns();
  }


  /** Load dropdowns + budget data */
  public loadDropdowns() {
    forkJoin({
      projects: this.myservice.getProjects(),
      employees: this.myservice.getEmployees(),
      months: this.myservice.getMonths(),
      statuses: this.myservice.getStatuses(),
      data: this.myservice.getdata()
    }).subscribe(({ projects, employees, months, statuses, data }) => {
      this.projects = projects;
      this.employees = employees;
      this.months = months;
      this.statuses = statuses;
      this.budgetPlans = data;

      this.setupSpreadsheet(
        this.budgetPlans,
        this.projects,
        this.employees,
        this.months,
        this.statuses
      );
    });
  }

  toggleEdit() {
    this.isEditable = !this.isEditable;
    this.setupSpreadsheet(this.budgetPlans, this.projects, this.employees, this.months, this.statuses);
  }

  /** Build spreadsheet */
  setupSpreadsheet(
    budgetPlans: BudgetExtends[],
    projects: { id: number; name: string }[],
    employees: { id: number; name: string }[],
    months: { id: number; name: string }[],
    statuses: { id: number; name: string }[]
  ) {
    const labelRow = {
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
        { value: 'Comments', bold: true },
        { value: 'Delete?', bold: true },
      ],
    };

    const dataRows = budgetPlans.map((item) => {
      const allowEdit = this.isEditable;
      return {
        cells: [
          { value: item.budgetPlanId, enable: false },
          this.createDropdownCell(item.projectName, projects.map(p => p.name), allowEdit),
          this.createDropdownCell(item.employeeName, employees.map(e => e.name), allowEdit),
          this.createDropdownCell(item.month, months.map(m => m.name), allowEdit),
          this.createDropdownCell(item.statusName, statuses.map(s => s.name), allowEdit),
          this.createTextCell(item.budgetAllocated, allowEdit),
          this.createTextCell(item.hoursPlanned, allowEdit),
          { value: item.cost, enable: true },
          this.createTextCell(item.comments, allowEdit),
          this.createTextCell('', true), // ✅ delete column (empty by default)

        ],
      };
    });

    // Generate N empty rows
    const emptyRows = Array.from({ length: 1000 }).map(() => ({
      cells: [
        { value: '', enable: false },
        this.createDropdownCell('', projects.map(p => p.name), true),
        this.createDropdownCell('', employees.map(e => e.name), true),
        this.createDropdownCell('', months.map(m => m.name), true),
        this.createDropdownCell('', statuses.map(s => s.name), true),
        this.createTextCell('', true),
        this.createTextCell('', true),
        { value: '', enable: true },
        this.createTextCell('', true),
      ],
    }));

    this.workbook = {
      sheets: [
        {
          name: 'Budget',
          rows: [labelRow, ...dataRows, ...emptyRows],
          columns: Array(9).fill({ width: 150 }),
          protection: {
            protected: true,
            options: {
              allowInsertRows: true,
              allowSelectLockedCells: true,
              allowSelectUnlockedCells: true,
              allowFormatCells: false,
              allowDeleteRows: false,
              allowEditObjects: false,
              allowEditLockedCells: false,
            },
          },
        },
      ],
    };
    this.cdr.detectChanges();
  }

  /** Handle changes */
  onSheetChange(event: any) {
    const sheet = event.sender.activeSheet();
    if (!sheet) return;
    this.latestSheetJson = sheet.toJSON();
  }

  /** Save newly added rows (API takes one row at a time) with validation */
  saveData() {
    if (!this.latestSheetJson) return;

    const rows = this.latestSheetJson.rows;
    const newPlans: BudgetResource[] = [];
    const oldplans: BudgetResource[] = [];
    const validationErrors: string[] = [];

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
      // 🔴 Validate required dropdowns
      if (!projectName || !employeeName || !monthName || !statusName) {
        validationErrors.push(`Row ${i + 1}: Missing required dropdown values.`);
        continue;
      }

      // 🔴 Validate numbers
      if (isNaN(budgetAllocated) || isNaN(hoursPlanned)) {
        validationErrors.push(`Row ${i + 1}: Budget Allocated and Hours Planned must be numbers.`);
        continue;
      }

      if (!budgetPlanId) {
        const project = this.projects.find(p => p.name === projectName);
        const employee = this.employees.find(e => e.name === employeeName);
        const month = this.months.find(m => m.name === monthName);
        const status = this.statuses.find(s => s.name === statusName);

        newPlans.push({
          budgetPlanId: 0,
          projectId: project?.id || 0,
          employeeId: employee?.id || 0,
          monthId: month?.id || 0,
          statusId: status?.id || 0,
          budgetAllocated,
          hoursPlanned,
          comments: this.getCellValue(cells, 8),
        });
      } else {
        oldplans.push({
          budgetPlanId,
          projectId: this.projects.find(p => p.name === projectName)?.id || 0,
          employeeId: this.employees.find(e => e.name === employeeName)?.id || 0,
          monthId: this.months.find(m => m.name === monthName)?.id || 0,
          statusId: this.statuses.find(s => s.name === statusName)?.id || 0,
          budgetAllocated,
          hoursPlanned,
          comments: this.getCellValue(cells, 8),
        });
      }
    }

    // ❌ Stop if validation failed
    if (validationErrors.length > 0) {
      alert("Validation Errors:\n" + validationErrors.join("\n"));
      return;
    }

    if (newPlans.length === 0 && oldplans.length === 0) {
      alert('No valid rows to save.');
      return;
    }

    const requests = newPlans.map((plan) => this.myservice.saveData(plan));
    requests.push(...oldplans.map((plan) => this.myservice.updateData(plan)));

    forkJoin(requests).subscribe({
      next: () => {
        alert('Data saved successfully!');
        this.isEditable = false;
        this.loadDropdowns();
      },
      error: (err) => {
        alert('Save failed. Please check your inputs or try again.');
        console.error('Save error:', err);
      },
    });
  }

  /** Cell helpers */
  private createTextCell(value: any, allowEdit: boolean) {
    return {
      value,
      background: allowEdit ? '#fff' : '#f0f0f0',
      locked: !allowEdit,
    };
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
          type: 'reject',
        },
      }
      : {
        value,
        background: '#f0f0f0',
        locked: true,
      };
  }

  /** Safe getter for cleared cells */
  private getCellValue(cells: any[], index: number): string;
  private getCellValue(cells: any[], index: number, asNumber: true): number;
  private getCellValue(cells: any[], index: number, asNumber = false): string | number {
    if (!cells || !cells[index] || cells[index].value === undefined || cells[index].value === null) {
      return asNumber ? 0 : '';
    }
    return asNumber ? Number(cells[index].value) || 0 : String(cells[index].value);
  }

  /** Delete selected rows */
  /** Delete selected rows and sync with backend */
  /** Delete selected rows and sync with backend */
  selectedBudgetPlanIds: number[] = [];

  onSelect(e: any): void {
    try {
      console.log('🟢 onSelect fired with event:', e);

      const sheet = e.sender.activeSheet();
      const selection = sheet.selection();

      if (!selection) {
        console.log('⚠️ No valid selection, clearing IDs');
        this.selectedBudgetPlanIds = [];
        return;
      }
      console.log(selection);

      const ranges = selection.ranges || [selection]; // could be multiple ranges
      const ids: number[] = [];

      ranges.forEach((range: any) => {
        const ref = range._ref;
        if (!ref?.topLeft || !ref?.bottomRight) return;

        const startRow = ref.topLeft.row;
        const endRow = ref.bottomRight.row;

        for (let r = startRow; r <= endRow; r++) {
          if (r === 0) continue; // skip header

          const id = sheet.range(r, 0).value();
          if (id) ids.push(Number(id));
        }
      });

      this.selectedBudgetPlanIds = Array.from(new Set(ids)); // unique
      console.log('✅ Collected BudgetPlanIds:', this.selectedBudgetPlanIds);

    } catch (err) {
      console.error('❌ Error in onSelect:', err);
      this.selectedBudgetPlanIds = [];
    }
  }


  onDelete() {
    console.log("🗑️ Attempting delete. Selected IDs:", this.selectedBudgetPlanIds);

    if (!this.selectedBudgetPlanIds || this.selectedBudgetPlanIds.length === 0) {
      console.warn("⚠️ No valid BudgetPlanId selected for deletion.");

      return;
    }

    const requests = this.selectedBudgetPlanIds.map(budgetPlanId => {
      console.log("➡️ Sending delete request for BudgetPlanId:", budgetPlanId);
      return this.myservice.deleteData(budgetPlanId);
    });

    forkJoin(requests).subscribe({
      next: (res) => {
        console.log("✅ Delete response:", res);

        this.selectedBudgetPlanIds = [];
        this.loadDropdowns(); // reload after delete
      },
      error: (err) => {
        console.error("❌ Delete error:", err);

      }
    });
  }
}
