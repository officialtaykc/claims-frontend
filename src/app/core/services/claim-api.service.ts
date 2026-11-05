import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  Claim,
  ClaimDocument,
  ClaimantPolicy,
  ClaimFilters,
  ClaimFormOptions,
  ClaimHistory,
  MotorClaimFormOptions,
  PropertyClaimFormOptions,
  ClaimStatus,
  ClaimSubmissionRequest,
  ClaimSubmissionResponse,
  DashboardSummary,
  InformationRequest,
  LoginRequest,
  LoginResponse,
  StaffOfficer,
  WorkloadResponse,
} from '../models/claim';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ClaimApiService {
  private readonly http = inject(HttpClient);

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/login`, request);
  }

  getMotorClaimOptions(): Observable<MotorClaimFormOptions> {
    return this.http.get<MotorClaimFormOptions>(`${environment.apiUrl}/config/motor-claims`);
  }

  getPropertyClaimOptions(): Observable<PropertyClaimFormOptions> {
    return this.http.get<PropertyClaimFormOptions>(`${environment.apiUrl}/config/property-claims`);
  }

  submitClaim(request: ClaimSubmissionRequest): Observable<ClaimSubmissionResponse> {
    return this.http.post<ClaimSubmissionResponse>(`${environment.apiUrl}/claims`, request);
  }

  uploadClaimDocuments(reference: string, files: File[], uploadedBy: string): Observable<ClaimDocument[]> {
    const body = new FormData();
    body.append('uploadedBy', uploadedBy);
    files.forEach(file => body.append('files', file, file.name));
    return this.http.post<ClaimDocument[]>(
      `${environment.apiUrl}/claims/${encodeURIComponent(reference)}/documents`,
      body,
    );
  }

  downloadClaimDocument(reference: string, documentId: string): Observable<Blob> {
    return this.http.get(
      `${environment.apiUrl}/claims/${encodeURIComponent(reference)}/documents/${encodeURIComponent(documentId)}/content`,
      { responseType: 'blob' },
    );
  }

  getMyClaims(email: string): Observable<Claim[]> {
    const params = new HttpParams().set('claimantEmail', email);
    return this.http.get<Claim[]>(`${environment.apiUrl}/claims`, { params });
  }

  getMyPolicies(email: string): Observable<ClaimantPolicy[]> {
    const params = new HttpParams().set('claimantEmail', email);
    return this.http.get<ClaimantPolicy[]>(`${environment.apiUrl}/claimant/policies`, { params });
  }

  getClaim(reference: string): Observable<Claim> {
    return this.http.get<Claim>(`${environment.apiUrl}/claims/${encodeURIComponent(reference)}`);
  }

  getStaffClaim(reference: string): Observable<Claim> {
    return this.http.get<Claim>(`${environment.apiUrl}/staff/claims/${encodeURIComponent(reference)}`);
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

  getActiveOfficers(): Observable<StaffOfficer[]> {
    return this.http.get<StaffOfficer[]>(`${environment.apiUrl}/staff/officers`);
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

  submitForDecision(
    reference: string,
    submittedBy: string,
    recommendationOutcome: 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED',
    recommendationReason: string,
    recommendationAmount?: number,
  ): Observable<Claim> {
    return this.http.post<Claim>(
      `${environment.apiUrl}/staff/claims/${encodeURIComponent(reference)}/submit-for-decision`,
      { submittedBy, recommendationOutcome, recommendationReason, recommendationAmount },
    );
  }

  rejectRecommendation(reference: string, rejectedBy: string, reason: string): Observable<Claim> {
    return this.http.post<Claim>(
      `${environment.apiUrl}/staff/claims/${encodeURIComponent(reference)}/reject-recommendation`,
      { rejectedBy, reason },
    );
  }

  createInformationRequest(reference: string, requestMessage: string, requestedBy: string,
                           dueDate: string, files: File[] = []): Observable<InformationRequest> {
    const body = new FormData();
    body.append('request', JSON.stringify({ requestMessage, requestedBy, dueDate }));
    files.forEach(file => body.append('files', file, file.name));
    return this.http.post<InformationRequest>(`${environment.apiUrl}/staff/claims/${encodeURIComponent(reference)}/information-requests`, body);
  }

  respondToInformationRequest(reference: string, requestId: string, responseMessage: string,
                              files: File[] = []): Observable<InformationRequest> {
    const body = new FormData();
    body.append('request', JSON.stringify({ responseMessage }));
    files.forEach(file => body.append('files', file, file.name));
    return this.http.post<InformationRequest>(
      `${environment.apiUrl}/claims/${encodeURIComponent(reference)}/information-requests/${encodeURIComponent(requestId)}/response`,
      body,
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
