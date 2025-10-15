import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NzFormModule } from 'ng-zorro-antd/form';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzModalRef, NZ_MODAL_DATA } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';
import { DeviceService, Device } from '../device.service';

@Component({
  selector: 'app-edit-device-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NzFormModule, NzInputModule, NzButtonModule],
  template: `
    <div class="edit-device-dialog">
      <h2 class="dialog-title">Edit Device</h2>

      <form nz-form [formGroup]="form" (ngSubmit)="submitForm()" nzLayout="vertical">
        <nz-form-item>
          <nz-form-label [nzFor]="'deviceId'" nzRequired>Device ID</nz-form-label>
          <nz-form-control nzErrorTip="Please enter the device ID">
            <input
              nz-input
              id="deviceId"
              formControlName="deviceId"
              placeholder="Enter device ID"
            />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label [nzFor]="'userIdentity'">Hospital Number</nz-form-label>
          <nz-form-control>
            <input
              nz-input
              id="userIdentity"
              formControlName="userIdentity"
              placeholder="Enter hospital number"
            />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label [nzFor]="'userName'" nzRequired>Patient Name</nz-form-label>
          <nz-form-control nzErrorTip="Please enter patient name">
            <input
              nz-input
              id="userName"
              formControlName="userName"
              placeholder="Enter patient name"
            />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label [nzFor]="'email'">User Email</nz-form-label>
          <nz-form-control nzErrorTip="Please enter a valid email">
            <input nz-input id="email" formControlName="email" placeholder="Enter user email" />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label [nzFor]="'phoneNumber'" nzRequired>User Phone</nz-form-label>
          <nz-form-control nzErrorTip="Please enter a valid phone number">
            <input
              nz-input
              id="phoneNumber"
              formControlName="phoneNumber"
              placeholder="Enter user phone"
            />
          </nz-form-control>
        </nz-form-item>

        <nz-form-item>
          <nz-form-label [nzFor]="'deviceName'" nzRequired>Device Name</nz-form-label>
          <nz-form-control>
            <input
              nz-input
              id="deviceName"
              formControlName="deviceName"
              placeholder="Enter device name"
              readonly
            />
          </nz-form-control>
        </nz-form-item>

        <!-- <nz-form-item>
          <nz-form-label [nzFor]="'note'">Notes</nz-form-label>
          <nz-form-control>
            <textarea
              nz-input
              id="note"
              formControlName="note"
              placeholder="Enter any additional notes"
              rows="3"
            ></textarea>
          </nz-form-control>
        </nz-form-item> -->

        <div class="dialog-actions">
          <button
            nz-button
            nzType="default"
            type="button"
            (click)="cancel()"
            [disabled]="isSubmitting"
          >
            Cancel
          </button>
          <button
            nz-button
            nzType="primary"
            type="submit"
            [nzLoading]="isSubmitting"
            [disabled]="form.invalid"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [
    `
      .edit-device-dialog {
        padding: 20px;
        width: 100%;
        max-width: 450px;
      }

      .dialog-title {
        font-size: 20px;
        font-weight: 600;
        text-align: center;
        margin-bottom: 20px;
        color: #002b45;
      }

      form {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      nz-form-item {
        margin-bottom: 12px;
      }

      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 25px;
      }

      button[nz-button] {
        min-width: 90px;
        border-radius: 4px;
      }

      textarea {
        resize: vertical;
        min-height: 60px;
      }
    `,
  ],
})
export class EditDeviceDialogComponent implements OnInit {
  form!: FormGroup;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private modalRef: NzModalRef,
    private deviceService: DeviceService,
    private message: NzMessageService,
    @Inject(NZ_MODAL_DATA) public data: Device
  ) {}

  ngOnInit(): void {
    this.initializeForm();
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      deviceId: [this.data?.device_id || '', [Validators.required]],
      userIdentity: [this.data?.user_identity || ''],
      userName: [this.data?.user_name || '', [Validators.required]],
      email: [this.data?.user_email || '', [Validators.email]],
      phoneNumber: [this.data?.user_phone || '', [Validators.required]],
      deviceName: [this.data?.device_name || '', [Validators.required]],
      note: [this.data?.note || ''],
    });
  }

  submitForm(): void {
    Object.keys(this.form.controls).forEach((key) => {
      const control = this.form.get(key);
      if (control) {
        control.markAsDirty();
        control.updateValueAndValidity();
      }
    });

    if (this.form.valid && this.data?.id) {
      this.isSubmitting = true;

      const updatePayload: Partial<Device> = {
        device_id: this.form.value.deviceId,
        user_identity: this.form.value.userIdentity,
        user_name: this.form.value.userName,
        user_email: this.form.value.email,
        user_phone: this.form.value.phoneNumber,
        device_name: this.form.value.deviceName,
        note: this.form.value.note,
      };

      this.deviceService.updateDevice(this.data.id, updatePayload).subscribe({
        next: (response) => {
          this.isSubmitting = false;
          this.message.success('Device updated successfully');

          const updatedDevice: Device = {
            ...this.data,
            ...updatePayload,
          };

          this.modalRef.close(updatedDevice);
        },
        error: (error) => {
          this.isSubmitting = false;
          console.error('Failed to update device:', error);

          const errorMessage =
            error?.error?.message || 'Failed to update device. Please try again.';
          this.message.error(errorMessage);
        },
      });
    }
  }

  cancel(): void {
    this.modalRef.close(null);
  }
}
