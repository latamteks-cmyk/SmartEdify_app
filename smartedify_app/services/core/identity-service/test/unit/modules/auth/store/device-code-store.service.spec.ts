import { DeviceCodeStoreService, DeviceCodeStatus } from '../../../../../src/modules/auth/store/device-code-store.service';

describe('DeviceCodeStoreService', () => {
  it('should set, retrieve by device and user code, and update status', () => {
    const store = new DeviceCodeStoreService();
    const device = 'dev-1';
    const userCode = 'ABCD';
    store.set(device, { user_code: userCode, status: DeviceCodeStatus.PENDING }, 60);

    const byDevice = store.getByDeviceCode(device);
    expect(byDevice?.status).toBe(DeviceCodeStatus.PENDING);

    const byUser = store.getByUserCode(userCode);
    expect(byUser?.user_code).toBe(userCode);

    const updated = store.updateStatusByUserCode(userCode, DeviceCodeStatus.APPROVED, 'user-1');
    expect(updated).toBe(true);
    expect(store.getByDeviceCode(device)?.status).toBe(DeviceCodeStatus.APPROVED);
    expect(store.getByDeviceCode(device)?.userId).toBe('user-1');
  });
});

