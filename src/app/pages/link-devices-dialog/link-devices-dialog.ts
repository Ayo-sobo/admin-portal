import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';

interface Device {
  id: number;
  name: string;
  deviceId: string;
  type: string;
  status: 'Available' | 'In Use';
}

interface User {
  id: number;
  name: string;
  email: string;
}

@Component({
  selector: 'app-link-devices-dialog',
  imports: [
    CommonModule,
    FormsModule,
    NzModalModule,
    NzSelectModule,
    NzInputModule,
    NzTableModule,
    NzButtonModule,
    NzIconModule,
    NzTagModule,
  ],
  templateUrl: './link-devices-dialog.html',
  styleUrl: './link-devices-dialog.scss',
})
export class LinkDevicesDialog {
  @Input() isVisible = false;
  @Input() users: User[] = [];
  @Output() isVisibleChange = new EventEmitter<boolean>();
  @Output() devicesAssigned = new EventEmitter<{ userId: number; devices: Device[] }>();

  selectedUserId: number | null = null;
  searchText = '';
  selectedType = 'all';
  selectedDevices: Device[] = [];

  allDevices: Device[] = [
    { id: 1, name: 'Omron M7', deviceId: 'BP-88231', type: 'Blood Pressure', status: 'Available' },
    {
      id: 2,
      name: 'Accu-Chek Guide',
      deviceId: 'GL-55201',
      type: 'Glucometer',
      status: 'Available',
    },
    { id: 3, name: 'Omron M3', deviceId: 'BP-77102', type: 'Blood Pressure', status: 'In Use' },
    {
      id: 4,
      name: 'OneTouch Ultra',
      deviceId: 'GL-33401',
      type: 'Glucometer',
      status: 'Available',
    },
    { id: 5, name: 'Omron M6', deviceId: 'BP-99521', type: 'Blood Pressure', status: 'Available' },
  ];

  get filteredDevices(): Device[] {
    return this.allDevices.filter((device) => {
      const matchesSearch =
        !this.searchText ||
        device.name.toLowerCase().includes(this.searchText.toLowerCase()) ||
        device.deviceId.toLowerCase().includes(this.searchText.toLowerCase());

      const matchesType = this.selectedType === 'all' || device.type === this.selectedType;

      return matchesSearch && matchesType;
    });
  }

  getDeviceIcon(type: string): string {
    return type === 'Blood Pressure' ? 'heart' : 'experiment';
  }

  isDeviceSelected(device: Device): boolean {
    return this.selectedDevices.some((d) => d.id === device.id);
  }

  selectDevice(device: Device): void {
    if (!this.isDeviceSelected(device)) {
      this.selectedDevices.push(device);
    }
  }

  removeDevice(device: Device): void {
    this.selectedDevices = this.selectedDevices.filter((d) => d.id !== device.id);
  }

  clearSelection(): void {
    this.selectedDevices = [];
  }

  handleCancel(): void {
    this.isVisible = false;
    this.isVisibleChange.emit(false);
    this.resetDialog();
  }

  assignDevices(): void {
    if (this.selectedUserId && this.selectedDevices.length > 0) {
      this.devicesAssigned.emit({
        userId: this.selectedUserId,
        devices: this.selectedDevices,
      });
      this.handleCancel();
    }
  }

  resetDialog(): void {
    this.selectedUserId = null;
    this.searchText = '';
    this.selectedType = 'all';
    this.selectedDevices = [];
  }
}
