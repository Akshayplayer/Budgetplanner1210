import { Component } from '@angular/core';
import { KENDO_SPREADSHEET } from '@progress/kendo-angular-spreadsheet';
@Component({
  selector: 'app-budgetspreadsheet',
  standalone: true,
  imports: [KENDO_SPREADSHEET],
  templateUrl: './budgetspreadsheet.component.html',
  styleUrl: './budgetspreadsheet.component.scss'
})
export class BudgetspreadsheetComponent {
  public data: any = {
    sheets: [{
      name: 'Budget',
      rows: [
        { cells: [ { value: 'Year', bold: true }, { value: 'Budget', bold: true } ] },
        { cells: [ { value: '2024' }, { value: 50000 } ] },
        { cells: [ { value: '2025' }, { value: 75000 } ] },
        { cells: [ { value: '2026' }, { value: 90000 } ] }
      ]
    }]
  };
}
