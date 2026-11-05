import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Claim, ClaimantPolicy, ClaimStatus, DashboardSummary } from '../../core/models/claim';
import { ClaimApiService } from '../../core/services/claim-api.service';
import { SessionService } from '../../core/services/session.service';
import { errorMessage } from '../../core/utils/error-message';

@Component({
  selector: 'app-dashboard-page',
  imports: [CommonModule, RouterLink, CurrencyPipe, DatePipe],
  template: `
    @if (view === 'exposure') {
      <div class="page-heading">
        <div><div class="eyebrow">MANAGEMENT</div><h1>Financial exposure</h1><p>Current financial figures reported by the claims service.</p></div>
        <button class="button button-secondary" type="button" (click)="load()">↻ Refresh</button>
      </div>
      @if (error) { <div class="alert error">{{ error }}</div> }
      @if (loading) { <div class="loading-panel">Loading financial summary…</div> }
      @if (summary; as data) {
        <div class="metric-grid two">
          <article class="metric-card"><span class="metric-label">Estimated outstanding exposure</span><strong>{{ data.estimatedOutstandingExposure | number:'1.0-0' }}</strong><small>API does not include a currency or conversion basis</small></article>
          <article class="metric-card"><span class="metric-label">Approved exposure</span><strong>{{ data.approvedExposure | number:'1.0-0' }}</strong><small>API does not include a currency or conversion basis</small></article>
        </div>
        <section class="panel">
          <div class="panel-heading"><div><h2>Claims by market</h2><p>Claim counts from the backend summary</p></div></div>
          <div class="bar-list">@for (entry of marketEntries; track entry[0]) { <div class="bar-row"><span>{{ entry[0] }}</span><div class="bar-track"><i [style.width.%]="marketWidth(entry[1])"></i></div><b>{{ entry[1] }}</b></div> } @empty { <p class="empty-note">No market data available.</p> }</div>
        </section>
      }
    } @else {
      <div class="page-heading">
        <div><div class="eyebrow">{{ isClaimant ? 'CLAIMANT PORTAL' : isManager ? 'MANAGEMENT' : 'CLAIMS OPERATIONS' }}</div><h1>{{ isClaimant ? 'Good day, ' + firstName : isManager ? 'Claims overview' : 'Welcome back, ' + firstName }}</h1><p>{{ isClaimant ? 'Track your claims and see what needs your attention.' : 'A live view of claims activity across your operation.' }}</p></div>
        @if (isClaimant) { <a class="button button-primary" routerLink="/claimant/claims/new">＋ Submit new claim</a> }
        @else { <button class="button button-secondary" type="button" (click)="load()">↻ Refresh data</button> }
      </div>
      @if (error) { <div class="alert error">{{ error }}</div> }
      @if (loading) { <div class="loading-panel">Loading claims data…</div> }
      @if (isClaimant) {
        <section class="panel">
          <div class="panel-heading"><div><h2>My Policies</h2><p>Your active and previous policies</p></div></div>
          @if (policiesLoading) { <div class="loading-panel">Loading your policies…</div> }
          @if (policiesError) { <div class="alert error">{{ policiesError }}</div> }
          @if (policies.length) {
            <div class="overview-grid">
              @for (policy of policies; track policy.id) {
                <article class="metric-card policy-card">
                  <div class="panel-heading"><div><span class="metric-label">{{ policy.productName }}</span><strong>{{ policy.policyNumber }}</strong></div><button class="policy-status-button" type="button" disabled [class.inactive]="!policy.active">{{ policy.active ? 'Active' : 'Inactive' }}</button></div>
                  <p>{{ titleCase(policy.claimType) }} · {{ policy.market }}</p>
                  @if (policy.insuredItem) { <p>{{ policy.insuredItem }}</p> }
                  <small>Coverage {{ policy.coverageAmount | currency:policy.currency:'symbol':'1.0-0' }} · Valid to {{ policy.effectiveTo | date:'dd MMM yyyy' }}</small>
                </article>
              }
            </div>
          } @else if (!policiesLoading && !policiesError) {
            <div class="empty-note">No policies are linked to your account.</div>
          }
        </section>
        <div class="metric-grid">
          <article class="metric-card"><span class="metric-label">Total claims</span><strong>{{ claims.length }}</strong><small>Submitted by you</small><span class="metric-symbol blue">▤</span></article>
          <article class="metric-card"><span class="metric-label">New claims</span><strong>{{ count('NEW') }}</strong><small>Recently submitted</small><span class="metric-symbol teal">◷</span></article>
          <article class="metric-card"><span class="metric-label">Under assessment</span><strong>{{ count('IN_REVIEW') + count('PENDING_DECISION') }}</strong><small>Being reviewed</small><span class="metric-symbol purple">⌕</span></article>
          <article class="metric-card"><span class="metric-label">Action required</span><strong>{{ count('ADDITIONAL_INFO_REQUIRED') }}</strong><small>Information requested</small><span class="metric-symbol amber">!</span></article>
          <article class="metric-card"><span class="metric-label">Settled</span><strong>{{ count('SETTLED') }}</strong><small>Completed payments</small><span class="metric-symbol green">✓</span></article>
        </div>
        <section class="panel">
          <div class="panel-heading"><div><h2>My recent claims</h2><p>Your latest claim activity</p></div><a class="text-link" routerLink="/claimant/claims">View all claims →</a></div>
          @if (claims.length) {
            <div class="table-wrap"><table><thead><tr><th>CLAIM REFERENCE</th><th>CLAIM TYPE</th><th>INCIDENT DATE</th><th>SUBMITTED</th><th>STATUS</th><th></th></tr></thead><tbody>
              @for (claim of claims.slice(0, 5); track claim.id) { <tr><td><a class="ref-link" [routerLink]="['/claimant/claims', claim.claimReference]">{{ claim.claimReference }}</a></td><td>{{ titleCase(claim.claimType) }}</td><td>{{ claim.incidentDate | date:'dd MMM yyyy' }}</td><td>{{ claim.createdAt | date:'dd MMM yyyy' }}</td><td><span class="status-badge" [class]="statusClass(claim.status)">{{ titleCase(claim.status) }}</span></td><td><a class="row-link" [routerLink]="['/claimant/claims', claim.claimReference]">View →</a></td></tr> }
            </tbody></table></div>
          } @else if (!loading) { <div class="empty-state"><span class="empty-icon">▤</span><h3>No claims yet</h3><p>Your submitted claims will appear here. Start by submitting your first claim.</p><a class="button button-primary" routerLink="/claimant/claims/new">Submit a claim</a></div> }
        </section>
      } @else {
        @if (summary; as data) {
          <div class="metric-grid staff-metrics">
            <article class="metric-card"><span class="metric-label">Total claims</span><strong>{{ data.totalClaims }}</strong><small>Across all markets</small><span class="metric-symbol blue">▤</span></article>
            <article class="metric-card"><span class="metric-label">New claims</span><strong>{{ data.newClaims }}</strong><small>Awaiting review</small><span class="metric-symbol teal">◷</span></article>
            <article class="metric-card"><span class="metric-label">In progress</span><strong>{{ data.inReview + data.additionalInfoRequired }}</strong><small>Under assessment</small><span class="metric-symbol purple">⌕</span></article>
            <article class="metric-card"><span class="metric-label">Pending decisions</span><strong>{{ data.pendingDecision }}</strong><small>Ready for a decision</small><span class="metric-symbol amber">!</span></article>
            <article class="metric-card"><span class="metric-label">Overdue requests</span><strong>{{ data.overdueInfoRequests }}</strong><small>Past due date</small><span class="metric-symbol red">◷</span></article>
            <article class="metric-card"><span class="metric-label">Outstanding exposure</span><strong>{{ data.estimatedOutstandingExposure | number:'1.0-0' }}</strong><small>Currency not included by API</small><span class="metric-symbol green">$</span></article>
          </div>
          <div class="overview-grid">
            <section class="panel">
              <div class="panel-heading"><div><h2>Claims by status</h2><p>Current portfolio distribution</p></div></div>
              <div class="status-bars">@for (item of statusSummary(data); track item.label) { <div class="status-bar-row"><span>{{ item.label }}</span><div class="bar-track"><i [style.width.%]="barWidth(item.value, data.totalClaims)" [class]="item.color"></i></div><b>{{ item.value }}</b></div> }</div>
            </section>
            <section class="panel">
              <div class="panel-heading"><div><h2>Claim mix</h2><p>By type and market</p></div></div>
              <div class="mix-row"><span class="mix-icon motor">M</span><span class="mix-info"><b>Motor</b><small>{{ data.claimsByType['MOTOR'] ?? 0 }} claims</small></span><strong>{{ mixPercent(data.claimsByType['MOTOR'], data.totalClaims) }}%</strong></div>
              <div class="mix-row"><span class="mix-icon property">P</span><span class="mix-info"><b>Property</b><small>{{ data.claimsByType['PROPERTY'] ?? 0 }} claims</small></span><strong>{{ mixPercent(data.claimsByType['PROPERTY'], data.totalClaims) }}%</strong></div>
              <div class="market-tags">@for (market of marketEntries; track market[0]) { <span>{{ market[0] }} <b>{{ market[1] }}</b></span> }</div>
            </section>
          </div>
        }
        <section class="panel">
          <div class="panel-heading"><div><h2>Recent claims</h2><p>Latest activity in the work queue</p></div><a class="text-link" routerLink="/staff/queue">Open work queue →</a></div>
          @if (claims.length) {
            <div class="table-wrap"><table><thead><tr><th>CLAIM REFERENCE</th><th>CLAIMANT</th><th>TYPE</th><th>MARKET</th><th>ESTIMATED LOSS</th><th>STATUS</th><th></th></tr></thead><tbody>
              @for (claim of claims.slice(0, 5); track claim.id) { <tr><td><a class="ref-link" [routerLink]="['/staff/claims', claim.claimReference]">{{ claim.claimReference }}</a></td><td>{{ claim.claimantName }}</td><td>{{ titleCase(claim.claimType) }}</td><td>{{ claim.market }}</td><td>{{ claim.estimatedLoss | currency:claim.currency:'symbol':'1.0-0' }}</td><td><span class="status-badge" [class]="statusClass(claim.status)">{{ titleCase(claim.status) }}</span></td><td><a class="row-link" [routerLink]="['/staff/claims', claim.claimReference]">Open →</a></td></tr> }
            </tbody></table></div>
          } @else if (!loading) { <div class="empty-note">No claims are currently available from the backend.</div> }
        </section>
        @if (user()?.role === 'officer') {
          <section class="panel">
            <div class="panel-heading"><div><h2>My assigned claims</h2><p>Claims assigned to {{ user()?.email }}</p></div><a class="text-link" routerLink="/staff/queue">Open queue →</a></div>
            @if (myAssignedClaims.length) {
              <div class="table-wrap"><table><thead><tr><th>CLAIM REFERENCE</th><th>CLAIMANT</th><th>TYPE</th><th>MARKET</th><th>STATUS</th><th></th></tr></thead><tbody>
                @for (claim of myAssignedClaims.slice(0, 5); track claim.id) { <tr><td><a class="ref-link" [routerLink]="['/staff/claims', claim.claimReference]">{{ claim.claimReference }}</a></td><td>{{ claim.claimantName }}</td><td>{{ titleCase(claim.claimType) }}</td><td>{{ claim.market }}</td><td><span class="status-badge" [class]="statusClass(claim.status)">{{ titleCase(claim.status) }}</span></td><td><a class="row-link" [routerLink]="['/staff/claims', claim.claimReference]">Open →</a></td></tr> }
              </tbody></table></div>
            } @else if (!loading) { <p class="empty-note">No claims are assigned to your demo officer account.</p> }
          </section>
        }
      }
    }
  `,
})
export class DashboardPage implements OnInit {
  private readonly api = inject(ClaimApiService);
  private readonly session = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  private readonly changeDetector = inject(ChangeDetectorRef);
  readonly user = this.session.user;
  claims: Claim[] = [];
  policies: ClaimantPolicy[] = [];
  policiesLoading = false;
  policiesError = '';
  summary: DashboardSummary | null = null;
  loading = false;
  error = '';
  view = '';

