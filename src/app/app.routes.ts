import { Routes } from '@angular/router';
import { BudgetspreadsheetComponent } from './budgetspreadsheet/budgetspreadsheet.component';
export const routes: Routes = [
    {path:"spreadsheet",component:BudgetspreadsheetComponent,pathMatch: 'full'},
];
