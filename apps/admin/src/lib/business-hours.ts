export type StoreBusinessHours = {
  openHour: number;
  closeHour: number;
  label: string;
};

export const storeScheduleSummary = 'Seg. a sab. 09h-20h · dom. 09h-14h';

export function getStoreBusinessHours(date: Date): StoreBusinessHours {
  const sunday = date.getDay() === 0;
  return {
    openHour: 9,
    closeHour: sunday ? 14 : 20,
    label: sunday ? '09h-14h' : '09h-20h'
  };
}

export function isWithinStoreBusinessHours(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return false;
  const { openHour, closeHour } = getStoreBusinessHours(date);
  const hour = date.getHours();
  return hour >= openHour && hour <= closeHour;
}

export function getStoreBusinessHourBuckets(date: Date) {
  const { openHour, closeHour } = getStoreBusinessHours(date);
  return Array.from({ length: closeHour - openHour + 1 }, (_, index) => openHour + index);
}
