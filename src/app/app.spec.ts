import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { App } from './app';
import { ClaimApiService } from './core/services/claim-api.service';
import { SessionService } from './core/services/session.service';
import { ClaimTypeSelectionPage } from './features/claims/claim-form.component';

describe('Claims frontend', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
  });
  afterEach(() => localStorage.removeItem('claims-demo-user'));

  it('creates the application shell', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('stores the selected demo role and clears it on logout', () => {
    const session = TestBed.inject(SessionService);
    expect(session.login('officer').email).toBe('officer.a@chubb.com');
    expect(session.user()?.role).toBe('officer');
    session.logout();
    expect(session.user()).toBeNull();
  });

  it('loads claim form options from the backend config endpoint', () => {
    const api = TestBed.inject(ClaimApiService);
    const http = TestBed.inject(HttpTestingController);
    let received = false;
    api.getClaimFormOptions().subscribe(options => {
      received = true;
      expect(options.markets).toContain('Singapore');
      expect(options.motorClaimCategories).toContain('Own Damage');
    });
    const request = http.expectOne('http://localhost:8080/api/config/claim-form-options');
    expect(request.request.method).toBe('GET');
    request.flush({
      claimTypes: ['MOTOR', 'PROPERTY'],
      markets: ['Singapore'],
      currencies: ['SGD'],
      motorClaimCategories: ['Own Damage'],
      propertyTypes: ['Residential'],
      propertyCausesOfLoss: ['Fire'],
      propertyAffectedAreas: ['Building'],
    });
    expect(received).toBe(true);
    http.verify();
  });

  it('updates the claim type chooser after options load', () => {
    const fixture = TestBed.createComponent(ClaimTypeSelectionPage);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Loading available claim types');

    http.expectOne('http://localhost:8080/api/config/claim-form-options').flush({
      claimTypes: ['MOTOR', 'PROPERTY'],
      markets: ['Singapore'],
      currencies: ['SGD'],
      motorClaimCategories: ['Own Damage'],
      propertyTypes: ['Residential'],
      propertyCausesOfLoss: ['Fire'],
      propertyAffectedAreas: ['Building'],
    });

    fixture.detectChanges();
    const content = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(content).toContain('Motor claim');
    expect(content).toContain('Property claim');
    expect(content).not.toContain('Loading available claim types');
    http.verify();
  });
});
