export interface BudgetResource {
    budgetPlanId: number;
    projectId?: number;
    employeeId?: number;
    monthId?: number;
    statusId?: number;
    budgetAllocated: number;
    hoursPlanned: number;
    comments: string;
}
export interface BudgetExtends extends BudgetResource {
    projectName: string;
    employeeName: string;
    month: string;
    statusName: string;
    cost: number;
}