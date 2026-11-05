import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { DemoRole } from './core/models/claim';
import { SessionService } from './core/services/session.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  readonly session = inject(SessionService);
  private readonly router = inject(Router);

  get user() {
    return this.session.user();
  }

  get navigation(): { label: string; path: string; icon: string }[] {
    const role = this.user?.role;
    if (role === 'claimant') {
      return [
        { label: 'Overview', path: '/claimant/dashboard', icon: '⌂' },
        { label: 'My claims', path: '/claimant/claims', icon: '▤' },
        { label: 'Submit a claim', path: '/claimant/claims/new', icon: '+' },
        { label: 'Information requests', path: '/claimant/requests', icon: '✉' },
        { label: 'Messages', path: '/claimant/messages', icon: '◉' },
      ];
    }
    if (role === 'officer') {
      return [
        { label: 'Overview', path: '/staff/dashboard', icon: '⌂' },
        { label: 'Claims queue', path: '/staff/queue', icon: '▤' },
      ];
    }
    return [
      { label: 'Overview', path: '/management/dashboard', icon: '⌂' },
      { label: 'Claims queue', path: '/staff/queue', icon: '▤' },
      { label: 'Team workload', path: '/management/workload', icon: '◫' },
      { label: 'Financial exposure', path: '/management/exposure', icon: '$' },
    ];
  }

  get roleLabel(): string {
    const role = this.user?.role;
    return role === 'officer' ? 'Claims officer' : role === 'manager' ? 'Claims manager' : 'Claimant';
  }

  logout(): void {
    this.session.logout();
    void this.router.navigateByUrl('/login');
  }

  dashboardPath(role: DemoRole): string {
    return role === 'claimant' ? '/claimant/dashboard' : role === 'officer' ? '/staff/dashboard' : '/management/dashboard';
  }
}
