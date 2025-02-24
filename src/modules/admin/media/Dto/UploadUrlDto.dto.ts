import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum } from 'class-validator';

export class UploadUrlDto {
    @IsString()
    @IsNotEmpty()
    url: string;

    @IsNumber()
    @IsOptional()
    userId?: number;

    @IsNumber()
    @IsOptional()
    refId?: number;

    @IsOptional()
    @IsEnum(['image', 'video', 'headshot'])
    type?: 'image' | 'video' | 'headshot';
}
