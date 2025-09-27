import { Injectable } from '@nestjs/common';

export enum DeviceCodeStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied',
}

export interface DeviceCodePayload {
  user_code: string;
  status: DeviceCodeStatus;
  userId?: string;
  // Add other parameters like client_id, scope, etc.
}

@Injectable()
export class DeviceCodeStoreService {
  // device_code -> payload
  private store = new Map<string, DeviceCodePayload>();
  // user_code -> device_code
  private userCodeIndex = new Map<string, string>();

  set(deviceCode: string, payload: DeviceCodePayload, expiresIn: number): void {
    this.store.set(deviceCode, payload);
    this.userCodeIndex.set(payload.user_code, deviceCode);

    setTimeout(() => {
      this.store.delete(deviceCode);
      this.userCodeIndex.delete(payload.user_code);
    }, expiresIn * 1000);
  }

  getByDeviceCode(deviceCode: string): DeviceCodePayload | undefined {
    return this.store.get(deviceCode);
  }

  getByUserCode(userCode: string): DeviceCodePayload | undefined {
    const deviceCode = this.userCodeIndex.get(userCode);
    if (!deviceCode) {
      return undefined;
    }
    return this.store.get(deviceCode);
  }

  updateStatusByUserCode(userCode: string, status: DeviceCodeStatus, userId: string): boolean {
    const deviceCode = this.userCodeIndex.get(userCode);
    if (!deviceCode) {
      return false;
    }
    const payload = this.store.get(deviceCode);
    if (!payload) {
      return false;
    }
    payload.status = status;
    payload.userId = userId;
    return true;
  }
}
