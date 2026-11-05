import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Claim, ClaimStatus, ClaimType, InformationRequest } from '../../core/models/claim';
import { ClaimApiService } from '../../core/services/claim-api.service';
import { SessionService } from '../../core/services/session.service';
import { errorMessage } from '../../core/utils/error-message';

@Component({
  selector: 'app-claims-list-page',
  imports: [CommonModule, FormsModule, RouterLink, CurrencyPipe, DatePipe],
  template: `
    @if (view === 'requests') {
      <div class="page-heading"><div><div class="eyebrow">CLAIMANT PORTAL</div><h1>Information requests</h1><p>Review and respond to requests from your claims team.</p></div><button class="button button-secondary" type="button" (click)="load()">↻ Refresh</button></div>
      @if (error()) { <div class="alert error">{{ error() }}</div> }
      @if (responseSuccess()) { <div class="alert success">{{ responseSuccess() }}</div> }
      @if (loading()) { <div class="loading-panel">Loading information requests…</div> }
      @if (requests.length) {
        <div class="request-grid">
          @for (item of requests; track item.request.id) {
            <article class="request-card"><div class="request-top"><span class="status-badge" [class]="item.request.requestStatus === 'OPEN' ? 'status-additional-info-required' : 'status-settled'">{{ titleCase(item.request.requestStatus) }}</span><span>{{ item.request.requestedAt | date:'dd MMM yyyy' }}</span></div>
              <a class="ref-link" [routerLink]="['/claimant/claims', item.claim.claimReference]">{{ item.claim.claimReference }}</a>
              <h2>{{ item.request.requestMessage }}</h2>
              @if (item.request.responseMessage) { <p class="response-snippet">Your response: {{ item.request.responseMessage }}</p> }
              @if (item.request.requestStatus === 'OPEN') {
                <label class="request-response">Your response<textarea [(ngModel)]="responseTexts[item.request.id]" rows="3" placeholder="Enter your response to the claims team"></textarea></label>
                <label>Attach supporting documents<input type="file" accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx" multiple (change)="onResponseFilesSelected($event, item.request.id)"></label>
                @if (responseFiles[item.request.id]?.length) { <p class="subtle">Selected: {{ fileNames(responseFiles[item.request.id]) }}</p> }
                @if (responseErrors[item.request.id]) { <p class="field-error">{{ responseErrors[item.request.id] }}</p> }
                <div class="request-foot"><span>Due {{ item.request.dueDate | date:'dd MMM yyyy' }} · Up to 5 files (10 MB each)</span><button class="button button-primary" type="button" [disabled]="(!responseTexts[item.request.id]?.trim() && !responseFiles[item.request.id]?.length) || !!responseErrors[item.request.id] || respondingId === item.request.id" (click)="respondToRequest(item)">{{ respondingId === item.request.id ? 'Sending…' : 'Send response' }}</button></div>
              } @else {
                <div class="request-foot"><span>Due {{ item.request.dueDate | date:'dd MMM yyyy' }} · Responded {{ item.request.respondedAt | date:'dd MMM yyyy' }}</span></div>
              }
            </article>
          }
        </div>
      } @else if (!loading()) { <div class="panel empty-state"><span class="empty-icon">✉</span><h3>No information requests</h3><p>When your claims team needs more information, requests will appear here.</p></div> }
    } @else if (view === 'messages') {
      <div class="page-heading"><div><div class="eyebrow">CLAIMANT PORTAL</div><h1>Messages & updates</h1><p>Recent claim activity based on the status currently returned by the claims service.</p></div><button class="button button-secondary" type="button" (click)="load()">↻ Refresh</button></div>
      @if (error()) { <div class="alert error">{{ error() }}</div> }
      @if (loading()) { <div class="loading-panel">Loading claim updates…</div> }
      @if (claims().length) {
        <section class="panel activity-list">
          @for (claim of claims(); track claim.id) {
            <article class="activity-item"><span class="activity-marker" [class]="statusClass(claim.status)"></span><div><div class="activity-title">{{ activityTitle(claim.status) }}</div><p>{{ claim.claimReference }} · {{ titleCase(claim.claimType) }} claim in {{ claim.market }}</p><small>Last updated {{ claim.updatedAt | date:'dd MMM yyyy, h:mm a' }}</small></div><a class="row-link" [routerLink]="['/claimant/claims', claim.claimReference]">View claim →</a></article>
          }
        </section>
      } @else if (!loading()) { <div class="panel empty-state"><span class="empty-icon">◉</span><h3>No updates yet</h3><p>Updates to your claims will show here.</p></div> }
    } @else {
      <div class="page-heading"><div><div class="eyebrow">{{ isClaimant ? 'CLAIMANT PORTAL' : 'CLAIMS OPERATIONS' }}</div><h1>{{ isClaimant ? 'My claims' : 'Claims work queue' }}</h1><p>{{ isClaimant ? 'View and track claims you have submitted.' : 'Review, assign and progress claims across your operation.' }}</p></div>
        @if (isClaimant) { <a class="button button-primary" routerLink="/claimant/claims/new">＋ Submit new claim</a> }
        @else { <button class="button button-secondary" type="button" (click)="load()">↻ Refresh</button> }
      </div>
      @if (error()) { <div class="alert error">{{ error() }}</div> }
      <section class="panel">
        <div class="filter-row">
          <label class="search-input"><span>⌕</span><input type="search" [(ngModel)]="search" placeholder="Search reference or claimant"></label>
          <select aria-label="Filter by claim type" [(ngModel)]="typeFilter"><option value="">All claim types</option><option value="MOTOR">Motor</option><option value="PROPERTY">Property</option></select>
          <select aria-label="Filter by status" [(ngModel)]="statusFilter"><option value="">All statuses</option>@for (status of statuses; track status) { <option [value]="status">{{ titleCase(status) }}</option> }</select>
          @if (!isClaimant) {
            <select aria-label="Filter by market" [(ngModel)]="marketFilter"><option value="">All markets</option>@for (market of markets; track market) { <option [value]="market">{{ market }}</option> }</select>
            <select aria-label="Filter by assigned officer" [(ngModel)]="assignedFilter"><option value="">All assignments</option><option value="__unassigned">Unassigned</option><option [value]="userEmail">My claims</option>@for (officer of officers; track officer) { @if (officer !== userEmail) { <option [value]="officer">{{ officer }}</option> } }</select>
            <select aria-label="Sort claims by date" [(ngModel)]="dateSort"><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select>
          }
        </div>
        @if (loading()) { <div class="loading-panel">Loading claims…</div> }
        @if (filteredClaims.length) {
          <div class="table-wrap"><table><thead><tr>@if (!isClaimant) { <th>PRIORITY</th> }<th>CLAIM REFERENCE</th><th>{{ isClaimant ? 'CLAIM TYPE' : 'CLAIMANT' }}</th><th>MARKET</th><th>INCIDENT DATE</th><th>{{ isClaimant ? 'SUBMITTED' : 'ESTIMATED LOSS' }}</th><th>STATUS</th><th></th></tr></thead><tbody>
            @for (claim of filteredClaims; track claim.id) {
              <tr>@if (!isClaimant) { <td><span class="priority" [class]="claim.priority.toLowerCase()">{{ titleCase(claim.priority) }}</span></td>}<td><a class="ref-link" [routerLink]="[isClaimant ? '/claimant/claims' : '/staff/claims', claim.claimReference]">{{ claim.claimReference }}</a></td><td>{{ isClaimant ? titleCase(claim.claimType) : claim.claimantName }}</td><td>{{ claim.market }}</td><td>{{ claim.incidentDate | date:'dd MMM yyyy' }}</td><td>{{ isClaimant ? (claim.createdAt | date:'dd MMM yyyy') : (claim.estimatedLoss | currency:claim.currency:'symbol':'1.0-0') }}</td><td><span class="status-badge" [class]="statusClass(claim.status)">{{ titleCase(claim.status) }}</span></td><td><a class="row-link" [routerLink]="[isClaimant ? '/claimant/claims' : '/staff/claims', claim.claimReference]">{{ isClaimant ? 'View' : 'Open' }} →</a></td></tr>
            }
          </tbody></table></div>
        } @else if (!loading()) { <div class="empty-state"><span class="empty-icon">▤</span><h3>{{ claims().length ? 'No matching claims' : 'No claims available' }}</h3><p>{{ claims().length ? 'Try adjusting your filters.' : 'Claims will appear here once they are registered by the backend.' }}</p>@if (isClaimant) { <a class="button button-primary" routerLink="/claimant/claims/new">Submit a claim</a> }</div> }
      </section>
    }
  `,
})
export class ClaimsListPage implements OnInit {
  private readonly api = inject(ClaimApiService);
  private readonly session = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  view = '';
  readonly claims = signal<Claim[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  search = '';
  typeFilter = '';
  statusFilter = '';
  marketFilter = '';
  assignedFilter = '';
  dateSort: 'newest' | 'oldest' = 'newest';
  responseTexts: Record<string, string> = {};
  responseFiles: Record<string, File[]> = {};
  responseErrors: Record<string, string> = {};
  respondingId = '';
  readonly responseSuccess = signal('');
  readonly statuses: ClaimStatus[] = ['NEW', 'IN_REVIEW', 'ADDITIONAL_INFO_REQUIRED', 'PENDING_DECISION', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'SETTLEMENT_PENDING', 'SETTLED'];

  get isClaimant(): boolean { return this.session.user()?.role === 'claimant'; }
  get userEmail(): string { return this.session.user()?.email ?? ''; }
  get markets(): string[] { return [...new Set(this.claims().map(claim => claim.market))].sort(); }
  get officers(): string[] { return [...new Set(this.claims().map(claim => claim.assignedTo).filter((value): value is string => !!value))].sort(); }
  get requests(): { claim: Claim; request: InformationRequest }[] {
    return this.claims().flatMap(claim => claim.informationRequests.map(request => ({ claim, request })))
      .sort((a, b) => b.request.requestedAt.localeCompare(a.request.requestedAt));
  }
  get filteredClaims(): Claim[] {
    const term = this.search.trim().toLowerCase();
    return this.claims().filter(claim =>
      (!term || claim.claimReference.toLowerCase().includes(term) || claim.claimantName.toLowerCase().includes(term)) &&
      (!this.typeFilter || claim.claimType === this.typeFilter) &&
      (!this.statusFilter || claim.status === this.statusFilter) &&
      (!this.marketFilter || claim.market === this.marketFilter) &&
      (!this.assignedFilter || (this.assignedFilter === '__unassigned'
        ? !claim.assignedTo
        : claim.assignedTo === this.assignedFilter)),
    ).sort((a, b) => this.dateSort === 'newest'
      ? b.createdAt.localeCompare(a.createdAt)
      : a.createdAt.localeCompare(b.createdAt));
  }

  ngOnInit(): void {
    this.view = this.route.snapshot.data['view'] as string ?? '';
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    const request = this.isClaimant
      ? this.api.getMyClaims(this.session.user()?.email ?? '')
      : this.api.getStaffClaims();
    request.subscribe({
      next: claims => { this.claims.set(claims); this.loading.set(false); },
      error: error => { this.error.set(errorMessage(error)); this.loading.set(false); },
    });
  }

  fileNames(files: File[] | undefined): string {
    return (files ?? []).map(file => file.name).join(', ');
  }

  onResponseFilesSelected(event: Event, requestId: string): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const files = Array.from(input.files ?? []);
    const totalSize = files.reduce((total, file) => total + file.size, 0);
    const error = files.length > 5
      ? 'Select no more than 5 files.'
      : files.some(file => file.size > 10 * 1024 * 1024)
        ? 'Each file must be 10 MB or smaller.'
        : totalSize > 20 * 1024 * 1024
          ? 'The selected files must total 20 MB or less.'
          : '';
    this.responseErrors[requestId] = error;
    if (error) {
      input.value = '';
      this.responseFiles[requestId] = [];
      return;
    }
    this.responseFiles[requestId] = files;
  }

