import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

class WishlistDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  url: string;

  
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsNumber()
  @IsNotEmpty()
  ratings: number;

  @IsNumber()
  @IsNotEmpty()
  category: number;

  @IsNumber()
  @IsNotEmpty()
  specific_category: number;

  @IsNumber()
  @IsNotEmpty()
  entId: number;
}

export { WishlistDto };
