import { Component } from '@angular/core';
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
import { LinkDevicesDialog } from '../link-devices-dialog/link-devices-dialog';
import { NzMessageService } from 'ng-zorro-antd/message';

interface User {
  id: number;
  name: string;
  email: string;
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
    LinkDevicesDialog,
  ],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class Users {
  searchText: string = '';
  selectedRole: string = 'all';
  selectedStatus: string = 'all';

  isLinkDevicesVisible = false;
  selectedUserForDevices: User | null = null;

  allUsers: User[] = [
    { id: 1, name: 'Alex Admin', email: 'alex.admin@clinic.com', role: 'Admin', status: 'Active' },
    {
      id: 2,
      name: 'Morgan Manager',
      email: 'morgan.manager@clinic.com',
      role: 'Manager',
      status: 'Active',
    },
    {
      id: 3,
      name: 'Priya Supervisor',
      email: 'priya.supervisor@clinic.com',
      role: 'Supervisor',
      status: 'Suspended',
    },
    {
      id: 4,
      name: 'Diego Operator',
      email: 'diego.operator@clinic.com',
      role: 'Operator',
      status: 'Active',
    },
    {
      id: 5,
      name: 'Sarah Johnson',
      email: 'sarah.johnson@clinic.com',
      role: 'Manager',
      status: 'Active',
    },
    {
      id: 6,
      name: 'Michael Chen',
      email: 'michael.chen@clinic.com',
      role: 'Operator',
      status: 'Inactive',
    },
    {
      id: 7,
      name: 'Emma Williams',
      email: 'emma.williams@clinic.com',
      role: 'Supervisor',
      status: 'Active',
    },
    {
      id: 8,
      name: 'James Brown',
      email: 'james.brown@clinic.com',
      role: 'Admin',
      status: 'Active',
    },
  ];

  constructor(private message: NzMessageService) {}

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
        this.message.info(`Edit user: ${user.name}`);
        break;
      case 'view':
        this.message.info(`View details for: ${user.name}`);
        break;
      case 'suspend':
        this.message.warning(`Suspend user: ${user.name}`);
        break;
      case 'activate':
        this.message.success(`Activate user: ${user.name}`);
        break;
      case 'delete':
        this.message.error(`Delete user: ${user.name}`);
        break;
      default:
        console.log(`${action} action for user:`, user);
    }
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
}
