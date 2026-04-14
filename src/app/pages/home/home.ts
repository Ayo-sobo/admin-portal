import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzCardModule } from 'ng-zorro-antd/card';
import { NzStatisticModule } from 'ng-zorro-antd/statistic';
import { NzGridModule } from 'ng-zorro-antd/grid';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { DeviceService } from '../../device.service';
import { HttpClient } from '@angular/common/http';
import { forkJoin, finalize } from 'rxjs';
import { env } from 'process';
import { environment } from '../../../environments/environment';
import { KeycloakService } from 'keycloak-angular';

interface ReadingData {
  user_name: string;
  reading: string;
  readingColor: string;
  user_phone?: string;
  recorded_at: string;
  systolic?: number;
  diastolic?: number;
  glucose_level?: number;
}

interface DateRange {
  start: string;
  end: string;
}

type ReadingType = 'bp' | 'glucose';

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
    NzModalModule,
    NzTableModule,
    NzSpinModule,
    NzButtonModule,
    NzIconModule,
  ],
  templateUrl: './home.html',
  styleUrls: ['./home.scss'],
})
export class Home implements OnInit {
  topMetrics = {
    totalDevices: 0,
    totalBPDevices: 0,
    totalGlucometers: 0,
    todayBP: 0,
    todayGlucose: 0,
  };

  accountStatus = {
    active: 0,
    inactive: 0,
    suspended: 0,
  };

  loading = true;
  isDialogVisible = false;
  dialogTitle = '';
  dialogLoading = false;
  readingsData: ReadingData[] = [];
  private allReadingsData: ReadingData[] = [];
  currentPage = 0;
  pageSize = 50;
  readingType: ReadingType = 'bp';
  hasNextPage = false;

  private readingsCache: { [key in ReadingType]: ReadingData[] | null } = {
    bp: null,
    glucose: null,
  };

  constructor(private deviceService: DeviceService, private http: HttpClient, private keycloak: KeycloakService) {}

  ngOnInit(): void {
    this.loadDeviceStats();
  }
  private getHeaderOptions() {
    return {
      'Content-Type': 'application/json',
      authorization: `Bearer ${this.keycloak.getKeycloakInstance().token}`,
    };
  }

  private getTodayDateRange(): DateRange {
    const today = new Date().toISOString().split('T')[0];
    return {
      start: `${today}T00:00:00.000Z`,
      end: `${today}T23:59:59.999Z`,
    };
  }

  private filterListByToday(list: any[], dateRange: DateRange): any[] {
    return list.filter((r) => {
      const d = r.recorded_at || r.createdAt || r.created_at || '';
      return d >= dateRange.start && d <= dateRange.end;
    });
  }

