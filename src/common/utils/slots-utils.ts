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

export { SLOT_RANGES, SlotName, getOverlappingSlots };
