import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzEmptyModule } from 'ng-zorro-antd/empty';
import { NzSpinModule } from 'ng-zorro-antd/spin';
import { NzDividerModule } from 'ng-zorro-antd/divider';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { NzMessageService } from 'ng-zorro-antd/message';
import { DeviceService } from '../../device.service';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
}

interface LinkedDevice {
  id: number;
  name: string;
  deviceId: string;
  type: string;
  hospitalNumber?: string;
  status: string;
}

@Component({
  selector: 'app-view-monitor-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    NzModalModule,
    NzTableModule,
    NzButtonModule,
    NzIconModule,
    NzTagModule,
    NzEmptyModule,
    NzSpinModule,
    NzDividerModule,
    NzPopconfirmModule,
  ],
  template: `
    <nz-modal
      [(nzVisible)]="isVisible"
      [nzTitle]="'Monitor Details'"
      [nzClosable]="true"
      [nzMaskClosable]="true"
      [nzWidth]="800"
      (nzOnCancel)="handleCancel()"
      [nzFooter]="modalFooter"
    >
      <ng-container *nzModalContent>
        <div *ngIf="user" class="monitor-info">
          <div class="info-section">
            <h3 class="section-title">Monitor Information</h3>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Name:</span>
                <span class="info-value">{{ user.name }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Email:</span>
                <span class="info-value">{{ user.email }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Phone:</span>
                <span class="info-value">{{ user.phone }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Role:</span>
                <nz-tag [nzColor]="getRoleColor(user.role)">{{ user.role }}</nz-tag>
              </div>
              <div class="info-item">
                <span class="info-label">Status:</span>
                <nz-tag [nzColor]="user.status === 'Active' ? 'success' : 'default'">
                  {{ user.status }}
                </nz-tag>
              </div>
            </div>
          </div>

          <nz-divider></nz-divider>

          <div class="devices-section">
            <div class="section-header">
              <h3 class="section-title">Linked Devices ({{ linkedDevices.length }})</h3>
              <button
                *ngIf="linkedDevices.length > 0"
                nz-button
                nzType="default"
                nzDanger
                nz-popconfirm
                nzPopconfirmTitle="Are you sure you want to unassign all devices from this monitor?"
                nzPopconfirmPlacement="left"
                (nzOnConfirm)="unassignAllDevices()"
                [disabled]="isUnassigning"
              >
                <span nz-icon nzType="disconnect"></span>
                Unassign All
              </button>
            </div>

            <nz-spin [nzSpinning]="isLoading">
              <nz-table
                *ngIf="linkedDevices.length > 0"
                #devicesTable
                [nzData]="linkedDevices"
                [nzShowPagination]="linkedDevices.length > 10"
                [nzPageSize]="10"
                [nzSize]="'middle'"
              >
                <thead>
                  <tr>
                    <th>Device Name</th>
                    <th>Device ID</th>
                    <th>Type</th>
                    <th>Hospital Number</th>
                    <th>Status</th>
                    <th nzWidth="120px" nzAlign="center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let device of devicesTable.data">
                    <td>{{ device.name }}</td>
                    <td>
                      <span class="device-id">{{ device.deviceId }}</span>
                    </td>
                    <td>
                      <nz-tag [nzColor]="getDeviceTypeColor(device.type)">
                        <span nz-icon [nzType]="getDeviceIcon(device.type)"></span>
                        {{ device.type }}
                      </nz-tag>
                    </td>
                    <td>{{ device.hospitalNumber || 'N/A' }}</td>
                    <td>
                      <nz-tag [nzColor]="device.status === 'In Use' ? 'processing' : 'success'">
                        {{ device.status }}
                      </nz-tag>
                    </td>
                    <td nzAlign="center">
                      <button
                        nz-button
                        nzType="link"
                        nzDanger
                        nz-popconfirm
                        nzPopconfirmTitle="Are you sure you want to unassign this device?"
                        nzPopconfirmPlacement="left"
                        (nzOnConfirm)="unassignDevice(device)"
                        [disabled]="isUnassigning"
                      >
                        <span nz-icon nzType="disconnect"></span>
                        Unassign
                      </button>
                    </td>
                  </tr>
                </tbody>
              </nz-table>

              <nz-empty
                *ngIf="!isLoading && linkedDevices.length === 0"
                nzNotFoundContent="No devices linked to this monitor"
                [nzNotFoundImage]="'simple'"
              ></nz-empty>
            </nz-spin>
          </div>
        </div>
      </ng-container>

      <ng-template #modalFooter>
        <button nz-button nzType="default" (click)="handleCancel()">Close</button>
      </ng-template>
    </nz-modal>
  `,
  styles: [
    `
      .monitor-info {
        padding: 8px 0;
      }

      .info-section {
        margin-bottom: 16px;
      }

      .section-title {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 16px;
        color: rgba(0, 0, 0, 0.85);
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
      }

      .info-item {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .info-label {
        font-weight: 500;
        color: rgba(0, 0, 0, 0.65);
      }

      .info-value {
        color: rgba(0, 0, 0, 0.85);
      }

      .devices-section {
        margin-top: 16px;
      }

      .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }

      .device-id {
        font-family: 'Courier New', monospace;
        font-size: 12px;
        color: rgba(0, 0, 0, 0.65);
      }

      nz-divider {
        margin: 24px 0;
      }
    `,
  ],
})
export class ViewMonitorDetailsDialog implements OnChanges {
  @Input() isVisible = false;
  @Input() user: User | null = null;
  @Output() isVisibleChange = new EventEmitter<boolean>();
  @Output() deviceUnassigned = new EventEmitter<number>();
  @Output() devicesUnassigned = new EventEmitter<number[]>();

