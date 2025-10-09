import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';

@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzButtonModule,
    NzIconModule,
    NzTableModule,
    NzInputModule,
    NzPaginationModule,
    NzSelectModule,
  ],
  templateUrl: './devices.html',
  styleUrls: ['./devices.scss'],
})
export class Devices {
  searchTerm: string = '';
  selectedDeviceType: string = 'All';
  selectedPeriod: string = 'This month';

  pageIndex = 1;
  pageSize = 20;
  totalDevices = 0;

  devices = [
    {
      name: 'Adaora Okafor',
      hospitalNumber: 'HN-20483',
      deviceId: 'BP-88231',
      type: 'Blood Pressure',
      createdAt: '2025-09-12',
    },
    {
      name: 'Samuel Nwosu',
      hospitalNumber: 'HN-11821',
      deviceId: 'GL-55201',
      type: 'Glucometer',
      createdAt: '2025-08-03',
    },
    {
      name: 'Maryam Bello',
      hospitalNumber: 'HN-33092',
      deviceId: 'BP-77102',
      type: 'Blood Pressure',
      createdAt: '2025-07-21',
    },
    {
      name: 'Chinedu Obi',
      hospitalNumber: 'HN-99201',
      deviceId: 'GL-45019',
      type: 'Glucometer',
      createdAt: '2025-05-30',
    },
  ];

  filteredDevices = [...this.devices];

  constructor() {
    this.totalDevices = this.devices.length;
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onDeviceTypeChange(type: string): void {
    this.selectedDeviceType = type || 'All';
    this.applyFilters();
  }

  selectPeriod(period: string): void {
    this.selectedPeriod = period;
    this.applyFilters();
  }

  applyFilters(): void {
    const term = this.searchTerm.toLowerCase();

    this.filteredDevices = this.devices.filter((device) => {
      const matchesSearch =
        device.name.toLowerCase().includes(term) ||
        device.deviceId.toLowerCase().includes(term) ||
        device.hospitalNumber.toLowerCase().includes(term);

      const matchesType =
        this.selectedDeviceType === 'All' || device.type === this.selectedDeviceType;

      return matchesSearch && matchesType;
    });

    this.totalDevices = this.filteredDevices.length;
  }

  onPageChange(page: number): void {
    this.pageIndex = page;
  }

  editDevice(device: any): void {
    console.log('Editing device:', device);
  }

  viewDevice(device: any): void {
    console.log('Viewing device:', device);
  }
}