  respondToRequest(item: { claim: Claim; request: InformationRequest }): void {
    const response = this.responseTexts[item.request.id]?.trim() ?? '';
    const files = this.responseFiles[item.request.id] ?? [];
    if (item.request.requestStatus !== 'OPEN' || (!response && !files.length)
        || this.responseErrors[item.request.id]) return;
    this.respondingId = item.request.id;
    this.error.set('');
    this.responseSuccess.set('');
    this.api.respondToInformationRequest(item.claim.claimReference, item.request.id, response, files).subscribe({
      next: () => {
        this.responseTexts[item.request.id] = '';
        this.responseFiles[item.request.id] = [];
        this.responseErrors[item.request.id] = '';
        this.respondingId = '';
        this.responseSuccess.set('Your response has been sent to the claims team.');
        this.load();
      },
      error: error => {
        this.respondingId = '';
        this.error.set(errorMessage(error));
      },
    });
  }

  titleCase(value: string): string { return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase()); }
  statusClass(status: ClaimStatus): string { return `status-${status.toLowerCase().replaceAll('_', '-')}`; }
  activityTitle(status: ClaimStatus): string {
    const titles: Partial<Record<ClaimStatus, string>> = {
      NEW: 'Your claim has been submitted',
      IN_REVIEW: 'Your claim is being reviewed',
      ADDITIONAL_INFO_REQUIRED: 'Additional information requested',
      PENDING_DECISION: 'Assessment is complete',
      APPROVED: 'Your claim has been approved',
      PARTIALLY_APPROVED: 'Your claim has been partially approved',
      REJECTED: 'Your claim was not approved',
      SETTLEMENT_PENDING: 'Settlement is being processed',
      SETTLED: 'Settlement processed',
    };
    return titles[status] ?? 'Claim updated';
  }
}
