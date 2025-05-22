import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class SaveFcmTokenDto {
  @IsNumber()
  userId: number;

  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  userAgent: string;
}
