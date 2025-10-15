import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NzModalModule } from 'ng-zorro-antd/modal';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTagModule } from 'ng-zorro-antd/tag';
import { DeviceService, Device, DeviceResponse } from '../../device.service';
import { Subject, BehaviorSubject, combineLatest, of } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  takeUntil,
  switchMap,
  startWith,
  map,
  catchError,
} from 'rxjs/operators';

interface DeviceRow {
  id: number;
  name: string;
  deviceId: string;
  type: string;
  hospitalNumber?: string;
  status: 'Available' | 'In Use';
  raw?: any;
}

interface User {
  id: number;
  name: string;
  email: string;
}

@Component({
  selector: 'app-link-devices-dialog',
  standalone: true,
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
  styleUrls: ['./link-devices-dialog.scss'],
})
export class LinkDevicesDialog implements OnInit, OnDestroy {
  @Input() isVisible = false;
  @Input() users: User[] = [];
  @Output() isVisibleChange = new EventEmitter<boolean>();
  @Output() devicesAssigned = new EventEmitter<{ userId: number; devices: DeviceRow[] }>();

  private destroy$ = new Subject<void>();
  private searchTerm$ = new BehaviorSubject<string>('');
  private deviceType$ = new BehaviorSubject<string>('all');
  private refreshTrigger$ = new BehaviorSubject<boolean>(true);

  selectedUserId: number | null = null;
  searchText = '';
  selectedType = 'all';
  selectedDevices: DeviceRow[] = [];

  allDevices: DeviceRow[] = [];
  filteredDevices: DeviceRow[] = [];
  isLoading = false;

