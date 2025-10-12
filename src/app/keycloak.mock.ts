import Keycloak from 'keycloak-js';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export function keycloakFactory(platformId: Object): Keycloak {
  if (isPlatformBrowser(platformId)) {
    return new Keycloak({
      url: '',
      realm: '',
      clientId: '',
    });
  }

  const mockKeycloak = {
    init: () => Promise.resolve(false),
    login: () => Promise.resolve(),
    logout: () => Promise.resolve(),
    register: () => Promise.resolve(),
    accountManagement: () => Promise.resolve(),
    createLoginUrl: () => '',
    createLogoutUrl: () => '',
    createRegisterUrl: () => '',
    createAccountUrl: () => '',
    isTokenExpired: () => true,
    updateToken: () => Promise.resolve(false),
    clearToken: () => {},
    hasRealmRole: () => false,
    hasResourceRole: () => false,
    loadUserProfile: () => Promise.resolve({} as any),
    loadUserInfo: () => Promise.resolve({} as any),
    authenticated: false,
    token: undefined,
    tokenParsed: undefined,
    subject: undefined,
    idToken: undefined,
    idTokenParsed: undefined,
    realmAccess: undefined,
    resourceAccess: undefined,
    refreshToken: undefined,
    refreshTokenParsed: undefined,
    timeSkew: 0,
    responseMode: undefined,
    flow: undefined,
    adapter: undefined,
    responseType: undefined,
    onReady: () => {},
    onAuthSuccess: () => {},
    onAuthError: () => {},
    onAuthRefreshSuccess: () => {},
    onAuthRefreshError: () => {},
    onAuthLogout: () => {},
    onTokenExpired: () => {},
    onActionUpdate: () => {},
  } as unknown as Keycloak;

  return mockKeycloak;
}
