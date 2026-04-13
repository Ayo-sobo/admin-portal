interface InitOptions {
  onLoad: 'check-sso';
  flow: 'standard';
}

const initOptions: InitOptions = {
  onLoad: 'check-sso',
  flow: 'standard',
};

export const environment = {
  nexusUrl: 'https://nexus.drsavealife.com',
  production: true,
  baseUrlServiceService: 'https://api.drsavealife.com/v1/service-service',
  emailUrl: 'https://develop.drsavealife.com/v1/mail-service',
  baseUrlLabService: 'https://api.drsavealife.com/v1/lab-service',
  baseUrlRecordsService: 'https://api.drsavealife.com/v1/records-api',

  baseUrlMedical_history_service: 'https://api.drsavealife.com/v1/medical-history-service',
  baseUrlFinanceService: 'https://api.drsavealife.com/v1/sal-finance',
  baseUrlAdmissionService: 'https://api.drsavealife.com/v1/admission-service',
  url: 'https://api.drsavealife.com/v1',
  user_guide_url_lab:
    'https://home-clinic.gitbook.io/home-clinic/laboratory-and-radiology/laboratory',
  user_guide_url_rad:
    'https://home-clinic.gitbook.io/home-clinic/laboratory-and-radiology/radiology',
  socket_url: 'https://notification.drsavealife.com',
  keycloakConfig: {
    clientId: 'entry-app',
    realm: 'SaveALife',
    url: 'https://secure.drsavealife.com/auth',
  },
  initOptions: {
    onLoad: initOptions.onLoad,
    silentCheckSsoRedirectUri: window.location.origin + '/assets/silent-check-sso.html',
  },
};
