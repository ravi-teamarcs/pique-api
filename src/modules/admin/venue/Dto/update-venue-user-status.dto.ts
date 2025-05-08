import { IsIn, IsNotEmpty, IsNumber } from 'class-validator';

export class UpdateVenueUserStatus {
  @IsNumber()
  @IsNotEmpty()
  id: number;

  @IsNotEmpty()
  @IsIn(['active', 'rejected', 'inactive'])
  status: 'active' | 'rejected' | 'inactive';
}
