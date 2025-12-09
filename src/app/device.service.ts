import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

export interface DeviceFilterPayload {
  page?: number;
  limit?: number;
  filter?: any;
  orderBy?: string;
  order?: 'ASC' | 'DESC';
  searchString?: string;
  searchField?: string;
}

export interface DeviceResponse {
  list: any[];
  pagination?: {
    total_items: number;
    total_pages: number;
    current_page: number;
    page_size: number;
  };
}

export interface Device {
  id: number;
  device_name: string;
  user_identity: string;
  user_name: string;
  device_id: string;
  device_type: string;
  created_at: string;
  createdAt?: string;
  user_email?: string;
  user_phone?: string;
  note?: string;
  customer_status?: string;
  device_monitor_id?: number | null;
  device_monitors?: { id: number }[];
}

export interface VitalSign {
  id: number;
  device_id: string;
  user_identity: string;
  user_name: string;
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  glucose_level?: number;
  measurement_type?: string;
  recorded_at: string;
  notes?: string;
}

export interface VitalsResponse {
  list: VitalSign[];
  pagination?: {
    total_items: number;
    total_pages: number;
    current_page: number;
    page_size: number;
  };
}

export interface DeviceUser {
  id: number;
  device_name: string;
  user_identity: string;
  user_name: string;
  user_phone?: string | null;
  user_email?: string | null;
  device_id: string;
  device_type: string;
  customer_status?: string;
  note?: string;
  device_monitor_id: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface DeviceMonitor {
  id: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  monitor_type: 'INDIVIDUAL' | 'ORGANIZATION';
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password?: string;
  device_users: DeviceUser[];
}

@Injectable({
  providedIn: 'root',
})
export class DeviceService {
  private apiUrl = 'https://nexus.drsavealife.com/device';
  private monitorsUrl = 'https://nexus.drsavealife.com/device-monitors';
  private bloodPressureUrl = 'https://nexus.drsavealife.com/blood-pressure/filter';
  private glucometerUrl = 'https://nexus.drsavealife.com/glucometer/filter';

  constructor(private http: HttpClient) {}

  getDevices(payload: DeviceFilterPayload): Observable<DeviceResponse> {
    const requestBody = {
      page: payload.page || 0,
      limit: payload.limit || 50,
      filter: payload.filter || {},
      orderBy: payload.orderBy || 'createdAt',
      order: payload.order || 'DESC',
      ...(payload.searchString && { searchString: payload.searchString }),
      ...(payload.searchField && { searchField: payload.searchField }),
    };
    return this.http.post<DeviceResponse>(`${this.apiUrl}/filter`, requestBody);
  }

  getDevicesByType(deviceType: string, page = 0, limit = 50): Observable<DeviceResponse> {
    const requestBody = {
      filter: { device_type: deviceType },
      page,
      limit,
      orderBy: 'createdAt',
      order: 'DESC',
    };
    return this.http.post<DeviceResponse>(`${this.apiUrl}/filter`, requestBody);
  }

  getDeviceById(deviceId: number): Observable<Device> {
    const requestBody = { filter: { id: deviceId }, limit: 1 };
    return this.http
      .post<DeviceResponse>(`${this.apiUrl}/filter`, requestBody)
      .pipe(map((res) => res.list?.[0]));
  }

