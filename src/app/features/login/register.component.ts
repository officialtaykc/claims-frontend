import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-register-page',
  imports: [RouterLink],
  template: `
    <main class="register-page">
      <section class="register-card">
        <a class="brand" routerLink="/login"><span class="brand-mark">C</span><strong>Chubb <small>Claims platform</small></strong></a>
        <div class="eyebrow">CLAIMANT ACCOUNT</div>
        <h1>Registration</h1>
        <p>Self-service registration is not connected in this demonstration. No account will be created.</p>
        <div class="notice" role="status"><b>Registration unavailable</b><span>Please use the provided demo claimant account to explore the claimant experience.</span></div>
        <label for="name">Full name</label><input id="name" disabled placeholder="Your full name">
        <label for="email">Email address</label><input id="email" disabled placeholder="you@example.com">
        <label for="password">Create password</label><input id="password" type="password" disabled placeholder="Create a password">
        <button type="button" disabled>Create account (unavailable)</button>
        <a class="back-link" routerLink="/login">← Back to sign in</a>
      </section>
    </main>
  `,
  styles: [`
    :host { display:block; min-height:100vh; }
    .register-page { align-items:center; background:#f3f6f9; display:flex; justify-content:center; min-height:100vh; padding:24px; }
    .register-card { background:#fff; border:1px solid #e8edf2; border-radius:12px; box-shadow:0 12px 40px #142c4410; max-width:440px; padding:38px; width:100%; }
    .brand { align-items:center; color:#10243a; display:flex; gap:11px; margin-bottom:38px; text-decoration:none; }
    .brand strong { font-size:17px; }.brand small { color:#718294; display:block; font-size:10px; font-weight:400; margin-top:3px; }
    .eyebrow { color:#3176a9; font-size:10px; font-weight:700; letter-spacing:.13em; }
    h1 { color:#1e3043; font-size:27px; margin:10px 0; }
    p { color:#718091; font-size:13px; line-height:1.6; }
    .notice { background:#f7f9fb; border:1px solid #e7edf2; border-radius:7px; color:#657788; display:grid; font-size:12px; gap:5px; line-height:1.5; margin:22px 0; padding:14px; }
    .notice b { color:#334b60; }
    label { color:#425365; display:block; font-size:11px; font-weight:650; margin:0 0 7px; }
    input { background:#f8f9fa; border:1px solid #e4e8eb; border-radius:6px; color:#99a4ae; font:inherit; font-size:12px; height:40px; margin-bottom:14px; padding:0 11px; width:100%; }
    button { background:#f6f7f8; border:1px solid #e4e8eb; border-radius:6px; color:#99a4ae; cursor:not-allowed; font:inherit; font-size:12px; min-height:42px; width:100%; }
    .back-link { color:#1769a5; display:block; font-size:12px; font-weight:650; margin-top:22px; text-align:center; }
  `],
})
export class RegisterPage {}
