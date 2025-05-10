// dto/set-availability.dto.ts
import { IsArray, IsIn, IsMilitaryTime } from 'class-validator';

export class TimeSlotDto {
  @IsIn([
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
  ])
  dayOfWeek: string;

  @IsMilitaryTime()
  startTime: string; // Format: HH:mm

  @IsMilitaryTime()
  endTime: string; // Format: HH:mm
}

export class SetAvailabilityDto {
  @IsArray()
  slots: TimeSlotDto[];
}
