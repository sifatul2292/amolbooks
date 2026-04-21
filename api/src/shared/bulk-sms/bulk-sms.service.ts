import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BulkSmsService {
  private logger = new Logger(BulkSmsService.name);

  constructor(
    private readonly httpService: HttpService,
    private configService: ConfigService,
  ) {}

  /**
   * BULK SMS METHODS
   * sentSingleSms
   */
  // public sentSingleSms(phoneNo: string, message: string) {
  //   const api_token = this.configService.get<string>('api_token');
  //   const sid = this.configService.get<string>('sid');
  //   const SSL_SMS_API = this.configService.get<string>('SSL_SMS_API');
  //
  //   if (phoneNo) {
  //     // SMS
  //     const smsData = {
  //       api_token: api_token,
  //       msisdn: '88' + phoneNo,
  //       sms: message || '',
  //       sid: sid,
  //       csms_id: phoneNo,
  //     };
  //     // console.log(smsData);
  //     this.httpService
  //       .get<{ data: any }>(SSL_SMS_API, { params: smsData })
  //       .subscribe(
  //         (res) => {
  //           // console.log(res)
  //         },
  //         (error) => {
  //           console.log(error)
  //         },
  //       );
  //   }
  // }

  // public sentSingleSms(phoneNo: string, message: string) {
  //   const username = this.configService.get<string>('smsSenderUsername');
  //   const smsSenderSecret = this.configService.get<string>('smsSenderSecret');
  //   const senderId = this.configService.get<string>('smsSenderId');
  //
  //   // const url =
  //   //   'http://66.45.237.70/api.php?username=' +
  //   //   username +
  //   //   '&password=' +
  //   //   password +
  //   //   '&number=' +
  //   //   phoneNo +
  //   //   '&message=' +
  //   //   message;
  //
  //   const url = `https://www.880sms.com/smsapi?api_key=${smsSenderSecret}&type=text&contacts=${phoneNo}&senderid=${senderId}&msg=${message}`;
  //
  //   // console.log('url', url);
  //
  //   this.httpService.get<{ data: string }>(url, {}).subscribe(
  //     (res) => {
  //       // console.log(res.data.data);
  //       // console.log(res.data);
  //     },
  //     (error) => {
  //       console.log('error', error);
  //       this.logger.error(error);
  //     },
  //   );
  // }
  public sentSingleSms(phoneNo: string, message: string) {
    try {
      console.log('test9999999999999',phoneNo);
      const smsSenderSecret = this.configService.get<string>('smsSenderSecret');
      const password = this.configService.get<string>('smsSenderPassword');
      const smsSenderId = this.configService.get<string>('smsSenderId');

      // URL encode all parameters to handle special characters and Bengali text
      const encodedApiKey = encodeURIComponent(smsSenderSecret || '');
      const encodedPhoneNo = encodeURIComponent(phoneNo || '');
      const encodedSenderId = encodeURIComponent(smsSenderId || '');
      const encodedMessage = encodeURIComponent(message || '');

      const url = `http://bulksmsbd.net/api/smsapi?api_key=${encodedApiKey}&type=text&number=${encodedPhoneNo}&senderid=${encodedSenderId}&message=${encodedMessage}`;

      this.httpService.post<{ data: string }>(url, {}).subscribe(
        (res) => {
          this.logger.log('SMS sent successfully:', res.data);
        },
        (error) => {
          this.logger.error(
            `Failed to send SMS to ${phoneNo}:`,
            error?.message || error,
          );
        },
      );
    } catch (error) {
      this.logger.error(
        `Error in sentSingleSms for ${phoneNo}:`,
        error?.message || error,
      );
    }
  }
}
