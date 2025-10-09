import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzLayoutModule } from 'ng-zorro-antd/layout';
import { NzMenuModule } from 'ng-zorro-antd/menu';

@Component({
  selector: 'app-layout',
  imports: [CommonModule, NzLayoutModule, NzMenuModule, NzIconModule, RouterModule],
  templateUrl: './layout.html',
  styleUrl: './layout.scss',
})
export class Layout {
  isCollapsed = false;

  logout(): void {
    console.log('Logout clicked');
  }
}
