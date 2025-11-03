import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { NzAvatarModule } from 'ng-zorro-antd/avatar';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzDropDownModule } from 'ng-zorro-antd/dropdown';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzBadgeModule } from 'ng-zorro-antd/badge';
import { NzPopconfirmModule } from 'ng-zorro-antd/popconfirm';
import { LinkDevicesDialog } from '../link-devices-dialog/link-devices-dialog';
import { EditMonitorDialog } from '../users/edit-monitor-dialog.component';
import { ViewMonitorDetailsDialog } from '../users/view-monitor-details-dialog.component';
import { NzMessageService } from 'ng-zorro-antd/message';
import { DeviceService } from '../../device.service';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
  avatar?: string;
}

interface Device {
  id: number;
  name: string;
}

@Component({
  selector: 'app-users',
  imports: [
    CommonModule,
    FormsModule,
    NzTableModule,
    NzInputModule,
    NzSelectModule,
    NzTagModule,
    NzAvatarModule,
    NzIconModule,
    NzDropDownModule,
    NzButtonModule,
    NzBadgeModule,
    NzPopconfirmModule,
    LinkDevicesDialog,
    EditMonitorDialog,
    ViewMonitorDetailsDialog,
  ],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class Users implements OnInit {
  searchText: string = '';
  selectedRole: string = 'all';
  selectedStatus: string = 'all';

  isLinkDevicesVisible = false;
  selectedUserForDevices: User | null = null;

  isEditMonitorVisible = false;
  selectedUserForEdit: User | null = null;

  isViewDetailsVisible = false;
  selectedUserForView: User | null = null;

  allUsers: User[] = [];
  isLoading = false;

  constructor(private message: NzMessageService, private deviceService: DeviceService) {}

  ngOnInit(): void {
    this.fetchMonitors();
  }

  fetchMonitors(): void {
    this.isLoading = true;
    this.deviceService.getDeviceMonitors().subscribe({
      next: (monitors: any[]) => {
        this.allUsers = monitors.map((m) => ({
          id: m.id,
          name: `${m.first_name} ${m.last_name}`.trim(),
          email: m.email,
          phone: m.phone || 'N/A',
          role: m.monitor_type,
          status: 'Active',
        }));
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch monitors:', err);
        this.message.error('Failed to load monitors');
        this.isLoading = false;
      },
    });
  }

  get filteredUsers(): User[] {
    return this.allUsers.filter((user) => {
      const matchesSearch =
        !this.searchText ||
        user.name.toLowerCase().includes(this.searchText.toLowerCase()) ||
        user.email.toLowerCase().includes(this.searchText.toLowerCase()) ||
        user.role.toLowerCase().includes(this.searchText.toLowerCase());

      const matchesRole = this.selectedRole === 'all' || user.role === this.selectedRole;
      const matchesStatus = this.selectedStatus === 'all' || user.status === this.selectedStatus;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }

  get totalUsers(): number {
    return this.allUsers.length;
  }

  getStatusColor(status: string): string {
    const colors: { [key: string]: string } = {
      Active: 'success',
      Inactive: 'default',
      Suspended: 'warning',
    };
    return colors[status] || 'default';
  }

  getUserInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  getAvatarColor(name: string): string {
    const colors = ['#f56a00', '#7265e6', '#ffbf00', '#00a2ae', '#87d068'];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  }

  onUserAction(action: string, user: User): void {
    switch (action) {
      case 'edit':
        this.openEditMonitor(user);
        break;
      case 'view':
        this.openViewDetails(user);
        break;
      case 'suspend':
        this.suspendMonitor(user);
        break;
      case 'activate':
        this.activateMonitor(user);
        break;
      case 'delete':
        this.deleteMonitor(user);
        break;
      default:
        console.log(`${action} action for monitor:`, user);
    }
  }

  openEditMonitor(user: User): void {
    this.selectedUserForEdit = user;
    this.isEditMonitorVisible = true;
  }

  openViewDetails(user: User): void {
    this.selectedUserForView = user;
    this.isViewDetailsVisible = true;
  }

  suspendMonitor(user: User): void {
    user.status = 'Suspended';
    this.message.warning(`Suspended: ${user.name}`);
  }

  activateMonitor(user: User): void {
    user.status = 'Active';
    this.message.success(`Activated: ${user.name}`);
  }

  deleteMonitor(user: User): void {
    this.deviceService.deleteMonitor(user.id).subscribe({
      next: () => {
        this.allUsers = this.allUsers.filter((u) => u.id !== user.id);
        this.message.success(`Monitor ${user.name} deleted successfully`);
      },
      error: (err) => {
        console.error('Failed to delete monitor:', err);
        this.message.error('Failed to delete monitor. Please try again.');
      },
    });
  }

  openLinkDevices(): void {
    this.selectedUserForDevices = null;
    this.isLinkDevicesVisible = true;
  }

  handleDevicesAssigned(data: { userId: number; devices: Device[] }): void {
    const user = this.allUsers.find((u) => u.id === data.userId);
    if (user) {
      this.message.success(
        `Successfully assigned ${data.devices.length} device(s) to ${user.name}`
      );
    }
    console.log('Devices assigned:', data);
  }

  handleMonitorUpdated(updatedUser: User): void {
    const index = this.allUsers.findIndex((u) => u.id === updatedUser.id);
    if (index !== -1) {
      this.allUsers[index] = updatedUser;
      this.allUsers = [...this.allUsers];
    }
  }

  handleDeviceUnassigned(deviceId: number): void {
    console.log('Device unassigned:', deviceId);
  }
}
