import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './app';
import { ClaimApiService } from './core/services/claim-api.service';
import { SessionService } from './core/services/session.service';
import { ClaimTypeSelectionPage } from './features/claims/claim-form.component';
import { ClaimDetailsPage } from './features/claims/claim-details.component';
import { ClaimFormPage } from './features/claims/claim-form.component';
import { ClaimsListPage } from './features/claims/claims-list.component';
import { LoginPage } from './features/login/login.component';

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

  it('sends information requests and attached files as one multipart request', () => {
    const api = TestBed.inject(ClaimApiService);
    const http = TestBed.inject(HttpTestingController);
    const file = new File(['evidence'], 'evidence.pdf', { type: 'application/pdf' });
    api.createInformationRequest(
      'CLM-20261105-001', 'Please provide the receipt', 'officer.a@chubb.com',
      '2026-11-12', [file],
    ).subscribe();

    const request = http.expectOne(
      'http://localhost:8080/api/staff/claims/CLM-20261105-001/information-requests',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toBeInstanceOf(FormData);
    const body = request.request.body as FormData;
    expect(JSON.parse(body.get('request') as string)).toEqual({
      requestMessage: 'Please provide the receipt',
      requestedBy: 'officer.a@chubb.com',
      dueDate: '2026-11-12',
    });
    expect((body.get('files') as File).name).toBe('evidence.pdf');
    request.flush({ id: 'request-1' });
    http.verify();
  });

  it('loads active claims officers from the backend', () => {
    const api = TestBed.inject(ClaimApiService);
    const http = TestBed.inject(HttpTestingController);
    let officers: { username: string; name: string; email: string }[] = [];
    api.getActiveOfficers().subscribe(result => { officers = result; });
    const request = http.expectOne('http://localhost:8080/api/staff/officers');
    expect(request.request.method).toBe('GET');
    request.flush([{ username: 'officer.a', name: 'Alex Lim', email: 'officer.a@chubb.com' }]);
    expect(officers).toEqual([{ username: 'officer.a', name: 'Alex Lim', email: 'officer.a@chubb.com' }]);
    http.verify();
  });

  it('shows both officer demo accounts in the login credentials panel', () => {
    const fixture = TestBed.createComponent(LoginPage);
    fixture.detectChanges();

    const officerTab = [...(fixture.nativeElement as HTMLElement).querySelectorAll('[role="tab"]')]
      .find(button => button.textContent?.trim() === 'Officer');
    expect(officerTab).toBeTruthy();
    officerTab?.dispatchEvent(new Event('click'));
    fixture.detectChanges();

    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(content).toContain('officer.a');
    expect(content).toContain('officer.b');
    expect(content).toContain('OfficerDemo!26');
    fixture.destroy();
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

  it('lets claimants respond to open information requests with text and files', () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: { snapshot: { data: { view: 'requests' } } },
    });
    TestBed.inject(SessionService).login({
      name: 'John Tan', email: 'john.tan@example.com', role: 'claimant',
    });
    const fixture = TestBed.createComponent(ClaimsListPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const claimResponse = {
      id: 'claim-id',
      claimReference: 'CLM-20261105-001',
      claimantName: 'John Tan',
      claimantEmail: 'john.tan@example.com',
      market: 'Malaysia',
      claimType: 'MOTOR',
      policyNumber: 'POL-123',
      incidentDate: '2026-11-05',
      incidentDescription: 'Accident details',
      estimatedLoss: 500,
      currency: 'MYR',
      status: 'ADDITIONAL_INFO_REQUIRED',
      priority: 'NORMAL',
      createdAt: '2026-11-05T13:50:07.271507',
      updatedAt: '2026-11-05T13:50:07.271507',
      informationRequests: [{
        id: 'request-1',
        requestMessage: 'Please provide the receipt',
        requestedBy: 'officer.a@chubb.com',
        dueDate: '2026-11-12',
        requestStatus: 'OPEN',
        requestedAt: '2026-11-05T13:50:07.271507',
      }],
      documents: [],
    };
    http.expectOne('http://localhost:8080/api/claims?claimantEmail=john.tan@example.com')
      .flush([claimResponse]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.request-response textarea')).not.toBeNull();
    expect(element.textContent).toContain('Attach supporting documents');
    const textarea = element.querySelector<HTMLTextAreaElement>('.request-response textarea')!;
    textarea.value = 'I have attached the receipt.';
    textarea.dispatchEvent(new Event('input'));
    const file = new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' });
    const fileInput = element.querySelector<HTMLInputElement>('input[type="file"]')!;
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fileInput.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    element.querySelector<HTMLButtonElement>('.request-foot button')!.click();

    const responseRequest = http.expectOne(
      'http://localhost:8080/api/claims/CLM-20261105-001/information-requests/request-1/response',
    );
    expect(responseRequest.request.method).toBe('POST');
    const body = responseRequest.request.body as FormData;
    expect(JSON.parse(body.get('request') as string)).toEqual({
      responseMessage: 'I have attached the receipt.',
    });
    expect((body.get('files') as File).name).toBe('receipt.pdf');
    responseRequest.flush({ requestStatus: 'RESPONDED' });

    http.expectOne('http://localhost:8080/api/claims?claimantEmail=john.tan@example.com')
      .flush([{
        ...claimResponse,
        status: 'IN_REVIEW',
        informationRequests: [{
          ...claimResponse.informationRequests[0],
          requestStatus: 'RESPONDED',
          responseMessage: 'I have attached the receipt.',
          respondedAt: '2026-11-05T14:00:00',
        }],
      }]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Your response: I have attached the receipt.');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Responded');
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

  it('locks officer actions while the claim awaits claimant information', () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        paramMap: of(convertToParamMap({ claimReference: 'CLM-20261105-001' })),
        snapshot: { data: {} },
      },
    });
    TestBed.inject(SessionService).login({
      name: 'Alex Lim', email: 'officer.a@chubb.com', role: 'officer',
    });
    const fixture = TestBed.createComponent(ClaimDetailsPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne('http://localhost:8080/api/staff/claims/CLM-20261105-001').flush({
      id: 'a7233d27-882e-4316-8de3-6c7a43a87fe2',
      claimReference: 'CLM-20261105-001',
      claimantName: 'John Tan',
      claimantEmail: 'john.tan@example.com',
      market: 'Singapore',
      claimType: 'MOTOR',
      policyNumber: 'MTR-SG-2026-001',
      incidentDate: '2026-11-05',
      incidentDescription: 'Accident details',
      estimatedLoss: 500,
      currency: 'SGD',
      status: 'ADDITIONAL_INFO_REQUIRED',
      priority: 'NORMAL',
      assignedTo: 'officer.a@chubb.com',
      createdAt: '2026-11-05T13:50:07.271507',
      updatedAt: '2026-11-05T13:50:07.271507',
      informationRequests: [{
        id: 'request-1',
        requestMessage: 'Please provide the receipt',
        requestedBy: 'officer.a@chubb.com',
        dueDate: '2026-11-12',
        requestStatus: 'OPEN',
        requestedAt: '2026-11-05T13:50:07.271507',
      }],
      documents: [],
    });
    http.expectOne('http://localhost:8080/api/claims/CLM-20261105-001/history').flush([]);
    http.expectOne('http://localhost:8080/api/staff/officers').flush([
      { username: 'officer.a', name: 'Alex Lim', email: 'officer.a@chubb.com' },
    ]);

    fixture.detectChanges();
    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(content).toContain('Awaiting claimant response');
    expect(content).not.toContain('Claim assignment');
    expect(content).not.toContain('Assign claim');
    expect(content).not.toContain('Reassign claim');
    expect(content).not.toContain('Save assignment');
    expect(content).not.toContain('Update status');
    expect(content).not.toContain('Request information');
    fixture.destroy();
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

  it('approves the outcome and amount selected in the officer recommendation', () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        paramMap: of(convertToParamMap({ claimReference: 'CLM-20261105-001' })),
        snapshot: { data: {} },
      },
    });
    TestBed.inject(SessionService).login({
      name: 'Michelle Wong',
      email: 'manager@chubb.com',
      role: 'manager',
    });
    const fixture = TestBed.createComponent(ClaimDetailsPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    const claim = {
      id: 'claim-id',
      claimReference: 'CLM-20261105-001',
      claimantName: 'John Tan',
      claimantEmail: 'john.tan@example.com',
      market: 'Malaysia',
      claimType: 'MOTOR',
      policyNumber: 'POL-123',
      incidentDate: '2026-11-05',
      incidentDescription: 'Accident details',
      estimatedLoss: 5333,
      currency: 'MYR',
      status: 'PENDING_DECISION',
      priority: 'HIGH',
      recommendationOutcome: 'PARTIALLY_APPROVED',
      recommendationAmount: 1250.5,
      recommendationReason: 'Repair costs are partially covered.',
      recommendationBy: 'officer.a@chubb.com',
      recommendationDate: '2026-11-05T14:00:00',
      createdAt: '2026-11-05T13:50:07.271507',
      updatedAt: '2026-11-05T13:50:07.271507',
      informationRequests: [],
      documents: [],
    };
    http.expectOne('http://localhost:8080/api/staff/claims/CLM-20261105-001').flush(claim);
    http.expectOne('http://localhost:8080/api/claims/CLM-20261105-001/history').flush([]);
    http.expectOne('http://localhost:8080/api/staff/officers').flush([]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Approve recommendation');
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fixture.componentInstance.approveRecommendation();

    const request = http.expectOne('http://localhost:8080/api/staff/claims/CLM-20261105-001/decision');
    expect(request.request.method).toBe('POST');
    expect(request.request.body.outcome).toBe('PARTIALLY_APPROVED');
    expect(request.request.body.decisionAmount).toBe(1250.5);
    expect(request.request.body.decidedBy).toBe('manager@chubb.com');
    request.flush({});
    http.expectOne('http://localhost:8080/api/staff/claims/CLM-20261105-001').flush({
      ...claim,
      status: 'APPROVED',
    });
    http.expectOne('http://localhost:8080/api/claims/CLM-20261105-001/history').flush([]);
    http.expectOne('http://localhost:8080/api/staff/officers').flush([]);
    http.verify();
  });

  it('submits an officer recommendation for manager review', () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        paramMap: of(convertToParamMap({ claimReference: 'CLM-20261105-001' })),
        snapshot: { data: {} },
      },
    });
    TestBed.inject(SessionService).login({
      name: 'Alex Lim', email: 'officer.a@chubb.com', role: 'officer',
    });
    const fixture = TestBed.createComponent(ClaimDetailsPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    const claim = {
      id: 'claim-id',
      claimReference: 'CLM-20261105-001',
      claimantName: 'John Tan',
      claimantEmail: 'john.tan@example.com',
      market: 'Malaysia',
      claimType: 'MOTOR',
      policyNumber: 'POL-123',
      incidentDate: '2026-11-05',
      incidentDescription: 'Accident details',
      estimatedLoss: 5333,
      currency: 'MYR',
      status: 'IN_REVIEW',
      priority: 'HIGH',
      assignedTo: 'officer.a@chubb.com',
      createdAt: '2026-11-05T13:50:07.271507',
      updatedAt: '2026-11-05T13:50:07.271507',
      informationRequests: [],
      documents: [],
    };
    http.expectOne('http://localhost:8080/api/staff/claims/CLM-20261105-001').flush(claim);
    http.expectOne('http://localhost:8080/api/claims/CLM-20261105-001/history').flush([]);
    http.expectOne('http://localhost:8080/api/staff/officers').flush([]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Officer recommendation');
    expect(element.textContent).not.toContain('Manager review');
    fixture.componentInstance.recommendationForm.setValue({
      outcome: 'PARTIALLY_APPROVED',
      amount: '1250.50',
      reason: 'Repair costs are partially covered.',
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fixture.componentInstance.submitForDecision();

    const submission = http.expectOne(
      'http://localhost:8080/api/staff/claims/CLM-20261105-001/submit-for-decision',
    );
    expect(submission.request.method).toBe('POST');
    expect(submission.request.body).toEqual({
      submittedBy: 'officer.a@chubb.com',
      recommendationOutcome: 'PARTIALLY_APPROVED',
      recommendationReason: 'Repair costs are partially covered.',
      recommendationAmount: 1250.5,
    });
    submission.flush({ ...claim, status: 'PENDING_DECISION' });
    http.expectOne('http://localhost:8080/api/staff/claims/CLM-20261105-001').flush({
      ...claim,
      status: 'PENDING_DECISION',
      recommendationOutcome: 'PARTIALLY_APPROVED',
      recommendationAmount: 1250.5,
      recommendationReason: 'Repair costs are partially covered.',
    });
    http.expectOne('http://localhost:8080/api/claims/CLM-20261105-001/history').flush([]);
    http.expectOne('http://localhost:8080/api/staff/officers').flush([]);
    http.verify();
  });

  it('shows the officer recommendation to the manager without an outcome selector', () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        paramMap: of(convertToParamMap({ claimReference: 'CLM-20261105-001' })),
        snapshot: { data: {} },
      },
    });
    TestBed.inject(SessionService).login({
      name: 'Michelle Wong', email: 'manager@chubb.com', role: 'manager',
    });
    const fixture = TestBed.createComponent(ClaimDetailsPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne('http://localhost:8080/api/staff/claims/CLM-20261105-001').flush({
      id: 'claim-id',
      claimReference: 'CLM-20261105-001',
      claimantName: 'John Tan',
      claimantEmail: 'john.tan@example.com',
      market: 'Malaysia',
      claimType: 'MOTOR',
      policyNumber: 'POL-123',
      incidentDate: '2026-11-05',
      incidentDescription: 'Accident details',
      estimatedLoss: 5333,
      currency: 'MYR',
      status: 'PENDING_DECISION',
      priority: 'HIGH',
      assignedTo: 'officer.a@chubb.com',
      recommendationOutcome: 'PARTIALLY_APPROVED',
      recommendationAmount: 1250.5,
      recommendationReason: 'Repair costs are partially covered.',
      recommendationBy: 'officer.a@chubb.com',
      recommendationDate: '2026-11-05T14:00:00',
      createdAt: '2026-11-05T13:50:07.271507',
      updatedAt: '2026-11-05T14:00:00',
      informationRequests: [],
      documents: [],
    });
    http.expectOne('http://localhost:8080/api/claims/CLM-20261105-001/history').flush([]);
    http.expectOne('http://localhost:8080/api/staff/officers').flush([]);
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('OFFICER RECOMMENDATION');
    expect(element.textContent).toContain('Reject recommendation');
    expect(element.textContent).toContain('Approve recommendation');
    expect(element.querySelector('select[formControlName="outcome"]')).toBeNull();
    http.verify();
  });

  it('returns a rejected recommendation to the officer with a manager reason', () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        paramMap: of(convertToParamMap({})),
        snapshot: { data: {} },
      },
    });
    TestBed.inject(SessionService).login({
      name: 'Michelle Wong', email: 'manager@chubb.com', role: 'manager',
    });
    const fixture = TestBed.createComponent(ClaimDetailsPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.componentInstance.reference = 'CLM-20261105-001';
    fixture.componentInstance.claim = {
      id: 'claim-id',
      claimReference: 'CLM-20261105-001',
      claimantName: 'John Tan',
      claimantEmail: 'john.tan@example.com',
      market: 'Malaysia',
      claimType: 'MOTOR',
      policyNumber: 'POL-123',
      incidentDate: '2026-11-05',
      incidentDescription: 'Accident details',
      estimatedLoss: 5333,
      currency: 'MYR',
      status: 'PENDING_DECISION',
      priority: 'HIGH',
      recommendationOutcome: 'APPROVED',
      recommendationAmount: 1250.5,
      recommendationReason: 'Covered under policy.',
      createdAt: '2026-11-05T13:50:07.271507',
      updatedAt: '2026-11-05T14:00:00',
      informationRequests: [],
      documents: [],
    };
    fixture.componentInstance.managerComment = 'Please include the missing repair estimate.';
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    fixture.componentInstance.rejectRecommendation();

    const request = http.expectOne(
      'http://localhost:8080/api/staff/claims/CLM-20261105-001/reject-recommendation',
    );
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      rejectedBy: 'manager@chubb.com',
      reason: 'Please include the missing repair estimate.',
    });
    request.flush({ status: 'IN_REVIEW' });
    http.expectOne('http://localhost:8080/api/staff/claims/CLM-20261105-001').flush({
      ...fixture.componentInstance.claim,
      status: 'IN_REVIEW',
    });
    http.expectOne('http://localhost:8080/api/claims/CLM-20261105-001/history').flush([]);
    http.expectOne('http://localhost:8080/api/staff/officers').flush([]);
    http.verify();
  });

  it('opens the reassignment dialog with active officers and assigns the selected officer', () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        paramMap: of(convertToParamMap({ claimReference: 'CLM-20261105-001' })),
        snapshot: { data: {} },
      },
    });
    TestBed.inject(SessionService).login({
      name: 'Alex Lim',
      email: 'officer.a@chubb.com',
      role: 'officer',
    });
    const fixture = TestBed.createComponent(ClaimDetailsPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    const claim = {
      id: 'claim-id',
      claimReference: 'CLM-20261105-001',
      claimantName: 'John Tan',
      claimantEmail: 'john.tan@example.com',
      market: 'Malaysia',
      claimType: 'MOTOR',
      policyNumber: 'POL-123',
      incidentDate: '2026-11-05',
      incidentDescription: 'Accident details',
      estimatedLoss: 5333,
      currency: 'MYR',
      status: 'NEW',
      priority: 'HIGH',
      assignedTo: 'officer.a@chubb.com',
      createdAt: '2026-11-05T13:50:07.271507',
      updatedAt: '2026-11-05T13:50:07.271507',
      informationRequests: [],
      documents: [],
    };
    http.expectOne('http://localhost:8080/api/staff/claims/CLM-20261105-001').flush(claim);
    http.expectOne('http://localhost:8080/api/claims/CLM-20261105-001/history').flush([]);
    http.expectOne('http://localhost:8080/api/staff/officers').flush([
      { username: 'officer.a', name: 'Alex Lim', email: 'officer.a@chubb.com' },
      { username: 'officer.b', name: 'Sam Lee', email: 'officer.b@chubb.com' },
    ]);
    fixture.detectChanges();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Alex Lim');
    const reassignButton = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find(button => button.textContent?.includes('Reassign claim'));
    reassignButton!.click();
    fixture.detectChanges();
    http.expectOne('http://localhost:8080/api/staff/officers').flush([
      { username: 'officer.a', name: 'Alex Lim', email: 'officer.a@chubb.com' },
      { username: 'officer.b', name: 'Sam Lee', email: 'officer.b@chubb.com' },
    ]);
    fixture.detectChanges();

    const select = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>('#officer-select')!;
    expect(Array.from(select.options).some(option => option.value === 'officer.b@chubb.com')).toBe(true);
    select.value = 'officer.b@chubb.com';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find(button => button.textContent?.includes('Confirm reassignment'))!.click();

    const assignment = http.expectOne('http://localhost:8080/api/staff/claims/CLM-20261105-001/assign');
    expect(assignment.request.method).toBe('PATCH');
    expect(assignment.request.body).toEqual({ assignedTo: 'officer.b@chubb.com' });
    assignment.flush(claim);
    http.expectOne('http://localhost:8080/api/staff/claims/CLM-20261105-001').flush({
      ...claim,
      assignedTo: 'officer.b@chubb.com',
    });
    http.expectOne('http://localhost:8080/api/claims/CLM-20261105-001/history').flush([]);
    http.expectOne('http://localhost:8080/api/staff/officers').flush([
      { username: 'officer.a', name: 'Alex Lim', email: 'officer.a@chubb.com' },
      { username: 'officer.b', name: 'Sam Lee', email: 'officer.b@chubb.com' },
    ]);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Sam Lee');
    http.verify();
  });

  it('hides reassignment after a claim decision and throughout settlement', () => {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        paramMap: of(convertToParamMap({})),
        snapshot: { data: {} },
      },
    });
    TestBed.inject(SessionService).login({
      name: 'Michelle Wong',
      email: 'manager@chubb.com',
      role: 'manager',
    });
    const fixture = TestBed.createComponent(ClaimDetailsPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.componentInstance.claim = {
      id: 'claim-id',
      claimReference: 'CLM-20261105-001',
      claimantName: 'John Tan',
      claimantEmail: 'john.tan@example.com',
      market: 'Malaysia',
      claimType: 'MOTOR',
      policyNumber: 'POL-123',
      incidentDate: '2026-11-05',
      incidentDescription: 'Accident details',
      estimatedLoss: 5333,
      currency: 'MYR',
      status: 'IN_REVIEW',
      priority: 'HIGH',
      assignedTo: 'officer.a@chubb.com',
      createdAt: '2026-11-05T13:50:07.271507',
      updatedAt: '2026-11-05T13:50:07.271507',
      informationRequests: [],
      documents: [],
    };
    fixture.detectChanges();

    const assignmentPanel = (): HTMLElement | null =>
      (fixture.nativeElement as HTMLElement).querySelector('[data-testid="claim-assignment"]');
    expect(assignmentPanel()).not.toBeNull();

    for (const status of ['APPROVED', 'PARTIALLY_APPROVED', 'REJECTED', 'SETTLEMENT_PENDING', 'SETTLED'] as const) {
      fixture.componentInstance.reference = 'CLM-20261105-001';
      fixture.componentInstance.load();
      http.expectOne('http://localhost:8080/api/staff/claims/CLM-20261105-001').flush({
        ...fixture.componentInstance.claim,
        status,
      });
      http.expectOne('http://localhost:8080/api/claims/CLM-20261105-001/history').flush([]);
      http.expectOne('http://localhost:8080/api/staff/officers').flush([]);
      fixture.detectChanges();
      expect(assignmentPanel(), `assignment panel should be hidden for ${status}`).toBeNull();
    }
    fixture.destroy();
    http.verify();
  });
});
