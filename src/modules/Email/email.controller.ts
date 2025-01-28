import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EmailService } from './email.service';
import { EmailDto } from './dto/send-email.dto';

@ApiTags('Email')
// Define your email controller here. For example, send email, verify email, etc.
@Controller('email')
export class EmailController {
  constructor(private readonly emailService: EmailService) {}
  @ApiOperation({ summary: 'Send  an Email to The User.' })
  @ApiResponse({ status: 200, description: 'Email Sent Sucessfully' })
  @Post('send')
  sendEmail(@Body() emailDto: EmailDto) {
    return this.emailService.handleSendEmail(emailDto);
  }
}
