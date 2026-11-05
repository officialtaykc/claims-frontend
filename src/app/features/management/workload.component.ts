import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { OfficerWorkload } from '../../core/models/claim';
import { ClaimApiService } from '../../core/services/claim-api.service';
import { errorMessage } from '../../core/utils/error-message';

@Component({
  selector: 'app-workload-page',
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-heading"><div><div class="eyebrow">MANAGEMENT</div><h1>Team workload</h1><p>Claims grouped by assigned officer, as reported by the claims service.</p></div><button class="button button-secondary" type="button" (click)="load()">↻ Refresh</button></div>
    @if (error) { <div class="alert error">{{ error }}</div> }
    @if (loading) { <div class="loading-panel">Loading team workload…</div> }
    <section class="panel">
      <div class="panel-heading"><div><h2>Workload by claims officer</h2><p>{{ officers.length }} officers with assigned claims</p></div><a class="text-link" routerLink="/staff/queue">View queue →</a></div>
      @if (officers.length) {
        <div class="table-wrap"><table><thead><tr><th>CLAIMS OFFICER</th><th>TOTAL ASSIGNED</th><th>NEW</th><th>IN REVIEW</th><th>INFO REQUIRED</th><th>PENDING DECISION</th><th>APPROVED</th><th>REJECTED</th><th>SETTLED</th></tr></thead><tbody>
          @for (officer of officers; track officer.officerName) { <tr><td><span class="officer-cell"><span class="avatar small">{{ officer.officerName.slice(0, 1) }}</span><b>{{ officer.officerName }}</b></span></td><td><b>{{ officer.totalClaims }}</b></td><td>{{ officer.newClaims }}</td><td>{{ officer.inReview }}</td><td>{{ officer.additionalInfoRequired }}</td><td>{{ officer.pendingDecision }}</td><td>{{ officer.approved }}</td><td>{{ officer.rejected }}</td><td>{{ officer.settled }}</td></tr> }
        </tbody></table></div>
      } @else if (!loading) { <div class="empty-state"><span class="empty-icon">◫</span><h3>No workload data yet</h3><p>Assigned claims will appear here after claims are allocated to officers.</p><a class="button button-primary" routerLink="/staff/queue">Open claims queue</a></div> }
    </section>
    <p class="data-note">This view reports the backend workload endpoint. It does not estimate overdue counts because the API does not provide per-officer overdue figures.</p>
  `,
})
export class WorkloadPage implements OnInit {
  private readonly api = inject(ClaimApiService);
  private readonly changeDetector = inject(ChangeDetectorRef);
  officers: OfficerWorkload[] = [];
  loading = false;
  error = '';

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error = '';
    this.api.getWorkload().subscribe({
      next: result => { this.officers = result.officers; this.loading = false; this.changeDetector.markForCheck(); },
      error: error => { this.error = errorMessage(error); this.loading = false; this.changeDetector.markForCheck(); },
    });
  }
}
