import { IsNotEmpty, IsString } from 'class-validator';

class verifyEmail {
  @IsNotEmpty()
  @IsString()
  email: string;
  @IsNotEmpty()
  @IsString()
  otp: string;
}

export { verifyEmail };
