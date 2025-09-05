import { ChangeDetectorRef, Component } from '@angular/core';
import { KENDO_SPREADSHEET, SheetDescriptor } from '@progress/kendo-angular-spreadsheet';
import { MyservicesService } from '../myservices.service';
import { BudgetExtends } from '../budgetresource';
import { CommonModule } from '@angular/common';
import { ViewChild } from '@angular/core';
import { SpreadsheetComponent } from '@progress/kendo-angular-spreadsheet';



@Component({
  selector: 'app-budgetspreadsheet',
  standalone: true,
  imports: [KENDO_SPREADSHEET, CommonModule],
  templateUrl: './budgetspreadsheet.component.html',
  styleUrls: ['./budgetspreadsheet.component.scss']
})
export class BudgetspreadsheetComponent {
  workbook: SheetDescriptor[] = [];

  constructor(private myservice: MyservicesService, private cdr: ChangeDetectorRef) { }
  @ViewChild(SpreadsheetComponent) spreadsheet!: SpreadsheetComponent;

  ngOnInit() {
    this.myservice.getdata().subscribe({
      next: (res: BudgetExtends[]) => {
        console.log("RES", res);
        const rows = [
          {
            cells: [
              { value: "BudgetPlanId" },
              { value: "Project Name" },
              { value: "Employee Name" },
              { value: "Month" },
              { value: "Status" },
              { value: "Budget Allocated" },
              { value: "Hours Planned" },
              { value: "Cost" },
              { value: "Comments" }
            ]
          },
          ...res?.map((item: BudgetExtends) => ({
            cells: [
              { value: item.budgetPlanId },
              { value: item.projectName },
              { value: item.employeeName },
              { value: item.month },
              { value: item.statusName },
              { value: item.budgetAllocated },
              { value: item.hoursPlanned },
              { value: item.cost },
              { value: item.comments }
            ]
          }))
        ];

        this.workbook = [{ name: "Budget", rows: [...rows] }];
        this.cdr.detectChanges(); 
      },
      error: (error) => {
        console.log(error);
      }
    });


    //Adding an entry row

    

    
  }
}
