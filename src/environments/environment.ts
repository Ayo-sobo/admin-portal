interface InitOptions {
  onLoad: any;
  flow: string;
}

const initOptions: InitOptions = {
  onLoad: 'login-required',
  flow: 'standard',
};

export const environment = {
  production: false,
  nexusUrl: 'https://nexus.drsavealife.com',
  // nexusUrl:'http://localhost:8888',
  baseUrlServiceService: 'https://savealifetechhub.com/services-api',
  emailUrl: 'https://savealifetechhub.com/mail-service',
  // emailUrl : `http://localhost:4344`,
  // baseUrlLabService: 'https://savealifetechhub.com/lab-api',
  baseUrlLabService: 'https://savealifetechhub.com/lab-api',

  // baseUrlRecordsService: 'https://develop.drsavealife.com/v1/records-api',
  baseUrlRecordsService: 'https://savealifetechhub.com/records-api',

  baseUrlMedical_history_service: 'https://savealifetechhub.com/medical-history-api',
  baseUrlFinanceService: 'https://savealifetechhub.com/finance-api',
  baseUrlAdmissionService: 'https://savealifetechhub.com/admission-api',
  url: 'https://savealifetechhub.com/',
  user_guide_url_lab:
    'https://home-clinic.gitbook.io/home-clinic/laboratory-and-radiology/laboratory',
  user_guide_url_rad:
    'https://home-clinic.gitbook.io/home-clinic/laboratory-and-radiology/radiology',
  socket_url: 'https://savealifetechhub.com',
  keycloakConfig: {
    clientId: 'entry-app',
    realm: 'SaveALifeSandbox',
    url: 'https://secure.drsavealife.com/auth',
  },
  initOptions: {
    onLoad: initOptions.onLoad,
    silentCheckSsoRedirectUri: window.location.origin + '/assets/silent-check-sso.html',
  },
};
