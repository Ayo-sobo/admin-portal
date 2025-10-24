import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzMessageService } from 'ng-zorro-antd/message';
import { DeviceService } from '../../device.service';

interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: string;
  status: string;
}

@Component({
  selector: 'app-edit-monitor-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NzModalModule,
    NzFormModule,
    NzInputModule,
    NzSelectModule,
    NzButtonModule,
  ],
  template: `
    <nz-modal
      [(nzVisible)]="isVisible"
      [nzTitle]="'Edit Monitor'"
      [nzClosable]="true"
      [nzMaskClosable]="false"
      [nzWidth]="600"
      (nzOnCancel)="handleCancel()"
      [nzFooter]="modalFooter"
    >
      <ng-container *nzModalContent>
        <form nz-form [nzLayout]="'vertical'">
          <nz-form-item>
            <nz-form-label nzRequired>First Name</nz-form-label>
            <nz-form-control>
              <input
                nz-input
                [(ngModel)]="formData.firstName"
                name="firstName"
                placeholder="Enter first name"
              />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired>Last Name</nz-form-label>
            <nz-form-control>
              <input
                nz-input
                [(ngModel)]="formData.lastName"
                name="lastName"
                placeholder="Enter last name"
              />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired>Email</nz-form-label>
            <nz-form-control>
              <input
                nz-input
                type="email"
                [(ngModel)]="formData.email"
                name="email"
                placeholder="Enter email address"
              />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label>Phone</nz-form-label>
            <nz-form-control>
              <input
                nz-input
                [(ngModel)]="formData.phone"
                name="phone"
                placeholder="Enter phone number"
              />
            </nz-form-control>
          </nz-form-item>

          <nz-form-item>
            <nz-form-label nzRequired>Monitor Type</nz-form-label>
            <nz-form-control>
              <nz-select
                [(ngModel)]="formData.monitorType"
                name="monitorType"
                nzPlaceHolder="Select monitor type"
                style="width: 100%"
              >
                <nz-option nzValue="INDIVIDUAL" nzLabel="Individual"></nz-option>
                <nz-option nzValue="ORGANIZATION" nzLabel="Organization"></nz-option>
              </nz-select>
            </nz-form-control>
          </nz-form-item>
        </form>
      </ng-container>

      <ng-template #modalFooter>
        <button nz-button nzType="default" (click)="handleCancel()" [disabled]="isLoading">
          Cancel
        </button>
        <button
          nz-button
          nzType="primary"
          (click)="handleSave()"
          [nzLoading]="isLoading"
          [disabled]="!isFormValid()"
        >
          Save Changes
        </button>
      </ng-template>
    </nz-modal>
  `,
  styles: [
    `
      nz-form-item {
        margin-bottom: 16px;
      }
    `,
  ],
})
export class EditMonitorDialog implements OnChanges {
  @Input() isVisible = false;
  @Input() user: User | null = null;
  @Output() isVisibleChange = new EventEmitter<boolean>();
  @Output() monitorUpdated = new EventEmitter<User>();

  formData = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    monitorType: '',
  };

  isLoading = false;

  constructor(private deviceService: DeviceService, private message: NzMessageService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user'] && this.user) {
      this.loadFormData();
    }
  }

  private loadFormData(): void {
    if (!this.user) return;

    const nameParts = this.user.name.split(' ');
    this.formData = {
      firstName: nameParts[0] || '',
      lastName: nameParts.slice(1).join(' ') || '',
      email: this.user.email,
      phone: this.user.phone === 'N/A' ? '' : this.user.phone,
      monitorType: this.user.role,
    };
  }

  isFormValid(): boolean {
    return !!(
      this.formData.firstName.trim() &&
      this.formData.lastName.trim() &&
      this.formData.email.trim() &&
      this.formData.monitorType
    );
  }

  handleCancel(): void {
    this.isVisible = false;
    this.isVisibleChange.emit(false);
    this.resetForm();
  }

  handleSave(): void {
    if (!this.isFormValid() || !this.user) return;

    this.isLoading = true;

    const updateData = {
      first_name: this.formData.firstName.trim(),
      last_name: this.formData.lastName.trim(),
      email: this.formData.email.trim(),
      phone: this.formData.phone.trim() || undefined,
      monitor_type: this.formData.monitorType,
    };

    this.deviceService.updateMonitor(this.user.id, updateData).subscribe({
      next: () => {
        this.message.success('Monitor updated successfully');
        const updatedUser: User = {
          ...this.user!,
          name: `${this.formData.firstName} ${this.formData.lastName}`.trim(),
          email: this.formData.email,
          phone: this.formData.phone || 'N/A',
          role: this.formData.monitorType,
        };
        this.monitorUpdated.emit(updatedUser);
        this.isVisible = false;
        this.isVisibleChange.emit(false);
        this.resetForm();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to update monitor:', err);
        this.message.error('Failed to update monitor. Please try again.');
        this.isLoading = false;
      },
    });
  }

  private resetForm(): void {
    this.formData = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      monitorType: '',
    };
  }
}
