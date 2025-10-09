import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    NzCardModule,
    NzStatisticModule,
    NzGridModule,
    NzTagModule,
    NzAvatarModule,
  ],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {
  topMetrics = {
    patients: {
      total: 1024,
      linkedDevices: 786,
    },
    bpReadings: {
      total: 342,
      avgPerPatient: 2.1,
    },
    glucoseReadings: {
      total: 289,
      avgPerPatient: 1.7,
    },
    users: {
      total: 42,
      active: 40,
    },
  };

  accountStatus = {
    active: 997,
    inactive: 25,
    suspended: 2,
  };

  todayMeasurements = {
    bp: 342,
    glucose: 289,
  };

  get activeAccountsPercentage(): number {
    const total =
      this.accountStatus.active + this.accountStatus.inactive + this.accountStatus.suspended;
    return Math.round((this.accountStatus.active / total) * 100);
  }
}
