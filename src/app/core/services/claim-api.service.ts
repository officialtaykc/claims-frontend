import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Claim,
  ClaimFilters,
  ClaimFormOptions,
  ClaimHistory,
  ClaimStatus,
  ClaimSubmissionRequest,
  ClaimSubmissionResponse,
  DashboardSummary,
  InformationRequest,
  WorkloadResponse,
} from '../models/claim';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ClaimApiService {
  private readonly http = inject(HttpClient);

  getClaimFormOptions(): Observable<ClaimFormOptions> {
    return this.http.get<ClaimFormOptions>(`${environment.apiUrl}/config/claim-form-options`);
  }

  submitClaim(request: ClaimSubmissionRequest): Observable<ClaimSubmissionResponse> {
    return this.http.post<ClaimSubmissionResponse>(`${environment.apiUrl}/claims`, request);
  }

  getMyClaims(email: string): Observable<Claim[]> {
    const params = new HttpParams().set('claimantEmail', email);
    return this.http.get<Claim[]>(`${environment.apiUrl}/claims`, { params });
  }

  getClaim(reference: string): Observable<Claim> {
    return this.http.get<Claim>(`${environment.apiUrl}/claims/${encodeURIComponent(reference)}`);
  }

  getHistory(reference: string): Observable<ClaimHistory[]> {
    return this.http.get<ClaimHistory[]>(`${environment.apiUrl}/claims/${encodeURIComponent(reference)}/history`);
  }

  getStaffClaims(filters: ClaimFilters = {}): Observable<Claim[]> {
    let params = new HttpParams();
    if (filters.status) params = params.set('status', filters.status);
    if (filters.claimType) params = params.set('claimType', filters.claimType);
    if (filters.market) params = params.set('market', filters.market);
    if (filters.assignedTo) params = params.set('assignedTo', filters.assignedTo);
    return this.http.get<Claim[]>(`${environment.apiUrl}/staff/claims`, { params });
  }

  assignClaim(reference: string, assignedTo: string): Observable<Claim> {
    return this.http.patch<Claim>(`${environment.apiUrl}/staff/claims/${encodeURIComponent(reference)}/assign`, { assignedTo });
  }

  updateStatus(reference: string, newStatus: ClaimStatus, changedBy: string, comment: string): Observable<Claim> {
    return this.http.patch<Claim>(`${environment.apiUrl}/staff/claims/${encodeURIComponent(reference)}/status`, {
      newStatus,
      changedBy,
      comment,
    });
  }

  createInformationRequest(reference: string, requestMessage: string, requestedBy: string, dueDate: string): Observable<InformationRequest> {
    return this.http.post<InformationRequest>(`${environment.apiUrl}/staff/claims/${encodeURIComponent(reference)}/information-requests`, {
      requestMessage,
      requestedBy,
      dueDate,
    });
  }

  respondToInformationRequest(reference: string, requestId: string, responseMessage: string): Observable<InformationRequest> {
    return this.http.post<InformationRequest>(
      `${environment.apiUrl}/claims/${encodeURIComponent(reference)}/information-requests/${encodeURIComponent(requestId)}/response`,
      { responseMessage },
    );
  }

  makeDecision(reference: string, outcome: ClaimStatus, decisionReason: string, decidedBy: string, decisionAmount?: number): Observable<Claim> {
    return this.http.post<Claim>(`${environment.apiUrl}/staff/claims/${encodeURIComponent(reference)}/decision`, {
      outcome,
      decisionAmount,
      decisionReason,
      decidedBy,
    });
  }

  getDashboardSummary(): Observable<DashboardSummary> {
    return this.http.get<DashboardSummary>(`${environment.apiUrl}/staff/dashboard/summary`);
  }

  getWorkload(): Observable<WorkloadResponse> {
    return this.http.get<WorkloadResponse>(`${environment.apiUrl}/staff/dashboard/workload`);
  }
}