  private searchCache = new Map<string, { devices: DeviceRow[]; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000;

  constructor(private deviceService: DeviceService) {}

  ngOnInit(): void {
    this.setupDataStream();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupDataStream(): void {
    combineLatest([
      this.searchTerm$.pipe(debounceTime(300), distinctUntilChanged()),
      this.deviceType$,
      this.refreshTrigger$,
    ])
      .pipe(
        switchMap(([searchTerm, deviceType]) => {
          this.isLoading = true;
          return this.fetchDevicesStream(searchTerm, deviceType);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (devices) => {
          this.allDevices = devices;
          this.filteredDevices = devices.slice(0, 10);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Failed to load devices:', error);
          this.allDevices = [];
          this.filteredDevices = [];
          this.isLoading = false;
        },
      });
  }

  private fetchDevicesStream(searchTerm: string, deviceType: string) {
    const isSearching = !!searchTerm;
    const isFiltering = deviceType !== 'all';

    if (isSearching || isFiltering) {
      return this.performFilteredSearch(searchTerm, deviceType);
    }

    return this.deviceService
      .getDevices({ page: 0, limit: 10000, orderBy: 'createdAt', order: 'DESC' })
      .pipe(
        map((response: DeviceResponse) => this.mapDevices(response.list || [])),
        catchError(() => of([]))
      );
  }

  private performFilteredSearch(searchTerm: string, deviceType: string) {
    const cacheKey = `${searchTerm}-${deviceType}`.toLowerCase();
    const cached = this.searchCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return of(cached.devices);
    }

    if (!searchTerm && deviceType !== 'all') {
      const actualDeviceType = this.mapFilterToDeviceType(deviceType);

      return this.deviceService.getDevicesByType(actualDeviceType, 0, 10000).pipe(
        map((response: DeviceResponse) => {
          const devices = this.mapDevices(response.list || []);
          this.searchCache.set(cacheKey, { devices, timestamp: Date.now() });
          return devices;
        }),
        catchError(() => of([]))
      );
    }

    if (searchTerm) {
      return this.deviceService.searchDevices(searchTerm, 10000).pipe(
        map((devices: Device[]) => {
          let mapped = this.mapDevices(devices);

          if (deviceType !== 'all') {
            mapped = mapped.filter((d) => this.matchesDeviceType(d.type, deviceType));
          }

          const sorted = this.sortSearchResults(mapped, searchTerm);
          this.searchCache.set(cacheKey, { devices: sorted, timestamp: Date.now() });
          return sorted;
        }),
        catchError(() => of([]))
      );
    }

    return of([]);
  }

  private mapFilterToDeviceType(filterType: string): string {
    const filterLower = filterType.toLowerCase();

    if (filterLower.includes('blood') || filterLower.includes('pressure')) {
      return 'BP_MONITOR';
    }
    if (filterLower.includes('glu')) {
      return 'GLUCOMETER';
    }
    if (filterLower.includes('param')) {
      return 'PARAMONITOR';
    }

    return filterType;
  }

  private matchesDeviceType(deviceType: string, filterType: string): boolean {
    const deviceTypeLower = (deviceType || '').toLowerCase();
    const filterLower = filterType.toLowerCase();

    if (filterLower.includes('blood') || filterLower.includes('pressure')) {
      return (
        deviceTypeLower.includes('bp') ||
        deviceTypeLower.includes('blood') ||
        deviceTypeLower.includes('pressure') ||
        deviceTypeLower.includes('bp_monitor')
      );
    }

    if (filterLower.includes('glu')) {
      return (
        deviceTypeLower.includes('glu') ||
        deviceTypeLower.includes('glucose') ||
        deviceTypeLower.includes('glucometer')
      );
    }

    if (filterLower.includes('param')) {
      return (
        deviceTypeLower.includes('param') ||
        deviceTypeLower.includes('all') ||
        deviceTypeLower.includes('paramonitor')
      );
    }

    return deviceTypeLower === filterLower;
  }

  private mapDevices(list: any[]): DeviceRow[] {
    return list.map((device: any) => ({
      id: device.id,
      name: device.device_name || device.model || device.name || 'Unknown',
      deviceId: device.device_id || device.deviceID || device.deviceId || '',
      type: device.device_type || device.type || 'Unknown',
      hospitalNumber: device.user_identity || device.hospitalNumber || '',
      status: device.is_active ? 'In Use' : 'Available',
      raw: device,
    }));
  }

  private sortSearchResults(devices: DeviceRow[], searchTerm: string): DeviceRow[] {
    if (!searchTerm) {
      return devices;
    }

    const term = searchTerm.toLowerCase();

    return devices
      .map((device) => ({
        ...device,
        relevanceScore: this.getTotalRelevanceScore(device, term),
      }))
      .filter((device) => device.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  private getTotalRelevanceScore(device: DeviceRow, term: string): number {
    const scores = [
      { field: device.name, weight: 4 },
      { field: device.deviceId, weight: 3 },
      { field: device.hospitalNumber, weight: 2 },
      { field: device.type, weight: 1 },
    ];

    return scores.reduce(
      (total, { field, weight }) => total + this.getMatchScore(field || '', term) * weight,
      0
    );
  }

  private getMatchScore(text: string, term: string): number {
    if (!text || !term) return 0;
    const lowerText = text.toLowerCase();

    if (lowerText === term) return 100;
    if (lowerText.startsWith(term)) return 90;
    if (lowerText.includes(term)) return 75;

    return 0;
  }

  public onSearchChange(): void {
    this.searchTerm$.next(this.searchText.trim());
  }

  public onTypeChange(newType: string): void {
    this.selectedType = newType || 'all';
    this.deviceType$.next(newType || 'all');
  }

  public getDeviceIcon(type: string): string {
    const t = (type || '').toLowerCase();
    if (t.includes('bp') || t.includes('pressure') || t.includes('blood')) return 'heart';
    if (t.includes('glu')) return 'experiment';
    return 'dashboard';
  }

  public isDeviceSelected(device: DeviceRow): boolean {
    return this.selectedDevices.some((d) => d.id === device.id);
  }

  public selectDevice(device: DeviceRow): void {
    if (!this.isDeviceSelected(device)) {
      this.selectedDevices.push(device);
    }
  }

  public removeDevice(device: DeviceRow): void {
    this.selectedDevices = this.selectedDevices.filter((d) => d.id !== device.id);
  }

  public clearSelection(): void {
    this.selectedDevices = [];
  }

  public handleCancel(): void {
    this.isVisible = false;
    this.isVisibleChange.emit(false);
    setTimeout(() => this.resetDialog(), 300);
  }

  public assignDevices(): void {
    if (this.selectedUserId && this.selectedDevices.length > 0) {
      this.devicesAssigned.emit({
        userId: this.selectedUserId,
        devices: this.selectedDevices,
      });
      this.isVisible = false;
      this.isVisibleChange.emit(false);
      setTimeout(() => this.resetDialog(), 300);
    }
  }

  public resetDialog(): void {
    this.selectedUserId = null;
    this.searchText = '';
    this.selectedType = 'all';
    this.selectedDevices = [];
    this.allDevices = [];
    this.filteredDevices = [];
    this.isLoading = false;
    this.searchCache.clear();

    this.searchTerm$.next('');
    this.deviceType$.next('all');
  }
}
