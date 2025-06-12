import { lookupViaCity } from 'city-timezones';
import tzlookup = require('tz-lookup');

const SLOT_RANGES = {
  morning: { start: '07:00', end: '12:00' },
  afternoon: { start: '12:00', end: '17:00' },
  evening: { start: '17:00', end: '23:00' },
};
type SlotName = keyof typeof SLOT_RANGES;

function getOverlappingSlots(startTime: string, endTime: string): SlotName[] {
  const overlapping: SlotName[] = [];

  for (const [slotName, { start, end }] of Object.entries(SLOT_RANGES)) {
    if (startTime < end && endTime > start) {
      overlapping.push(slotName as SlotName);
    }
  }

  return overlapping;
}

function getTimezoneByCity(city: string, state?: string): string | null {
  if (!city) return null;

  try {
    const cityLookup = lookupViaCity(city.trim());
    const matched = cityLookup.find(
      (c) => c.city.toLowerCase() === city.trim().toLowerCase(),
    );
    return matched?.timezone || null;
  } catch (error) {
    // Log error if needed, but return fallback
    console.warn('Timezone lookup failed:', error);
    return null;
  }
}

function getTimezoneByLatLng(lat: number, lng: number): string {
  try {
    // Validate inputs: latitude [-90, 90], longitude [-180, 180]
    if (
      typeof lat !== 'number' ||
      typeof lng !== 'number' ||
      isNaN(lat) ||
      isNaN(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return null;
    }

    return tzlookup(lat, lng);
  } catch (error) {
    console.warn('tzlookup failed:', error);
    return null;
  }
}

export {
  SLOT_RANGES,
  SlotName,
  getOverlappingSlots,
  getTimezoneByCity,
  getTimezoneByLatLng,
};