  get isClaimant(): boolean { return this.user()?.role === 'claimant'; }
  get isManager(): boolean { return this.user()?.role === 'manager'; }
  get firstName(): string { return this.user()?.name.split(' ')[0] ?? ''; }
  get marketEntries(): [string, number][] { return Object.entries(this.summary?.claimsByMarket ?? {}).sort((a, b) => b[1] - a[1]); }
  get myAssignedClaims(): Claim[] { return this.claims.filter(claim => claim.assignedTo === this.user()?.email); }

  ngOnInit(): void {
    this.view = this.route.snapshot.data['view'] as string ?? '';
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    if (this.isClaimant) {
      this.policiesLoading = true;
      this.policiesError = '';
      this.api.getMyPolicies(this.user()?.email ?? '').subscribe({
        next: policies => {
          this.policies = policies;
          this.policiesLoading = false;
          this.changeDetector.markForCheck();
        },
        error: err => {
          this.policiesError = errorMessage(err);
          this.policiesLoading = false;
          this.changeDetector.markForCheck();
        },
      });
      this.api.getMyClaims(this.user()?.email ?? '').subscribe({
        next: claims => { this.claims = claims; this.loading = false; this.changeDetector.markForCheck(); },
        error: err => { this.error = errorMessage(err); this.loading = false; this.changeDetector.markForCheck(); },
      });
      return;
    }
    this.api.getDashboardSummary().subscribe({
      next: summary => { this.summary = summary; this.loading = false; this.changeDetector.markForCheck(); },
      error: err => { this.error = errorMessage(err); this.loading = false; this.changeDetector.markForCheck(); },
    });
    if (this.view !== 'exposure') {
      this.api.getStaffClaims().subscribe({
        next: claims => { this.claims = claims; this.changeDetector.markForCheck(); },
        error: err => { this.error = errorMessage(err); this.changeDetector.markForCheck(); },
      });
    }
  }

  count(status: ClaimStatus): number { return this.claims.filter(claim => claim.status === status).length; }
  titleCase(value: string): string { return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase()); }
  statusClass(status: ClaimStatus): string { return `status-${status.toLowerCase().replaceAll('_', '-')}`; }
  barWidth(value: number, total: number): number { return total ? Math.max(value / total * 100, value ? 4 : 0) : 0; }
  mixPercent(value: number | undefined, total: number): number { return total ? Math.round((value ?? 0) / total * 100) : 0; }
  marketWidth(value: number): number { return Math.max(value / Math.max(...this.marketEntries.map(entry => entry[1]), 1) * 100, 4); }
  statusSummary(summary: DashboardSummary): { label: string; value: number; color: string }[] {
    return [
      { label: 'New', value: summary.newClaims, color: 'blue-fill' },
      { label: 'In review', value: summary.inReview, color: 'teal-fill' },
      { label: 'Information required', value: summary.additionalInfoRequired, color: 'amber-fill' },
      { label: 'Pending decision', value: summary.pendingDecision, color: 'purple-fill' },
      { label: 'Approved', value: summary.approved, color: 'green-fill' },
      { label: 'Rejected', value: summary.rejected, color: 'red-fill' },
    ];
  }
}
