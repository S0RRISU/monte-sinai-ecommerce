'use client';

import { useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { ChevronDown, MapPin } from 'lucide-react';

type SavedLocation = {
  recipient?: string;
  phone?: string;
  zipcode?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  reference?: string;
  instructions?: string;
  address?: string;
};

const STORAGE_KEY = 'monte-sinai-delivery-location';
const LOCATION_EVENT = 'monte-sinai-location-updated';

export function DeliveryLocationChip({
  deliveryAreas,
  storeAddress,
  businessHours
}: {
  deliveryAreas: string;
  storeAddress: string;
  businessHours: string;
}) {
  const fallbackArea = deliveryAreas || storeAddress || 'Cobertura local';
  const fallbackDetail = storeAddress || businessHours || 'Consulte cobertura';
  const rawLocation = useSyncExternalStore(subscribeToLocation, getRawSavedLocation, getServerLocationSnapshot);
  const location = useMemo(() => parseSavedLocation(rawLocation), [rawLocation]);

  const summary = useMemo(() => getLocationSummary(location), [location]);
  const title = summary?.title || fallbackArea;
  const detail = summary?.detail || fallbackDetail;

  return (
    <Link className="address-chip" href="/conta/editar#localizacao">
      <MapPin className="size-5" />
      <span>
        <strong>
          <span className="address-desktop-text">Entregar em:</span>
          <span className="address-mobile-text">{title}</span>
        </strong>
        <small>
          <span className="address-desktop-text">{summary ? `${title} - ${detail}` : fallbackArea}</span>
          <span className="address-mobile-text">{detail}</span>
        </small>
      </span>
      <ChevronDown className="address-chevron size-4" />
    </Link>
  );
}

function subscribeToLocation(callback: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY) callback();
  }

  function handleLocationUpdate() {
    callback();
  }

  window.addEventListener('storage', handleStorage);
  window.addEventListener(LOCATION_EVENT, handleLocationUpdate);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(LOCATION_EVENT, handleLocationUpdate);
  };
}

function getRawSavedLocation() {
  if (typeof window === 'undefined') return '';
  return window.localStorage.getItem(STORAGE_KEY) || '';
}

function getServerLocationSnapshot() {
  return '';
}

function parseSavedLocation(rawLocation: string) {
  if (!rawLocation) return null;

  try {
    return JSON.parse(rawLocation) as SavedLocation;
  } catch {
    if (typeof window !== 'undefined') window.localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function getLocationSummary(location: SavedLocation | null) {
  if (!location) return null;

  const neighborhood = clean(location.neighborhood);
  const city = clean(location.city);
  const state = normalizeLocationState(location.state, city);
  const street = clean(location.street || location.address);
  const number = clean(location.number);
  const complement = clean(location.complement);

  const title = neighborhood || city || 'Local salvo';
  const streetLine = [street, number].filter(Boolean).join(', ');
  const cityLine = [city, state].filter(Boolean).join(' - ');
  const detail = [streetLine, complement, cityLine].filter(Boolean).join(' | ');

  if (!title && !detail) return null;
  return { title, detail: detail || 'Endereco salvo' };
}

function clean(value?: string | null) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeLocationState(value: string | undefined, city: string) {
  const state = clean(value).toUpperCase();
  const normalizedCity = city.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  if (!state) return '';
  if (state === 'MG' && (normalizedCity === 'sao paulo' || normalizedCity === 'montes claros')) return 'SP';
  return state;
}
