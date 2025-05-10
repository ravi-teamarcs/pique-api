import { IsIn, IsNotEmpty, IsNumber } from 'class-validator';

export class ApproveEntertainer {
  @IsNumber()
  @IsNotEmpty()
  id: number;
  @IsNotEmpty()
  @IsIn(['active', 'rejected', 'inactive'])
  status: 'active' | 'rejected' | 'inactive';
}
