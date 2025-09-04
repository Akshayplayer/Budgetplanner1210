import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { KENDO_TOOLBAR } from '@progress/kendo-angular-toolbar';
import '@angular/localize/init';
import { SpreadsheetModule } from '@progress/kendo-angular-spreadsheet';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, KENDO_TOOLBAR, SpreadsheetModule, RouterLink],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'Emp_Budget';
}
