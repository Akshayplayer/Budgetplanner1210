interface Sheet {
  name: string;
  rows: any[];
  columns: any[];
  protection?: any;
}

export interface WorkbookModel {
  sheets: Sheet[];
}