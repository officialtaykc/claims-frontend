import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './app';
import { ClaimApiService } from './core/services/claim-api.service';
import { SessionService } from './core/services/session.service';
import { ClaimTypeSelectionPage } from './features/claims/claim-form.component';
import { ClaimDetailsPage } from './features/claims/claim-details.component';
import { ClaimFormPage } from './features/claims/claim-form.component';
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

  it('loads policies for the signed-in claimant', () => {
    const api = TestBed.inject(ClaimApiService);
    const http = TestBed.inject(HttpTestingController);
    let received = false;
    api.getMyPolicies('john.tan@example.com').subscribe(policies => {
      received = true;
      expect(policies[0].policyNumber).toBe('MTR-SG-2026-001');
      expect(policies[0].claimantName).toBe('John Tan');
      expect(policies[0].active).toBe(true);
    });
    const request = http.expectOne(
      'http://localhost:8080/api/claimant/policies?claimantEmail=john.tan@example.com',
    );
    expect(request.request.method).toBe('GET');
    request.flush([{
      id: 'a3000000-0000-4000-8000-000000000001',
      policyNumber: 'MTR-SG-2026-001',
      claimType: 'MOTOR',
      productName: 'Comprehensive Motor Protect',
      market: 'Singapore',
      currency: 'SGD',
      insuredItem: 'Toyota Camry',
      coverageAmount: 100000,
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31',
      active: true,
      claimantName: 'John Tan',
      claimantEmail: 'john.tan@example.com',
      claimantPhone: '+65 8123 4567',
    }]);
    expect(received).toBe(true);
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

  it('renders claim details and history after both API responses arrive', () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        paramMap: of(convertToParamMap({ claimReference: 'CLM-20261105-001' })),
        snapshot: { data: {} },
      },
    });
    TestBed.inject(SessionService).login({
      name: 'John Tan',
      email: 'john.tan@example.com',
      role: 'claimant',
    });
    const fixture = TestBed.createComponent(ClaimDetailsPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const contentBeforeResponse = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(contentBeforeResponse).toContain('Loading claim details');

    http.expectOne('http://localhost:8080/api/claims/CLM-20261105-001').flush({
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
    });
    http.expectOne('http://localhost:8080/api/claims/CLM-20261105-001/history').flush([{
      previousStatus: null,
      newStatus: 'NEW',
      changedBy: 'system',
      comment: null,
      changedAt: '2026-11-05T13:50:07.271507',
    }]);

    fixture.detectChanges();
    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(content).toContain('John Tan');
    expect(content).toContain('Claim activity');
    expect(content).not.toContain('Loading claim details');
    http.verify();
  });

  it('lets property claimants select multiple affected areas with checkboxes', () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        snapshot: { data: { claimType: 'PROPERTY' } },
      },
    });
    TestBed.inject(SessionService).login({
      name: 'John Tan', email: 'john.tan@example.com', role: 'claimant',
    });
    const fixture = TestBed.createComponent(ClaimFormPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    http.expectOne('http://localhost:8080/api/config/property-claims').flush({
      claimTypes: ['PROPERTY'],
      markets: ['Malaysia'],
      currencies: ['MYR'],
      propertyTypes: ['Residential'],
      causesOfLoss: ['Fire'],
      affectedAreas: ['Building', 'Contents', 'Roof'],
    });
    fixture.detectChanges();

    http.expectOne(
      'http://localhost:8080/api/claimant/policies?claimantEmail=john.tan@example.com',
    ).flush([{
      id: 'a3000000-0000-4000-8000-000000000002',
      policyNumber: 'PRP-SG-2026-001',
      claimType: 'PROPERTY',
      productName: 'Home Protect Plus',
      market: 'Singapore',
      currency: 'SGD',
      insuredItem: '18 Orchard View, Singapore',
      coverageAmount: 500000,
      effectiveFrom: '2026-01-01',
      effectiveTo: '2026-12-31',
      active: true,
      claimantName: 'John Tan',
      claimantEmail: 'john.tan@example.com',
      claimantPhone: '+65 8123 4567',
    }]);
    fixture.detectChanges();
    const policySelect = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLSelectElement>('select[formControlName="policyNumber"]');
    expect(policySelect).toBeTruthy();
    policySelect!.value = 'PRP-SG-2026-001';
    policySelect!.dispatchEvent(new Event('change'));
    expect(fixture.componentInstance.form.controls.policyNumber.value).toBe('PRP-SG-2026-001');
    expect(fixture.componentInstance.form.controls.claimantName.value).toBe('John Tan');
    expect(fixture.componentInstance.form.controls.claimantEmail.value).toBe('john.tan@example.com');
    expect(fixture.componentInstance.form.controls.claimantPhone.value).toBe('+65 8123 4567');
    expect(fixture.componentInstance.form.controls.market.value).toBe('Singapore');
    expect(fixture.componentInstance.form.controls.currency.value).toBe('SGD');

    const checkboxes = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLInputElement>('.affected-area-option input'),
    );
    expect(checkboxes).toHaveLength(3);
    checkboxes[0].checked = true;
    checkboxes[0].dispatchEvent(new Event('change'));
    checkboxes[1].checked = true;
    checkboxes[1].dispatchEvent(new Event('change'));
    expect(fixture.componentInstance.form.controls.areasAffected.value).toEqual(['Building', 'Contents']);
    http.verify();
  });
});