  registerDevice(device: Partial<Device>): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/register`, device);
  }

  updateDevice(deviceId: number, updatePayload: Partial<Device>): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/update?id=${deviceId}`, updatePayload);
  }

  deleteDevice(deviceId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${deviceId}`);
  }

  assignDevicesToMonitor(monitorIds: number[], deviceIds: number[]): Observable<any> {
    const requests = deviceIds.map((deviceId) =>
      this.getDeviceById(deviceId).pipe(
        switchMap((device) => {
          const existing = Array.isArray(device?.device_monitors)
            ? device.device_monitors.map((m) => m.id)
            : [];
          const updatedIds = Array.from(new Set([...existing, ...monitorIds]));
          const device_monitors = updatedIds.map((id) => ({ id }));
          return this.http.post(`${this.apiUrl}/update?id=${deviceId}`, { device_monitors });
        })
      )
    );
    return forkJoin(requests);
  }

  unassignDeviceFromMonitor(deviceId: number, monitorIdToRemove: number): Observable<any> {
    return this.getDeviceById(deviceId).pipe(
      switchMap((device) => {
        const currentMonitors = Array.isArray(device?.device_monitors)
          ? device.device_monitors
          : [];
        const filteredMonitors = currentMonitors.filter(
          (monitor) => monitor.id !== monitorIdToRemove
        );
        const device_monitors = filteredMonitors.map((m) => ({ id: m.id }));
        return this.http.post(`${this.apiUrl}/update?id=${deviceId}`, { device_monitors });
      })
    );
  }

  setDeviceMonitorsForDevice(deviceId: number, monitorIds: number[]): Observable<any> {
    const device_monitors = monitorIds.map((id) => ({ id }));
    return this.http.post(`${this.apiUrl}/update?id=${deviceId}`, { device_monitors });
  }

  removeMonitorFromDevice(deviceId: number, monitorIdToRemove: number): Observable<any> {
    return this.unassignDeviceFromMonitor(deviceId, monitorIdToRemove);
  }

  getDeviceStatistics(): Observable<{
    bpMonitorsCount: number;
    glucometersCount: number;
    allInOneParamonitorsCount: number;
    totalDevices: number;
  }> {
    return this.getDevices({
      page: 0,
      limit: 10000,
      orderBy: 'createdAt',
      order: 'DESC',
    }).pipe(
      map((response) => {
        const devices = response.list || [];
        const normalized = (s: any) => (s ? String(s).toLowerCase() : '');
        const bpMonitorsCount = devices.filter((d: any) =>
          normalized(d.device_type).includes('bp')
        ).length;
        const glucometersCount = devices.filter((d: any) =>
          normalized(d.device_type).includes('glu')
        ).length;
        const allInOneParamonitorsCount = devices.filter((d: any) =>
          normalized(d.device_type).includes('param')
        ).length;
        return {
          bpMonitorsCount,
          glucometersCount,
          allInOneParamonitorsCount,
          totalDevices: devices.length,
        };
      })
    );
  }

  searchDevices(searchTerm: string, limit = 1000): Observable<Device[]> {
    const fields = ['user_name', 'user_identity', 'device_id'];
    const requests = fields.map((field) =>
      this.getDevices({
        page: 0,
        limit,
        orderBy: 'createdAt',
        order: 'DESC',
        searchField: field,
        searchString: searchTerm,
      })
    );
    return new Observable((observer) => {
      Promise.all(requests.map((req) => req.toPromise()))
        .then((responses) => {
          const combinedList = responses.flatMap((res) => res?.list || []);
          const uniqueDevices = this.deduplicateDevices(combinedList);
          observer.next(uniqueDevices);
          observer.complete();
        })
        .catch((error) => observer.error(error));
    });
  }

  getBloodPressureVitals(deviceId: string): Observable<VitalSign[]> {
    const requestBody = { filter: { deviceID: deviceId }, orderBy: 'id', order: 'DESC' };
    return this.http
      .post<{ list: VitalSign[] }>(this.bloodPressureUrl, requestBody)
      .pipe(map((response) => response.list || []));
  }

  getGlucometerVitals(deviceId: string): Observable<VitalSign[]> {
    const requestBody = { filter: { deviceID: deviceId }, orderBy: 'id', order: 'DESC' };
    return this.http
      .post<{ list: VitalSign[] }>(this.glucometerUrl, requestBody)
      .pipe(map((response) => response.list || []));
  }

  getDeviceMonitors(): Observable<DeviceMonitor[]> {
    return this.http.get<DeviceMonitor[]>(`${this.monitorsUrl}/find`).pipe(
      map((monitors) =>
        monitors.map((m) => ({
          ...m,
          device_users: (m.device_users || []).map((u) => ({
            ...u,
            user_name: u.user_name || `${m.first_name} ${m.last_name}`,
          })),
        }))
      )
    );
  }

  updateMonitor(monitorId: number, data: any): Observable<DeviceMonitor> {
    return this.http.patch<DeviceMonitor>(`${this.monitorsUrl}/${monitorId}`, data);
  }

  deleteMonitor(monitorId: number): Observable<any> {
    return this.http.delete<any>(`${this.monitorsUrl}/${monitorId}`);
  }

  getDevicesAssignedToMonitor(monitorId: number): Observable<DeviceUser[]> {
    const nestedFilterRequest = {
      page: 0,
      limit: 10000,
      filter: { device_monitors: { id: monitorId } },
      orderBy: 'createdAt',
      order: 'DESC',
    };
    return this.http.post<DeviceResponse>(`${this.apiUrl}/filter`, nestedFilterRequest).pipe(
      switchMap((resp) => {
        if (resp && resp.list && resp.list.length > 0) return of(resp.list || []);
        const legacyFilterRequest = {
          page: 0,
          limit: 10000,
          filter: { device_monitor_id: monitorId },
          orderBy: 'createdAt',
          order: 'DESC',
        };
        return this.http
          .post<DeviceResponse>(`${this.apiUrl}/filter`, legacyFilterRequest)
          .pipe(map((r) => r.list || []));
      })
    );
  }

  getMonitorProfile(userId: number) {
    return this.http.get(`https://nexus.drsavealife.com/device-monitors/profile`, {
      params: { userId },
    });
  }

  private deduplicateDevices(devices: any[]): Device[] {
    const uniqueMap = new Map();
    devices.forEach((device) => {
      const createdAt = device.createdAt || device.created_at;
      if (
        !uniqueMap.has(device.id) ||
        new Date(createdAt) > new Date(uniqueMap.get(device.id).created_at)
      ) {
        uniqueMap.set(device.id, { ...device, created_at: createdAt });
      }
    });
    return Array.from(uniqueMap.values());
  }
}
