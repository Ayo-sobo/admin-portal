import { Component, OnInit, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NZ_MODAL_DATA, NzModalRef } from 'ng-zorro-antd/modal';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { Line } from '@antv/g2plot';
import { DeviceService, Device } from '../device.service';

interface BPVital {
  sys: string;
  dia: string;
  pul: string;
  createdAt: string;
}

interface GlucoseVital {
  glu: string;
  createdAt: string;
}

type Vital = BPVital | GlucoseVital;

@Component({
  selector: 'app-view-vitals-dialog',
  standalone: true,
  imports: [
    CommonModule,
    NzButtonModule,
    NzTableModule,
    NzSpinModule,
    NzEmptyModule,
    NzTagModule,
    NzDividerModule,
    NzIconModule,
  ],
  template: `
    <div class="vitals-dialog">
      <div class="dialog-header">
        <div class="header-content">
          <span nz-icon [nzType]="getDeviceIcon()" nzTheme="outline" class="device-icon"></span>
          <div>
            <h3 class="header-title">
              {{ device.device_name || 'Device Vitals' }}
              <span *ngIf="device.user_phone" class="phone-section">
                <button
                  nz-button
                  nzType="link"
                  class="call-btn"
                  (click)="callUser(device.user_phone)"
                  nz-tooltip="Call User"
                >
                  <span nz-icon nzType="phone" nzTheme="fill" class="call-icon"></span>
                  {{ formatPhone(device.user_phone) }}
                </button>
              </span>
            </h3>
            <p class="device-info">
              {{ getDeviceTypeDisplay(device.device_type) }} - {{ device.device_id }}
            </p>
          </div>
        </div>
      </div>

      <div class="dialog-body" *ngIf="!isLoading && vitals.length > 0">
        <div class="chart-section">
          <h4><span nz-icon nzType="line-chart"></span> Last 5 Readings Trend</h4>
          <div class="chart-container" #chartContainer></div>
        </div>

        <nz-divider></nz-divider>

        <div class="table-section">
          <h4><span nz-icon nzType="table"></span> Last 10 Readings</h4>
          <nz-table
            [nzData]="tableVitals"
            [nzShowPagination]="false"
            [nzSize]="'small'"
            class="vitals-table"
          >
            <thead>
              <tr>
                <th>Date & Time</th>
                <th *ngIf="isBPDevice()">Systolic (mmHg)</th>
                <th *ngIf="isBPDevice()">Diastolic (mmHg)</th>
                <th *ngIf="isBPDevice()">Pulse (bpm)</th>
                <th *ngIf="isGlucoseDevice()">Glucose (mg/dL)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let vital of tableVitals">
                <td>{{ formatDate(vital.createdAt) }}</td>

                <ng-container *ngIf="isBPDevice() && isBPVital(vital)">
                  <td>
                    <span [class.high]="isHighSystolic(vital.sys)">{{ vital.sys }}</span>
                  </td>
                  <td>
                    <span [class.high]="isHighDiastolic(vital.dia)">{{ vital.dia }}</span>
                  </td>
                  <td>{{ vital.pul }}</td>
                </ng-container>

                <ng-container *ngIf="isGlucoseDevice() && isGlucoseVital(vital)">
                  <td>
                    <span
                      [class.low]="isLowGlucose(vital.glu)"
                      [class.high]="isHighGlucose(vital.glu)"
                      [class.very-high]="isVeryHighGlucose(vital.glu)"
                      >{{ vital.glu }}</span
                    >
                  </td>
                </ng-container>

                <td>
                  <nz-tag [nzColor]="getStatusColor(vital)">{{ getStatus(vital) }}</nz-tag>
                </td>
              </tr>
            </tbody>
          </nz-table>
        </div>
      </div>

      <div class="loading-container" *ngIf="isLoading">
        <nz-spin nzSimple [nzSize]="'large'"></nz-spin>
        <p>Loading vitals data...</p>
      </div>

      <div class="empty-container" *ngIf="!isLoading && vitals.length === 0">
        <nz-empty
          nzNotFoundContent="No vitals data available for this device"
          [nzNotFoundImage]="'simple'"
        ></nz-empty>
      </div>

      <div class="dialog-footer">
        <button nz-button nzType="default" (click)="onClose()">Close</button>
      </div>
    </div>
  `,
  styles: [
    `
      .vitals-dialog {
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        background: #fff;
      }

      .dialog-header {
        padding: 20px 24px;
        border-bottom: 1px solid #f0f0f0;
        background: #fafafa;
      }

      .header-content {
        display: flex;
        align-items: center;
        gap: 12px;
        flex-wrap: wrap;
      }

      .header-title {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 10px;
      }

      .phone-section {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .call-btn {
        padding: 0;
        display: flex;
        align-items: center;
        font-weight: 500;
      }

      .call-icon {
        color: #1890ff;
        font-size: 16px;
        margin-right: 4px;
      }

      .call-btn:hover .call-icon {
        color: #40a9ff;
      }

      .device-icon {
        font-size: 32px;
        color: #1890ff;
      }

      .device-info {
        font-size: 13px;
        color: #8c8c8c;
        margin: 0;
      }

      .dialog-body {
        padding: 24px;
        overflow-y: auto;
        flex: 1;
      }

      .chart-section {
        margin-bottom: 24px;
      }

      .chart-container {
        background: #fff;
        padding: 16px;
        border-radius: 8px;
        border: 1px solid #f0f0f0;
        height: 320px;
      }

      .vitals-table {
        background: #fff;
        border-radius: 8px;
        border: 1px solid #f0f0f0;
        overflow-x: auto;
      }

      .vitals-table table {
        width: 100%;
        min-width: 600px;
      }

      .high {
        color: #ff4d4f;
        font-weight: 600;
      }

      .low {
        color: #faad14;
        font-weight: 600;
      }

      .very-high {
        color: #722ed1;
        font-weight: 700;
      }

      .loading-container,
      .empty-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 60px 24px;
        gap: 16px;
        text-align: center;
      }

      .dialog-footer {
        padding: 16px 24px;
        border-top: 1px solid #f0f0f0;
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        background: #fafafa;
      }

      @media (max-width: 768px) {
        .dialog-header {
          padding: 16px;
        }
        .device-icon {
          font-size: 26px;
        }
        .header-content h3 {
          font-size: 16px;
        }
        .device-info {
          font-size: 12px;
        }
        .dialog-body {
          padding: 16px;
        }
        .chart-container {
          height: 260px;
          padding: 12px;
        }
        .chart-section h4,
        .table-section h4 {
          font-size: 14px;
          margin-bottom: 8px;
        }
        .vitals-table {
          font-size: 13px;
          border-radius: 6px;
        }
        .vitals-table table {
          min-width: 520px;
        }
        .dialog-footer {
          flex-direction: column-reverse;
          align-items: stretch;
          gap: 10px;
          padding: 12px 16px;
        }
        .dialog-footer button {
          width: 100%;
          height: 38px;
          font-size: 14px;
        }
      }

      @media (max-width: 480px) {
        .dialog-header {
          padding: 12px;
        }
        .device-icon {
          font-size: 22px;
        }
        .header-content h3 {
          font-size: 15px;
        }
        .dialog-body {
          padding: 12px;
        }
        .chart-container {
          height: 220px;
          padding: 10px;
        }
        .vitals-table {
          font-size: 12px;
        }
        .vitals-table table {
          min-width: 450px;
        }
        .dialog-footer button {
          font-size: 13px;
        }
      }
    `,
  ],
})
export class ViewVitalsDialogComponent implements OnInit {
  readonly nzModalData = inject(NZ_MODAL_DATA) as { device: Device; vitalsData?: any };
  private modalRef = inject(NzModalRef);
  private deviceService = inject(DeviceService);

