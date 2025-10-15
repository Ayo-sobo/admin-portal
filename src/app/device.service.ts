import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

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

@Injectable({
  providedIn: 'root',
})
export class DeviceService {
  private apiUrl = 'https://nexus.drsavealife.com/device';
  //   private vitalsUrl = 'https://nexus.drsavealife.com/vitals';

  constructor(private http: HttpClient) {}

  getDevices(payload: DeviceFilterPayload): Observable<DeviceResponse> {
    const requestBody = {
      page: payload.page || 0,
      limit: payload.limit || 20,
      filter: payload.filter || {},
      orderBy: payload.orderBy || 'createdAt',
      order: payload.order || 'DESC',
      ...(payload.searchString && { searchString: payload.searchString }),
      ...(payload.searchField && { searchField: payload.searchField }),
    };

    return this.http.post<DeviceResponse>(`${this.apiUrl}/filter`, requestBody);
  }

  getDevicesByType(deviceType: string, page = 0, limit = 20): Observable<DeviceResponse> {
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
    return this.http.get<Device>(`${this.apiUrl}/${deviceId}`);
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

        const bpMonitorsCount = devices.filter((d: any) => {
          const t = normalized(d.device_type);
          return t.includes('bp') || t.includes('bp_monitor') || t.includes('blood');
        }).length;

        const glucometersCount = devices.filter((d: any) => {
          const t = normalized(d.device_type);
          return t.includes('glu') || t.includes('glucose') || t.includes('glucometer');
        }).length;

        const allInOneParamonitorsCount = devices.filter((d: any) => {
          const t = normalized(d.device_type);
          return (
            t.includes('param') ||
            t.includes('paramonitor') ||
            t.includes('allinone') ||
            t.includes('all-in-one')
          );
        }).length;

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
    const url = 'https://nexus.drsavealife.com/blood-pressure/filter';
    const requestBody = {
      filter: { deviceID: deviceId },
      orderBy: 'id',
      order: 'DESC',
    };
    return this.http
      .post<{ list: VitalSign[] }>(url, requestBody)
      .pipe(map((response) => response.list || []));
  }

  getGlucometerVitals(deviceId: string): Observable<VitalSign[]> {
    const url = 'https://nexus.drsavealife.com/glucometer/filter';
    const requestBody = {
      filter: { deviceID: deviceId },
      orderBy: 'id',
      order: 'DESC',
    };
    return this.http
      .post<{ list: VitalSign[] }>(url, requestBody)
      .pipe(map((response) => response.list || []));
  }

  private deduplicateDevices(devices: any[]): Device[] {
    const uniqueMap = new Map();
    devices.forEach((device) => {
      const createdAt = device.createdAt || device.created_at;
      if (
        !uniqueMap.has(device.id) ||
        new Date(createdAt) > new Date(uniqueMap.get(device.id).created_at)
      ) {
        uniqueMap.set(device.id, {
          ...device,
          created_at: createdAt,
        });
      }
    });
    return Array.from(uniqueMap.values());
  }

  private calculateAverage(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((acc, val) => acc + val, 0);
    return Math.round((sum / numbers.length) * 100) / 100;
  }
}
