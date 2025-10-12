import {
  ApplicationConfig,
  provideZoneChangeDetection,
  APP_INITIALIZER,
  PLATFORM_ID,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { en_US, provideNzI18n } from 'ng-zorro-antd/i18n';
import { registerLocaleData } from '@angular/common';
import en from '@angular/common/locales/en';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideHttpClient, withInterceptorsFromDi, withFetch } from '@angular/common/http';
import { KeycloakService, KeycloakBearerInterceptor } from 'keycloak-angular';
import Keycloak from 'keycloak-js';
import { ConfigService, initializer } from './configurations.helper';
import { keycloakFactory } from './keycloak.mock';

registerLocaleData(en);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideNzI18n(en_US),
    provideAnimations(),
    provideHttpClient(withFetch(), withInterceptorsFromDi()),

    ConfigService,

    KeycloakService,

    {
      provide: Keycloak,
      useFactory: keycloakFactory,
      deps: [PLATFORM_ID],
    },

    {
      provide: APP_INITIALIZER,
      useFactory: initializer,
      multi: true,
      deps: [KeycloakService, ConfigService],
    },

    {
      provide: 'records_BASE_PATH',
      useFactory: () => ConfigService.config?.frontend_config?.records_api ?? '',
    },

    {
      provide: 'HTTP_INTERCEPTORS',
      useClass: KeycloakBearerInterceptor,
      multi: true,
    },
  ],
};
