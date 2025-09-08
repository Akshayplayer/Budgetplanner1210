import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../src/app/environments/environment';
import { Observable } from 'rxjs';
import { BudgetExtends } from './budgetresource';
@Injectable({
  providedIn: 'root'
})
export class MyservicesService {
  private baseUrl = environment.baseApiUrl;

  constructor(private myhttpclient: HttpClient) { }

  getdata(): Observable<BudgetExtends[]> {
    return this.myhttpclient.get<BudgetExtends[]>(this.baseUrl + "/GetAllBudget");
  }

  saveData(data: BudgetExtends) {
    return this.myhttpclient.post(this.baseUrl+"/AddBudget", data);
  }

  getProjects(): Observable<any> {
    return this.myhttpclient.get<any>(this.baseUrl + "/GetProjectNames");
  }

  getEmployees(): Observable<any> {
    return this.myhttpclient.get<any>(this.baseUrl + "/GetEmployeeNames");
  }

  getMonths(): Observable<any> {
    return this.myhttpclient.get<any>(this.baseUrl + "/GetMonths");
  }

  getStatuses(): Observable<any> {
    return this.myhttpclient.get<any>(this.baseUrl + "/GetStatusNames");
  }

}
