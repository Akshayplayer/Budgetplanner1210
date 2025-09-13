interface Sheet {
  name: string;
  rows: any[];
  columns: any[];
  protection?: any;
  frozenRows?: number;
  frozenColumns?: number;
  

}

export interface WorkbookModel {
  sheets: Sheet[];
}