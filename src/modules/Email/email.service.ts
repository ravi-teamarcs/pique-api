import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { EmailDto } from './dto/send-email.dto';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configure the transporter (replace with your email provider's settings)
    this.transporter = nodemailer.createTransport(
      //     {
      //   service: 'gmail', // Example: Gmail
      //   auth: {
      //     user: process.env.EMAIL_USER, // Your email address
      //     pass: process.env.EMAIL_PASSWORD, // Your email password or app-specific password
      //   },
      // }
      {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      },
    );
  }
  async handleSendEmail(emailDto: EmailDto) {
    const { to, subject, message } = emailDto;
    const mailOptions = {
      from: process.env.SMTP_FROM, // Sender address
      to, // Recipient address
      subject, // Subject line
      text: message, // Plain text body
      //   html, // HTML body (optional)
    };
    try {
      const res = await this.transporter.sendMail(mailOptions);
      return { message: 'Email sent successfully', res };
    } catch (error) {
      console.log(error);
      throw new Error(`Error while sending the email`);
    }
  }
}
