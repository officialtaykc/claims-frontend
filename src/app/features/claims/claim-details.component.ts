import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Claim, ClaimHistory, ClaimStatus, InformationRequest, StaffOfficer } from '../../core/models/claim';
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
            <div class="panel-heading"><div><h2>Supporting documents</h2><p>Files stored with this claim</p></div></div>
            @if (record.documents.length) { <div class="document-list">@for (doc of record.documents; track doc.id) { <div><span class="document-icon">▧</span><span><b>{{ doc.fileName }}</b><small>{{ doc.contentType }} · {{ doc.uploadedBy }} · {{ doc.uploadedAt | date:'dd MMM yyyy' }}</small></span><button class="button button-secondary" type="button" [disabled]="downloadingId === doc.id" (click)="downloadDocument(doc)">{{ downloadingId === doc.id ? 'Downloading…' : 'Download' }}</button></div> }</div> }
            @else { <p class="empty-note">No supporting documents have been uploaded.</p> }
          </section>
          @if (record.decisionDate) {
            <section class="panel">
              <div class="panel-heading"><div><h2>Claim decision</h2><p>Decision information recorded by the claims team</p></div></div>
              <div class="detail-fields">
                <div><small>OUTCOME</small><span class="status-badge" [class]="statusClass(decisionOutcome || record.status)">{{ titleCase(decisionOutcome || record.status) }}</span></div>
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
                  @if (documentsForRequest(record.documents, request.id).length) { <div class="document-list request-documents">@for (doc of documentsForRequest(record.documents, request.id); track doc.id) { <div><span class="document-icon">▧</span><span><b>{{ doc.fileName }}</b><small>{{ doc.uploadedBy }} · {{ doc.uploadedAt | date:'dd MMM yyyy' }}</small></span><button class="button button-secondary" type="button" [disabled]="downloadingId === doc.id" (click)="downloadDocument(doc)">{{ downloadingId === doc.id ? 'Downloading…' : 'Download' }}</button></div> }</div> }
                  @if (request.responseMessage) { <div class="response-box"><small>CLAIMANT RESPONSE</small><p>{{ request.responseMessage }}</p></div> }
                  @if (isClaimant && request.requestStatus === 'OPEN') { <label class="response-input">Your response<textarea [(ngModel)]="responseText" rows="3" placeholder="Enter your response"></textarea></label><label>Attach documents<input type="file" accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx" multiple (change)="onResponseFilesSelected($event)"></label>@if (responseFiles.length) { <p class="subtle">Selected: {{ fileNames(responseFiles) }}</p> }@if (attachmentError) { <p class="field-error">{{ attachmentError }}</p> }<div class="response-actions"><span>Attach up to 5 files (10 MB each).</span><button class="button button-primary" type="button" [disabled]="(!responseText.trim() && !responseFiles.length) || !!attachmentError || respondingId === request.id" (click)="respond(request)">{{ respondingId === request.id ? 'Sending…' : 'Send response' }}</button></div> }
                </article>
              }</div>
            } @else { <p class="empty-note">No additional information requests.</p> }
          </section>
          @if (!isClaimant && isOfficer && record.status === 'IN_REVIEW') {
            <section class="panel">
              <div class="panel-heading"><div><h2>Officer recommendation</h2><p>Recommend a claim outcome for manager review</p></div></div>
              <form [formGroup]="recommendationForm" (ngSubmit)="submitForDecision()">
                <div class="form-grid">
                  <label>Recommended outcome<select formControlName="outcome"><option value="APPROVED">Approve claim</option><option value="PARTIALLY_APPROVED">Partially approve claim</option><option value="REJECTED">Reject claim</option></select></label>
                  @if (recommendationForm.controls.outcome.value !== 'REJECTED') { <label>Recommended amount<input type="number" min="0" step="0.01" formControlName="amount" placeholder="0.00" required></label> }
                  <label class="span-two">Assessment rationale<textarea rows="3" formControlName="reason" placeholder="Explain the assessment and recommendation"></textarea></label>
                </div>
                <div class="form-actions"><span class="subtle">Recommended by: {{ user()?.name }}</span><button class="button button-primary" [disabled]="recommendationForm.invalid || saving">{{ saving ? 'Submitting…' : 'Submit recommendation' }}</button></div>
              </form>
            </section>
          }
          @if (!isClaimant && isManager && record.status === 'PENDING_DECISION') {
            <section class="panel">
              <div class="panel-heading"><div><h2>Manager review</h2><p>Approve the officer recommendation or return it for reassessment</p></div></div>
              @if (record.recommendationOutcome) {
                <div class="response-box">
                  <small>OFFICER RECOMMENDATION · {{ titleCase(record.recommendationOutcome) }}</small>
                  @if (record.recommendationAmount !== null && record.recommendationAmount !== undefined) { <p>Recommended amount: {{ record.recommendationAmount | currency:record.currency:'symbol':'1.0-2' }}</p> }
                  <p>{{ record.recommendationReason }}</p>
                  <small>Submitted by {{ record.recommendationBy }}@if (record.recommendationDate) { · {{ record.recommendationDate | date:'dd MMM yyyy, h:mm a' }} }</small>
                  <label class="response-input">Manager review note<textarea [(ngModel)]="managerComment" rows="3" placeholder="Required when returning the recommendation"></textarea></label>
                  <div class="response-actions">
                    <button class="button button-secondary" type="button" [disabled]="saving || !managerComment.trim()" (click)="rejectRecommendation()">Reject recommendation</button>
                    <button class="button button-primary" type="button" [disabled]="saving" (click)="approveRecommendation()">{{ saving ? 'Saving…' : 'Approve recommendation' }}</button>
                  </div>
                </div>
              } @else { <p class="empty-note">This claim has no officer recommendation to review.</p> }
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
            @if (!isOfficer || record.status !== 'ADDITIONAL_INFO_REQUIRED') {
              @if (canReassignClaim) {
                <section class="panel" data-testid="claim-assignment">
                  <div class="panel-heading"><div><h2>Claim assignment</h2><p>Assign an officer to this claim</p></div></div>
                  <div class="assigned-current"><small>CURRENT ASSIGNEE</small><b>{{ currentAssigneeName }}</b></div>
                  <button class="button button-secondary full-button" type="button" [disabled]="saving" (click)="openReassignDialog()">{{ record.assignedTo ? 'Reassign claim' : 'Assign claim' }}</button>
                </section>
              }
            <section class="panel">
              <div class="panel-heading"><div><h2>Update status</h2><p>Only valid workflow transitions are offered</p></div></div>
              @if (nextStatuses.length) {
                <form [formGroup]="statusForm" (ngSubmit)="updateStatus()"><label>New status<select formControlName="newStatus">@for (status of nextStatuses; track status) { <option [value]="status">{{ titleCase(status) }}</option> }</select></label><label>Comment (optional)<textarea rows="3" formControlName="comment" placeholder="Add a note to the activity history"></textarea></label><button class="button button-primary full-button" [disabled]="saving">{{ saving ? 'Updating…' : 'Update status' }}</button></form>
              } @else { <p class="empty-note">No further status transitions are available.</p> }
            </section>
            }
            @if (isOfficer && record.status === 'IN_REVIEW') {
            <section class="panel">
              <div class="panel-heading"><div><h2>Request information</h2><p>Ask the claimant for additional details</p></div></div>
              <form [formGroup]="requestForm" (ngSubmit)="requestInformation()"><label>Request message<textarea rows="4" formControlName="requestMessage" placeholder="What information is needed?"></textarea></label><label>Due date<input type="date" formControlName="dueDate"></label><label>Attach documents<input type="file" accept=".pdf,.jpg,.jpeg,.png,.txt,.doc,.docx" multiple (change)="onRequestFilesSelected($event)"></label>@if (requestFiles.length) { <p class="subtle">Selected: {{ fileNames(requestFiles) }}</p> }@if (attachmentError) { <p class="field-error">{{ attachmentError }}</p> }<button class="button button-secondary full-button" [disabled]="requestForm.invalid || saving || !!attachmentError">{{ saving ? 'Sending…' : 'Send request' }}</button></form>
            </section>
            }
            @if (isOfficer && record.status === 'ADDITIONAL_INFO_REQUIRED') {
              <section class="panel"><div class="panel-heading"><div><h2>Awaiting claimant response</h2><p>Officer actions are paused until the claimant responds to all open information requests.</p></div></div></section>
            }
          </aside>
        }
      </div>
    }
    @if (reassignDialogOpen && canReassignClaim) {
      <div class="dialog-backdrop" tabindex="-1" (click)="closeReassignDialog()" (keydown.escape)="closeReassignDialog()">
        <section class="reassign-dialog" role="dialog" aria-modal="true" aria-labelledby="reassign-title" (click)="$event.stopPropagation()">
          <div class="dialog-heading"><div><div class="eyebrow">CLAIMS OPERATIONS</div><h2 id="reassign-title">Reassign claim</h2></div><button class="dialog-close" type="button" aria-label="Close" (click)="closeReassignDialog()">×</button></div>
          <p class="dialog-description">Choose an active claims officer for {{ claim?.claimReference }}.</p>
          @if (officersLoading) { <div class="loading-panel">Loading available officers…</div> }
          @if (officersError) { <div class="alert error"><span>{{ officersError }}</span><button type="button" (click)="loadOfficers()">Try again</button></div> }
          @if (!officersLoading && !officersError && availableOfficers.length === 0) { <p class="empty-note">No other active claims officers are available for this claim.</p> }
          @if (!officersLoading && !officersError && availableOfficers.length > 0) {
            <label class="dialog-field" for="officer-select">Available officer
              <select id="officer-select" [(ngModel)]="selectedOfficer" [ngModelOptions]="{standalone: true}">
                <option value="">Select an officer</option>
                @for (officer of availableOfficers; track officer.email) {
                  <option [value]="officer.email">{{ officer.name }}</option>
                }
              </select>
            </label>
          }
          <div class="dialog-actions">
            <button class="button button-secondary" type="button" [disabled]="saving" (click)="closeReassignDialog()">Cancel</button>
            <button class="button button-primary" type="button" [disabled]="!selectedOfficer || saving || officersLoading || !!officersError || availableOfficers.length === 0" (click)="assign()">{{ saving ? 'Reassigning…' : 'Confirm reassignment' }}</button>
          </div>
        </section>
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
  readonly recommendationForm = this.fb.nonNullable.group({
    outcome: ['APPROVED' as 'APPROVED' | 'PARTIALLY_APPROVED' | 'REJECTED', Validators.required],
    amount: ['', [Validators.required, Validators.min(0)]],
    reason: ['', Validators.required],
  });
  readonly transitions: Partial<Record<ClaimStatus, ClaimStatus[]>> = {
    NEW: ['IN_REVIEW'],
    IN_REVIEW: ['ADDITIONAL_INFO_REQUIRED'],
    ADDITIONAL_INFO_REQUIRED: ['IN_REVIEW'],
  };
  reference = '';
  claim: Claim | null = null;
  history: ClaimHistory[] = [];
  officers: StaffOfficer[] = [];
  selectedOfficer = '';
  reassignDialogOpen = false;
  officersLoading = false;
  officersError = '';
  loading = false;
  saving = false;
  error = '';
  success = '';
  responseText = '';
  respondingId = '';
  managerComment = '';
  requestFiles: File[] = [];
  responseFiles: File[] = [];
  attachmentError = '';
  downloadingId = '';

  get isClaimant(): boolean { return this.session.user()?.role === 'claimant'; }
  get isOfficer(): boolean { return this.session.user()?.role === 'officer'; }
  get isManager(): boolean { return this.session.user()?.role === 'manager'; }
  get decisionOutcome(): ClaimStatus | null {
    return [...this.history].reverse().find(item =>
      item.newStatus === 'APPROVED'
      || item.newStatus === 'PARTIALLY_APPROVED'
      || item.newStatus === 'REJECTED',
    )?.newStatus ?? null;
  }
  get nextStatuses(): ClaimStatus[] {
    return this.claim && this.isOfficer ? this.transitions[this.claim.status] ?? [] : [];
  }
  get canReassignClaim(): boolean {
    return !!this.claim && ![
      'APPROVED',
      'PARTIALLY_APPROVED',
      'REJECTED',
      'SETTLEMENT_PENDING',
      'SETTLED',
      'CLOSED',
    ].includes(this.claim.status);
  }
  get availableOfficers(): StaffOfficer[] {
    const assignedTo = this.claim?.assignedTo?.toLowerCase();
    return this.officers.filter(officer =>
      officer.email.toLowerCase() !== assignedTo
      && officer.username.toLowerCase() !== assignedTo);
  }
  get currentAssigneeName(): string {
    const assignedTo = this.claim?.assignedTo?.toLowerCase();
    if (!assignedTo) return 'Unassigned';
    const officer = this.officers.find(item =>
      item.email.toLowerCase() === assignedTo
      || item.username.toLowerCase() === assignedTo);
    return officer?.name ?? 'Officer details unavailable';
  }

  fileNames(files: File[]): string {
    return files.map(file => file.name).join(', ');
  }

  documentsForRequest(documents: Claim['documents'], requestId: string): Claim['documents'] {
    return documents.filter(document => document.informationRequestId === requestId);
  }

  openReassignDialog(): void {
    if (!this.canReassignClaim) return;
    this.reassignDialogOpen = true;
    this.selectedOfficer = '';
    this.loadOfficers();
  }

  closeReassignDialog(): void {
    if (this.saving) return;
    this.reassignDialogOpen = false;
  }

  loadOfficers(): void {
    this.officersLoading = true;
    this.officersError = '';
    this.api.getActiveOfficers().subscribe({
      next: officers => {
        this.officers = officers;
        this.officersLoading = false;
        this.changeDetector.markForCheck();
      },
      error: error => {
        this.officersLoading = false;
        this.officersError = errorMessage(error);
        this.changeDetector.markForCheck();
      },
    });
  }

  ngOnInit(): void {
    this.recommendationForm.controls.outcome.valueChanges.subscribe(outcome => {
      const amountControl = this.recommendationForm.controls.amount;
      amountControl.setValidators(outcome === 'REJECTED'
        ? []
        : [Validators.required, Validators.min(0)]);
      amountControl.updateValueAndValidity();
    });
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
      claim: this.isClaimant
        ? this.api.getClaim(this.reference)
        : this.api.getStaffClaim(this.reference),
      history: this.api.getHistory(this.reference),
    }).subscribe({
      next: result => {
        this.claim = result.claim;
        this.history = result.history;
        this.assignmentForm.controls.assignedTo.setValue(result.claim.assignedTo ?? '');
        this.statusForm.controls.newStatus.setValue(this.transitions[result.claim.status]?.[0] ?? 'IN_REVIEW');
        this.managerComment = '';
        this.loading = false;
        this.changeDetector.markForCheck();
        if (!this.isClaimant) this.loadOfficers();
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
    if (!this.claim || !this.selectedOfficer) return;
    this.saving = true;
    this.success = '';
    this.api.assignClaim(this.reference, this.selectedOfficer).subscribe({
      next: () => {
        this.reassignDialogOpen = false;
        this.completeAction('Claim reassigned successfully.');
      },
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
    if (!this.claim || this.claim.status !== 'IN_REVIEW' || !this.requestForm.valid || this.attachmentError) return;
    this.saving = true;
    this.success = '';
    this.api.createInformationRequest(
      this.reference,
      this.requestForm.controls.requestMessage.value,
      this.session.user()?.email ?? '',
      this.requestForm.controls.dueDate.value,
      this.requestFiles,
    ).subscribe({
      next: () => {
        this.requestForm.reset();
        this.requestFiles = [];
        this.attachmentError = '';
        this.completeAction('Information request sent to the claimant.');
      },
      error: error => this.failAction(error),
    });
  }

  submitForDecision(): void {
    if (!this.claim || !this.isOfficer || this.claim.status !== 'IN_REVIEW'
        || this.recommendationForm.invalid) return;
    const value = this.recommendationForm.getRawValue();
    if (!window.confirm(`Submit your ${this.titleCase(value.outcome)} recommendation for ${this.reference}?`)) return;
    this.saving = true;
    this.success = '';
    const amount = value.amount === '' ? undefined : Number(value.amount);
    if (amount !== undefined && (!Number.isFinite(amount) || amount < 0)) {
      this.error = 'Enter a valid recommended amount of zero or more.';
      this.changeDetector.markForCheck();
      return;
    }
    this.api.submitForDecision(
      this.reference,
      this.session.user()?.email ?? '',
      value.outcome,
      value.reason,
      amount,
    ).subscribe({
      next: () => this.completeAction('Officer recommendation submitted to the manager.'),
      error: error => this.failAction(error),
    });
  }

  approveRecommendation(): void {
    if (!this.claim || !this.isManager || this.claim.status !== 'PENDING_DECISION'
        || !this.claim.recommendationOutcome) return;
    if (!window.confirm(`Approve the officer recommendation for ${this.reference}?`)) return;
    this.saving = true;
    this.success = '';
    this.api.makeDecision(
      this.reference,
      this.claim.recommendationOutcome,
      this.managerComment.trim() || this.claim.recommendationReason || '',
      this.session.user()?.email ?? '',
      this.claim.recommendationAmount ?? undefined,
    ).subscribe({
      next: () => this.completeAction('Officer recommendation approved and recorded as the claim decision.'),
      error: error => this.failAction(error),
    });
  }

  rejectRecommendation(): void {
    const reason = this.managerComment.trim();
    if (!this.claim || !this.isManager || this.claim.status !== 'PENDING_DECISION'
        || !this.claim.recommendationOutcome || !reason) return;
    if (!window.confirm(`Return the recommendation for ${this.reference} to the officer for reassessment?`)) return;
    this.saving = true;
    this.success = '';
    this.api.rejectRecommendation(this.reference, this.session.user()?.email ?? '', reason).subscribe({
      next: () => this.completeAction('Recommendation returned to the officer for reassessment.'),
      error: error => this.failAction(error),
    });
  }

  respond(request: InformationRequest): void {
    const response = this.responseText.trim();
    if (!response && !this.responseFiles.length) return;
    if (this.attachmentError) return;
    this.respondingId = request.id;
    this.api.respondToInformationRequest(this.reference, request.id, response, this.responseFiles).subscribe({
      next: () => {
        this.responseText = '';
        this.responseFiles = [];
        this.attachmentError = '';
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

  onRequestFilesSelected(event: Event): void {
    this.requestFiles = this.validateFiles(event);
  }

  onResponseFilesSelected(event: Event): void {
    this.responseFiles = this.validateFiles(event);
  }

  downloadDocument(document: Claim['documents'][number]): void {
    this.downloadingId = document.id;
    this.api.downloadClaimDocument(this.reference, document.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        const anchor = window.document.createElement('a');
        anchor.href = url;
        anchor.download = document.fileName;
        anchor.click();
        URL.revokeObjectURL(url);
        this.downloadingId = '';
        this.changeDetector.markForCheck();
      },
      error: error => {
        this.downloadingId = '';
        this.error = errorMessage(error);
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

  private validateFiles(event: Event): File[] {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return [];
    const files = Array.from(input.files ?? []);
    const totalSize = files.reduce((total, file) => total + file.size, 0);
    this.attachmentError = files.length > 5
      ? 'Select no more than 5 files.'
      : files.some(file => file.size > 10 * 1024 * 1024)
        ? 'Each file must be 10 MB or smaller.'
        : totalSize > 20 * 1024 * 1024
          ? 'The selected files must total 20 MB or less.'
          : '';
    if (this.attachmentError) {
      input.value = '';
      return [];
    }
    return files;
  }
}
