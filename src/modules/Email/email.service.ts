import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { EmailDto } from './dto/send-email.dto';
import { ConfigService } from '@nestjs/config';
import { loadEmailTemplate } from '../../common/email-templates/utils/email.utils';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

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
    const { to, subject, templateName, replacements } = emailDto;
    const html = loadEmailTemplate(templateName, replacements);

    const mailOptions = {
      from: this.configService.get<string>('SMTP_FROM'), // Sender address
      to, // Recipient address
      subject, // Subject line
      // text: message,  Plain text body
      html,
    };
    try {
      const res = await this.transporter.sendMail(mailOptions);
      console.log('EMAIL SENT SUCCESSFULLY', res);
      return { message: 'Email sent successfully', res };
    } catch (error) {
      console.log('ERROR In Email Service', error);
      throw new InternalServerErrorException({
        message: 'Error While Sending the Email',
        error: error.message,
        status: false,
      });
    }
  }
}
