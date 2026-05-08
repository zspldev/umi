const DEVICE_ID_KEY = 'xlango_device_id';
const DISPLAY_NAME_KEY = 'xlango_display_name';

function generateId(): string {
  return crypto.randomUUID();
}

export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateId();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function getDisplayName(): string {
  return localStorage.getItem(DISPLAY_NAME_KEY) ?? 'Unknown';
}

export function setDisplayName(name: string): void {
  localStorage.setItem(DISPLAY_NAME_KEY, name);
}

export function trackingHeaders(): Record<string, string> {
  return {
    'X-Device-Id': getDeviceId(),
    'X-Display-Name': getDisplayName(),
    'X-App-Source': 'umi-web',
  };
}
