import { Transform } from 'class-transformer';
import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

class PrimaryInfoDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNotEmpty()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    // If it's already an array (e.g., services[]=A&services[]=B), return as-is
    if (Array.isArray(value)) return value;
    // If it's a comma-separated string: "A,B,C"
    if (typeof value === 'string')
      return value.split(',').map((item) => item.trim());
    return [];
  })
  venueType: string[];
}

export { PrimaryInfoDto };
