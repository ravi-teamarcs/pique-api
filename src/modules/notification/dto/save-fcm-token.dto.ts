import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class SaveFcmTokenDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number;

  @IsString()
  @IsNotEmpty()
  token: string;
}
