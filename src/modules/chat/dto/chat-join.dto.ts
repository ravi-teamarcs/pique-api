import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class JoinDto {
  @IsNumber()
  @IsNotEmpty()
  userId: number;
  @IsNumber()
  @IsNotEmpty()
  receiverId: number;
}
