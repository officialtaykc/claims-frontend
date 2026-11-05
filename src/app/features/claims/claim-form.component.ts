import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin, map, Observable } from 'rxjs';
import { ClaimFormOptions, ClaimSubmissionResponse, ClaimType } from '../../core/models/claim';
import { ClaimApiService } from '../../core/services/claim-api.service';
import { SessionService } from '../../core/services/session.service';
import { errorMessage } from '../../core/utils/error-message';

@Component({
  selector: 'app-claim-type-selection',
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-heading"><div><div class="eyebrow">CLAIMANT PORTAL</div><h1>What would you like to claim?</h1><p>Choose the claim type to open its dedicated form.</p></div></div>
    @if (error()) { <div class="alert error"><span>{{ error() }}</span><button type="button" (click)="load()">Try again</button></div> }
    @if (loading()) { <div class="panel loading-panel">Loading available claim types…</div> }
    @if (!loading() && options(); as config) {
      @if (supportedTypes.length) {
        <div class="claim-type-grid">
          @for (type of supportedTypes; track type) {
            <a class="claim-type-card" [routerLink]="['/claimant/claims/new', type.toLowerCase()]">
              <span class="claim-type-icon" [class.motor]="type === 'MOTOR'" [class.property]="type === 'PROPERTY'">{{ type === 'MOTOR' ? 'M' : 'P' }}</span>
              <span class="claim-type-copy"><b>{{ titleCase(type) }} claim</b><small>{{ type === 'MOTOR' ? 'Accident or damage involving a vehicle' : 'Damage or loss affecting a property' }}</small></span><span class="claim-type-arrow">→</span>
            </a>
          }
        </div>
      } @else {
        <div class="panel empty-state"><h3>No supported claim types are configured</h3><p>Configure MOTOR or PROPERTY in the backend claim form options and restart the service.</p></div>
      }
    }
    <a class="back-link" routerLink="/claimant/dashboard">← Back to dashboard</a>
  `,
})
export class ClaimTypeSelectionPage implements OnInit {
  private readonly api = inject(ClaimApiService);
  readonly options = signal<ClaimType[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  get supportedTypes(): ClaimType[] {
    return this.options();
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading.set(true);
    this.error.set('');
    forkJoin({
      motor: this.api.getMotorClaimOptions(),
      property: this.api.getPropertyClaimOptions(),
    }).subscribe({
      next: options => {
        const supportedTypes: ClaimType[] = [];
        if (options.motor.claimTypes.includes('MOTOR')) supportedTypes.push('MOTOR');
        if (options.property.claimTypes.includes('PROPERTY')) supportedTypes.push('PROPERTY');
        this.options.set(supportedTypes);
        this.loading.set(false);
      },
      error: error => { this.error.set(errorMessage(error)); this.loading.set(false); },
    });
  }

  titleCase(value: string): string { return value.charAt(0) + value.slice(1).toLowerCase(); }
}

@Component({
  selector: 'app-claim-form-page',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    @if (receipt(); as submitted) {
      <div class="page-heading"><div><div class="eyebrow">CLAIM SUBMITTED</div><h1>Your claim is being registered</h1><p>Your submission has been accepted and is being processed by our claims service.</p></div></div>
      <section class="panel receipt-card">
        <div class="receipt-icon">✓</div><div class="eyebrow">HTTP 202 · ACCEPTED</div><h2>Thank you, {{ form.controls.claimantName.value }}</h2>
        <p>We received your {{ claimType.toLowerCase() }} claim. It may take a short time to appear in My Claims while it is registered.</p>
        <div class="receipt-reference"><span>CLAIM REFERENCE</span><strong>{{ submitted.claimReference }}</strong></div>
        <div class="receipt-reference"><span>STATUS</span><span class="status-badge status-new">{{ titleCase(submitted.status) }}</span></div>
        <div class="receipt-note">{{ submitted.message || 'Your claim has been accepted for registration.' }} You can refresh My Claims shortly to check for updates.</div>
        <a class="button button-primary" routerLink="/claimant/claims">Go to My Claims →</a>
      </section>
    } @else {
      <div class="page-heading">
        <div><a class="back-link" routerLink="/claimant/claims/new">← Choose claim type</a><div class="eyebrow">{{ claimType }} CLAIM</div><h1>Incident details</h1><p>Complete the {{ claimType.toLowerCase() }} claim form below.</p></div>
      </div>
        @if (optionsLoading()) { <div class="panel loading-panel">Loading form options…</div> }
        @if (optionsError()) { <div class="alert error"><span>{{ optionsError() }}</span><button type="button" (click)="loadOptions()">Try again</button></div> }
        @if (error()) { <div class="alert error">{{ error() }}</div> }
        @if (!optionsLoading() && !optionsError() && options(); as config) {
      <form class="panel claim-form sample-claim-form" [formGroup]="form" (ngSubmit)="submit()">
          <p class="required-legend"><span>*</span> Required fields</p>
          @if (claimType === 'MOTOR') {
          <div class="form-section-title"><h2>Motor claim — incident details</h2><p>Vehicle, driver and accident information</p></div>
          <div class="form-grid">
            <label class="required-field">Type of motor claim <select formControlName="incidentCategory" [class.invalid-field]="showError('incidentCategory')"><option value="">Select claim category</option>@for (category of config.claimCategories; track category) { <option [value]="category">{{ category }}</option> }</select>@if (showError('incidentCategory')) { <small class="validation-message">{{ fieldError('incidentCategory') }}</small> }</label>
            <label class="required-field">Vehicle registration <input formControlName="vehicleRegistration" placeholder="e.g. ABC 1234" [class.invalid-field]="showError('vehicleRegistration')">@if (showError('vehicleRegistration')) { <small class="validation-message">{{ fieldError('vehicleRegistration') }}</small> }</label>
            <label class="required-field">Vehicle model <input formControlName="vehicleModel" placeholder="e.g. Toyota Camry" [class.invalid-field]="showError('vehicleModel')">@if (showError('vehicleModel')) { <small class="validation-message">{{ fieldError('vehicleModel') }}</small> }</label>
            <label class="required-field">Driver name <input formControlName="driverName" placeholder="Driver name" [class.invalid-field]="showError('driverName')">@if (showError('driverName')) { <small class="validation-message">{{ fieldError('driverName') }}</small> }</label>
            <label>Driving licence <input formControlName="drivingLicence" placeholder="Licence number"></label>
          </div>
          <div class="form-section-title section-spaced"><h2>Accident information</h2></div>
          <div class="form-grid">
            <label class="required-field">Accident date <input formControlName="incidentDate" type="date" [class.invalid-field]="showError('incidentDate')">@if (showError('incidentDate')) { <small class="validation-message">{{ fieldError('incidentDate') }}</small> }</label>
            <label>Accident time <input formControlName="accidentTime" type="time"></label>
            <label class="span-two required-field">Accident location <input formControlName="incidentLocation" placeholder="Enter accident location" [class.invalid-field]="showError('incidentLocation')">@if (showError('incidentLocation')) { <small class="validation-message">{{ fieldError('incidentLocation') }}</small> }</label>
            <label class="span-two required-field">Accident description <textarea formControlName="incidentDescription" rows="4" placeholder="Describe how the accident happened" [class.invalid-field]="showError('incidentDescription')"></textarea>@if (showError('incidentDescription')) { <small class="validation-message">{{ fieldError('incidentDescription') }}</small> }</label>
          </div>
          <div class="form-section-title section-spaced"><h2>Third-party information</h2></div>
          <div class="form-grid">
            <fieldset class="span-two choice-field"><legend>Was another vehicle involved?</legend><label><input type="radio" formControlName="thirdPartyInvolved" value="Yes"> Yes</label><label><input type="radio" formControlName="thirdPartyInvolved" value="No"> No</label></fieldset>
            @if (form.controls.thirdPartyInvolved.value === 'Yes') {
              <label>Other party / vehicle details <input formControlName="thirdPartyDetails" placeholder="Other vehicle or party details"></label>
            }
            <label>Police report number <input formControlName="policeReportNumber" placeholder="Enter report number"></label>
          </div>
        } @else {
          <div class="form-section-title"><h2>Property claim — incident details</h2><p>Property type, damage and affected items</p></div>
          <div class="form-grid">
            <fieldset class="span-two choice-field required-field" [class.invalid-choice]="showError('propertyType')"><legend>Property type</legend>@for (type of config.propertyTypes; track type) { <label><input type="radio" formControlName="propertyType" [value]="type"> {{ type }}</label> }@if (showError('propertyType')) { <small class="validation-message">{{ fieldError('propertyType') }}</small> }</fieldset>
            <label class="required-field">Incident category <select formControlName="incidentCategory" [class.invalid-field]="showError('incidentCategory')"><option value="">Select incident</option>@for (cause of config.causesOfLoss; track cause) { <option [value]="cause">{{ cause }}</option> }</select>@if (showError('incidentCategory')) { <small class="validation-message">{{ fieldError('incidentCategory') }}</small> }</label>
            <label class="required-field">Incident date <input formControlName="incidentDate" type="date" [class.invalid-field]="showError('incidentDate')">@if (showError('incidentDate')) { <small class="validation-message">{{ fieldError('incidentDate') }}</small> }</label>
            <label class="span-two required-field">Property address <textarea formControlName="incidentLocation" rows="2" placeholder="Enter full property address" [class.invalid-field]="showError('incidentLocation')"></textarea>@if (showError('incidentLocation')) { <small class="validation-message">{{ fieldError('incidentLocation') }}</small> }</label>
          </div>
          <div class="form-section-title section-spaced"><h2>Property damage information</h2></div>
          <div class="form-grid">
            <label class="span-two required-field">Areas affected <select formControlName="areasAffected" multiple size="4" [class.invalid-field]="showError('areasAffected')">@for (area of config.affectedAreas; track area) { <option [value]="area">{{ area }}</option> }</select><small class="field-hint">Select one or more areas.</small>@if (showError('areasAffected')) { <small class="validation-message">{{ fieldError('areasAffected') }}</small> }</label>
            <label class="span-two required-field">Description of damage <textarea formControlName="incidentDescription" rows="4" placeholder="Describe the damage and affected items" [class.invalid-field]="showError('incidentDescription')"></textarea>@if (showError('incidentDescription')) { <small class="validation-message">{{ fieldError('incidentDescription') }}</small> }</label>
            <fieldset class="span-two choice-field"><legend>Are there damaged contents or belongings?</legend><label><input type="radio" formControlName="contentsDamaged" value="Yes"> Yes</label><label><input type="radio" formControlName="contentsDamaged" value="No"> No</label></fieldset>
          </div>
        }
        <div class="form-section-title section-spaced"><h2>Policy and contact details</h2><p>How we can identify and contact you</p></div>
        <div class="form-grid">
          <label class="required-field">Policy number <input formControlName="policyNumber" placeholder="e.g. POL-APAC-1024" [class.invalid-field]="showError('policyNumber')">@if (showError('policyNumber')) { <small class="validation-message">{{ fieldError('policyNumber') }}</small> }</label>
          <label class="required-field">Market <select formControlName="market" [class.invalid-field]="showError('market')"><option value="">Select a market</option>@for (market of config.markets; track market) { <option [value]="market">{{ market }}</option> }</select>@if (showError('market')) { <small class="validation-message">{{ fieldError('market') }}</small> }</label>
          <label class="required-field">Claimant name <input formControlName="claimantName" placeholder="Full name" [class.invalid-field]="showError('claimantName')">@if (showError('claimantName')) { <small class="validation-message">{{ fieldError('claimantName') }}</small> }</label>
          <label class="required-field">Email address <input formControlName="claimantEmail" type="email" placeholder="you@example.com" [class.invalid-field]="showError('claimantEmail')">@if (showError('claimantEmail')) { <small class="validation-message">{{ fieldError('claimantEmail') }}</small> }</label>
          <label>Contact number <input formControlName="claimantPhone" type="tel" placeholder="+65 8123 4567"></label>
          <div class="span-two required-field amount-field-group"><span class="amount-field-label">Estimated loss and currency</span>
            <div class="amount-currency-field" [class.invalid-field]="showError('estimatedLoss') || showError('currency')">
              <input formControlName="estimatedLoss" type="number" min="0" step="0.01" placeholder="0.00" aria-label="Estimated loss amount" [class.invalid-field]="showError('estimatedLoss')">
              <span class="amount-divider"></span>
              <select formControlName="currency" aria-label="Currency" [class.invalid-field]="showError('currency')"><option value="">Currency</option>@for (currency of config.currencies; track currency) { <option [value]="currency">{{ currency }}</option> }</select>
            </div>
            @if (showError('estimatedLoss')) { <small class="validation-message">{{ fieldError('estimatedLoss') }}</small> }
            @if (showError('currency')) { <small class="validation-message">{{ fieldError('currency') }}</small> }
          </div>
        </div>
        <p class="form-capability-note">Supporting file uploads are not available in the current claims API. This form submits the claim information only.</p>
        <label class="declaration"><input type="checkbox" [checked]="declared" (change)="declared = $any($event.target).checked"><span>I confirm that the information provided is accurate to the best of my knowledge.</span></label>
        @if (formError) { <p class="field-error">{{ formError }}</p> }
        <div class="wizard-actions">
          <a class="button button-secondary" routerLink="/claimant/claims/new">Change claim type</a>
          <span class="step-count">Review your details before submitting</span>
          <button class="button button-primary" type="submit" [disabled]="submitting() || !declared">{{ submitting() ? 'Submitting…' : 'Submit claim' }}</button>
        </div>
      </form>
      }
    }
  `,
})
export class ClaimFormPage implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ClaimApiService);
  private readonly session = inject(SessionService);
  private readonly route = inject(ActivatedRoute);
  claimType: ClaimType = 'MOTOR';
  readonly options = signal<ClaimFormOptions | null>(null);
  readonly optionsLoading = signal(false);
  readonly optionsError = signal('');
  readonly form = this.fb.nonNullable.group({
    policyNumber: ['', Validators.required],
    claimantName: [this.session.user()?.name ?? '', Validators.required],
    claimantEmail: [this.session.user()?.email ?? '', [Validators.required, Validators.email]],
    claimantPhone: [''],
    market: ['', Validators.required],
    incidentDate: ['', Validators.required],
    incidentLocation: ['', Validators.required],
    incidentCategory: ['', Validators.required],
    incidentDescription: ['', Validators.required],
    estimatedLoss: ['', [Validators.required, Validators.min(0)]],
    currency: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    vehicleRegistration: [''],
    vehicleModel: [''],
    driverName: [''],
    drivingLicence: [''],
    accidentTime: [''],
    thirdPartyInvolved: ['No'],
    thirdPartyDetails: [''],
    policeReportNumber: [''],
    propertyType: [''],
    areasAffected: this.fb.nonNullable.control<string[]>([]),
    contentsDamaged: ['No'],
  });
  readonly receipt = signal<ClaimSubmissionResponse | null>(null);
  readonly submitting = signal(false);
  declared = false;
  readonly error = signal('');
  formError = '';
  submitAttempted = false;

  ngOnInit(): void {
    this.claimType = this.route.snapshot.data['claimType'] as ClaimType;
    this.loadOptions();
    if (this.claimType === 'MOTOR') {
      this.form.controls.vehicleRegistration.addValidators(Validators.required);
      this.form.controls.vehicleModel.addValidators(Validators.required);
      this.form.controls.driverName.addValidators(Validators.required);
      this.form.controls.incidentCategory.addValidators(Validators.required);
      this.form.controls.vehicleRegistration.updateValueAndValidity();
      this.form.controls.vehicleModel.updateValueAndValidity();
      this.form.controls.driverName.updateValueAndValidity();
      this.form.controls.incidentCategory.updateValueAndValidity();
    } else {
      this.form.controls.areasAffected.addValidators(Validators.required);
      this.form.controls.propertyType.addValidators(Validators.required);
      this.form.controls.areasAffected.updateValueAndValidity();
      this.form.controls.propertyType.updateValueAndValidity();
    }
  }

  private loadOptions(): void {
    this.optionsLoading.set(true);
    this.optionsError.set('');
    const optionsRequest: Observable<ClaimFormOptions> = this.claimType === 'MOTOR'
      ? this.loadMotorOptions()
      : this.loadPropertyOptions();
    optionsRequest.subscribe({
      next: options => {
        const requiredGroups = this.claimType === 'MOTOR'
          ? [options.claimTypes, options.markets, options.currencies, options.claimCategories]
          : [options.claimTypes, options.markets, options.currencies, options.propertyTypes, options.causesOfLoss, options.affectedAreas];
        if (requiredGroups.some(group => !Array.isArray(group) || group.length === 0)) {
          this.optionsError.set(`The backend returned incomplete ${this.claimType.toLowerCase()} claim form options. Check its configuration JSON.`);
          this.optionsLoading.set(false);
          return;
        }
        this.options.set(options);
        this.optionsLoading.set(false);
        if (!options.claimTypes.includes(this.claimType)) {
          this.optionsError.set(`The ${this.claimType.toLowerCase()} claim type is not enabled in the backend configuration.`);
        }
        if (options.currencies.length && !options.currencies.includes(this.form.controls.currency.value)) {
          this.form.controls.currency.setValue(options.currencies[0]);
        }
      },
      error: error => {
        this.optionsError.set(errorMessage(error));
        this.optionsLoading.set(false);
      },
    });
  }

  private loadMotorOptions(): Observable<ClaimFormOptions> {
    return this.api.getMotorClaimOptions().pipe(map(options => ({
          claimTypes: options.claimTypes,
          markets: options.markets,
          currencies: options.currencies,
          claimCategories: options.claimCategories,
          propertyTypes: [],
          causesOfLoss: [],
          affectedAreas: [],
        })));
  }

  private loadPropertyOptions(): Observable<ClaimFormOptions> {
    return this.api.getPropertyClaimOptions().pipe(map(options => ({
          claimTypes: options.claimTypes,
          markets: options.markets,
          currencies: options.currencies,
          claimCategories: [],
          propertyTypes: options.propertyTypes,
          causesOfLoss: options.causesOfLoss,
          affectedAreas: options.affectedAreas,
        })));
  }

  submit(): void {
    this.error.set('');
    this.formError = '';
    this.submitAttempted = true;
    const options = this.options();
    if (!options || this.optionsError() || !options.claimTypes.includes(this.claimType)) {
      this.formError = 'Form options are unavailable. Use “Try again” above to reload them.';
      return;
    }
    if (this.form.invalid || !this.declared) {
      this.form.markAllAsTouched();
      this.formError = !this.declared && this.form.valid
        ? 'Confirm the declaration to submit your claim.'
        : 'Please complete the highlighted fields.';
      return;
    }
    const value = this.form.getRawValue();
    const incidentDescription = this.claimType === 'MOTOR'
      ? [
          value.incidentDescription,
          `Accident time: ${value.accidentTime || 'Not provided'}`,
          `Vehicle model: ${value.vehicleModel}`,
          `Driver: ${value.driverName}`,
          `Driving licence: ${value.drivingLicence || 'Not provided'}`,
          `Third party involved: ${value.thirdPartyInvolved}`,
          value.thirdPartyInvolved === 'Yes' ? `Third-party details: ${value.thirdPartyDetails || 'Not provided'}` : '',
          `Police report number: ${value.policeReportNumber || 'Not provided'}`,
        ].filter(Boolean).join('\n')
      : [
          value.incidentDescription,
          `Property type: ${value.propertyType}`,
          `Areas affected: ${value.areasAffected}`,
          `Damaged contents or belongings: ${value.contentsDamaged}`,
        ].join('\n');

    this.submitting.set(true);
    const request = {
      claimantName: value.claimantName,
      claimantEmail: value.claimantEmail,
      claimantPhone: value.claimantPhone,
      market: value.market,
      claimType: this.claimType,
      policyNumber: value.policyNumber,
      incidentDate: value.incidentDate,
      incidentLocation: value.incidentLocation,
      incidentCategory: value.incidentCategory,
      incidentDescription,
      assetReference: this.claimType === 'MOTOR' ? value.vehicleRegistration : value.propertyType,
      estimatedLoss: Number(value.estimatedLoss),
      currency: value.currency,
      ...(this.claimType === 'MOTOR' ? {
        motorDetails: {
          vehicleRegistration: value.vehicleRegistration,
          vehicleModel: value.vehicleModel,
          driverName: value.driverName,
          driverLicenceNumber: value.drivingLicence,
          thirdPartyInvolved: value.thirdPartyInvolved === 'Yes',
          policeReportNumber: value.policeReportNumber,
          claimCategory: value.incidentCategory,
        },
      } : {
        propertyDetails: {
          propertyType: value.propertyType,
          propertyAddress: value.incidentLocation,
          affectedAreas: value.areasAffected.join(', '),
          damageToBuilding: value.areasAffected.some(area => ['Building', 'Roof', 'Walls', 'Flooring'].includes(area)),
          damageToContents: value.contentsDamaged === 'Yes' || value.areasAffected.includes('Contents'),
          causeOfLoss: value.incidentCategory,
          estimatedRepairCost: Number(value.estimatedLoss),
          estimatedContentsLoss: value.contentsDamaged === 'Yes' ? Number(value.estimatedLoss) : 0,
        },
      }),
    };
    this.api.submitClaim(request).subscribe({
      next: response => { this.receipt.set(response); this.submitting.set(false); },
      error: error => { this.error.set(errorMessage(error)); this.submitting.set(false); },
    });
  }

  showError(name: string): boolean {
    const control = this.form.get(name);
    return !!control?.invalid && (!!control.touched || this.submitAttempted);
  }

  fieldError(name: string): string {
    const control = this.form.get(name);
    if (control?.hasError('required')) return 'This field is required.';
    if (control?.hasError('email')) return 'Enter a valid email address.';
    if (control?.hasError('min')) return 'Enter an amount of zero or more.';
    if (control?.hasError('minlength') || control?.hasError('maxlength')) return 'Select a valid currency.';
    return 'Please check this field.';
  }

  titleCase(value: string): string { return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, char => char.toUpperCase()); }
}
