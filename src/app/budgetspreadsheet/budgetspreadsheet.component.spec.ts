import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BudgetspreadsheetComponent } from './budgetspreadsheet.component';

describe('BudgetspreadsheetComponent', () => {
  let component: BudgetspreadsheetComponent;
  let fixture: ComponentFixture<BudgetspreadsheetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BudgetspreadsheetComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BudgetspreadsheetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
