import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { SslInit } from '../../interfaces/common/ssl-init';
import { SslCommerzPayment } from 'sslcommerz';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';

@Injectable()
export class SslcommerzService {
  private logger = new Logger(SslcommerzService.name);

  constructor(
    private readonly httpService: HttpService,
    private configService: ConfigService,
  ) {}

  /**
   * Init SSL commerze
   * validateSSL
   * transactionQueryBySessionIdSSL
   * transactionQueryByTransactionIdSSL
   */
  public sslInit(data: SslInit) {
    const store_id = this.configService.get<string>('STORE_ID');
    const store_passwd = this.configService.get<string>('STORE_PASSWORD');

    data.store_id = store_id;
    data.store_passwd = store_passwd;
    try {
      return new Promise((resolve, reject) => {
        const credential = new SslCommerzPayment(store_id, store_passwd, true);
        const response = credential.init(data);

        response.then(
          async (res) => {
            resolve(res);
          },
          (error) => {
            reject(error);
          },
        );
      });
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  public validateSSL(data: any) {
    const store_id = this.configService.get<string>('STORE_ID');
    const store_passwd = this.configService.get<string>('STORE_PASSWORD');

    data.store_id = store_id;
    data.store_passwd = store_passwd;

    try {
      const credential = new SslCommerzPayment(
        process.env.STORE_ID,
        process.env.STORE_PASSWORD,
        true,
      );
      const response = credential.validate(data);
      response.then((result) => {
        return {
          success: true,
          message: 'Success',
          data: result,
        } as ResponsePayload;
      });
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }
  public transactionQueryBySessionIdSSL(data: any) {
    const store_id = this.configService.get<string>('STORE_ID');
    const store_passwd = this.configService.get<string>('STORE_PASSWORD');
    try {
      return new Promise((resolve, reject) => {
        const credential = new SslCommerzPayment(store_id, store_passwd, true);
        const response = credential.transactionQueryBySessionId(data);
        response.then(
          async (res) => {
            console.log(res);
            resolve(res);
          },
          (error) => {
            reject(error);
          },
        );
      });
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  public transactionQueryByTransactionIdSSL(data: any) {
    const store_id = this.configService.get<string>('STORE_ID');
    const store_passwd = this.configService.get<string>('STORE_PASSWORD');
    try {
      const credential = new SslCommerzPayment(
        process.env.STORE_ID,
        process.env.STORE_PASSWORD,
        true,
      );
      const response = credential.transactionQueryByTransactionId(data);
      response.then((result) => {
        return {
          success: true,
          message: 'Success',
          data: result,
        } as ResponsePayload;
      });
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }
}
