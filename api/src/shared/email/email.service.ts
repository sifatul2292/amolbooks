import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { google } from 'googleapis';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

/**
 * REf Video: https://youtu.be/-rcRf7yswfM
 */

@Injectable()
export class EmailService {
  constructor(private configService: ConfigService) {
    // TODO IF NEED
  }

  /**
   * EMAIL METHODS
   * sendEmail
   */

  async sendEmail(email: string, subject: string, htmlBody: string) {
    // console.log('email', email, subject, htmlBody);
    try {
      const gmail = this.configService.get<string>('gmail');
      const googleClientId = this.configService.get<string>('googleClientId1');
      const googleClientSecret = this.configService.get<string>(
        'googleClientSecret1',
      );
      const googleClientRedirectUrl = this.configService.get<string>(
        'googleClientRedirectUrl',
      );
      const googleRefreshToken = this.configService.get<string>(
        'googleRefreshToken1',
      );

      const oAuth2Client = new google.auth.OAuth2(
        googleClientId,
        googleClientSecret,
        googleClientRedirectUrl,
      );
      oAuth2Client.setCredentials({ refresh_token: googleRefreshToken });

      const accessToken = await oAuth2Client.getAccessToken();

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: gmail,
          clientId: googleClientId,
          clientSecret: googleClientSecret,
          refreshToken: googleRefreshToken,
          accessToken: accessToken,
        },
        tls: {
          rejectUnauthorized: false
        },
      });

      const emailFrom = gmail;
      const toReceiver = email;

      const info = await transporter.sendMail({
        from: `"Alambook" <${emailFrom}>`,
        replyTo: emailFrom,
        to: toReceiver, //receiver
        subject: subject, // Subject line
        // text: "Hello this is text body", // plain text body
        html: htmlBody, // html body
      });
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  // async sendEmail(name, email, file): Promise<ResponsePayload> {
  //   try {
  //     const gmail = this.configService.get<string>('gmail');
  //     const googleClientId = this.configService.get<string>('googleClientId');
  //     const googleClientSecret =
  //       this.configService.get<string>('googleClientSecret');
  //     const googleClientRedirectUrl = this.configService.get<string>(
  //       'googleClientRedirectUrl',
  //     );
  //     const googleRefreshToken =
  //       this.configService.get<string>('googleRefreshToken');
  //
  //     const oAuth2Client = new google.auth.OAuth2(
  //       googleClientId,
  //       googleClientSecret,
  //       googleClientRedirectUrl,
  //     );
  //     oAuth2Client.setCredentials({ refresh_token: googleRefreshToken });
  //
  //     const accessToken = await oAuth2Client.getAccessToken();
  //
  //     const transporter = nodemailer.createTransport({
  //       service: 'gmail',
  //       auth: {
  //         type: 'OAuth2',
  //         user: 'info@mkshippinglines.com',
  //         clientId: googleClientId,
  //         clientSecret: googleClientSecret,
  //         refreshToken: googleRefreshToken,
  //         accessToken: accessToken,
  //       },
  //     });
  //
  //     const emailFrom = gmail;
  //     const toReceiver = email;
  //
  //     const info = await transporter.sendMail({
  //       from: `"MK shipping Lines" <${emailFrom}>`,
  //       replyTo: emailFrom,
  //       to: toReceiver, //receiver
  //       subject: 'Thanks for your Cabin rentals.', // Subject line
  //       // text: "Hello this is text body", // plain text body
  //       html: `
  //           <p>Hi: (${name})</p>
  //           <p>We have completed your Cabin rentals. We hope you will enjoy travelling with us.</p>
  //           <p>Thanks for travelling with us.</p>
  //           <p>MK Shipping Lines</p>
  //           <p>Download App: <a href="https://rb.gy/aia3mx">https://rb.gy/aia3mx</a></p>
  //           `, // html body
  //       attachments: [
  //         {
  //           filename: `.pdf`, //my pdf name
  //           path: file, // the pdf content
  //           contentType: 'application/pdf', //Content type
  //         },
  //       ],
  //     });
  //
  //     return {
  //       success: true,
  //       message: 'Data Added Success',
  //     } as ResponsePayload;
  //   } catch (error) {
  //     console.log(error);
  //     throw new InternalServerErrorException(error.message);
  //   }
  // }
}
