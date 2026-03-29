import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { NzMessageService } from 'ng-zorro-antd/message';
import dayjs from 'dayjs';
import Swal from 'sweetalert2';
import { firstValueFrom } from 'rxjs';
import { KeycloakService, KeycloakOptions } from 'keycloak-angular';
import type { KeycloakOnLoad } from 'keycloak-js';
import Keycloak from 'keycloak-js';

@Injectable({
  providedIn: 'root',
})
export class ConfigService {
  config?: SalAppConfig;
  originWithoutProtocol = '';

  constructor(
    private http: HttpClient,
    private message: NzMessageService,
    @Inject(PLATFORM_ID) private platformId: Object,
  ) {
    console.log('reached here');
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
      new Date(dayjs().add(10, 'minutes').toDate()).getTime().toString(),
    );
  }

  async loadConfig(retries = 0): Promise<SalAppConfig | void> {
    if (!isPlatformBrowser(this.platformId)) return;

    const { config: stored, isValid } = ConfigService.validConfig;
    if (isValid && stored?.hospital?.sub_domain) {
      this.config = stored;
      return stored;
    }

    const code = await ConfigService.fetchConfig();
    if (!code) return;

    try {
      const response = await firstValueFrom(
        this.http.post<[SalAppConfig]>(
          'https://configuration-manager-service-dunur.ondigitalocean.app/configurations/filter',
          { hospital_sub_domain: code },
        ),
      );

      if (!response?.length) return;

      const config = response[0];
      this.config = config;
      this.saveConfig(config, code);
      return config;
    } catch {
      if (retries < 3) {
        await new Promise((r) => setTimeout(r, 2000));
        return this.loadConfig(retries + 1);
      }
    }
  }

  static logout(keycloakInstance: Keycloak, clearConfig = false) {
    if (clearConfig) {
      ConfigService.clearConfig(true).then(() => {
        keycloakInstance.logout({ redirectUri: window.location.origin });
      });
    } else {
      keycloakInstance.logout({ redirectUri: window.location.origin });
    }
  }

  static async showSnacks(message: NzMessageService) {
    message.loading(`Loading ${ConfigService.validConfig.config?.hospital?.name}`, {
      nzDuration: 5000,
    });
    ConfigService.loadAndConfigureConfig();
  }

  static loadAndConfigureConfig() {
    ConfigService.fetchConfig().then((code) => {
      if (code) {
        fetch(
          'https://configuration-manager-service-dunur.ondigitalocean.app/configurations/filter',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hospital_sub_domain: code }),
          },
        )
          .then((res) => res.json())
          .then((data) => {
            if (data[0]?.hospital?.sub_domain) {
              ConfigService.setConfig(data[0]);
            }
          });
      }
    });
  }

  static fetchConfig = async (): Promise<string | null> => {
    const result = await Swal.fire({
      text: 'Please enter hospital code',
      input: 'text',
      inputAttributes: {
        autocapitalize: 'off',
      },
      inputAutoFocus: true,
      inputValidator: (value) => {
        if (!value) {
          return 'Please enter hospital code';
        }
        return false;
      },
    });

    if (!result.value) {
      alert('Must enter a hospital code');
      return null;
    }

    return result.value as string;
  };

  static setConfig(config: SalAppConfig) {
    localStorage.setItem('sal-config$', JSON.stringify(config));
    localStorage.setItem(
      'sal-config-expiry$',
      new Date(dayjs().add(10, 'minutes').toDate()).getTime().toString(),
    );
    localStorage.setItem(
      'sal-config-origin$',
      window.location.origin.replace(/^https?:\/\/|\/$/g, ''),
    );
    localStorage.setItem('sal-config-code$', config.hospital.sub_domain);

    console.log('CONFIG', this.config);
    window.location.reload();
  }

  static clearConfig(force = false) {
    return Swal.fire({
      text: `You are currently connected to ${
        ConfigService.validConfig.config?.hospital?.name ?? 'an organization'
      }. Do you want to keep the settings?`,
      icon: 'warning',
      showDenyButton: true,
      denyButtonText: 'No',
      confirmButtonText: 'Yes',
      showCancelButton: false,
      confirmButtonColor: '#1e88e5',
    }).then((res) => {
      if (res.isDenied) {
        localStorage.removeItem('sal-config$');
        localStorage.removeItem('sal-config-expiry$');
        localStorage.removeItem('sal-config-origin$');
        localStorage.removeItem('sal-config-code$');
      }
    });
  }

  static get validConfig() {
    const storedConfig: SalAppConfig = JSON.parse(localStorage.getItem('sal-config$') || '{}');
    const storedConfigExpiry = Number(localStorage.getItem('sal-config-expiry$'));
    const storedConfigOrigin = localStorage.getItem('sal-config-origin$');
    const storedConfigCode = localStorage.getItem('sal-config-code$');

    return {
      config: storedConfig,
      isValid:
        storedConfigOrigin === window.location.origin.replace(/^https?:\/\/|\/$/g, '') &&
        storedConfig &&
        storedConfigExpiry &&
        dayjs().isBefore(storedConfigExpiry) &&
        storedConfig?.hospital?.sub_domain === storedConfigCode,
    };
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
    care_api: string;
    hmo_api: string;
    production: boolean;
    url: string;
    records_api: string;
    clinicals_api: string;
    clinicals_engine_api: string;
    medical_history_v2_api: string;
    notification_api: string;
    NOTIFICATION_SOCKET_api_V2: string;
    medical_history_api: string;
    medical_history_golang_api: string;
    pharmacy_api: string;
    old_pharmacy_api: string;
    procedure_api: string;
    staff_api: string;
    services_api: string;
    finance_api: string;
    lab_api: string;
    admission_api: string;
    mobile_api: string;
    upload_file_api: string;
    store_api: string;
    user_guide_api: string;
    emailUrl: string;
    messaging_api: string;
    socket_api: string;
    keycloak_base_url: string;
    keycloak_realm: string;
    keycloak_client_id: string;
    [key: string]: any;
  };
  messaging_mode: 'TWILIO' | 'INVIDEO';
  keycloakConfig?: {
    clientId: string;
    realm: string;
    url: string;
  };
  initOptions?: {
    onLoad: KeycloakOnLoad;
    silentCheckSsoRedirectUri: string;
  };
  ZEGO_APP_ID: number;
  tiny_mc: {
    api_key: string;
  };
}

export function initializer(
  keycloak: KeycloakService,
  configService: ConfigService,
): () => Promise<boolean> {
  return async (): Promise<boolean> => {
    if (typeof window === 'undefined') return true;

    try {
      await configService.loadConfig();

      if (!configService.config) return true;

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

      return await keycloak.init(options);
    } catch {
      return true;
    }
  };
}
