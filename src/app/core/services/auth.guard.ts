import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { DemoRole } from '../models/claim';
import { SessionService } from './session.service';

export const authGuard: CanActivateFn = (route) => {
  const session = inject(SessionService);
  const router = inject(Router);
  const user = session.user();
  const roles = route.data['roles'] as DemoRole[] | undefined;
  if (!user) return router.parseUrl('/login');
  if (roles && !roles.includes(user.role)) return router.parseUrl(
    user.role === 'claimant' ? '/claimant/dashboard' :
      user.role === 'officer' ? '/staff/dashboard' : '/management/dashboard',
  );
  return true;
};
