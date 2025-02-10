import { IsNotEmpty, IsString } from 'class-validator';

export class JoinDto {
  @IsString()
  @IsNotEmpty()
  userId: string;
  @IsString()
  @IsNotEmpty()
  receiverId: string;
}
