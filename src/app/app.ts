import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';
import { ConfigService } from './configurations.helper';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `
    @if (isInitializing) {
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Initializing application...</p>
    </div>
    } @else {
    <router-outlet />
    }
  `,
  styles: [
    `
      .loading-container {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100vh;
        background: #f0f2f5;
      }

      .spinner {
        width: 50px;
        height: 50px;
        border: 4px solid #f3f3f3;
        border-top: 4px solid #1890ff;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }

      p {
        margin-top: 20px;
        color: #666;
        font-size: 16px;
      }
    `,
  ],
})
export class App implements OnInit {
  isInitializing = true;

  constructor(private keycloak: KeycloakService, private configService: ConfigService) {}

  async ngOnInit() {
    const hasConfig = !!this.configService.config;
    const isAuthenticated = await this.keycloak.isLoggedIn();

    console.log('App Init - Config:', hasConfig, 'Authenticated:', isAuthenticated);

    if (hasConfig && isAuthenticated) {
      this.isInitializing = false;
    } else {
      console.log('Waiting for initialization...');
    }
  }
}
