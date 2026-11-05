import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DemoRole } from '../../core/models/claim';
import { SessionService } from '../../core/services/session.service';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule],
  template: `
    <main class="login-page">
      <section class="login-card">
        <a class="login-brand"><span class="brand-mark">C</span><strong>Chubb <small>Claims platform</small></strong></a>
        <div class="eyebrow">APAC CLAIMS MANAGEMENT</div>
        <h1>Welcome back</h1>
        <p class="login-intro">Choose a demo experience to explore the claims platform.</p>
        <form (ngSubmit)="enter()">
          <label for="role">Sign in as</label>
          <select id="role" name="role" [(ngModel)]="role">
            <option value="claimant">Claimant</option>
            <option value="officer">Claims officer</option>
            <option value="manager">Claims manager</option>
          </select>
          <div class="demo-user"><span class="avatar">{{ selectedInitial }}</span><span><b>{{ selectedName }}</b><small>{{ selectedEmail }}</small></span></div>
          <button class="button button-primary login-submit" type="submit">Continue to workspace <span>→</span></button>
        </form>
        <div class="login-foot">Demo access only · No password required</div>
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
    .login-card { background:#fff; border:1px solid #e8edf2; border-radius:12px; box-shadow:0 12px 40px #142c4410; max-width:430px; padding:42px; width:100%; z-index:1; }
    .login-brand { align-items:center; color:#10243a; display:flex; gap:11px; margin-bottom:44px; text-decoration:none; }
    .login-brand strong { font-size:17px; }.login-brand small { color:#718294; display:block; font-size:10px; font-weight:400; margin-top:3px; }
    .eyebrow { color:#3176a9; font-size:10px; font-weight:700; letter-spacing:.13em; }
    h1 { color:#1e3043; font-size:27px; letter-spacing:-.03em; margin:10px 0 7px; }
    .login-intro { color:#768493; font-size:13px; line-height:1.55; margin:0 0 27px; }
    label { color:#425365; display:block; font-size:11px; font-weight:650; margin-bottom:8px; }
    select { background:#fff; border:1px solid #dce3e9; border-radius:6px; color:#253649; font:inherit; font-size:13px; height:43px; padding:0 12px; width:100%; }
    .demo-user { align-items:center; background:#f7f9fb; border:1px solid #edf0f3; border-radius:7px; display:flex; gap:11px; margin:16px 0 21px; padding:11px; }
    .avatar { align-items:center; background:#e4f0f9; border-radius:50%; color:#1d679e; display:flex; font-size:13px; font-weight:700; height:34px; justify-content:center; width:34px; }
    .demo-user b,.demo-user small { display:block; }.demo-user b { color:#263a4d; font-size:11px; }.demo-user small { color:#83909c; font-size:10px; margin-top:4px; }
    .button { border:0; border-radius:6px; cursor:pointer; font:inherit; font-size:12px; font-weight:650; min-height:42px; padding:0 16px; }
    .button-primary { background:#1769a5; color:#fff; }.button-primary:hover { background:#0d568f; }
    .login-submit { display:flex; justify-content:space-between; width:100%; }
    .login-foot { border-top:1px solid #edf0f3; color:#99a4ae; font-size:10px; margin-top:23px; padding-top:17px; text-align:center; }
    .login-aside { background:#10243a; border-radius:0 12px 12px 0; color:#fff; margin-left:-12px; max-width:470px; min-height:430px; overflow:hidden; padding:55px 45px 40px 58px; position:relative; width:44%; }
    .login-aside:after { border:1px solid #ffffff16; border-radius:50%; content:''; height:380px; position:absolute; right:-130px; top:155px; width:380px; }
    .aside-kicker { color:#6eb4e3; font-size:10px; font-weight:700; letter-spacing:.15em; }
    .login-aside h2 { font-size:31px; letter-spacing:-.035em; line-height:1.2; margin:20px 0 13px; }
    .login-aside p { color:#b0bfce; font-size:12px; line-height:1.65; max-width:270px; }
    .aside-stats { align-items:center; display:flex; gap:22px; margin-top:75px; position:relative; z-index:1; }
    .aside-stats b,.aside-stats small { display:block; }.aside-stats b { font-size:19px; }.aside-stats small { color:#a5b6c6; font-size:10px; margin-top:3px; }.aside-stats i { background:#496076; height:29px; width:1px; }
    @media(max-width:780px) { .login-aside { display:none; }.login-card { padding:32px 26px; } }
  `],
})
export class LoginPage {
  private readonly session = inject(SessionService);
  private readonly router = inject(Router);
  role: DemoRole = 'claimant';

  get selectedName(): string {
    return this.role === 'claimant' ? 'John Tan' : this.role === 'officer' ? 'Alex Lim' : 'Michelle Wong';
  }
  get selectedEmail(): string {
    return this.role === 'claimant' ? 'john.tan@example.com' : this.role === 'officer' ? 'officer.a@chubb.com' : 'manager@chubb.com';
  }
  get selectedInitial(): string {
    return this.selectedName.charAt(0);
  }

  enter(): void {
    const user = this.session.login(this.role);
    const path = user.role === 'claimant' ? '/claimant/dashboard' :
      user.role === 'officer' ? '/staff/dashboard' : '/management/dashboard';
    void this.router.navigateByUrl(path);
  }
}
