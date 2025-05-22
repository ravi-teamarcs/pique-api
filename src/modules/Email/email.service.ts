import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { EmailDto } from './dto/send-email.dto';
import { ConfigService } from '@nestjs/config';
import { loadEmailTemplate } from '../../common/email-templates/utils/email.utils';
import { Logger } from '@nestjs/common';
import { EmailController } from './email.controller';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: Number(this.configService.get<number>('SMTP_PORT')),
      secure: this.configService.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }
  async handleSendEmail(emailDto: EmailDto) {
    const { to, subject, templateName, replacements, attachments } = emailDto;
    const html = loadEmailTemplate(templateName, replacements);

    const mailOptions = {
      from: this.configService.get<string>('SMTP_FROM'), // Sender address
      to, // Recipient address
      subject, // Subject line
      // text: message,  Plain text body
      html,
    };

    if (attachments?.length) {
      mailOptions['attachments'] = attachments;
    }
    try {
      const res = await this.transporter.sendMail(mailOptions);

      return { message: 'Email sent successfully', res, status: true };
    } catch (error) {
      this.logger.error('Error sending email', {
        to,
        subject,
        templateName,
        error: error.message,
      });

      return {
        message: 'Error While Sending the Email',
        error: error.message,
        status: false,
      };
    }
  }
}
