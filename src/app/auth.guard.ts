import { inject, PLATFORM_ID } from '@angular/core';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { NzMessageService } from 'ng-zorro-antd/message';
import { createAuthGuard, KeycloakService } from 'keycloak-angular';

export const AuthGuard = createAuthGuard(async (route, state) => {
  const platformId = inject(PLATFORM_ID);
  const keycloak = inject(KeycloakService);
  const router = inject(Router);
  const message = inject(NzMessageService);

  if (!isPlatformBrowser(platformId)) {
    console.log('⚠️ SSR detected - skipping auth guard');
    return true;
  }

  try {
    const authenticated = await keycloak.isLoggedIn();

    if (!authenticated) {
      console.log('🔒 User not authenticated - redirecting to login');
      await keycloak.login({
        redirectUri: window.location.origin + state.url,
      });
      return false;
    }

    const requiredRoles = route.data?.['roles'] ?? [];

    if (requiredRoles.length === 0) {
      return true;
    }

    const token = keycloak.getKeycloakInstance().tokenParsed;

    if (!token) {
      console.warn('⚠️ Token not available - cannot check roles');
      message.error('Authentication token not found. Please log in again.', { nzDuration: 5000 });
      await keycloak.login({ redirectUri: window.location.origin + state.url });
      return false;
    }

    const hasRole = requiredRoles.some((role: string) => {
      try {
        return keycloak.isUserInRole(role);
      } catch (error) {
        console.error(`Error checking role "${role}":`, error);
        return false;
      }
    });

    if (!hasRole) {
      console.warn('❌ Access denied. Required roles:', requiredRoles);
      console.warn('User roles:', keycloak.getUserRoles());

      message.error('You are not authorized to access this page', { nzDuration: 5000 });
      return router.parseUrl('/home');
    }

    console.log('✅ Access granted');
    return true;
  } catch (error) {
    console.error('❌ Auth guard error:', error);

    message.error('Authentication error. Please log in again.', { nzDuration: 5000 });

    try {
      await keycloak.login({
        redirectUri: window.location.origin + state.url,
      });
    } catch (loginError) {
      console.error('Login error:', loginError);
    }

    return false;
  }
});
