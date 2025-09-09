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

  // dropdown sources
  months: string[] = [];
  statuses: string[] = [];
  projects:string[] = [];
  employees:string[] = [];

  budgetPlans: BudgetExtends[] = [];

  isEditable = false;
  latestSheetJson: any;

  constructor(private myservice: MyservicesService, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.loadDropdowns();
  }

  /** Load dropdowns + budget data */
  public async loadDropdowns() {
    this.myservice.getProjects().subscribe((projects) => {
      this.projects = projects.map((p: any) => p.name);

      this.myservice.getEmployees().subscribe((employees) => {
        this.employees = employees.map((e: any) => e.name);

        this.myservice.getMonths().subscribe((months) => {
          this.months = months.map((m: any) => m.name);

          this.myservice.getStatuses().subscribe((statuses) => {
            this.statuses = statuses.map((s: any) => s.name);

            this.myservice.getdata().subscribe({
              next: (res: BudgetExtends[]) => {
                this.budgetPlans = res;
                this.setupSpreadsheet(
                  this.budgetPlans,
                  this.projects,
                  this.employees,
                  this.months,
                  this.statuses
                );
              }
            });
          });
        });
      });
    });

  }
  //working

  toggleEdit() {
    this.isEditable = !this.isEditable;
    this.setupSpreadsheet(this.budgetPlans, this.projects,this.employees, this.months, this.statuses);
  }

  /** Build spreadsheet */
  setupSpreadsheet(budgetPlans: BudgetExtends[], projectNames: string[], employeeNames: string[], monthNames: string[], statuses: string[]) {
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
          this.createDropdownCell(item.projectName,projectNames, allowEdit),
          this.createDropdownCell(item.employeeName,employeeNames, allowEdit),
          this.createDropdownCell(item.month, monthNames, allowEdit),
          this.createDropdownCell(item.statusName, statuses, allowEdit),
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
        this.createDropdownCell('', projectNames, true),
        this.createDropdownCell('', employeeNames, true),
        this.createDropdownCell('', monthNames, true),
        this.createDropdownCell('', this.statuses, true),
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
    for (let i = this.budgetPlans.length+1; i < rows.length; i++) {
      const cells = rows[i]?.cells;
      if (!cells) continue;

      const budgetPlanId = cells[0]?.value;
      const projectName = cells[1]?.value || '';
      const employeeName = cells[2]?.value || '';

      // new row if no id and required fields filled
      if (!budgetPlanId && projectName && employeeName) {
        newPlans.push({
          budgetPlanId: 0,
          projectId: Number(cells[1]?.value) || 0,
          employeeId: Number(cells[2]?.value) || 0,
          monthId: Number(cells[3]?.value) || 0,
          statusId: Number(cells[4]?.value) || 0,
          budgetAllocated: Number(cells[5]?.value) || 0,
          hoursPlanned: Number(cells[6]?.value) || 0,
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
