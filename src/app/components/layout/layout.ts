import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';
import { KeycloakService } from 'keycloak-angular';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-layout',
  imports: [CommonModule, NzLayoutModule, NzMenuModule, NzIconModule, RouterModule],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  isCollapsed = false;

  private keycloak = inject(KeycloakService);
  private message = inject(NzMessageService);

  async logout(): Promise<void> {
    try {
      this.message.info('Logging out...', { nzDuration: 2000 });
      await this.keycloak.logout(window.location.origin);
    } catch (err) {
      console.error('Logout error:', err);
      this.message.error('Error during logout');
    }
  }
}
