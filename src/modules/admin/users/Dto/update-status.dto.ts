import {
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
} from 'class-validator';

export class UpdateStatusDto {
  // @IsNumber()
  // @IsNotEmpty()
  // userId: number;

  //   @IsIn(['active', 'pending', 'inactive'])
  //   @IsString()
  //   @IsNotEmpty()
  //   status: 'active' | 'pending' | 'inactive';

  @IsArray()
  @IsInt({ each: true })
  @IsNotEmpty()
  ids: number[];

  @IsEnum(['active', 'inactive', 'pending'], {
    message: 'Invalid status value',
  })
  @IsNotEmpty()
  status: 'active' | 'inactive' | 'pending';
}
