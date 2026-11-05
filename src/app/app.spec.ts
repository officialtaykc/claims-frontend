import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './app';
import { ClaimApiService } from './core/services/claim-api.service';
import { SessionService } from './core/services/session.service';
import { ClaimTypeSelectionPage } from './features/claims/claim-form.component';
import { ClaimsListPage } from './features/claims/claims-list.component';

describe('Claims frontend', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });
  afterEach(() => {
    localStorage.removeItem('claims-account-user');
    localStorage.removeItem('claims-demo-user');
  });

  it('creates the application shell', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('stores the selected demo role and clears it on logout', () => {
    const session = TestBed.inject(SessionService);
    expect(session.login({ name: 'Claims Officer', email: 'officer.a@chubb.com', role: 'officer' }).email)
      .toBe('officer.a@chubb.com');
    expect(session.user()?.role).toBe('officer');
    session.logout();
    expect(session.user()).toBeNull();
  });

  it('sends the selected account credentials to the backend login endpoint', () => {
    const api = TestBed.inject(ClaimApiService);
    const http = TestBed.inject(HttpTestingController);
    api.login({ role: 'OFFICER', identifier: 'officer.a', password: 'OfficerDemo!26' }).subscribe();
    const request = http.expectOne('http://localhost:8080/api/auth/login');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      role: 'OFFICER',
      identifier: 'officer.a',
      password: 'OfficerDemo!26',
    });
    request.flush({ name: 'Alex Lim', email: 'officer.a@chubb.com', role: 'officer' });
    http.verify();
  });

  it('loads Motor options from its dedicated backend endpoint', () => {
    const api = TestBed.inject(ClaimApiService);
    const http = TestBed.inject(HttpTestingController);
    let received = false;
    api.getMotorClaimOptions().subscribe(options => {
      received = true;
      expect(options.markets).toContain('Singapore');
      expect(options.claimTypes).toContain('MOTOR');
      expect(options.claimCategories).toContain('Own Damage');
    });
    const request = http.expectOne('http://localhost:8080/api/config/motor-claims');
    expect(request.request.method).toBe('GET');
    request.flush({
      claimTypes: ['MOTOR'],
      markets: ['Singapore'],
      currencies: ['SGD'],
      claimCategories: ['Own Damage'],
    });
    expect(received).toBe(true);
    http.verify();
  });

  it('loads Property options from its dedicated backend endpoint', () => {
    const api = TestBed.inject(ClaimApiService);
    const http = TestBed.inject(HttpTestingController);
    api.getPropertyClaimOptions().subscribe(options => {
      expect(options.claimTypes).toContain('PROPERTY');
      expect(options.propertyTypes).toContain('Residential');
      expect(options.causesOfLoss).toContain('Fire');
      expect(options.affectedAreas).toContain('Building');
    });
    const request = http.expectOne('http://localhost:8080/api/config/property-claims');
    expect(request.request.method).toBe('GET');
    request.flush({
      claimTypes: ['PROPERTY'],
      markets: ['Singapore'],
      currencies: ['SGD'],
      propertyTypes: ['Residential'],
      causesOfLoss: ['Fire'],
      affectedAreas: ['Building'],
    });
    http.verify();
  });

  it('updates the claim type chooser after both options load', () => {
    const fixture = TestBed.createComponent(ClaimTypeSelectionPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loading available claim types');

    http.expectOne('http://localhost:8080/api/config/motor-claims').flush({
      claimTypes: ['MOTOR'],
      markets: ['Singapore'],
      currencies: ['SGD'],
      claimCategories: ['Own Damage'],
    });
    http.expectOne('http://localhost:8080/api/config/property-claims').flush({
      claimTypes: ['PROPERTY'],
      markets: ['Singapore'],
      currencies: ['SGD'],
      propertyTypes: ['Residential'],
      causesOfLoss: ['Fire'],
      affectedAreas: ['Building'],
    });

    fixture.detectChanges();
    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(content).toContain('Motor claim');
    expect(content).toContain('Property claim');
    expect(content).not.toContain('Loading available claim types');
    http.verify();
  });

  it('renders claimant claims after the API response arrives', () => {
    const session = TestBed.inject(SessionService);
    session.login({ name: 'John Tan', email: 'john.tan@example.com', role: 'claimant' });
    const fixture = TestBed.createComponent(ClaimsListPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loading claims');
    const request = http.expectOne(
      'http://localhost:8080/api/claims?claimantEmail=john.tan@example.com',
    );
    request.flush([{
      id: 'a7233d27-882e-4316-8de3-6c7a43a87fe2',
      claimReference: 'CLM-20261105-001',
      claimantName: 'John Tan',
      claimantEmail: 'john.tan@example.com',
      claimantPhone: '+3434334',
      market: 'Malaysia',
      claimType: 'MOTOR',
      policyNumber: 'sdfdsfds',
      incidentDate: '2026-11-05',
      incidentLocation: 'malaysia',
      incidentCategory: 'Motor — Accident / collision',
      incidentDescription: 'Accident details',
      assetReference: 'BSDSD',
      estimatedLoss: 5333,
      currency: 'MYR',
      status: 'NEW',
      priority: 'HIGH',
      assignedTo: 'ahmad.hassan',
      decisionAmount: null,
      decisionReason: null,
      decisionDate: null,
      createdAt: '2026-11-05T13:50:07.271507',
      updatedAt: '2026-11-05T13:50:07.271507',
      informationRequests: [],
      documents: [],
    }]);

    fixture.detectChanges();
    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(content).toContain('CLM-20261105-001');
    expect(content).toContain('Malaysia');
    expect(content).not.toContain('Loading claims');
    http.verify();
  });
});
