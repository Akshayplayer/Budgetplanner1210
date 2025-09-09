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

  isEditable = false;
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
          this.createDropdownCell(item.projectName, projects.map(p => p.name), allowEdit),
          this.createDropdownCell(item.employeeName, employees.map(e => e.name), allowEdit),
          this.createDropdownCell(item.month, months.map(m => m.name), allowEdit),
          this.createDropdownCell(item.statusName, statuses.map(s => s.name), allowEdit),
          this.createTextCell(item.budgetAllocated, allowEdit),
          this.createTextCell(item.hoursPlanned, allowEdit),
          { value: item.cost, enable: false },
          this.createTextCell(item.comments, allowEdit),
        ],
      };
    });

    const emptyRow = {
      cells: [
        { value: '', enable: false },
        this.createDropdownCell('', projects.map(p => p.name), true),
        this.createDropdownCell('', employees.map(e => e.name), true),
        this.createDropdownCell('', months.map(m => m.name), true),
        this.createDropdownCell('', statuses.map(s => s.name), true),
        this.createTextCell('', true),
        this.createTextCell('', true),
        { value: '', enable: false },
        this.createTextCell('', true),
      ],
    };

    this.workbook = {
      sheets: [
        {
          name: 'Budget',
          rows: [labelRow, ...dataRows, emptyRow],
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
  saveData() {
    if (!this.latestSheetJson) return;

    const rows = this.latestSheetJson.rows;
    const newPlans: BudgetResource[] = [];

    // skip header row (0)
    for (let i = this.budgetPlans.length + 1; i < rows.length; i++) {
      const cells = rows[i]?.cells;
      if (!cells) continue;

      const budgetPlanId = cells[0]?.value;
      const projectName = cells[1]?.value || '';
      const employeeName = cells[2]?.value || '';
      const monthName = cells[3]?.value || '';
      const statusName = cells[4]?.value || '';

      // only add if no id and required fields filled
      if (!budgetPlanId && projectName && employeeName) {
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
          budgetAllocated: Number(cells[5]?.value) || 0,
          hoursPlanned: Number(cells[6]?.value) || 0,
          comments: cells[8]?.value || '',
        });
      }
    }

    if (newPlans.length === 0) {
      console.log('No new rows to save');
      return;
    }

    // save each row sequentially
    const requests = newPlans.map((plan) => this.myservice.saveData(plan));

    forkJoin(requests).subscribe({
      next: () => {
        console.log('Saved all new rows:', newPlans);
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
}
