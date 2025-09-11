import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../src/app/environments/environment';
import { Observable } from 'rxjs';
import { BudgetExtends, BudgetResource } from './budgetresource';
@Injectable({
  providedIn: 'root'
})
export class MyservicesService {
  private baseUrl = environment.baseApiUrl;

  constructor(private myhttpclient: HttpClient) { }

  getdata(): Observable<BudgetExtends[]> {
    return this.myhttpclient.get<BudgetExtends[]>(this.baseUrl + "/GetAllBudget");
  }

  // saveData(data: BudgetResource) {
  //   return this.myhttpclient.post(this.baseUrl+"/AddBudget", data);
  // }

  // updateData(data: BudgetResource) {
  //   return this.myhttpclient.put(this.baseUrl+"/Update", data);
  // }

  deleteData(id: number) :Observable<any>{
    return this.myhttpclient.delete(`${this.baseUrl}/DeleteBudget/${id}`);
  }

  bulkdelete(data: number[]) {
    return this.myhttpclient.post(this.baseUrl+"/BulkDelete", data);
  }

  Addupdate(data: BudgetResource[]) {
    return this.myhttpclient.post(this.baseUrl+"/BulkUpsert", data);
  }

  getProjects(): Observable<any> {
    return this.myhttpclient.get<any>(this.baseUrl + "/GetAllProjects");
  }

  getEmployees(): Observable<any> {
    return this.myhttpclient.get<any>(this.baseUrl + "/GetAllEmployees");
  }

  getMonths(): Observable<any> {
    return this.myhttpclient.get<any>(this.baseUrl + "/GetAllMonths");
  }

  getStatuses(): Observable<any> {
    return this.myhttpclient.get<any>(this.baseUrl + "/GetAllStatus");
  }

}
