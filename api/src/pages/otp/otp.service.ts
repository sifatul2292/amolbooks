import {
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes, randomInt } from 'crypto';
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

        const code = randomInt(100000, 1000000).toString();
        const expireTime = this.utilsService.addMinuteInCurrentTime(5);

        await this.otpModel.findByIdAndUpdate(otpData._id, {
          $set: {
            code,
            attempts: 0,
            expireTime,
            createdAt: new Date(),
          },
          $unset: { resetTokenHash: 1, resetTokenExpiresAt: 1 },
          $inc: {
            count: 1,
          },
        });
        // Sent Bulk Sms
        this.bulkSmsService.sentSingleSms(phoneNo, `Your otp code is ${code}`);
        return {
          success: true,
          message: `Success! OTP code has been sent to your phone number.`,
          data,
        } as ResponsePayload;
      } else {
        const code = randomInt(100000, 1000000).toString();
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

        const code = randomInt(100000, 1000000).toString();
        const expireTime = this.utilsService.addMinuteInCurrentTime(5);

        await this.otpModel.findByIdAndUpdate(otpData._id, {
          $set: {
            code,
            attempts: 0,
            expireTime,
            createdAt: new Date(),
          },
          $unset: { resetTokenHash: 1, resetTokenExpiresAt: 1 },
          $inc: {
            count: 1,
          },
        });
        // Sent Email
        const html = `
        <p>Your otp code is ${code} </p>
        `;
        this.emailService.sendEmail(email, 'Amol Books OTP', html);
        return {
          success: true,
          message: `Success! OTP code has been sent to your email.`,
          data,
        } as ResponsePayload;
      } else {
        const code = randomInt(100000, 1000000).toString();
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
        this.emailService.sendEmail(email, 'Amol Books OTP', html);

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

  async validateOtpWithPhoneNo(dto: ValidateOtpDto): Promise<ResponsePayload> {
    return this.validateOtp(dto.phoneNo, dto.code);
  }

  async validateOtpWithEmail(dto: ValidateOtpDto): Promise<ResponsePayload> {
    return this.validateOtp(dto.email, dto.code);
  }

  private async validateOtp(identity: string, code: string): Promise<ResponsePayload> {
    const invalid = { success: false, message: 'Sorry! Invalid OTP', data: null };
    if (typeof identity !== 'string' || !identity || !/^\d{6}$/.test(code)) {
      return invalid;
    }
    // Count attempts atomically, including concurrent guesses and legacy records.
    const otp = await this.otpModel.findOneAndUpdate(
      { phoneNo: identity, $or: [{ attempts: { $lt: 5 } }, { attempts: { $exists: false } }] },
      { $inc: { attempts: 1 } },
      { new: true },
    );
    if (!otp || otp.code !== code || !(new Date(otp.expireTime).getTime() > Date.now())) {
      return invalid;
    }
    const resetToken = randomBytes(32).toString('hex');
    const consumed = await this.otpModel.findOneAndUpdate(
      { _id: otp._id, code, expireTime: otp.expireTime, attempts: { $lte: 5 } },
      { $set: {
        code: randomBytes(32).toString('hex'),
        resetTokenHash: createHash('sha256').update(resetToken).digest('hex'),
        resetTokenExpiresAt: new Date(Date.now() + 5 * 60 * 1000),
      } },
    );
    if (!consumed) return invalid;
    return { success: true, message: 'Success! OTP matched', data: { resetToken } };
  }

  async consumePasswordResetToken(username: string, resetToken: string): Promise<void> {
    if (typeof username !== 'string' || !username ||
        typeof resetToken !== 'string' || !/^[a-f0-9]{64}$/.test(resetToken)) {
      throw new UnauthorizedException('Invalid or expired password reset token');
    }
    const consumed = await this.otpModel.findOneAndUpdate(
      {
        phoneNo: username,
        resetTokenHash: createHash('sha256').update(resetToken).digest('hex'),
        resetTokenExpiresAt: { $gt: new Date() },
      },
      { $unset: { resetTokenHash: 1, resetTokenExpiresAt: 1 } },
    );
    if (!consumed) throw new UnauthorizedException('Invalid or expired password reset token');
  }
}
