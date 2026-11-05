import { Routes } from '@angular/router';
import { authGuard } from './core/services/auth.guard';
import { ClaimDetailsPage } from './features/claims/claim-details.component';
import { ClaimFormPage, ClaimTypeSelectionPage } from './features/claims/claim-form.component';
import { ClaimsListPage } from './features/claims/claims-list.component';
import { DashboardPage } from './features/dashboard/dashboard.component';
import { LoginPage } from './features/login/login.component';
import { RegisterPage } from './features/login/register.component';
import { WorkloadPage } from './features/management/workload.component';

export const routes: Routes = [
  { path: 'login', component: LoginPage },
  { path: 'register', component: RegisterPage },
  { path: 'claimant/dashboard', component: DashboardPage, canActivate: [authGuard], data: { roles: ['claimant'] } },
  { path: 'claimant/claims/new', component: ClaimTypeSelectionPage, canActivate: [authGuard], data: { roles: ['claimant'] } },
  { path: 'claimant/claims/new/motor', component: ClaimFormPage, canActivate: [authGuard], data: { roles: ['claimant'], claimType: 'MOTOR' } },
  { path: 'claimant/claims/new/property', component: ClaimFormPage, canActivate: [authGuard], data: { roles: ['claimant'], claimType: 'PROPERTY' } },
  { path: 'claimant/claims', component: ClaimsListPage, canActivate: [authGuard], data: { roles: ['claimant'] } },
  { path: 'claimant/claims/:claimReference', component: ClaimDetailsPage, canActivate: [authGuard], data: { roles: ['claimant'] } },
  { path: 'claimant/requests', component: ClaimsListPage, canActivate: [authGuard], data: { roles: ['claimant'], view: 'requests' } },
  { path: 'claimant/messages', component: ClaimsListPage, canActivate: [authGuard], data: { roles: ['claimant'], view: 'messages' } },
  { path: 'staff/dashboard', component: DashboardPage, canActivate: [authGuard], data: { roles: ['officer', 'manager'] } },
  { path: 'staff/queue', component: ClaimsListPage, canActivate: [authGuard], data: { roles: ['officer', 'manager'] } },
  { path: 'staff/claims/:claimReference', component: ClaimDetailsPage, canActivate: [authGuard], data: { roles: ['officer', 'manager'] } },
  { path: 'management/dashboard', component: DashboardPage, canActivate: [authGuard], data: { roles: ['manager'] } },
  { path: 'management/workload', component: WorkloadPage, canActivate: [authGuard], data: { roles: ['manager'] } },
  { path: 'management/exposure', component: DashboardPage, canActivate: [authGuard], data: { roles: ['manager'], view: 'exposure' } },
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  { path: '**', redirectTo: 'login' },
];