  linkedDevices: LinkedDevice[] = [];
  isLoading = false;
  isUnassigning = false;

  constructor(private deviceService: DeviceService, private message: NzMessageService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (
      (changes['user'] && this.user && this.isVisible) ||
      (changes['isVisible'] && this.isVisible && this.user)
    ) {
      this.loadLinkedDevices();
    }
  }

  private loadLinkedDevices(): void {
    if (!this.user) return;
    this.isLoading = true;

    this.deviceService.getDevicesAssignedToMonitor(this.user.id).subscribe({
      next: (devices: any[]) => {
        this.linkedDevices = devices.map((d) => ({
          id: d.id,
          name: d.device_name || d.model || d.name || 'Unknown',
          deviceId: d.device_id || d.deviceID || d.deviceId || '',
          type: d.device_type || d.type || 'Unknown',
          hospitalNumber: d.user_identity || d.hospitalNumber || '',
          status: d.is_active ? 'In Use' : 'Available',
        }));
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to load linked devices:', err);
        this.message.error('Failed to load linked devices');
        this.linkedDevices = [];
        this.isLoading = false;
      },
    });
  }

  unassignDevice(device: LinkedDevice): void {
    if (!this.user) return;

    this.isUnassigning = true;
    const hideMessage = this.message.loading('Unassigning device...', { nzDuration: 0 }).messageId;

    this.deviceService
      .updateDevice(device.id, { device_monitor_id: null })
      .pipe(
        finalize(() => {
          this.isUnassigning = false;
          this.message.remove(hideMessage);
        })
      )
      .subscribe({
        next: () => {
          this.message.success(`Device "${device.name}" unassigned successfully`);
          this.loadLinkedDevices();
          this.deviceUnassigned.emit(device.id);
        },
        error: (err) => {
          console.error('Failed to unassign device:', err);
          this.message.error('Failed to unassign device. Please try again.');
        },
      });
  }

  unassignAllDevices(): void {
    if (!this.user || this.linkedDevices.length === 0) return;

    this.isUnassigning = true;
    const deviceIds = this.linkedDevices.map((d) => d.id);
    const hideMessage = this.message.loading(`Unassigning ${deviceIds.length} device(s)...`, {
      nzDuration: 0,
    }).messageId;

    const unassignRequests = deviceIds.map((deviceId) =>
      this.deviceService.updateDevice(deviceId, { device_monitor_id: null })
    );

    forkJoin(unassignRequests)
      .pipe(
        finalize(() => {
          this.isUnassigning = false;
          this.message.remove(hideMessage);
        })
      )
      .subscribe({
        next: () => {
          this.message.success(`Successfully unassigned ${deviceIds.length} device(s)`);
          this.devicesUnassigned.emit(deviceIds);
          this.loadLinkedDevices();
        },
        error: (err) => {
          console.error('Failed to unassign devices:', err);
          this.message.error('Failed to unassign some devices. Please try again.');
          this.loadLinkedDevices();
        },
      });
  }

  getRoleColor(role: string): string {
    const colors: Record<string, string> = {
      DOCTOR: 'blue',
      NURSE: 'green',
      CAREGIVER: 'orange',
      ADMIN: 'purple',
    };
    return colors[role] || 'default';
  }

  getDeviceTypeColor(type: string): string {
    const t = (type || '').toLowerCase();
    if (t.includes('bp') || t.includes('pressure') || t.includes('blood')) return 'red';
    if (t.includes('glu')) return 'orange';
    return 'blue';
  }

  getDeviceIcon(type: string): string {
    const t = (type || '').toLowerCase();
    if (t.includes('bp') || t.includes('pressure') || t.includes('blood')) return 'heart';
    if (t.includes('glu')) return 'experiment';
    return 'dashboard';
  }

  handleCancel(): void {
    this.isVisible = false;
    this.isVisibleChange.emit(false);
    this.linkedDevices = [];
  }
}