  splitPhones(phones: string = ''): string[] {
    return phones
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  loadDeviceStats(): void {
    this.loading = true;

    const allDevicesReq = this.deviceService.getDevices({ page: 0, limit: 1 });
    const bpDevicesReq = this.http.post<any>(`${environment.nexusUrl}/device/filter`, {
      filter: { device_type: 'BP_MONITOR' },
      limit: 1,
      page: 0,
    }, { headers: this.getHeaderOptions() });
    const glucoseDevicesReq = this.http.post<any>(`${environment.nexusUrl}/device/filter`, {
      filter: { device_type: 'GLUCOMETER' },
      limit: 1,
      page: 0,
    }, { headers: this.getHeaderOptions() });

    forkJoin({
      all: allDevicesReq,
      bp: bpDevicesReq,
      glucose: glucoseDevicesReq,
    })
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => {
          this.topMetrics.totalDevices = res.all.pagination?.total_items || 0;
          this.topMetrics.totalBPDevices = res.bp.pagination?.total_items || 0;
          this.topMetrics.totalGlucometers = res.glucose.pagination?.total_items || 0;
          this.loadTodayReadingsCounts();
        },
        error: (err) => console.error('Failed to load device stats', err),
      });
  }

  loadTodayReadingsCounts(): void {
    const dateRange = this.getTodayDateRange();
    const READINGS_LIMIT = 500;

    const bpRequest = this.http.post<{ list: any[] }>(
      `${environment.nexusUrl}/blood-pressure/filter`,
      { filter: {}, orderBy: 'createdAt', order: 'DESC', page: 0, limit: READINGS_LIMIT }, { headers: this.getHeaderOptions() }
    );

    const glucoseRequest = this.http.post<{ list: any[] }>(
      `${environment.nexusUrl}/glucometer/filter`,
      { filter: {}, orderBy: 'createdAt', order: 'DESC', page: 0, limit: READINGS_LIMIT }, { headers: this.getHeaderOptions() }
    );

    forkJoin({ bp: bpRequest, glucose: glucoseRequest }).subscribe({
      next: (results) => {
        const todayBP = this.filterListByToday(results.bp.list, dateRange);
        const todayGlucose = this.filterListByToday(results.glucose.list, dateRange);

        this.topMetrics.todayBP = todayBP.length;
        this.topMetrics.todayGlucose = todayGlucose.length;
        this.calculateAccountStatus();
      },
      error: (err) => console.error('Failed to load daily counts', err),
    });
  }

  calculateAccountStatus(): void {
    this.accountStatus.active = Math.floor(this.topMetrics.totalDevices * 0.9);
    this.accountStatus.inactive = Math.floor(this.topMetrics.totalDevices * 0.08);
    this.accountStatus.suspended =
      this.topMetrics.totalDevices - this.accountStatus.active - this.accountStatus.inactive;
  }

  showBPReadings(): void {
    this.readingType = 'bp';
    this.dialogTitle = "Today's Blood Pressure Readings";
    this.isDialogVisible = true;
    this.currentPage = 0;
    this.loadReadings();
  }

  showGlucoseReadings(): void {
    this.readingType = 'glucose';
    this.dialogTitle = "Today's Glucose Readings";
    this.isDialogVisible = true;
    this.currentPage = 0;
    this.loadReadings();
  }

  loadReadings(): void {
    const type = this.readingType;
    const cachedData = this.readingsCache[type];

    if (cachedData) {
      this.allReadingsData = cachedData;
      this.updatePaginatedData();
      return;
    }

    this.dialogLoading = true;
    const dateRange = this.getTodayDateRange();
    const limit = 500;

    const apiUrl =
      type === 'bp'
        ? `${environment.nexusUrl}/blood-pressure/filter`
        : `${environment.nexusUrl}/glucometer/filter`;

    const requestPayload = {
      filter: {},
      orderBy: 'createdAt',
      order: 'DESC',
      relations: ['device'],
      limit: limit,
      page: 0,
    };

    this.http.post<{ list: any[] }>(apiUrl, requestPayload).subscribe({
      next: (response) => {
        const list = response.list || [];

        const todayList = this.filterListByToday(list, dateRange);

        const formattedData = todayList.map((r) => {
          const device = r.device || {};

          if (type === 'bp') {
            const s = r.systolic_bp || r.systolic || r.sys || 0;
            const d = r.diastolic_bp || r.diastolic || r.dia || 0;
            const p = r.heart_rate || r.pulse || r.pul || 0;

            return {
              user_name: device.user_name || 'N/A',
              user_phone: device.user_phone || 'N/A',
              reading: `${s}/${d} (${p} bpm)`,
              readingColor: this.getBPColor(s, d),
              recorded_at: r.recorded_at || r.createdAt || r.created_at,
              systolic: s,
              diastolic: d,
            } as ReadingData;
          }

          const g = Number(r.glucose || r.glucose_level || 0);
          return {
            user_name: device.user_name || 'N/A',
            user_phone: device.user_phone || 'N/A',
            reading: `${g} mg/dL`,
            readingColor: this.getGlucoseColor(g),
            recorded_at: r.recorded_at || r.createdAt || r.created_at,
            glucose_level: g,
          } as ReadingData;
        });

        this.readingsCache[type] = formattedData;
        this.allReadingsData = formattedData;

        this.updatePaginatedData();
        this.dialogLoading = false;
      },
      error: (err) => {
        console.error(`Failed to load ${type} readings`, err);
        this.dialogLoading = false;
      },
    });
  }

  updatePaginatedData(): void {
    const start = this.currentPage * this.pageSize;
    const end = start + this.pageSize;
    this.readingsData = this.allReadingsData.slice(start, end);
    this.hasNextPage = end < this.allReadingsData.length;
  }

  nextPage(): void {
    if (this.hasNextPage) {
      this.currentPage++;
      this.updatePaginatedData();
    }
  }

  prevPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.updatePaginatedData();
    }
  }

  getStartIndex(): number {
    return this.currentPage * this.pageSize + 1;
  }

  getEndIndex(): number {
    return Math.min((this.currentPage + 1) * this.pageSize, this.allReadingsData.length);
  }

  getTotalItems(): number {
    return this.allReadingsData.length;
  }

  getBPColor(s: number, d: number): string {
    if (s >= 180 || d >= 120) return '#dc143c';
    if (s >= 140 || d >= 90) return '#ff6347';
    if (s >= 120 || d >= 80) return '#ffa500';
    return '#52c41a';
  }

  getGlucoseColor(g: number): string {
    if (g >= 200) return '#dc143c';
    if (g >= 140) return '#ff6347';
    if (g < 70) return '#ffa500';
    return '#52c41a';
  }

  closeDialog(): void {
    this.isDialogVisible = false;
    this.currentPage = 0;
    this.readingsData = [];
  }

  get activeAccountsPercentage(): number {
    const t =
      this.accountStatus.active + this.accountStatus.inactive + this.accountStatus.suspended;
    return t > 0 ? Math.round((this.accountStatus.active / t) * 100) : 0;
  }
}
