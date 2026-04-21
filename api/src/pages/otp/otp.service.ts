import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { AddOtpDto, ValidateOtpDto } from '../../dto/otp.dto';
import { UtilsService } from '../../shared/utils/utils.service';
import { ResponsePayload } from '../../interfaces/core/response-payload.interface';
import { Otp } from '../../interfaces/common/otp.interface';
import { BulkSmsService } from '../../shared/bulk-sms/bulk-sms.service';
import { EmailService } from '../../shared/email/email.service';

const ObjectId = Types.ObjectId;

@Injectable()
export class OtpService {
  private logger = new Logger(OtpService.name);

  constructor(
    @InjectModel('Otp')
    private readonly otpModel: Model<Otp>,
    private utilsService: UtilsService,
    private bulkSmsService: BulkSmsService,
    private emailService: EmailService,
  ) {}

  /**
   * OTP FUNCTIONS
   * generateOtpWithPhoneNo()
   * validateOtpWithPhoneNo()
   */
  async generateOtpWithPhoneNo(addOtpDto: AddOtpDto): Promise<ResponsePayload> {
    try {
      const { phoneNo } = addOtpDto;

      const otpData = await this.otpModel.findOne({ phoneNo });

      if (otpData) {
        const data = {
          _id: otpData._id,
        };

        const code = this.utilsService.getRandomOtpCode6();
        const expireTime = this.utilsService.addMinuteInCurrentTime(5);

        await this.otpModel.findByIdAndUpdate(otpData._id, {
          $set: {
            code,
            expireTime,
            createdAt: new Date(),
          },
          $inc: {
            count: 1,
          },
        });
        // Sent Bulk Sms
        this.bulkSmsService.sentSingleSms(phoneNo, `Your otp code is ${code}`);
        console.log('code ', code);
        return {
          success: true,
          message: `Success! OTP code has been sent to your phone number.`,
          data,
        } as ResponsePayload;
      } else {
        const code = this.utilsService.getRandomOtpCode6();
        const expireTime = this.utilsService.addMinuteInCurrentTime(5);

        const newData = new this.otpModel({
          phoneNo,
          code,
          expireTime,
          count: 1,
        });

        const saveData = await newData.save();
        const data = {
          _id: saveData._id,
        };
        // Sent Bulk Sms
        this.bulkSmsService.sentSingleSms(phoneNo, `Your otp code is ${code}`);
        console.log('code ', code);

        return {
          success: true,
          message: `Success! OTP code has been sent to your phone number.`,
          data,
        } as ResponsePayload;
      }
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async generateOtpWithEmail(addOtpDto: AddOtpDto): Promise<ResponsePayload> {
    try {
      const { email } = addOtpDto;

      const otpData = await this.otpModel.findOne({ phoneNo: email });

      if (otpData) {
        const data = {
          _id: otpData._id,
        };

        const code = this.utilsService.getRandomOtpCode6();
        const expireTime = this.utilsService.addMinuteInCurrentTime(5);

        await this.otpModel.findByIdAndUpdate(otpData._id, {
          $set: {
            code,
            expireTime,
            createdAt: new Date(),
          },
          $inc: {
            count: 1,
          },
        });
        // Sent Email
        const html = `
        <p>Your otp code is ${code} </p>
        `;
        this.emailService.sendEmail(email, 'Alambook Otp', html);
        console.log('code ', code);
        return {
          success: true,
          message: `Success! OTP code has been sent to your email.`,
          data,
        } as ResponsePayload;
      } else {
        const code = this.utilsService.getRandomOtpCode6();
        const expireTime = this.utilsService.addMinuteInCurrentTime(5);

        const newData = new this.otpModel({
          phoneNo: email,
          code,
          expireTime,
          count: 1,
        });

        const saveData = await newData.save();
        const data = {
          _id: saveData._id,
        };
        // Sent Email
        const html = `
        <p>Your otp code is <strong>${code}</strong> </p>
        `;
        this.emailService.sendEmail(email, 'Alambook Otp', html);
        console.log('code ', code);

        return {
          success: true,
          message: `Success! OTP code has been sent to your email.`,
          data,
        } as ResponsePayload;
      }
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async validateOtpWithPhoneNo(
    ValidateOtpDto: ValidateOtpDto,
  ): Promise<ResponsePayload> {
    try {
      const { phoneNo } = ValidateOtpDto;
      const { code } = ValidateOtpDto;

      const otpData = await this.otpModel.findOne({ phoneNo });

      if (otpData) {
        const isExpired = this.utilsService.getDateDifference(
          new Date(),
          new Date(otpData.expireTime),
          'seconds',
        );

        if (isExpired <= 0) {
          return {
            success: false,
            message: 'Sorry! Invalid OTP',
            data: null,
          } as ResponsePayload;
        } else {
          if (code === otpData.code) {
            return {
              success: true,
              message: 'Success! OTP matched',
              data: null,
            } as ResponsePayload;
          } else {
            return {
              success: false,
              message: 'Sorry! Invalid OTP',
              data: null,
            } as ResponsePayload;
          }
        }
      } else {
        return {
          success: false,
          message: 'Sorry! Invalid OTP',
          data: null,
        } as ResponsePayload;
      }
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }

  async validateOtpWithEmail(
    ValidateOtpDto: ValidateOtpDto,
  ): Promise<ResponsePayload> {
    try {
      const { email } = ValidateOtpDto;
      const { code } = ValidateOtpDto;

      const otpData = await this.otpModel.findOne({ phoneNo: email });

      if (otpData) {
        const isExpired = this.utilsService.getDateDifference(
          new Date(),
          new Date(otpData.expireTime),
          'seconds',
        );

        if (isExpired <= 0) {
          return {
            success: false,
            message: 'Sorry! Invalid OTP',
            data: null,
          } as ResponsePayload;
        } else {
          if (code === otpData.code) {
            return {
              success: true,
              message: 'Success! OTP matched',
              data: null,
            } as ResponsePayload;
          } else {
            return {
              success: false,
              message: 'Sorry! Invalid OTP',
              data: null,
            } as ResponsePayload;
          }
        }
      } else {
        return {
          success: false,
          message: 'Sorry! Invalid OTP',
          data: null,
        } as ResponsePayload;
      }
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
}
