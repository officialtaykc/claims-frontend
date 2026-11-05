import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Claim, ClaimHistory, ClaimStatus, InformationRequest } from '../../core/models/claim';
import { ClaimApiService } from '../../core/services/claim-api.service';
import { SessionService } from '../../core/services/session.service';
import { errorMessage } from '../../core/utils/error-message';

@Component({
  selector: 'app-claim-details-page',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink, CurrencyPipe, DatePipe],
  template: `
    <div class="page-heading detail-heading">
      <div><a class="back-link" [routerLink]="isClaimant ? '/claimant/claims' : '/staff/queue'">← {{ isClaimant ? 'My claims' : 'Claims queue' }}</a>
        @if (claim; as record) { <div class="detail-title"><h1>{{ record.claimReference }}</h1><span class="status-badge" [class]="statusClass(record.status)">{{ titleCase(record.status) }}</span></div><p>{{ titleCase(record.claimType) }} claim · {{ record.market }} · Submitted {{ record.createdAt | date:'dd MMM yyyy' }}</p> }
        @else { <h1>Claim details</h1><p>Claim reference: {{ reference }}</p> }
      </div>
      <button class="button button-secondary" type="button" (click)="load()">↻ Refresh</button>
    </div>
    @if (error) { <div class="alert error"><span>{{ error }}</span><button type="button" (click)="load()">Try again</button></div> }
    @if (success) { <div class="alert success">{{ success }}</div> }
    @if (loading) { <div class="loading-panel">Loading claim details…</div> }
    @if (claim; as record) {
      <div class="detail-grid">
        <div class="detail-main">
          <section class="panel">
            <div class="panel-heading"><div><h2>Claim overview</h2><p>Claim and incident information</p></div></div>
            <div class="detail-fields">
              <div><small>CLAIMANT</small><b>{{ record.claimantName }}</b></div><div><small>POLICY NUMBER</small><b>{{ record.policyNumber }}</b></div>
              <div><small>EMAIL</small><b>{{ record.claimantEmail }}</b></div><div><small>CONTACT NUMBER</small><b>{{ record.claimantPhone || 'Not provided' }}</b></div>
              <div><small>INCIDENT DATE</small><b>{{ record.incidentDate | date:'dd MMM yyyy' }}</b></div><div><small>INCIDENT CATEGORY</small><b>{{ record.incidentCategory || 'Not provided' }}</b></div>
              <div class="span-two"><small>LOCATION</small><b>{{ record.incidentLocation || 'Not provided' }}</b></div>
              <div class="span-two"><small>INCIDENT DESCRIPTION</small><p>{{ record.incidentDescription }}</p></div>
              <div><small>ASSET REFERENCE</small><b>{{ record.assetReference || 'Not provided' }}</b></div><div><small>ESTIMATED LOSS</small><b>{{ record.estimatedLoss | currency:record.currency:'symbol':'1.0-2' }}</b></div>
            </div>
          </section>
          <section class="panel">
            <div class="panel-heading"><div><h2>Supporting documents</h2><p>Document metadata currently stored with this claim</p></div></div>
            @if (record.documents.length) { <div class="document-list">@for (doc of record.documents; track doc.id) { <div><span class="document-icon">▧</span><span><b>{{ doc.fileName }}</b><small>{{ doc.contentType }} · {{ doc.uploadedBy }} · {{ doc.uploadedAt | date:'dd MMM yyyy' }}</small></span></div> }</div> }
            @else { <p class="empty-note">No document metadata is available. The current backend does not expose a file upload endpoint.</p> }
          </section>
          @if (record.decisionDate) {
            <section class="panel">
              <div class="panel-heading"><div><h2>Claim decision</h2><p>Decision information recorded by the claims team</p></div></div>
              <div class="detail-fields">
                <div><small>OUTCOME</small><span class="status-badge" [class]="statusClass(record.status)">{{ titleCase(record.status) }}</span></div>
                <div><small>DECISION DATE</small><b>{{ record.decisionDate | date:'dd MMM yyyy, h:mm a' }}</b></div>
                @if (record.decisionAmount !== null && record.decisionAmount !== undefined) { <div><small>DECISION AMOUNT</small><b>{{ record.decisionAmount | currency:record.currency:'symbol':'1.0-2' }}</b></div> }
                @if (record.decisionReason) { <div class="span-two"><small>DECISION REASON</small><p>{{ record.decisionReason }}</p></div> }
              </div>
            </section>
          }
          <section class="panel">
            <div class="panel-heading"><div><h2>Information requests</h2><p>Requests and responses associated with this claim</p></div></div>
            @if (record.informationRequests.length) {
              <div class="information-list">@for (request of record.informationRequests; track request.id) {
                <article class="information-card"><div class="request-top"><span class="status-badge" [class]="request.requestStatus === 'OPEN' ? 'status-additional-info-required' : 'status-settled'">{{ titleCase(request.requestStatus) }}</span><span>Due {{ request.dueDate | date:'dd MMM yyyy' }}</span></div><h3>{{ request.requestMessage }}</h3><p class="subtle">Requested by {{ request.requestedBy }} · {{ request.requestedAt | date:'dd MMM yyyy' }}</p>
                  @if (request.responseMessage) { <div class="response-box"><small>CLAIMANT RESPONSE</small><p>{{ request.responseMessage }}</p></div> }
                  @if (isClaimant && request.requestStatus === 'OPEN') { <label class="response-input">Your response<textarea [(ngModel)]="responseText" rows="3" placeholder="Enter your response"></textarea></label><div class="response-actions"><span>File attachments are not supported by the current API.</span><button class="button button-primary" type="button" [disabled]="!responseText.trim() || respondingId === request.id" (click)="respond(request)">{{ respondingId === request.id ? 'Sending…' : 'Send response' }}</button></div> }
                </article>
              }</div>
            } @else { <p class="empty-note">No additional information requests.</p> }
          </section>
          @if (!isClaimant && record.status === 'PENDING_DECISION') {
            <section class="panel">
              <div class="panel-heading"><div><h2>Record claim decision</h2><p>Decision outcomes permitted by the current claim status</p></div></div>
              <form [formGroup]="decisionForm" (ngSubmit)="makeDecision()">
                <div class="form-grid">
                  <label>Outcome<select formControlName="outcome"><option value="APPROVED">Approved</option><option value="PARTIALLY_APPROVED">Partially approved</option><option value="REJECTED">Rejected</option></select></label>
                  @if (decisionForm.controls.outcome.value !== 'REJECTED') { <label>Decision amount<input type="number" min="0" step="0.01" formControlName="decisionAmount" placeholder="0.00"></label> }
                  <label class="span-two">Decision reason<textarea rows="3" formControlName="decisionReason" placeholder="Explain the decision"></textarea></label>
                </div>
                <div class="form-actions"><span class="subtle">Decision maker: {{ user()?.email }}</span><button class="button button-primary" [disabled]="decisionForm.invalid || saving">{{ saving ? 'Saving…' : 'Record decision' }}</button></div>
              </form>
            </section>
          }
          <section class="panel">
            <div class="panel-heading"><div><h2>Claim activity</h2><p>Status history recorded by the claims service</p></div></div>
            @if (history.length) {
              <div class="timeline">@for (item of history; track item.changedAt + item.newStatus) { <article class="timeline-item"><span class="timeline-dot"></span><div><b>{{ titleCase(item.newStatus) }}</b><p>{{ isClaimant ? 'Claim status updated' : (item.comment || 'Status updated') }}</p><small>{{ isClaimant ? (item.changedAt | date:'dd MMM yyyy, h:mm a') : item.changedBy + ' · ' + (item.changedAt | date:'dd MMM yyyy, h:mm a') }}</small></div></article> }</div>
            } @else { <p class="empty-note">No status history is available yet.</p> }
          </section>
        </div>
        @if (!isClaimant) {
          <aside class="detail-side">
            <section class="panel">
              <div class="panel-heading"><div><h2>Claim assignment</h2><p>Assign an officer to this claim</p></div></div>
              <div class="assigned-current"><small>CURRENT ASSIGNEE</small><b>{{ record.assignedTo || 'Unassigned' }}</b></div>
              <form [formGroup]="assignmentForm" (ngSubmit)="assign()"><label>Officer name or email<input formControlName="assignedTo" placeholder="e.g. officer.a@chubb.com"></label><button class="button button-primary full-button" [disabled]="assignmentForm.invalid || saving">{{ saving ? 'Saving…' : 'Save assignment' }}</button></form>
            </section>
            <section class="panel">
              <div class="panel-heading"><div><h2>Update status</h2><p>Only valid workflow transitions are offered</p></div></div>
              @if (nextStatuses.length) {
                <form [formGroup]="statusForm" (ngSubmit)="updateStatus()"><label>New status<select formControlName="newStatus">@for (status of nextStatuses; track status) { <option [value]="status">{{ titleCase(status) }}</option> }</select></label><label>Comment (optional)<textarea rows="3" formControlName="comment" placeholder="Add a note to the activity history"></textarea></label><button class="button button-primary full-button" [disabled]="saving">{{ saving ? 'Updating…' : 'Update status' }}</button></form>
              } @else { <p class="empty-note">No further status transitions are available.</p> }
            </section>
            <section class="panel">
              <div class="panel-heading"><div><h2>Request information</h2><p>Ask the claimant for additional details</p></div></div>
              <form [formGroup]="requestForm" (ngSubmit)="requestInformation()"><label>Request message<textarea rows="4" formControlName="requestMessage" placeholder="What information is needed?"></textarea></label><label>Due date<input type="date" formControlName="dueDate"></label><button class="button button-secondary full-button" [disabled]="requestForm.invalid || saving">{{ saving ? 'Sending…' : 'Send request' }}</button></form>
            </section>
          </aside>
        }
      </div>
    }
  `,
})
export class ClaimDetailsPage implements OnInit {
  private readonly api = inject(ClaimApiService);
  private readonly session = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly changeDetector = inject(ChangeDetectorRef);
  readonly user = this.session.user;
  readonly assignmentForm = this.fb.nonNullable.group({ assignedTo: ['', Validators.required] });
  readonly statusForm = this.fb.nonNullable.group({ newStatus: ['IN_REVIEW' as ClaimStatus, Validators.required], comment: [''] });
  readonly requestForm = this.fb.nonNullable.group({
    requestMessage: ['', Validators.required],
    dueDate: ['', Validators.required],
  });
  readonly decisionForm = this.fb.nonNullable.group({
    outcome: ['APPROVED' as 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED', Validators.required],
    decisionAmount: [''],
    decisionReason: ['', Validators.required],
  });
  readonly transitions: Partial<Record<ClaimStatus, ClaimStatus[]>> = {
    NEW: ['IN_REVIEW'],
    IN_REVIEW: ['ADDITIONAL_INFO_REQUIRED', 'PENDING_DECISION'],
    ADDITIONAL_INFO_REQUIRED: ['IN_REVIEW'],
    PENDING_DECISION: ['APPROVED', 'PARTIALLY_APPROVED', 'REJECTED'],
    APPROVED: ['SETTLEMENT_PENDING'],
    PARTIALLY_APPROVED: ['SETTLEMENT_PENDING'],
    REJECTED: ['CLOSED'],
    SETTLEMENT_PENDING: ['SETTLED'],
    SETTLED: ['CLOSED'],
  };
  reference = '';
  claim: Claim | null = null;
  history: ClaimHistory[] = [];
  loading = false;
  saving = false;
  error = '';
  success = '';
  responseText = '';
  respondingId = '';

  get isClaimant(): boolean { return this.session.user()?.role === 'claimant'; }
  get nextStatuses(): ClaimStatus[] { return this.claim ? this.transitions[this.claim.status] ?? [] : []; }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      this.reference = params.get('claimReference') ?? '';
      this.load();
    });
  }

  load(): void {
    if (!this.reference) return;
    this.loading = true;
    this.error = '';
    forkJoin({
      claim: this.api.getClaim(this.reference),
      history: this.api.getHistory(this.reference),
    }).subscribe({
      next: result => {
        this.claim = result.claim;
        this.history = result.history;
        this.assignmentForm.controls.assignedTo.setValue(result.claim.assignedTo ?? '');
        this.statusForm.controls.newStatus.setValue(this.transitions[result.claim.status]?.[0] ?? 'IN_REVIEW');
        this.loading = false;
        this.changeDetector.markForCheck();
      },
      error: error => {
        this.claim = null;
        this.loading = false;
        this.error = `${errorMessage(error)} If this claim was just submitted, allow time for asynchronous registration and refresh.`;
        this.changeDetector.markForCheck();
      },
    });
  }

  assign(): void {
    if (!this.claim || this.assignmentForm.invalid) return;
    this.saving = true;
    this.success = '';
    this.api.assignClaim(this.reference, this.assignmentForm.controls.assignedTo.value).subscribe({
      next: () => this.completeAction('Claim assignment updated.'),
      error: error => this.failAction(error),
    });
  }

  updateStatus(): void {
    if (!this.claim || this.statusForm.invalid) return;
    const newStatus = this.statusForm.controls.newStatus.value;
    if (!window.confirm(`Change ${this.reference} to ${this.titleCase(newStatus)}?`)) return;
    this.saving = true;
    this.success = '';
    this.api.updateStatus(this.reference, newStatus, this.session.user()?.email ?? '', this.statusForm.controls.comment.value).subscribe({
      next: () => this.completeAction('Claim status updated.'),
      error: error => this.failAction(error),
    });
  }

  requestInformation(): void {
    if (!this.requestForm.valid) return;
    this.saving = true;
    this.success = '';
    this.api.createInformationRequest(
      this.reference,
      this.requestForm.controls.requestMessage.value,
      this.session.user()?.email ?? '',
      this.requestForm.controls.dueDate.value,
    ).subscribe({
      next: () => {
        this.requestForm.reset();
        this.completeAction('Information request sent to the claimant.');
      },
      error: error => this.failAction(error),
    });
  }

  makeDecision(): void {
    if (!this.claim || this.decisionForm.invalid) return;
    const value = this.decisionForm.getRawValue();
    if (!window.confirm(`Record ${this.titleCase(value.outcome)} decision for ${this.reference}?`)) return;
    this.saving = true;
    this.success = '';
    const amount = value.decisionAmount.trim() ? Number(value.decisionAmount) : undefined;
    this.api.makeDecision(this.reference, value.outcome, value.decisionReason, this.session.user()?.email ?? '', amount).subscribe({
      next: () => this.completeAction('Claim decision recorded.'),
      error: error => this.failAction(error),
    });
  }

  respond(request: InformationRequest): void {
    const response = this.responseText.trim();
    if (!response) return;
    this.respondingId = request.id;
    this.api.respondToInformationRequest(this.reference, request.id, response).subscribe({
      next: () => {
        this.responseText = '';
        this.respondingId = '';
        this.success = 'Your response has been sent to the claims team.';
        this.changeDetector.markForCheck();
        this.load();
      },
      error: error => {
        this.error = errorMessage(error);
        this.respondingId = '';
        this.changeDetector.markForCheck();
      },
    });
  }

  titleCase(value: string): string { return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase()); }
  statusClass(status: ClaimStatus): string { return `status-${status.toLowerCase().replaceAll('_', '-')}`; }

  private completeAction(message: string): void {
    this.saving = false;
    this.success = message;
    this.changeDetector.markForCheck();
    this.load();
  }

  private failAction(error: unknown): void {
    this.saving = false;
    this.error = errorMessage(error);
    this.changeDetector.markForCheck();
  }
}
