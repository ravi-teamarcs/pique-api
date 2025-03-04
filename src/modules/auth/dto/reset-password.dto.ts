import { IsNotEmpty, IsString } from 'class-validator';

class ResetPassword {
  @IsNotEmpty()
  @IsString()
  newPassword: string;
  @IsNotEmpty()
  @IsString()
  token: string;
}

export {ResetPassword}
