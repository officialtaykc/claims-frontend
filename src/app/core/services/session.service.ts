import { Injectable, signal } from '@angular/core';
import { DemoRole, DemoUser } from '../models/claim';

const ROLES: DemoRole[] = ['claimant', 'officer', 'manager'];
const SESSION_KEY = 'claims-account-user';
const LEGACY_SESSION_KEY = 'claims-demo-user';

@Injectable({ providedIn: 'root' })
export class SessionService {
  readonly user = signal<DemoUser | null>(this.readUser());

  login(user: DemoUser): DemoUser {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    this.user.set(user);
    return user;
  }

  logout(): void {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LEGACY_SESSION_KEY);
    this.user.set(null);
  }

  private readUser(): DemoUser | null {
    try {
      localStorage.removeItem(LEGACY_SESSION_KEY);
      const saved = localStorage.getItem(SESSION_KEY);
      if (!saved) return null;
      const user: unknown = JSON.parse(saved);
      if (!user || typeof user !== 'object') return null;
      const candidate = user as Partial<DemoUser>;
      return typeof candidate.name === 'string' &&
        typeof candidate.email === 'string' &&
        ROLES.includes(candidate.role as DemoRole)
        ? candidate as DemoUser
        : null;
    } catch {
      return null;
    }
  }
}
