import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UtilsService } from '../../shared/utils/utils.service';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { Order } from '../../interfaces/common/order.interface';
import { SslcommerzService } from '../../shared/sslcommerz/sslcommerz.service';

// import { NagadGateway } from 'nagad-payment-gateway';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { BulkSmsService } from '../../shared/bulk-sms/bulk-sms.service';
import { Product } from '../../interfaces/common/product.interface';
// import NagadGateway from 'nagad-payment-gateway';

// const Nagad = new NagadGateway({
//   apiVersion: 'v-0.2.0',
//   baseURL: 'https://api.mynagad.com',
//   callbackURL: 'https://redgrocer.com/payment/payment-nagad',
//   merchantID: '684044856091761',
//   merchantNumber: '684044856091761',
//   privKey: './nagad-key/merchantPrivateKey.txt',
//   pubKey: './nagad-key/pgPublicKey.txt',
//   isPath: true,
// });

// const Nagad = new NagadGateway({
//   apiVersion: 'v-0.2.0',
//   baseURL: 'http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0',
//   callbackURL: 'http://localhost:4200/payment/payment-nagad',
//   merchantID: '683002007104225',
//   merchantNumber: '683002007104225',
//   privKey: './nagad-key/merchantPrivateKey.txt',
//   pubKey: './nagad-key/pgPublicKey.txt',
//   isPath: true,
// });

@Injectable()
export class PaymentService {
  private logger = new Logger(PaymentService.name);

  constructor(
    @InjectModel('Order')
    private readonly orderModel: Model<Order>,
    @InjectModel('Product')
    private readonly productModel: Model<Product>,
    private utilsService: UtilsService,
    private sslService: SslcommerzService,
    private configService: ConfigService,
    private http: HttpService,
    private bulkSmsService: BulkSmsService,
  ) {}

  /**
   * NAGAD Payment
   * nagadCreatePayment()
   * nagadVerifyPayment()
   */
  // async nagadCreatePayment(data: any): Promise<ResponsePayload> {
  //   try {
  //     // const format = {
  //     //   amount: '100',
  //     //   ip: '45.118.63.70',
  //     //   orderId: `${Date.now()}`,
  //     //   productDetails: { a: '1', b: '2' },
  //     //   clientType: 'PC_WEB',
  //     // }
  //     // console.log('data', data);
  //     const nagadURL = await Nagad.createPayment({
  //       ...data,
  //       ...{
  //         orderId: `${this.utilsService.makeNumberOfRandomCharacter(5)}${
  //           data.orderId
  //         }`,
  //       },
  //     });
  //
  //     console.log('nagadURL', nagadURL);
  //
  //     return {
  //       success: true,
  //       message: 'Success!',
  //       nagadURL: nagadURL,
  //     } as ResponsePayload;
  //   } catch (error) {
  //     console.log(error);
  //     throw new InternalServerErrorException(error.message);
  //   }
  // }
  //
  // async nagadVerifyPayment(data: any): Promise<ResponsePayload> {
  //   try {
  //     const { paymentRefID } = data;
  //
  //     console.log('paymentRefID', paymentRefID);
  //
  //     const paymentInfo = await Nagad.verifyPayment(paymentRefID);
  //
  //     console.log('paymentInfo', paymentInfo);
  //
  //     if (paymentInfo && paymentInfo.status === 'Success') {
  //       await this.orderModel.findOneAndUpdate(
  //         { nagadPaymentId: paymentRefID },
  //         {
  //           paymentStatus: 'paid',
  //         },
  //       );
  //
  //       return {
  //         success: true,
  //         message: 'Payment Success!',
  //         data: {
  //           status: paymentInfo.status,
  //           statusCode: paymentInfo.statusCode,
  //         },
  //       } as ResponsePayload;
  //     } else {
  //       await this.orderModel.findOneAndDelete({
  //         nagadPaymentId: paymentRefID,
  //       });
  //       return {
  //         success: false,
  //         message: 'Failed!',
  //         data: {
  //           status: paymentInfo.status,
  //           statusCode: paymentInfo.statusCode,
  //         },
  //       } as ResponsePayload;
  //     }
  //   } catch (error) {
  //     console.log(error);
  //     throw new InternalServerErrorException(error.message);
  //   }
  // }

  /**
   * SSL COMMERCE PAYMENT
   * initSSLPayment()
   * ipn()
   */
  async initSSLPayment(body: any): Promise<ResponsePayload> {
    if (body.tran_id) {
      try {
        const response = await this.sslService.sslInit(body);
        return {
          success: true,
          message: 'Success!',
          data: response,
        } as ResponsePayload;
      } catch (error) {
        console.warn(error);
        throw new InternalServerErrorException(error.message);
      }
    } else {
      throw new InternalServerErrorException();
    }
  }

