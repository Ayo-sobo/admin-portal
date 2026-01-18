import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NzMessageService } from 'ng-zorro-antd/message';
import dayjs from 'dayjs';
import { firstValueFrom } from 'rxjs';
import { KeycloakService, KeycloakOptions } from 'keycloak-angular';
import type { KeycloakOnLoad } from 'keycloak-js';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  config?: SalAppConfig;
  private readonly defaultCode = 'sal';
  originWithoutProtocol = '';

  constructor(
    private http: HttpClient,
    private message: NzMessageService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.originWithoutProtocol = window.location.origin.replace(/^https?:\/\/|\/$/g, '');
    }
  }

  static get config(): SalAppConfig {
    if (typeof window === 'undefined') return {} as SalAppConfig;
    return JSON.parse(localStorage.getItem('sal-config$') || '{}');
  }

  private saveConfig(config: SalAppConfig, code: string): void {
    localStorage.setItem('sal-config$', JSON.stringify(config));
    localStorage.setItem('sal-config-code$', code);
    localStorage.setItem('sal-config-origin$', this.originWithoutProtocol);
    localStorage.setItem(
      'sal-config-expiry$',
      new Date(dayjs().add(10, 'minutes').toDate()).getTime().toString()
    );
  }

  async loadConfig(retries = 0): Promise<SalAppConfig | void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const stored = ConfigService.config;
    if (stored?.hospital?.sub_domain === this.defaultCode) {
      this.config = stored;
      return stored;
    }

    try {
      const response = await firstValueFrom(
        this.http.post<[SalAppConfig]>(
          'https://configuration-manager-service-dunur.ondigitalocean.app/configurations/filter',
          { hospital_sub_domain: this.defaultCode }
        )
      );

      if (!response?.length) {
        return;
      }

      const config = response[0];
      this.config = config;
      this.saveConfig(config, this.defaultCode);
      return config;
    } catch {
      if (retries < 3) {
        await new Promise((r) => setTimeout(r, 2000));
        return this.loadConfig(retries + 1);
      }
    }
  }
}

export interface SalAppConfig {
  hospital: {
    name: string;
    address: string;
    city: string;
    sub_domain: string;
  };
  frontend_config: {
    title: string;
    records_api: string;
    keycloak_base_url: string;
    keycloak_realm: string;
    keycloak_client_id: string;
    [key: string]: any;
  };
  keycloakConfig?: {
    clientId: string;
    realm: string;
    url: string;
  };
  initOptions?: {
    onLoad: KeycloakOnLoad;
    silentCheckSsoRedirectUri: string;
  };
}

export function initializer(
  keycloak: KeycloakService,
  configService: ConfigService
): () => Promise<boolean> {
  return async (): Promise<boolean> => {
    if (typeof window === 'undefined') {
      return true;
    }

    try {
      await configService.loadConfig();

      if (!configService.config) {
        return true;
      }

      const options: KeycloakOptions = {
        config: {
          url: configService.config.frontend_config.keycloak_base_url,
          realm: configService.config.frontend_config.keycloak_realm,
          clientId: configService.config.frontend_config.keycloak_client_id,
        },
        initOptions: {
          onLoad: 'login-required' as KeycloakOnLoad,
          silentCheckSsoRedirectUri: window.location.origin + '/assets/silent-check-sso.html',
          checkLoginIframe: false,
        },
        enableBearerInterceptor: true,
        bearerExcludedUrls: ['/assets', '/configurations/filter'],
      };

      const initialized = await keycloak.init(options);
      return initialized;
    } catch {
      return true;
    }
  };
}
