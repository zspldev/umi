const DEVICE_ID_KEY    = 'xlango_device_id';
const DISPLAY_NAME_KEY = 'xlango_display_name';
const TRIP_CODE_KEY    = 'xlango_trip_code';
const ONBOARDED_KEY    = 'xlango_onboarded';

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

export function getTripCode(): string {
  return localStorage.getItem(TRIP_CODE_KEY) ?? '';
}

export function setTripCode(code: string): void {
  localStorage.setItem(TRIP_CODE_KEY, code);
}

export function isOnboarded(): boolean {
  return localStorage.getItem(ONBOARDED_KEY) === 'yes';
}

export function markOnboarded(): void {
  localStorage.setItem(ONBOARDED_KEY, 'yes');
}

export function trackingHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Device-Id':    getDeviceId(),
    'X-Display-Name': getDisplayName(),
    'X-App-Source':   'umi-web',
  };
  const tripCode = getTripCode();
  if (tripCode) headers['X-Trip-Code'] = tripCode;
  return headers;
}