  async ipn(body: {
    status: string;
    tran_id: string;
    amount: number;
  }): Promise<ResponsePayload> {
    if (body.tran_id) {
      try {
        const order: Order = await this.orderModel.findOne({
          orderId: body.tran_id,
        });
        const response: any =
          await this.sslService.transactionQueryBySessionIdSSL({
            sessionkey: order.sslSessionId,
          });

        if (response.status === 'VALID') {
          if (order) {
            await this.orderModel.findOneAndUpdate(
              { orderId: body.tran_id },
              {
                paymentStatus: 'paid',
                paidAmount: Number(response.amount ?? 0),
              },
            );
          }
          // for (const f of order['packages']) {
          //   for (const g of f['orderItems']) {
          //     await this.productModel.findByIdAndUpdate(
          //       g._id,
          //       {
          //         $inc: {
          //           totalSold: g.selectedQuantity,
          //         },
          //       },
          //       {
          //         new: true,
          //         upsert: true,
          //       },
          //     );
          //   }
          // }
          for (const f of order['orderedItems']) {
            await this.productModel.findByIdAndUpdate(f._id, {
              $inc: {
                totalSold: f.quantity,
              },
            });

            await this.productModel.findByIdAndUpdate(f._id, {
              $inc: {
                quantity: -f.quantity,
              },
            });
          }
        } else {
          // Delete Order
          await this.orderModel.deleteOne({ orderId: body.tran_id });
        }
        // }
        return {
          success: true,
          message: 'Success!',
        } as ResponsePayload;
      } catch (error) {
        console.warn(error);
        throw new InternalServerErrorException(error.message);
      }
    } else {
      throw new InternalServerErrorException();
    }
  }

  /**
   * BKASH PAYMENT
   * getBkashToken()
   * executeBkashPayment()
   * createBkashPayment()
   * callbackBkashPayment()
   */

  private async getBkashToken(): Promise<any> {
    try {
      const url = this.configService.get<string>('bkashUrl');
      const username = this.configService.get<string>('bkashUsername');
      const password = this.configService.get<string>('bkashPassword');
      const appKey = this.configService.get<string>('bkashAppKey');
      const appSecret = this.configService.get<string>('bkashAppSecret');

      // console.log('username', username);
      // console.log('password', password);
      // console.log('appKey', appKey);
      // console.log('appSecret', appSecret);

      const httpReq = async () => {
        return new Promise((resolve, reject) => {
          this.http
            .post(
              `${url}/token/grant`,
              {
                app_key: appKey,
                app_secret: appSecret,
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                  username: username,
                  password: password,
                },
              },
            )
            .subscribe({
              next: (res) => {
                resolve(res);
              },
              error: (err) => {
                reject(err);
                console.log(err);
              },
            });
        });
      };

      const result = await httpReq();
      return result['data'];
    } catch (error) {
      console.warn(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  private async executeBkashPayment(paymentID: string): Promise<any> {
    try {
      const token = await this.getBkashToken();

      const url = this.configService.get<string>('bkashUrl');
      const appKey = this.configService.get<string>('bkashAppKey');

      const httpReq = async () => {
        return new Promise((resolve, reject) => {
          this.http
            .post(
              `${url}/execute`,
              {
                paymentID: paymentID,
              },
              {
                headers: {
                  'Content-Type': 'application/json',
                  Accept: 'application/json',
                  authorization: token.id_token,
                  'x-app-key': appKey,
                },
              },
            )
            .subscribe({
              next: (res) => {
                resolve(res);
              },
              error: (err) => {
                reject(err);
                console.log(err);
              },
            });
        });
      };

      const result = await httpReq();
      return result['data'];
    } catch (error) {
      console.warn(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async createBkashPayment(body: any): Promise<ResponsePayload> {
    try {
      const token = await this.getBkashToken();

      const url = this.configService.get<string>('bkashUrl');
      const appKey = this.configService.get<string>('bkashAppKey');

      const httpReq = async () => {
        return new Promise((resolve, reject) => {
          this.http
            .post(`${url}/create`, body, {
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                authorization: token.id_token,
                'x-app-key': appKey,
              },
            })
            .subscribe({
              next: (res) => {
                resolve(res);
              },
              error: (err) => {
                reject(err);
                console.log(err);
              },
            });
        });
      };

      const result = await httpReq();

      return {
        success: true,
        message: 'Success',
        data: result['data'],
      } as ResponsePayload;
    } catch (error) {
      console.warn(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async callbackBkashPayment(body: {
    paymentID: string;
    status: string;
  }): Promise<ResponsePayload> {
    try {
      const { paymentID, status } = body;

      const orderData = await this.orderModel.findOne({
        bkashPaymentId: paymentID,
      });

      if (status === 'success') {
        const result = await this.executeBkashPayment(paymentID);

        if (result.statusCode === '0000') {
          await this.orderModel.findByIdAndUpdate(orderData._id, {
            paymentStatus: 'paid',
          });
          // Sent SMS to User
          const message = `Hi ${orderData.name} \nThanks for Shopping with redgrocer.com. Please wait for confirmation.`;
          this.bulkSmsService.sentSingleSms(orderData.phoneNo, message);

          return {
            success: true,
            message: 'Success',
            data: {
              statusCode: result.statusCode,
              message: result.statusMessage,
            },
          } as ResponsePayload;
        } else {
          // Delete Order
          await this.orderModel.findByIdAndDelete(orderData._id);
          return {
            success: false,
            message: 'Payment Error',
            data: {
              statusCode: result.statusCode,
              message: result.statusMessage,
            },
          } as ResponsePayload;
        }
      } else {
        // Delete Order
        await this.orderModel.findByIdAndDelete(orderData._id);
        return {
          success: false,
          message: 'Payment Canceled',
          data: {
            statusCode: null,
            message: 'Payment Canceled',
          },
        } as ResponsePayload;
      }
    } catch (error) {
      console.warn(error);
      throw new InternalServerErrorException(error.message);
    }
  }
}