  device!: Device;
  vitals: Vital[] = [];
  tableVitals: Vital[] = [];
  isLoading = true;

  @ViewChild('chartContainer', { static: false }) chartContainer!: ElementRef;
  private chart: Line | null = null;

  constructor() {
    this.device = this.nzModalData.device;
  }

  ngOnInit(): void {
    const { device, vitalsData } = this.nzModalData;
    this.device = device;

    const vitalsList = Array.isArray(vitalsData?.list)
      ? vitalsData.list
      : Array.isArray(vitalsData)
      ? vitalsData
      : Array.isArray(vitalsData?.data)
      ? vitalsData.data
      : [];

    if (vitalsList.length > 0) {
      this.isLoading = false;
      this.tableVitals = this.mapVitals(vitalsList);
      this.vitals = this.tableVitals.slice(0, 5).reverse();
      setTimeout(() => this.renderChart(), 0);
    } else {
      this.isLoading = false;
      console.warn('No vitals found in response', vitalsData);
    }
  }

  private mapVitals(list: any[]): Vital[] {
    if (this.isBPDevice()) {
      return list.map((item) => ({
        sys: item.sys?.toString() || this.tryParse(item.readings, 'SYS') || '0',
        dia: item.dia?.toString() || this.tryParse(item.readings, 'DIA') || '0',
        pul: item.pul?.toString() || this.tryParse(item.readings, 'PUL') || '0',
        createdAt:
          item.deviceTime ||
          item.createdAt ||
          item.created_at ||
          this.tryParse(item.readings, 'createtime'),
      }));
    } else {
      return list.map((item) => ({
        glu: item.glucose?.toString() || this.tryParse(item.readings, 'GLU') || '0',
        createdAt:
          item.deviceTime ||
          item.createdAt ||
          item.created_at ||
          this.tryParse(item.readings, 'createtime'),
      }));
    }
  }

