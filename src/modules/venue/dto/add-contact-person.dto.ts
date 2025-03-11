import { IsNotEmpty, IsNumber } from 'class-validator';

export class ContactDto {
  @IsNumber()
  @IsNotEmpty()
  venueId: number;

  @IsNotEmpty()
  contactPerson: { name: string; mobile: string; email: string };
}
