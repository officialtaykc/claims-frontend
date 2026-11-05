import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DemoRole, DemoUser } from '../../core/models/claim';
import { ClaimApiService } from '../../core/services/claim-api.service';
import { SessionService } from '../../core/services/session.service';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="login-page">
      <section class="login-card">
        <a class="login-brand"><span class="brand-mark">C</span><strong>Chubb <small>Claims platform</small></strong></a>
        <div class="eyebrow">APAC CLAIMS MANAGEMENT</div>
        <h1>Welcome back</h1>
        <p class="login-intro">Sign in to your claims workspace.</p>

        <div class="role-tabs" role="tablist" aria-label="Account type">
          <button type="button" role="tab" [attr.aria-selected]="role === 'claimant'" [class.active]="role === 'claimant'" (click)="selectRole('claimant')">Claimant</button>
          <button type="button" role="tab" [attr.aria-selected]="role === 'officer'" [class.active]="role === 'officer'" (click)="selectRole('officer')">Officer</button>
          <button type="button" role="tab" [attr.aria-selected]="role === 'manager'" [class.active]="role === 'manager'" (click)="selectRole('manager')">Manager</button>
        </div>

        <form (ngSubmit)="enter()">
          <label for="identifier">{{ role === 'claimant' ? 'Email address' : 'Username or email' }}</label>
          <input id="identifier" name="identifier" [(ngModel)]="identifier" [placeholder]="identifierPlaceholder" autocomplete="username" required>
          <label for="password">Password</label>
          <input id="password" name="password" [(ngModel)]="password" type="password" placeholder="Enter your password" autocomplete="current-password" required>
          @if (errorMessage()) {
            <p class="form-error" role="alert">{{ errorMessage() }}</p>
          }
          <button class="button button-primary login-submit" type="submit" [disabled]="loading()">
            {{ loading() ? 'Signing in…' : 'Sign in' }} <span>→</span>
          </button>
        </form>

        <div class="demo-credentials">
          <b>Local demo credentials</b>
          @if (role === 'officer') {
            <span>Officer A: <code>officer.a</code> / <code>OfficerDemo!26</code></span>
            <span>Officer B: <code>officer.b</code> / <code>OfficerDemo!26</code></span>
          } @else {
            <span>{{ demoIdentifier }}</span>
            <span>{{ demoPassword }}</span>
          }
        </div>
        <p class="register-link">New to the platform? <a routerLink="/register">Register</a></p>
        <div class="login-foot">Demonstration access · Credentials are verified by the local backend</div>
      </section>
      <div class="login-aside">
        <div class="aside-kicker">ONE PLATFORM. EVERY CLAIM.</div>
        <h2>Clarity through<br>every step of a claim.</h2>
        <p>A shared view for claimants, officers and managers across the APAC region.</p>
        <div class="aside-stats"><span><b>06</b><small>APAC markets</small></span><i></i><span><b>03</b><small>role experiences</small></span></div>
      </div>
    </main>
  `,
  styles: [`
    :host { display:block; min-height:100vh; }
    .login-page { align-items:center; background:#f3f6f9; display:flex; justify-content:center; min-height:100vh; padding:32px; }
    .login-card { background:#fff; border:1px solid #e8edf2; border-radius:12px; box-shadow:0 12px 40px #142c4410; max-width:430px; padding:38px 42px; width:100%; z-index:1; }
    .login-brand { align-items:center; color:#10243a; display:flex; gap:11px; margin-bottom:34px; text-decoration:none; }
    .login-brand strong { font-size:17px; }.login-brand small { color:#718294; display:block; font-size:10px; font-weight:400; margin-top:3px; }
    .eyebrow { color:#3176a9; font-size:10px; font-weight:700; letter-spacing:.13em; }
    h1 { color:#1e3043; font-size:27px; letter-spacing:-.03em; margin:10px 0 7px; }
    .login-intro { color:#768493; font-size:13px; line-height:1.55; margin:0 0 20px; }
    .role-tabs { background:#f3f6f8; border-radius:7px; display:flex; gap:3px; margin-bottom:22px; padding:4px; }
    .role-tabs button { background:transparent; border:0; border-radius:5px; color:#677888; cursor:pointer; flex:1; font:inherit; font-size:11px; font-weight:600; min-height:34px; }
    .role-tabs button.active { background:#fff; box-shadow:0 1px 4px #1b344414; color:#1769a5; }
    label { color:#425365; display:block; font-size:11px; font-weight:650; margin:0 0 7px; }
    input { background:#fff; border:1px solid #dce3e9; border-radius:6px; color:#253649; font:inherit; font-size:13px; height:42px; margin-bottom:15px; padding:0 12px; width:100%; }
    input:focus { border-color:#4787b4; outline:3px solid #e7f2fa; }
    .button { border:0; border-radius:6px; cursor:pointer; font:inherit; font-size:12px; font-weight:650; min-height:42px; padding:0 16px; }
    .button-primary { background:#1769a5; color:#fff; }.button-primary:hover { background:#0d568f; }.button-primary:disabled { cursor:wait; opacity:.7; }
    .login-submit { display:flex; justify-content:space-between; margin-top:5px; width:100%; }
    .form-error { background:#fff3f1; border:1px solid #f1c5bf; border-radius:5px; color:#a1392d; font-size:11px; margin:0 0 12px; padding:9px 10px; }
    .demo-credentials { background:#f7f9fb; border:1px solid #edf0f3; border-radius:7px; color:#657788; display:grid; font-size:10px; gap:4px; margin-top:17px; padding:10px 12px; }
    .demo-credentials b { color:#394e61; font-size:10px; margin-bottom:2px; }
    .register-link { color:#728191; font-size:11px; margin:16px 0 0; text-align:center; }.register-link a { color:#1769a5; font-weight:650; }
    .login-foot { border-top:1px solid #edf0f3; color:#99a4ae; font-size:9px; line-height:1.5; margin-top:18px; padding-top:14px; text-align:center; }
    .login-aside { background:#10243a; border-radius:0 12px 12px 0; color:#fff; margin-left:-12px; max-width:470px; min-height:430px; overflow:hidden; padding:55px 45px 40px 58px; position:relative; width:44%; }
    .login-aside:after { border:1px solid #ffffff16; border-radius:50%; content:''; height:380px; position:absolute; right:-130px; top:155px; width:380px; }
    .aside-kicker { color:#6eb4e3; font-size:10px; font-weight:700; letter-spacing:.15em; }
    .login-aside h2 { font-size:31px; letter-spacing:-.035em; line-height:1.2; margin:20px 0 13px; }
    .login-aside p { color:#b0bfce; font-size:12px; line-height:1.65; max-width:270px; }
    .aside-stats { align-items:center; display:flex; gap:22px; margin-top:75px; position:relative; z-index:1; }
    .aside-stats b,.aside-stats small { display:block; }.aside-stats b { font-size:19px; }.aside-stats small { color:#a5b6c6; font-size:10px; margin-top:3px; }.aside-stats i { background:#496076; height:29px; width:1px; }
    @media(max-width:780px) { .login-aside { display:none; }.login-card { padding:30px 24px; } }
  `],
})
export class LoginPage {
  private readonly api = inject(ClaimApiService);
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);

  role: DemoRole = 'claimant';
  identifier = '';
  password = '';
  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  get identifierPlaceholder(): string {
    return this.role === 'claimant' ? 'name@example.com' : 'Username or email';
  }

  get demoIdentifier(): string {
    return this.role === 'claimant' ? 'john.tan@example.com' :
      this.role === 'officer' ? 'officer.a' : 'manager';
  }

  get demoPassword(): string {
    return this.role === 'claimant' ? 'ClaimantDemo!26' :
      this.role === 'officer' ? 'OfficerDemo!26' : 'ManagerDemo!26';
  }

  selectRole(role: DemoRole): void {
    this.role = role;
    this.errorMessage.set(null);
  }

  enter(): void {
    if (this.loading()) return;
    if (!this.identifier.trim() || !this.password) {
      this.errorMessage.set('Enter your username/email and password to sign in.');
      return;
    }
    this.loading.set(true);
    this.errorMessage.set(null);
    const role = this.role === 'claimant' ? 'CLAIMANT' :
      this.role === 'officer' ? 'OFFICER' : 'MANAGER';
    this.api.login({ role, identifier: this.identifier.trim(), password: this.password }).subscribe({
      next: (account) => {
        const user: DemoUser = { name: account.name, email: account.email, role: account.role };
        this.session.login(user);
        const path = user.role === 'claimant' ? '/claimant/dashboard' :
          user.role === 'officer' ? '/staff/dashboard' : '/management/dashboard';
        void this.router.navigateByUrl(path);
      },
      error: (error: unknown) => {
        this.loading.set(false);
        this.errorMessage.set(this.getErrorMessage(error));
      },
      complete: () => this.loading.set(false),
    });
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) return 'The username/email or password is incorrect.';
      if (error.status === 0) return 'Unable to reach the claims service. Check that the backend is running.';
      const body = error.error as { message?: unknown } | null;
      if (typeof body?.message === 'string') return body.message;
    }
    return 'Sign in failed. Please try again.';
  }
}
