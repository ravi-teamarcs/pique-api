import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class EmailDto {
  @ApiProperty({ description: 'Email address to send the email to' })
  @IsString()
  @IsNotEmpty()
  to: string;
  @ApiProperty({ description: 'Subject of the Email' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  // @ApiProperty({ description: 'Message you want to send to ' })
  // @IsString()
  // @IsString()
  // @IsNotEmpty()
  // message: string;

  @ApiProperty({
    example: 'template1.html',
    description: 'Name of the template to use',
  })
  @IsString()
  templateName: string;

  @ApiProperty({ description: 'Replacements for the template' })
  replacements: Record<string, any>;

  @IsOptional()
  attachments?: {
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }[];
}
