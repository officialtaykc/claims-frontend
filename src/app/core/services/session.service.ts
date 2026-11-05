import { Injectable, signal } from '@angular/core';
import { DemoRole, DemoUser } from '../models/claim';

const DEMO_USERS: Record<DemoRole, DemoUser> = {
  claimant: { name: 'John Tan', email: 'john.tan@example.com', role: 'claimant' },
  officer: { name: 'Alex Lim', email: 'officer.a@chubb.com', role: 'officer' },
  manager: { name: 'Michelle Wong', email: 'manager@chubb.com', role: 'manager' },
};

@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly user = signal<DemoUser | null>(this.readUser());

  login(role: DemoRole): DemoUser {
    const user = DEMO_USERS[role];
    localStorage.setItem('claims-demo-user', JSON.stringify(user));
    this.user.set(user);
    return user;
  }

  logout(): void {
    localStorage.removeItem('claims-demo-user');
    this.user.set(null);
  }

  private readUser(): DemoUser | null {
    try {
      const saved = localStorage.getItem('claims-demo-user');
      if (!saved) return null;
      const user = JSON.parse(saved) as DemoUser;
      return user && user.role in DEMO_USERS ? DEMO_USERS[user.role] : null;
    } catch {
      return null;
    }
  }
}
