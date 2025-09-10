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
      ],
    };

    const dataRows = budgetPlans.map((item) => {
      const allowEdit = this.isEditable;
      return {
        cells: [
          { value: item.budgetPlanId, enable: false },
          this.createDropdownCell(item.projectName, projects.map(p => p.name), allowEdit, true),
          this.createDropdownCell(item.employeeName, employees.map(e => e.name), allowEdit, true),
          this.createDropdownCell(item.month, months.map(m => m.name), allowEdit, true),
          this.createDropdownCell(item.statusName, statuses.map(s => s.name), allowEdit, true),
          this.createNumberCell(item.budgetAllocated, allowEdit, 1, 100000),
          this.createNumberCell(item.hoursPlanned, allowEdit, 0, 1000000),
          this.createNumberCell(item.cost, false, 0, 1000000), // cost locked
          this.createTextCell(item.comments, allowEdit),
        ],
      };
    });

    // Generate N empty rows
    const emptyRows = Array.from({ length: 1000 }).map(() => ({
      cells: [
        { value: '', enable: false },
        this.createDropdownCell('', projects.map(p => p.name), true, true),
        this.createDropdownCell('', employees.map(e => e.name), true, true),
        this.createDropdownCell('', months.map(m => m.name), true, true),
        this.createDropdownCell('', statuses.map(s => s.name), true, true),
        this.createNumberCell('', true, 1, 100000),
        this.createNumberCell('', true, 0, 1000000),
        this.createNumberCell('', false, 0, 1000000),
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

  /** Save newly added rows (API takes one row at a time) */
/** Save newly added rows (API takes one row at a time) */
saveData() {
  if (!this.latestSheetJson) return;

  const rows = this.latestSheetJson.rows;
  const newPlans: BudgetResource[] = [];
  const oldplans: BudgetResource[] = [];
  let hasErrors = false;

  for (let i = 1; i < rows.length; i++) {
    const cells = rows[i]?.cells;
    if (!cells) continue;

    const budgetPlanId = cells[0]?.value;
    const projectName = cells[1]?.value || '';
    const employeeName = cells[2]?.value || '';
    const monthName = cells[3]?.value || '';
    const statusName = cells[4]?.value || '';
    const budgetAllocated = Number(cells[5]?.value) || 0;
    const hoursPlanned = Number(cells[6]?.value) || 0;

    // ✅ check if row is completely empty → skip it
    const isRowEmpty =
      !projectName && !employeeName && !monthName && !statusName &&
      !budgetAllocated && !hoursPlanned && !(cells[8]?.value);

    if (isRowEmpty) continue;

    // ✅ validate only non-empty rows
    if (!projectName || !employeeName || !monthName || !statusName) {
      alert(`Row ${i + 1}: Missing required dropdowns`);
      hasErrors = true;
      continue;
    }
    if (budgetAllocated <= 0) {
      alert(`Row ${i + 1}: Budget Allocated must be > 0`);
      hasErrors = true;
      continue;
    }
    if (hoursPlanned < 0) {
      alert(`Row ${i + 1}: Hours Planned cannot be negative`);
      hasErrors = true;
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
        comments: cells[8]?.value || '',
      });
    } else {
      oldplans.push({
        budgetPlanId: budgetPlanId,
        projectId: this.projects.find(p => p.name === projectName)?.id || 0,
        employeeId: this.employees.find(e => e.name === employeeName)?.id || 0,
        monthId: this.months.find(m => m.name === monthName)?.id || 0,
        statusId: this.statuses.find(s => s.name === statusName)?.id || 0,
        budgetAllocated,
        hoursPlanned,
        comments: cells[8]?.value || '',
      });
    }
  }

  if (hasErrors) {
    console.warn("Fix validation errors before saving");
    return;
  }

  if (newPlans.length === 0 && oldplans.length === 0) {
    console.log('No new rows to save or update');
    return;
  }

  const requests = [
    ...newPlans.map(plan => this.myservice.saveData(plan)),
    ...oldplans.map(plan => this.myservice.updateData(plan))
  ];

  forkJoin(requests).subscribe({
    next: () => {
      console.log('Saved successfully:', [...newPlans, ...oldplans]);
      this.isEditable = false;
      this.loadDropdowns();
    },
    error: (err) => console.error('Save error:', err),
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

  private createNumberCell(value: any, allowEdit: boolean, min: number, max: number) {
    return {
      value,
      background: allowEdit ? '#fff' : '#fef0f0',
      locked: !allowEdit,
      validation: allowEdit
        ? {
            dataType: 'number',
            comparerType: 'between',
            from: min,
            to: max,
            type: 'reject',
            messageTemplate: `Value must be between ${min} and ${max}`,
          }
        : undefined,
    };
  }

  private createDropdownCell(value: any, list: string[], allowEdit: boolean, required = false) {
    return allowEdit
      ? {
          value,
          background: '#fef0cd',
          validation: {
            dataType: 'list',
            showButton: true,
            comparerType: 'list',
            from: `"${list.join(',')}"`,
            allowNulls: !required,
            type: 'reject',
            messageTemplate: required ? "This field is required" : "Select from dropdown",
          },
        }
      : {
          value,
          background: '#f0f0f0',
          locked: true,
        };
  }
}