  private tryParse(readings: string, key: string): string | undefined {
    try {
      const parsed = JSON.parse(readings || '{}');
      return parsed[key];
    } catch {
      return undefined;
    }
  }

  public renderChart(): void {
    if (!this.chartContainer) return;
    const chartData = this.prepareChartData();
    this.chart = new Line(this.chartContainer.nativeElement, chartData.config);
    this.chart.render();
  }

  private prepareChartData() {
    if (this.isBPDevice()) {
      const bpVitals = this.vitals as BPVital[];
      const data = bpVitals.flatMap((vital) => {
        const time = new Date(vital.createdAt).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
        return [
          { time, value: +vital.sys, type: 'Systolic' },
          { time, value: +vital.dia, type: 'Diastolic' },
          { time, value: +vital.pul, type: 'Pulse' },
        ];
      });
      return {
        config: {
          data,
          xField: 'time',
          yField: 'value',
          seriesField: 'type',
          smooth: true,
          color: ['#1890ff', '#ff4d4f', '#52c41a'],
          point: { size: 4, shape: 'circle' },
          legend: { position: 'top' as const },
        },
      };
    } else {
      const glucoseVitals = this.vitals as GlucoseVital[];
      const data = glucoseVitals.map((vital) => ({
        time: new Date(vital.createdAt).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
        value: +vital.glu,
        type: 'Glucose',
      }));
      return {
        config: {
          data,
          xField: 'time',
          yField: 'value',
          seriesField: 'type',
          smooth: true,
          color: ['#722ed1'],
          point: { size: 4, shape: 'circle' },
          legend: { position: 'top' as const },
        },
      };
    }
  }

  public isBPDevice() {
    return this.device.device_type === 'BP_MONITOR' || this.device.device_type === 'PARAMONITOR';
  }

  public isGlucoseDevice() {
    return this.device.device_type === 'GLUCOMETER';
  }

  public isBPVital(v: Vital): v is BPVital {
    return 'sys' in v;
  }

  public isGlucoseVital(v: Vital): v is GlucoseVital {
    return 'glu' in v;
  }

  public isHighSystolic(v: string): boolean {
    return +v > 140;
  }

  public isHighDiastolic(v: string): boolean {
    return +v > 90;
  }

  public isHighGlucose(v: string): boolean {
    const value = +v;
    return value > 140 && value < 250;
  }

  public isVeryHighGlucose(v: string): boolean {
    return +v >= 250;
  }

  public isLowGlucose(v: string): boolean {
    return +v < 70;
  }

  public getStatus(v: Vital): string {
    if (this.isBPVital(v)) {
      const sys = +v.sys,
        dia = +v.dia;
      if (sys > 140 || dia > 90) return 'High';
      if (sys < 90 || dia < 60) return 'Low';
      return 'Normal';
    } else if (this.isGlucoseVital(v)) {
      const glu = +v.glu;
      if (glu >= 250) return 'Very High';
      if (glu > 140) return 'High';
      if (glu < 70) return 'Low';
      return 'Normal';
    }
    return 'Unknown';
  }

  public getStatusColor(v: Vital): string {
    const s = this.getStatus(v);
    switch (s) {
      case 'Very High':
        return 'magenta';
      case 'High':
        return 'red';
      case 'Low':
        return 'orange';
      case 'Normal':
        return 'green';
      default:
        return 'default';
    }
  }

  public formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  public getDeviceTypeDisplay(type: string) {
    const map: any = {
      BP_MONITOR: 'Blood Pressure Monitor',
      GLUCOMETER: 'Glucometer',
      PARAMONITOR: 'All-in-One Monitor',
    };
    return map[type] || type;
  }

  public getDeviceIcon() {
    const t = (this.device.device_type || '').toLowerCase();
    if (t.includes('bp') || t.includes('blood')) return 'heart';
    if (t.includes('glu')) return 'experiment';
    return 'dashboard';
  }

  public formatPhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }
    return phone;
  }

  public callUser(phone: string): void {
    const sanitized = phone.replace(/\D/g, '');
    window.open(`tel:${sanitized}`, '_self');
  }

  public onClose() {
    this.modalRef.close();
  }
}
