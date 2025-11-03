import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  FormControl,
} from '@angular/forms';
import { NzButtonModule } from 'ng-zorro-antd/button';
import { NzIconModule } from 'ng-zorro-antd/icon';
import { NzTableModule } from 'ng-zorro-antd/table';
import { NzInputModule } from 'ng-zorro-antd/input';
import { NzPaginationModule } from 'ng-zorro-antd/pagination';
import { NzSelectModule } from 'ng-zorro-antd/select';
import { NzMessageService } from 'ng-zorro-antd/message';
import { NzModalModule, NzModalService } from 'ng-zorro-antd/modal';
import { DeviceService, Device, DeviceResponse } from '../../device.service';
import { EditDeviceDialogComponent } from '../edit-device-dialog';
import { ViewVitalsDialogComponent } from '../view-vitals-dialog';
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

interface DeviceWithScore extends Device {
  relevanceScore?: number;
}

@Component({
  selector: 'app-devices',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NzButtonModule,
    NzIconModule,
    NzTableModule,
    NzInputModule,
    NzPaginationModule,
    NzSelectModule,
    NzModalModule,
  ],
  templateUrl: './devices.html',
  styleUrls: ['./devices.scss'],
})
export class Devices implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private refreshTrigger$ = new BehaviorSubject<boolean>(true);
  private pagination$ = new BehaviorSubject({ page: 0, size: 20 });
  private deviceType$ = new BehaviorSubject<string>('All');

  form!: FormGroup;
  selectedDeviceType: string = 'All';
  isLoading = false;

  pageIndex = 1;
  pageSize = 20;
  totalDevices = 0;

  devices: Device[] = [];
  filteredDevices: Device[] = [];

  private searchCache = new Map<string, { devices: Device[]; timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000;

  constructor(
    private fb: FormBuilder,
    private deviceService: DeviceService,
    private message: NzMessageService,
    private modal: NzModalService
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.setupDataStream();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeForm(): void {
    this.form = this.fb.group({
      searchTerm: [''],
    });
  }

  private setupDataStream(): void {
    const searchTerm$ = this.searchControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      distinctUntilChanged(),
      map((term) => term?.trim() || '')
    );

    combineLatest([searchTerm$, this.deviceType$, this.pagination$, this.refreshTrigger$])
      .pipe(
        switchMap(([searchTerm, deviceType, pagination]) => {
          const isSearching = !!searchTerm;
          const isFiltering = deviceType !== 'All';
          const isInitialLoad = this.devices.length === 0;

          this.isLoading = !isSearching || isInitialLoad;
          this.pageIndex = pagination.page + 1;
          this.pageSize = pagination.size;

          return this.fetchDevicesStream(searchTerm, deviceType, pagination);
        }),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: (result) => {
          this.devices = result.devices;
          this.filteredDevices = result.devices;
          this.totalDevices = result.total;
          this.isLoading = false;
        },
        error: (error) => this.handleError(error),
      });
  }

  private fetchDevicesStream(
    searchTerm: string,
    deviceType: string,
    pagination: { page: number; size: number }
  ) {
    const isSearching = !!searchTerm;
    const isFiltering = deviceType !== 'All';

    if (isSearching || isFiltering) {
      return this.performFilteredSearch(searchTerm, deviceType).pipe(
        map((devices) => ({
          devices: this.paginateClientSide(devices, pagination),
          total: devices.length,
        })),
        catchError((error) => {
          this.handleError(error);
          return of({ devices: [], total: 0 });
        })
      );
    }

    return this.deviceService
      .getDevices({
        page: pagination.page,
        limit: pagination.size,
        orderBy: 'createdAt',
        order: 'DESC',
      })
      .pipe(
        map((response: DeviceResponse) => ({
          devices: this.mapDevices(response.list || []),
          total: response.pagination?.total_items || 0,
        })),
        catchError((error) => {
          this.handleError(error);
          return of({ devices: [], total: 0 });
        })
      );
  }

  private performFilteredSearch(searchTerm: string, deviceType: string) {
    const cacheKey = `${searchTerm}-${deviceType}`.toLowerCase();
    const cached = this.searchCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return of(cached.devices);
    }

    if (!searchTerm && deviceType !== 'All') {
      return this.deviceService.getDevicesByType(deviceType, 0, 10000).pipe(
        map((response: DeviceResponse) => {
          const devices = this.mapDevices(response.list || []);
          this.searchCache.set(cacheKey, { devices, timestamp: Date.now() });
          return devices;
        })
      );
    }

    if (searchTerm) {
      return this.deviceService.searchDevices(searchTerm, 10000).pipe(
        map((devices: Device[]) => {
          let filteredDevices = devices;
          if (deviceType !== 'All') {
            filteredDevices = devices.filter((d) => d.device_type === deviceType);
          }
          const sortedDevices = this.sortSearchResults(filteredDevices, searchTerm);
          this.searchCache.set(cacheKey, { devices: sortedDevices, timestamp: Date.now() });
          return sortedDevices;
        })
      );
    }

    return of([]);
  }

  private paginateClientSide(
    devices: Device[],
    pagination: { page: number; size: number }
  ): Device[] {
    const start = pagination.page * pagination.size;
    const end = start + pagination.size;
    return devices.slice(start, end);
  }

  private mapDevices(list: any[]): Device[] {
    return list.map(
      (device: any): Device => ({
        id: device.id,
        device_name: device.device_name || '',
        user_identity: device.user_identity || '',
        user_name: device.user_name || '',
        device_id: device.device_id || '',
        device_type: device.device_type || '',
        created_at: device.createdAt || device.created_at || '',
        user_email: device.user_email || '',
        user_phone: device.user_phone || '',
        note: device.note || '',
      })
    );
  }

  private sortSearchResults(devices: Device[], searchTerm: string): Device[] {
    if (!searchTerm) {
      return devices.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }

    const term = searchTerm.toLowerCase();
    const devicesWithScore: DeviceWithScore[] = devices
      .map((device) => ({
        ...device,
        relevanceScore: this.getTotalRelevanceScore(device, term),
      }))
      .filter((device) => device.relevanceScore! > 0);

    return devicesWithScore.sort((a, b) => {
      const scoreDiff = b.relevanceScore! - a.relevanceScore!;
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }

  private getTotalRelevanceScore(device: Device, term: string): number {
    const scores = [
      { field: device.user_name, weight: 4 },
      { field: device.device_name, weight: 3 },
      { field: device.user_identity, weight: 2 },
      { field: device.device_id, weight: 1 },
    ];

    return scores.reduce(
      (total, { field, weight }) => total + this.getMatchScore(field, term) * weight,
      0
    );
  }

  private getMatchScore(text: string, term: string): number {
    if (!text || !term) return 0;
    const lowerText = text.toLowerCase();

    if (lowerText === term) return 100;
    if (lowerText.startsWith(term)) return 90;

    const wordBoundaryRegex = new RegExp(`\\b${this.escapeRegex(term)}\\b`, 'i');
    if (wordBoundaryRegex.test(text)) return 85;
    if (lowerText.includes(term)) return 75;

    const words = term.split(/\s+/).filter((w) => w.length > 0);
    if (words.length > 1) {
      let exactWordMatches = 0;
      let partialMatches = 0;
      words.forEach((word) => {
        const wordLower = word.toLowerCase();
        if (lowerText.includes(wordLower)) {
          partialMatches++;
          if (new RegExp(`\\b${this.escapeRegex(wordLower)}\\b`, 'i').test(text)) {
            exactWordMatches++;
          }
        }
      });

      if (exactWordMatches > 0) return 60 + (exactWordMatches / words.length) * 15;
      if (partialMatches > 0) return 50 + (partialMatches / words.length) * 10;
    }

    return 0;
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private handleError(error: any): void {
    console.error('Device fetch failed:', error);
    this.message.error('Failed to load devices. Please try again.');
    this.isLoading = false;
    this.devices = [];
    this.filteredDevices = [];
    this.totalDevices = 0;
  }

  private refreshData(): void {
    this.searchCache.clear();
    this.refreshTrigger$.next(true);
  }

  get searchControl(): FormControl {
    return this.form.get('searchTerm') as FormControl;
  }

  onDeviceTypeChange(type: string): void {
    this.selectedDeviceType = type || 'All';
    this.pageIndex = 1;
    this.deviceType$.next(type || 'All');
    this.pagination$.next({ page: 0, size: this.pageSize });
  }

  onPageChange(page: number): void {
    this.pageIndex = page;
    this.pagination$.next({ page: page - 1, size: this.pageSize });
  }

  editDevice(device: Device): void {
    const modalRef = this.modal.create({
      nzContent: EditDeviceDialogComponent,
      nzData: device,
      nzFooter: null,
      nzWidth: 480,
      nzClosable: true,
    });

    modalRef.afterClose.subscribe((result) => {
      if (result) {
        this.refreshData();
      }
    });
  }

  viewVitals(device: Device): void {
    this.isLoading = true;

    const vitalsRequest$ = device.device_type?.toLowerCase().includes('bp')
      ? this.deviceService.getBloodPressureVitals(device.device_id)
      : this.deviceService.getGlucometerVitals(device.device_id);

    vitalsRequest$.subscribe({
      next: (vitalsData) => {
        this.isLoading = false;

        this.modal.create({
          nzContent: ViewVitalsDialogComponent,
          nzData: { device, vitalsData, phone: device.user_phone || null },
          nzFooter: null,
          nzWidth: 900,
          nzClosable: true,
        });
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Failed to fetch vitals:', error);
        this.message.error('Failed to load vitals data');
      },
    });
  }

  getDeviceTypeDisplay(type: string): string {
    const typeMap: { [key: string]: string } = {
      BP_MONITOR: 'Blood Pressure',
      GLUCOMETER: 'Glucometer',
      PARAMONITOR: 'All-in-One',
    };
    return typeMap[type] || type;
  }

  getDeviceIcon(type: string): string {
    const lowerType = (type || '').toLowerCase();
    if (lowerType.includes('bp') || lowerType.includes('blood')) return 'heart';
    if (lowerType.includes('glu') || lowerType.includes('glucose')) return 'experiment';
    if (lowerType.includes('param')) return 'dashboard';
    return 'dashboard';
  }

  refresh(): void {
    this.refreshData();
  }
}
