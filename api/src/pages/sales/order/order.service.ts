import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { UtilsService } from '../../../shared/utils/utils.service';
import { Order } from '../../../interfaces/common/order.interface';
import { ResponsePayload } from '../../../interfaces/core/response-payload.interface';
import { ErrorCodes } from '../../../enum/error-code.enum';
import {
  AddOrderDto,
  FilterAndPaginationOrderDto,
  OptionOrderDto,
  UpdateOrderDto,
  UpdateOrderStatusDto,
} from '../../../dto/order.dto';
import { Product } from '../../../interfaces/common/product.interface';
import { UniqueId } from '../../../interfaces/core/unique-id.interface';
import { OrderStatus } from '../../../enum/order.enum';
import { User } from '../../../interfaces/user/user.interface';
import { Cart } from '../../../interfaces/common/cart.interface';
import { BulkSmsService } from '../../../shared/bulk-sms/bulk-sms.service';
import { EmailService } from '../../../shared/email/email.service';
import { Coupon } from '../../../interfaces/common/coupon.interface';
import { DiscountTypeEnum } from '../../../enum/product.enum';
import { OrderOffer } from '../../../interfaces/common/order-offer.interface';
import { SpecialPackage } from '../../../interfaces/common/special-package.interface';
import { ShopInformation } from '../../../interfaces/common/shop-information.interface';
import { Setting } from '../../customization/setting/interface/setting.interface';
import {
  CourierApiConfig,
  SteadfastCourierPayload,
} from 'src/shared/courier/interfaces/courier.interface';
import { CourierService } from '../../../shared/courier/courier.service';
import * as schedule from 'node-schedule';
import { Admin } from '../../../interfaces/admin/admin.interface';
const ObjectId = Types.ObjectId;

@Injectable()
export class OrderService {
  private logger = new Logger(OrderService.name);

  constructor(
    @InjectModel('Admin') private readonly adminModel: Model<Admin>,
    @InjectModel('Order') private readonly orderModel: Model<Order>,
    @InjectModel('Product') private readonly productModel: Model<Product>,
    @InjectModel('SpecialPackage')
    private readonly specialPackageModel: Model<SpecialPackage>,
    @InjectModel('UniqueId') private readonly uniqueIdModel: Model<UniqueId>,
    @InjectModel('Cart') private readonly cartModel: Model<Cart>,
    @InjectModel('User') private readonly userModel: Model<Cart>,
    @InjectModel('Setting') private readonly settingModel: Model<Setting>,
    @InjectModel('Coupon') private readonly couponModel: Model<Coupon>,
    private readonly courierService: CourierService,
    @InjectModel('ShopInformation')
    private readonly shopInformationModel: Model<ShopInformation>,
    @InjectModel('OrderOffer')
    private readonly orderOfferModel: Model<OrderOffer>,
    private configService: ConfigService,
    private utilsService: UtilsService,
    private bulkSmsService: BulkSmsService,
    private emailService: EmailService, // private pdfMakerService: TCreatedPdf,
  ) {
    this.checkAndUpdateCourierStatus();
  }

  /**
   * addOrder
   * insertManyOrder
   */
  async addOrderAdmin(
    admin,
    addOrderDto: AddOrderDto,
  ): Promise<ResponsePayload> {
    if (!admin || !admin._id) {
      this.logger.error('Admin data is missing in addOrderAdmin');
      throw new BadRequestException(
        'Admin authentication failed: Admin data is missing',
      );
    }
    let user;
    let mData;
    const adminData = await this.adminModel.findById(admin._id);
    // this.logger.error(addOrderDto);
    // Increment Order Id Unique
    const incOrder = await this.uniqueIdModel.findOneAndUpdate(
      {},
      { $inc: { orderId: 1 } },
      { new: true, upsert: true },
    );

    const orderIdUnique = this.utilsService.padLeadingZeros(incOrder.orderId);

    const dataExtra = {
      orderId: orderIdUnique,
      month: this.utilsService.getDateMonth(false, new Date()),
      year: this.utilsService.getDateYear(new Date()),
    };

    if (addOrderDto.phoneNo && !addOrderDto.user) {
      user = await this.userModel.findOne({ phoneNo: addOrderDto.phoneNo });
      // console.log(user);
      if (user) {
        mData = { ...addOrderDto, ...dataExtra, ...{ user: user._id } };
      } else {
        mData = { ...addOrderDto, ...dataExtra };
      }
    } else {
      mData = { ...addOrderDto, ...dataExtra, ...adminData };
    }

    const newData = new this.orderModel(mData);

    try {
      const saveData = await newData.save();

      // if (saveData.email) {
      //
      //   const file = await this.pdfMakerService.makePDF(saveData)
      //   await this.emailService.sendEmail(saveData.name, saveData.email, file);
      //
      // }

      const data = {
        _id: saveData._id,
        orderId: saveData.orderId,
      };
      if (addOrderDto.user) {
        await this.cartModel.deleteMany({
          user: new ObjectId(addOrderDto.user),
        });
        await this.userModel.findOneAndUpdate(
          { _id: addOrderDto.user },
          {
            $set: {
              carts: [],
            },
          },
        );
        if (addOrderDto.coupon) {
          await this.userModel.findOneAndUpdate(
            { _id: addOrderDto.user },
            {
              $push: {
                usedCoupons: addOrderDto.coupon,
              },
            },
          );
        }
      }

      for (const f of addOrderDto['orderedItems']) {
        const product = await this.productModel.findById(f._id);
        if (product?.quantity > 0) {
          await this.productModel.findByIdAndUpdate(f._id, {
            $inc: {
              quantity: -f.quantity,
              totalSold: f.quantity,
            },
          });
        } else {
          await this.productModel.findByIdAndUpdate(f._id, {
            $inc: {
              totalSold: f.quantity,
            },
          });
        }
      }

      const response = {
        success: true,
        message: 'Order Added Success',
        data,
      } as ResponsePayload;

      // Run background tasks after response is prepared (fire and forget)
      // This will execute after the response is sent to UI
      this.processOrderBackgroundTasks(saveData, addOrderDto).catch((error) => {
        this.logger.error(
          `Error in background order processing for order ${saveData.orderId}:`,
          error,
        );
      });

      return response;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async addOrder(addOrderDto: AddOrderDto): Promise<ResponsePayload> {
    try {
      let newOrderMake: any;
      const fraudCheckerData: any = null;

      // New Order Make
      // if (addOrderDto.user) {
      newOrderMake = await this.newOrderMake(addOrderDto);
      // console.log('newOrderMake data', newOrderMake);
      // } else {
      //   newOrderMake = await this.newOrderMake(addOrderDto);
      // }
      // if (addOrderDto.phoneNo) {
      //   try {
      //     fraudCheckerData = await this.courierService.checkFraudOrder(
      //       addOrderDto.phoneNo,
      //     );
      //     // Validate response structure
      //     if (fraudCheckerData && !fraudCheckerData.summary) {
      //       this.logger.warn(
      //         `Fraud checker response missing summary for phone: ${addOrderDto.phoneNo}`,
      //       );
      //     }
      //   } catch (error) {
      //     this.logger.warn(
      //       `Failed to fetch fraud checker data for phone: ${addOrderDto?.phoneNo}`,
      //       error?.message || error,
      //     );
      //     // Continue with order creation even if fraud check fails
      //   }
      // }

      // Increment Order Id Unique
      const incOrder = await this.uniqueIdModel.findOneAndUpdate(
        {},
        { $inc: { orderId: 1 } },
        { new: true, upsert: true },
      );

      const orderIdUnique = this.utilsService.padLeadingZeros(incOrder.orderId);

      const dataExtra = {
        orderId: orderIdUnique,
        month: this.utilsService.getDateMonth(false, new Date()),
        year: this.utilsService.getDateYear(new Date()),
      };

      const mData = { ...newOrderMake, ...dataExtra };
      const newData = new this.orderModel(mData);

      const saveData = await newData.save();

      // Prepare response data immediately
      const data = {
        _id: saveData._id,
        orderId: saveData.orderId,
      };

      // Return response immediately - UI will get response fast
      const response = {
        success: true,
        message: 'Order Added Success',
        data,
      } as ResponsePayload;

      // Run background tasks after response is prepared (fire and forget)
      // This will execute after the response is sent to UI
      this.processOrderBackgroundTasks(saveData, addOrderDto).catch((error) => {
        this.logger.error(
          `Error in background order processing for order ${saveData.orderId}:`,
          error,
        );
      });

      return response;
    } catch (error) {
      console.log(error);
      throw new InternalServerErrorException(error.message);
    }
  }

  /**
   * Process background tasks after order is saved
   * This runs asynchronously without blocking the response
   */
  private async processOrderBackgroundTasks(
    saveData: any,
    addOrderDto: AddOrderDto,
  ): Promise<void> {
    try {
      // 1) Fraud Checker Call + Order Update
      if (addOrderDto.phoneNo) {
        try {
          const fraudCheckerData = await this.courierService.checkFraudOrder(
            addOrderDto.phoneNo,
          );

          // Validate response structure
          if (fraudCheckerData && !fraudCheckerData.summary) {
            this.logger.warn(
              `Fraud checker response missing summary for phone: ${addOrderDto.phoneNo}`,
            );
          }

          // Fraud data পেলে order এ সেট করি
          if (fraudCheckerData) {
            await this.orderModel.updateOne(
              { _id: saveData._id },
              { $set: { fraudChecker: fraudCheckerData } },
            );
          }
        } catch (error) {
          this.logger.warn(
            `Failed to fetch fraud checker data for phone: ${addOrderDto?.phoneNo}`,
            error?.message || error,
          );
          // Fraud checker fail হলেও order ঠিক থাকবে
        }
      }

      // 2) Cart cleanup and coupon update
      if (addOrderDto.user && saveData._id) {
        await this.cartModel.deleteMany({
          user: new ObjectId(addOrderDto.user),
        });
        await this.userModel.findOneAndUpdate(
          { _id: addOrderDto.user },
          {
            $set: {
              carts: [],
            },
          },
        );
        if (addOrderDto.coupon) {
          await this.userModel.findOneAndUpdate(
            { _id: addOrderDto.user },
            {
              $push: {
                usedCoupons: addOrderDto.coupon,
              },
            },
          );
        }
      }

      // 3) Generate Invoice PDF
      await this.utilsService.generateInvoicePdf(saveData);
      const pdfLink = `https://api.alambook.com/invoice/invoice-${saveData.orderId}.pdf`;

      // 4) Send SMS and Email for Cash on Delivery
      // Check from database if SMS has already been sent to prevent duplicate SMS
      if (saveData['paymentType'] === 'cash_on_delivery') {
        // Check database to see if SMS was already sent (prevents race condition)
        const orderCheck: any = await this.orderModel.findById(saveData._id).select('orderSmsSent');
        if (!orderCheck?.orderSmsSent) {
          const message = `
         আপনার অর্ডারটি alambook.com-এ সফলভাবে সম্পন্ন হয়েছে! অর্ডার আইডি ${saveData.orderId},অর্ডারের বিল ${saveData.grandTotal} টাকা যেকোনো প্রয়োজনে আমাদের সাথে যোগাযোগ করুন 01754896763 ধন্যবাদ, alambook.com টিম
        `;
          // const message = `আপনার অর্ডারটি alambook.com-এ সফলভাবে সম্পন্ন হয়েছে। আপনার অর্ডার আইডি (${saveData.orderId}) যেকোনো প্রয়োজনে আমাদের সাথে যোগাযোগ করুন 01754896763`;
          // const message = `Thank you for your purchase from alambook.com. Your order (${saveData.orderId}) has been placed successfully. Please wait for a confirmation Call.`;
          this.bulkSmsService.sentSingleSms(saveData.phoneNo, message);
          
          // Mark SMS as sent to prevent duplicate (atomic update)
          await this.orderModel.updateOne(
            { _id: saveData._id },
            { $set: { orderSmsSent: true } },
          );
        }

        // Sent Email
        if (saveData.email) {
          const html = `
      <p>Thank you for your purchase from alambook.com. Your order (${saveData.orderId}) has been placed successfully. Please wait for a confirmation Call. Track your order alambook.com/order-track/${saveData._id}
      </p>
      <iframe src="${pdfLink}" frameborder="0" width="100%" height="500px"></iframe>
      <a href="${pdfLink}">Download your invoice</a>
      `;
          this.emailService.sendEmail(saveData.email, 'Alambook', html);
        }
      }
    } catch (error) {
      this.logger.error(
        `Error processing background tasks for order ${saveData.orderId}:`,
        error,
      );
      // Don't throw - background tasks should not fail the order
    }
  }

  async addOrderByUser(
    addOrderDto: AddOrderDto,
    user: User,
  ): Promise<ResponsePayload> {
    // Add user ID on order dto
    if (user) {
      addOrderDto.user = user._id;
    }
    return this.addOrder(addOrderDto);
  }

  async addOrderByAnonymous(
    addOrderDto: AddOrderDto,
  ): Promise<ResponsePayload> {
    // Add user ID on order dto
    // if (user) {
    //   addOrderDto.user = user._id;
    // }
    return this.addOrder(addOrderDto);
  }

  async updateDate(): Promise<ResponsePayload> {
    try {
      const data = await this.orderModel.find();

      if (data) {
        data.forEach(async (f) => {
          const date = this.utilsService.getDateString(f.preferredDate);
          // console.log('updateDate', date);
          await this.orderModel.findByIdAndUpdate(f._id, {
            $set: { preferredDateString: date },
            // $unset: {preferredDate: ''}
          });
        });
      }

      return {
        success: true,
        message: 'Date updated successfully!',
        data: null,
      };
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async checkFraudSpy(phoneNo: string): Promise<ResponsePayload> {
    try {
      const fraudData = await this.courierService.checkFraudOrder(phoneNo);
      return {
        success: true,
        message: 'Fraud check completed',
        data: fraudData,
      };
    } catch (err) {
      this.logger.error('Fraud check failed: ' + err.message);
      throw new InternalServerErrorException(err.message);
    }
  }

  async getRepeatCustomers(): Promise<ResponsePayload> {
    try {
      const data = await this.orderModel.aggregate([
        { $match: { phoneNo: { $exists: true, $not: { $in: [null, ''] } } } },
        { $group: { _id: '$phoneNo', count: { $sum: 1 } } },
        { $match: { count: { $gt: 1 } } },
        { $project: { _id: 0, phoneNo: '$_id', count: 1 } },
      ]);
      return { success: true, message: 'Success', data } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  private async buildInvoicePayload(fOrderData: any) {
    const fShopInfo = await this.shopInformationModel.findOne({});

    return {
      _id: fOrderData._id,
      shopLogo: fShopInfo?.navLogo,
      signatureImage: null,
      shopName: fShopInfo?.siteName,
      shopPhoneNo: fShopInfo?.phones?.length
        ? fShopInfo?.phones[0]?.value
        : '-',
      shopWhatsappNo: fShopInfo?.phones?.length
        ? fShopInfo?.phones[0]?.value
        : '-',
      shopAddress: fShopInfo?.addresses?.length
        ? fShopInfo?.addresses[0]?.value
        : '-',
      shopEmail: fShopInfo?.emails?.length ? fShopInfo?.emails[0]?.value : '-',
      orderId: fOrderData.orderId,
      customerId: null,
      name: fOrderData.name,
      phoneNo: fOrderData.phoneNo,
      address: fOrderData.addresses,
      additionalDiscount: fOrderData.additionalDiscount,
      division: fOrderData.division?.name,
      area: fOrderData.area?.name,
      shippingAddress: fOrderData.shippingAddress,
      date: fOrderData?.checkoutDate,
      paymentStatus: fOrderData?.paymentStatus,
      subTotal: fOrderData.subTotal,
      discount: fOrderData.discount,
      deliveryCharge: fOrderData.deliveryCharge,
      weightBasedDeliveryCharge: fOrderData.weightBasedDeliveryCharge || 0,
      grandTotal: fOrderData.grandTotal,
      items: fOrderData.orderedItems,
      couponDiscount: fOrderData.couponDiscount,
      deliveryNote: fOrderData.deliveryNote,
      paymentType: fOrderData.paymentType,
      paidAmount: fOrderData.paidAmount,
      advancePaymentStatus: fOrderData.advancePaymentStatus,
      advancePayment: fOrderData.advancePayment,
      trackingId: fOrderData.trackingId ?? null,
      customerNotes: fOrderData.customerNotes ?? null,
    };
  }

  async generateInvoicesByIds(ids: string[]): Promise<ResponsePayload> {
    try {
      const objectIds = ids.map((id) => new Types.ObjectId(id));
      const orders = await this.orderModel.find({ _id: { $in: objectIds } });

      // না পাওয়া গেলে খালি
      if (!orders?.length) {
        return { success: true, message: 'No orders found', data: [] };
      }

      // payloads
      const payloads = [];
      for (const order of orders) {
        const plain = JSON.parse(JSON.stringify(order));
        const invoice = await this.buildInvoicePayload(plain);
        payloads.push(invoice);
      }

      return {
        success: true,
        message: 'Success',
        data: payloads,
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * Invoice Methods
   * generateInvoiceById()
   */

  async generateInvoiceById(
    shop: string,
    id: string,
  ): Promise<ResponsePayload> {
    try {
      const fShopInfo = await this.shopInformationModel.findOne({
        shop: shop,
      });

      const fOrderData = JSON.parse(
        JSON.stringify(await this.orderModel.findById(id)),
      );

      const invoiceData = {
        _id: fOrderData._id,
        shopLogo: fShopInfo.navLogo,
        signatureImage: null,
        shopName: fShopInfo.siteName,
        shopPhoneNo: fShopInfo.phones.length ? fShopInfo.phones[0].value : '-',
        shopWhatsappNo: fShopInfo.phones.length
          ? fShopInfo.phones[0].value
          : '-',
        shopAddress: fShopInfo.addresses.length
          ? fShopInfo.addresses[0].value
          : '-',
        shopEmail: fShopInfo.emails.length ? fShopInfo.emails[0].value : '-',
        orderId: fOrderData.orderId,
        customerId: null,
        name: fOrderData.name,
        phoneNo: fOrderData.phoneNo,
        sku: fOrderData.sku,
        address: fOrderData.addresses,
        additionalDiscount: fOrderData.additionalDiscount,
        shippingAddress: fOrderData.shippingAddress,
        date: fOrderData?.checkoutDate,
        paymentStatus: fOrderData?.paymentStatus,
        subTotal: fOrderData.subTotal,
        discount: fOrderData.discount,
        deliveryCharge: fOrderData.deliveryCharge,
        weightBasedDeliveryCharge: fOrderData.weightBasedDeliveryCharge || 0,
        grandTotal: fOrderData.grandTotal,
        items: fOrderData.orderedItems.map((item) => ({
          ...item,
          sku: item.variation?.sku ?? item.sku ?? null,
        })),
        couponDiscount: fOrderData.couponDiscount,
        deliveryNote: fOrderData.deliveryNote,
        paymentType: fOrderData.paymentType,
        paidAmount: fOrderData.paidAmount,
        advancePaymentStatus: fOrderData.advancePaymentStatus,
        advancePayment: fOrderData?.advancePayment,
        postCode: fOrderData?.postCode,
        trackingId: fOrderData?.courierData
          ? fOrderData.courierData.providerName === 'Pathao Courier'
            ? fOrderData.courierData.consignmentId ??
              fOrderData.courierData.trackingId ??
              null
            : fOrderData.courierData.consignmentId ??
              fOrderData.courierData.trackingId ??
              null
          : null,
        providerName: fOrderData?.courierData?.providerName ?? null,
      };

      return {
        success: true,
        message: 'Success',
        data: invoiceData,
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException(err.message);
    }
  }

  async getOrderByOrderId(
    orderId: string,
    select: string,
  ): Promise<ResponsePayload> {
    try {
      const data = await this.orderModel
        .findOne({ orderId: orderId })
        .select(select);
      return {
        success: true,
        message: 'Success! Order fetch successfully.',
        data,
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException(err.message);
    }
  }

  async insertManyOrder(
    addOrdersDto: AddOrderDto[],
    optionOrderDto: OptionOrderDto,
  ): Promise<ResponsePayload> {
    const { deleteMany } = optionOrderDto;
    if (deleteMany) {
      await this.orderModel.deleteMany({});
    }
    const mData = addOrdersDto.map((m) => {
      return {
        ...m,
        ...{
          slug: this.utilsService.transformToSlug(m.name),
        },
      };
    });
    try {
      const saveData = await this.orderModel.insertMany(mData);
      return {
        success: true,
        message: `${
          saveData && saveData.length ? saveData.length : 0
        }  Data Added Success`,
      } as ResponsePayload;
    } catch (error) {
      // console.log(error);
      if (error?.code && error?.code?.toString() === ErrorCodes?.UNIQUE_FIELD) {
        throw new ConflictException('Slug Must be Unique');
      } else {
        throw new InternalServerErrorException(error?.message);
      }
    }
  }

  /**
   * getAllOrders
   * getOrderById
   */
  async getAllOrders(
    filterOrderDto: FilterAndPaginationOrderDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterOrderDto;
    const { pagination } = filterOrderDto;
    const { sort } = filterOrderDto;
    const { select } = filterOrderDto;

    // Calculations
    const aggregateStagesCalculation = [];
    // Essential Variables
    const aggregateStages = [];
    let mFilter = {};
    let mSort = {};
    let mSelect = {};
    let mPagination = {};

    // Match
    if (filter) {
      mFilter = { ...mFilter, ...filter };
    }

    if (searchQuery) {
      mFilter = {
        $and: [
          mFilter,
          {
            $or: [
              { orderId: { $regex: searchQuery, $options: 'i' } },
              { phoneNo: { $regex: searchQuery, $options: 'i' } },
              { name: { $regex: searchQuery, $options: 'i' } },
            ],
          },
        ],
      };
    }
    // Sort
    if (sort) {
      mSort = sort;
    } else {
      mSort = { createdAt: -1 };
    }

    // Select
    if (select) {
      mSelect = { ...select };
    } else {
      mSelect = { name: 1 };
    }

    // Finalize
    if (Object.keys(mFilter).length) {
      aggregateStages.push({ $match: mFilter });
      const group = {
        $group: {
          _id: null,
          grandTotal: { $sum: '$grandTotal' },
          // totalPaid: { $sum: '$paidAmount' },
          // totalDiscount: { $sum: '$discount' },
        },
      };
      aggregateStagesCalculation.push({ $match: mFilter });
      aggregateStagesCalculation.push(group);
    } else {
      const group = {
        $group: {
          _id: null,
          grandTotal: { $sum: '$grandTotal' },
          // totalPaid: { $sum: '$paidAmount' },
          // totalDiscount: { $sum: '$discount' },
        },
      };
      aggregateStagesCalculation.push(group);
    }

    if (Object.keys(mSort).length) {
      aggregateStages.push({ $sort: mSort });
    }

    if (!pagination) {
      aggregateStages.push({ $project: mSelect });
    }

    // Pagination
    if (pagination) {
      if (Object.keys(mSelect).length) {
        mPagination = {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              {
                $skip: pagination.pageSize * pagination.currentPage,
              } /* IF PAGE START FROM 0 OR (pagination.currentPage - 1) IF PAGE 1*/,
              { $limit: pagination.pageSize },
              { $project: mSelect },
            ],
          },
        };
      } else {
        mPagination = {
          $facet: {
            metadata: [{ $count: 'total' }],
            data: [
              {
                $skip: pagination.pageSize * pagination.currentPage,
              } /* IF PAGE START FROM 0 OR (pagination.currentPage - 1) IF PAGE 1*/,
              { $limit: pagination.pageSize },
            ],
          },
        };
      }

      aggregateStages.push(mPagination);

      aggregateStages.push({
        $project: {
          data: 1,
          count: { $arrayElemAt: ['$metadata.total', 0] },
        },
      });
    }

    try {
      const dataAggregates = await this.orderModel.aggregate(aggregateStages);
      const calculateAggregates = await this.orderModel.aggregate(
        aggregateStagesCalculation,
      );
      if (pagination) {
        return {
          ...{ ...dataAggregates[0] },
          ...{
            calculation: calculateAggregates[0],
            success: true,
            message: 'Success',
          },
        } as ResponsePayload;
      } else {
        return {
          data: dataAggregates,
          //
          success: true,
          message: 'Success',
          count: dataAggregates.length,
        } as ResponsePayload;
      }
    } catch (err) {
      this.logger.error(err);
      if (
        err?.code &&
        err?.code?.toString() === ErrorCodes?.PROJECTION_MISMATCH
      ) {
        throw new BadRequestException('Error! Projection mismatch');
      } else {
        throw new InternalServerErrorException();
      }
    }
  }

  /**
   * Get Sales Statistics by Publisher or Category
   * getSalesStatsByFilter()
   */
  async getSalesStatsByFilter(
    filterType: 'publisher' | 'category',
    filterId: string,
  ): Promise<ResponsePayload> {
    try {
      // Get today's date range
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Convert filterId to ObjectId
      const filterObjectId = new Types.ObjectId(filterId);

      // Build match condition based on filter type
      const matchCondition =
        filterType === 'publisher'
          ? { 'orderedItems.publisher._id': filterObjectId }
          : { 'orderedItems.category._id': filterObjectId };

      // Aggregate query for today's sales
      const todayStats = await this.orderModel.aggregate([
        {
          $match: {
            checkoutDate: {
              $gte: today,
              $lt: tomorrow,
            },
            orderStatus: { $ne: 6 }, // Exclude cancelled orders
          },
        },
        {
          $unwind: '$orderedItems',
        },
        {
          $match: matchCondition,
        },
        {
          $group: {
            _id: null,
            todayBooksSold: { $sum: '$orderedItems.quantity' },
            todaySalesAmount: {
              $sum: {
                $multiply: [
                  '$orderedItems.unitPrice',
                  '$orderedItems.quantity',
                ],
              },
            },
          },
        },
      ]);

      // Aggregate query for all-time sales (with total amount)
      const allTimeStats = await this.orderModel.aggregate([
        {
          $match: {
            orderStatus: { $ne: 6 }, // Exclude cancelled orders
          },
        },
        {
          $unwind: '$orderedItems',
        },
        {
          $match: matchCondition,
        },
        {
          $group: {
            _id: null,
            totalBooksSold: { $sum: '$orderedItems.quantity' },
            totalSalesAmount: {
              $sum: {
                $multiply: [
                  '$orderedItems.unitPrice',
                  '$orderedItems.quantity',
                ],
              },
            },
          },
        },
      ]);

      const result = {
        todayBooksSold: todayStats[0]?.todayBooksSold || 0,
        todaySalesAmount: todayStats[0]?.todaySalesAmount || 0,
        totalBooksSold: allTimeStats[0]?.totalBooksSold || 0,
        totalSalesAmount: allTimeStats[0]?.totalSalesAmount || 0,
      };

      return {
        success: true,
        message: 'Sales statistics retrieved successfully',
        data: result,
      } as ResponsePayload;
    } catch (error) {
      this.logger.error('Error getting sales stats:', error);
      throw new InternalServerErrorException(error.message);
    }
  }

  async getOrdersByUser(
    user: User,
    filterOrderDto: FilterAndPaginationOrderDto,
    searchQuery?: string,
  ): Promise<ResponsePayload> {
    const { filter } = filterOrderDto;

    let mFilter;

    if (filter) {
      mFilter = { ...{ user: new ObjectId(user._id) }, ...filter };
    } else {
      mFilter = { user: new ObjectId(user._id) };
    }

    filterOrderDto.filter = mFilter;

    return this.getAllOrders(filterOrderDto, searchQuery);
  }

  async getOrderById(id: string, select: string): Promise<ResponsePayload> {
    try {
      const data = await this.orderModel.findById(id).select(select);
      return {
        success: true,
        message: 'Success',
        data,
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * updateOrderById
   * updateMultipleOrderById
   */
  async updateOrderById(
    id: string,
    updateOrderDto: UpdateOrderDto,
  ): Promise<ResponsePayload> {
    const { name, orderStatus } = updateOrderDto;
    let data;
    try {
      data = await this.orderModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      await this.orderModel.findByIdAndUpdate(id, {
        $set: updateOrderDto,
      });

      // Setting Data
      const fSetting: any = await this.settingModel
        .findOne()
        .select(
          'smsSendingOption currency smsMethods orderSetting courierMethods -_id',
        );

      // Product Setting Providers
      const fProductSetting = fSetting?.productSetting ?? {};
      // Courier Providers
      const fCourierMethods = fSetting?.courierMethods ?? [];
      const courierMethod = fCourierMethods.find(
        (f: any) => f.status === 'active',
      );

      // Sms Providers
      const fSmsMethods = fSetting?.smsMethods ?? [];
      const smsMethod = fSmsMethods.find((f) => f.status === 'active');
      const smsSendingOption = fSetting?.smsSendingOption;

      if (orderStatus) {
        // await this.adjustDataOnOrderStatusUpdate({
        //   order_id: id,
        //   orderStatus: orderStatus,
        //   smsMethod: smsMethod,
        //   smsSendingOption: smsSendingOption,
        //   fProductSetting: fProductSetting,
        // });

        // Courier Manage
        this.addSingleOrderToCourier({
          orderStatus: orderStatus,
          courierMethod: courierMethod,
          id: id,
        });
      }
      return {
        success: true,
        message: 'Order updated successfully',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException();
    }
  }

  async updateMultipleOrderById(
    ids: string[],
    updateOrderDto: UpdateOrderDto,
  ): Promise<ResponsePayload> {
    const { orderStatus } = updateOrderDto;
    const mIds = ids.map((m) => new ObjectId(m));

    // const orderStatusRaw = updateOrderDto?.orderStatus
    //   ? String(updateOrderDto.orderStatus).trim()
    //   : '';

    // const hasOrderStatus = !!orderStatusRaw;

    try {
      await this.orderModel.updateMany(
        { _id: { $in: mIds } },
        { $set: updateOrderDto },
      );
      const fSetting = await this.settingModel
        .findOne()
        .select(
          'smsSendingOption currency smsMethods productSetting courierMethods -_id',
        );
      // Courier Providers
      const fCourierMethods = fSetting?.courierMethods ?? [];
      const courierMethod = fCourierMethods.find(
        (f: any) => f.status === 'active',
      );
      // Sms Providers
      const fSmsMethods = fSetting?.smsMethods ?? [];
      const smsMethod = fSmsMethods.find((f) => f.status === 'active');
      const smsSendingOption = fSetting?.smsSendingOption;

      // if (hasOrderStatus) {
      // Courier Manage
      this.addMultipleOrderToCourier({
        orderStatus: orderStatus,
        courierMethod: courierMethod,
        mIds: mIds,
      });
      // // console.log('mIds', mIds);
      // for (const id of mIds) {
      //   await this.adjustDataOnOrderStatusUpdate({
      //     order_id: id,
      //     orderStatus: orderStatus,
      //     smsMethod: smsMethod,
      //     smsSendingOption: smsSendingOption,
      //     fProductSetting: fProductSetting,
      //   });
      // }
      // }

      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async sendToCourier(id: string): Promise<ResponsePayload> {
    try {
      const fSetting = await this.settingModel.findOne();
      const courierMethods = fSetting?.courierMethods ?? [];
      const courierMethod = courierMethods.find((f: any) => f.status === 'active');
      await this.addSingleOrderToCourier({ orderStatus: 8, courierMethod, id });
      await this.orderModel.findByIdAndUpdate(id, { $set: { orderStatus: 2 } });
      return { success: true, message: 'Order sent to courier successfully' } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  /**
   * Courier Methods
   * addSingleOrderToCourier()
   * addMultipleOrderToCourier()
   */

  private async addSingleOrderToCourier(data: {
    orderStatus: any;
    courierMethod: any;
    id: string;
  }) {
    const { orderStatus, courierMethod, id } = data;
    if (orderStatus === 8 && courierMethod) {
      const courierApiConfig: CourierApiConfig = {
        providerName: courierMethod?.providerName,
        apiKey: courierMethod?.apiKey,
        secretKey: courierMethod?.secretKey,
        merchantCode: courierMethod?.merchantCode,
        pickMerchantThana: courierMethod?.thana,
        pickMerchantDistrict: courierMethod?.district,
        pickMerchantAddress: courierMethod?.address,
        pickMerchantName: courierMethod?.merchant_name,
        pickupMerchantPhone: courierMethod?.contact_number,
        username: courierMethod?.username,
        password: courierMethod?.password,
        specialInstruction: courierMethod?.specialInstruction,
        storeId: courierMethod?.storeId,
      };
      const fOrder = await this.orderModel.findById(id);
      const mdata = {};
      if (courierMethod?.providerName === 'Steadfast Courier') {
        if (fOrder?.courierData && fOrder?.courierData?.consignmentId) {
        } else {
          const getFullAddress = () => {
            const parts: string[] = [];
            if (fOrder?.division?.name) parts.push(fOrder.division.name);
            const area = typeof fOrder?.area === 'object' ? fOrder?.area?.name : fOrder?.area;
            if (area) parts.push(area);
            if (fOrder?.zone?.name) parts.push(fOrder.zone.name);
            if (fOrder?.shippingAddress) parts.push(fOrder.shippingAddress);
            return parts.join(', ');
          };

          const cashOnDeliveryAmount = () => {
            if (fOrder?.paymentStatus === 'paid') {
              return 0;
            } else {
              return fOrder?.grandTotal ?? 0;
            }
          };
          const payload: SteadfastCourierPayload = {
            invoice: fOrder?.orderId,
            recipient_name: fOrder?.name,
            recipient_phone: fOrder?.phoneNo,
            recipient_email: fOrder?.email ?? null,
            recipient_address: getFullAddress(),
            cod_amount: cashOnDeliveryAmount(),
            item_description:
              fOrder?.orderedItems?.map((i: any) => `${i.name} x${i.quantity || 1}`).join(', ') || '',
            note: fOrder?.deliveryNote
              ? `${fOrder.deliveryNote} (${
                  courierMethod?.specialInstruction || ''
                })`
              : courierMethod?.specialInstruction || '',
          };

          // console.log('payload', payload);

          const courierResponse =
            await this.courierService.createOrderWithProvider(
              courierApiConfig,
              payload,
            );

          if (courierResponse.status === 200) {
            // console.log('courierResponse', courierResponse);

            const orderCourierData = {
              providerName: 'Steadfast Courier',
              consignmentId: courierResponse?.consignment?.consignment_id,
              trackingId: courierResponse?.consignment?.tracking_code,
              createdAt: this.utilsService.getDateString(new Date()),
            };
            await this.orderModel.findByIdAndUpdate(id, {
              $set: {
                courierData: orderCourierData,
              },
            });
          }
        }
      }

      if (courierMethod?.providerName === 'Pathao Courier') {
        // if (courierMethod) {
        if (fOrder?.courierData && fOrder?.courierData?.consignmentId) {
        } else {
          console.log('fOrder', fOrder);
          const courierResponse =
            await this.courierService.createOrderWithProvider(
              courierApiConfig,
              fOrder,
            );

          console.log('courierResponse', courierResponse);

          if (courierResponse.code === 200) {
            const orderCourierData = {
              providerName: courierMethod?.providerName,
              consignmentId: courierResponse?.data?.consignment_id,
              trackingId: courierResponse?.data?.merchant_order_id,
              createdAt: this.utilsService.getDateString(new Date()),
            };
            await this.orderModel.findByIdAndUpdate(id, {
              $set: {
                courierData: orderCourierData,
              },
            });
          }
        }
      }
      if (courierMethod?.providerName === 'Paperfly Courier') {
        if (fOrder?.courierData && fOrder?.courierData?.consignmentId) {
        } else {
          const getFullAddress = () => {
            return `${fOrder?.division?.name}, ${fOrder?.area?.name}, ${fOrder?.shippingAddress}`;
          };

          const cashOnDeliveryAmount = () => {
            if (fOrder?.paymentStatus === 'paid') {
              return 0;
            } else {
              return fOrder?.grandTotal ?? 0;
            }
          };
          const payload = {
            merOrderRef: fOrder?.orderId,
            custname: fOrder.name,
            custPhone: fOrder.phoneNo,
            custaddress: getFullAddress(), // Provide a fallback
            customerThana: fOrder.area?.name ?? 'Mirpur',
            customerDistrict: fOrder.division?.name,
            productSizeWeight: 'standard', // Adjust if needed
            productBrief:
              this.getOrderItemProductNames(fOrder?.orderedItems) ||
              'No description',
            packagePrice: fOrder?.grandTotal, // Total price
            max_weight: 1, // Adjust based on requirements
            deliveryOption: 'regular',
            merchantCode: courierMethod?.merchantCode,
            pickMerchantThana: courierMethod?.thana,
            pickMerchantDistrict: courierMethod?.district,
            pickMerchantAddress: courierMethod?.address,
            pickMerchantName: courierMethod?.merchant_name,
            pickupMerchantPhone: courierMethod?.contact_number,
            special_instruction: courierMethod?.specialInstruction ?? '',
          };

          const courierResponse =
            await this.courierService.createOrderWithProvider(
              courierApiConfig,
              payload,
            );
          if (courierResponse.response_code === 200) {
            const orderCourierData = {
              providerName: 'Paperfly Courier',
              trackingId: courierResponse?.success?.tracking_number,
              consignmentId: courierResponse?.success?.tracking_number,
              createdAt: this.utilsService.getDateString(new Date()),
            };
            await this.orderModel.findByIdAndUpdate(id, {
              $set: {
                courierData: orderCourierData,
              },
            });
          }
        }
      }
    }
  }

  getOrderItemProductNames(orderItems: any[]): string {
    // Extract product names and join them with a comma
    return orderItems
      .map((item: any) => item?.name || '') // Safely access 'name' and handle missing values
      .filter((name) => name) // Remove empty or undefined names
      .join(',');
  }

  private async addMultipleOrderToCourier(data: {
    orderStatus: any;
    courierMethod: any;
    mIds: any[];
  }) {
    const { orderStatus, courierMethod, mIds } = data;
    if (orderStatus === 8 && courierMethod) {
      const courierApiConfig: CourierApiConfig = {
        providerName: courierMethod?.providerName,
        apiKey: courierMethod?.apiKey,
        secretKey: courierMethod?.secretKey,
        merchantCode: courierMethod?.merchantCode,
        pickMerchantThana: courierMethod?.thana,
        pickMerchantDistrict: courierMethod?.district,
        pickMerchantAddress: courierMethod?.address,
        pickMerchantName: courierMethod?.merchant_name,
        pickupMerchantPhone: courierMethod?.contact_number,
        username: courierMethod?.username,
        password: courierMethod?.password,
        specialInstruction: courierMethod?.specialInstruction ?? '',
        storeId: courierMethod?.storeId,
      };
      for (const id of mIds) {
        const fOrder = await this.orderModel.findById(id);

        if (courierMethod?.providerName === 'Steadfast Courier') {
          if (fOrder?.courierData && fOrder?.courierData?.consignmentId) {
          } else {
            const getFullAddress = () => {
              const parts: string[] = [];
              if (fOrder?.division?.name) parts.push(fOrder.division.name);
              const area = typeof fOrder?.area === 'object' ? fOrder?.area?.name : fOrder?.area;
              if (area) parts.push(area);
              if (fOrder?.zone?.name) parts.push(fOrder.zone.name);
              if (fOrder?.shippingAddress) parts.push(fOrder.shippingAddress);
              return parts.join(', ');
            };

            const cashOnDeliveryAmount = () => {
              if (fOrder?.paymentStatus === 'paid') {
                return 0;
              } else {
                return fOrder?.grandTotal ?? 0;
              }
            };
            const payload: SteadfastCourierPayload = {
              invoice: fOrder?.orderId,
              recipient_name: fOrder?.name,
              recipient_phone: fOrder?.phoneNo,
              recipient_address: getFullAddress(),
              cod_amount: cashOnDeliveryAmount(),
              item_description:
                fOrder?.orderedItems?.map((i: any) => `${i.name} x${i.quantity || 1}`).join(', ') || '',
              note: fOrder?.deliveryNote
                ? `${fOrder.deliveryNote} (${
                    courierMethod?.specialInstruction || ''
                  })`
                : courierMethod?.specialInstruction || '',
            };

            // console.log('payload', payload);

            const courierResponse =
              await this.courierService.createOrderWithProvider(
                courierApiConfig,
                payload,
              );
            if (courierResponse.status === 200) {
              // console.log('courierResponse', courierResponse);
              const orderCourierData = {
                providerName: 'Steadfast Courier',
                consignmentId: courierResponse?.consignment?.consignment_id,
                trackingId: courierResponse?.consignment?.tracking_code,
                createdAt: this.utilsService.getDateString(new Date()),
              };
              await this.orderModel.findByIdAndUpdate(id, {
                $set: {
                  courierData: orderCourierData,
                },
              });
            }
          }
        }

        if (courierMethod?.providerName === 'Pathao Courier') {
          // if (courierMethod) {
          if (fOrder?.courierData && fOrder?.courierData?.consignmentId) {
          } else {
            const courierResponse =
              await this.courierService.createOrderWithProvider(
                courierApiConfig,
                fOrder,
              );

            if (courierResponse.code === 200) {
              const orderCourierData = {
                providerName: courierMethod?.providerName,
                consignmentId: courierResponse?.data?.consignment_id,
                trackingId: courierResponse?.data?.merchant_order_id,
                createdAt: this.utilsService.getDateString(new Date()),
              };
              await this.orderModel.findByIdAndUpdate(id, {
                $set: {
                  courierData: orderCourierData,
                },
              });
            }
          }
        }
        if (courierMethod?.providerName === 'Paperfly Courier') {
          if (fOrder?.courierData && fOrder?.courierData?.consignmentId) {
          } else {
            const getFullAddress = () => {
              return `${fOrder?.division?.name}, ${fOrder?.area?.name}, ${fOrder?.shippingAddress}`;
            };

            const cashOnDeliveryAmount = () => {
              if (fOrder?.paymentStatus === 'paid') {
                return 0;
              } else {
                return fOrder?.grandTotal ?? 0;
              }
            };
            const payload = {
              merOrderRef: fOrder?.orderId,
              custname: fOrder.name,
              custPhone: fOrder.phoneNo,
              custaddress: getFullAddress(), // Provide a fallback
              // customerThana: fOrder.area,
              customerThana: fOrder.area?.name ?? 'Mirpur',
              customerDistrict: fOrder.division?.name,
              productSizeWeight: 'standard', // Adjust if needed
              productBrief:
                this.getOrderItemProductNames(fOrder?.orderedItems) ||
                'No description',
              packagePrice: fOrder?.grandTotal, // Total price
              max_weight: 1, // Adjust based on requirements
              deliveryOption: 'regular',
              merchantCode: courierMethod?.merchantCode,
              pickMerchantThana: courierMethod?.thana,
              pickMerchantDistrict: courierMethod?.district,
              pickMerchantAddress: courierMethod?.address,
              pickMerchantName: courierMethod?.merchant_name,
              pickupMerchantPhone: courierMethod?.contact_number,
              special_instruction: courierMethod?.specialInstruction ?? '',
            };

            const courierResponse =
              await this.courierService.createOrderWithProvider(
                courierApiConfig,
                payload,
              );
            if (courierResponse.response_code === 200) {
              const orderCourierData = {
                providerName: 'Paperfly Courier',
                trackingId: courierResponse?.success?.tracking_number,
                consignmentId: courierResponse?.success?.tracking_number,
                createdAt: this.utilsService.getDateString(new Date()),
              };
              await this.orderModel.findByIdAndUpdate(id, {
                $set: {
                  courierData: orderCourierData,
                },
              });
            }
          }
        }
      }
    }
  }

  async updateOrderSessionKey(
    id: string,
    updateOrderDto: any,
  ): Promise<ResponsePayload> {
    try {
      await this.orderModel.findByIdAndUpdate(id, {
        $set: updateOrderDto,
      });

      return {
        success: true,
        message: 'Order updated successfully',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException();
    }
  }

  async changeOrderStatus(
    id: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<ResponsePayload> {
    const { orderStatus } = updateOrderStatusDto;

    let data;
    try {
      data = await this.orderModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      // console.log('updateOrderStatusDto', updateOrderStatusDto);
      let deliveryDate;
      let deliveryDateString;
      // console.log('orderStatus', orderStatus);
      if (orderStatus === 5) {
        deliveryDate = this.utilsService.getLocalDateTime();
        deliveryDateString = this.utilsService.getDateString(
          this.utilsService.getLocalDateTime(),
        );
      } else {
        deliveryDate = null;
        deliveryDateString = null;
      }

      // console.log('data', data);
      let orderTimeline;
      if (data.hasOrderTimeline) {
        orderTimeline = data.orderTimeline;
        if (orderStatus === OrderStatus.CONFIRM) {
          orderTimeline.confirmed = {
            success: true,
            date: this.utilsService.getLocalDateTime(),
            expectedDate: null,
          };
        } else if (orderStatus === OrderStatus.PROCESSING) {
          orderTimeline.processed = {
            success: true,
            date: this.utilsService.getLocalDateTime(),
            expectedDate: data.orderTimeline.processed.expectedDate,
          };
        } else if (orderStatus === OrderStatus.SHIPPING) {
          orderTimeline.shipped = {
            success: true,
            date: this.utilsService.getLocalDateTime(),
            expectedDate: data.orderTimeline.shipped.expectedDate,
          };
        } else if (orderStatus === OrderStatus.DELIVERED) {
          orderTimeline.delivered = {
            success: true,
            date: this.utilsService.getLocalDateTime(),
            expectedDate: data.orderTimeline.delivered.expectedDate,
          };
          if (!orderTimeline.confirmed.success) {
            orderTimeline.confirmed = {
              success: true,
              date: this.utilsService.getLocalDateTime(),
              expectedDate: null,
            };
          }
          if (!orderTimeline.processed.success) {
            orderTimeline.processed = {
              success: true,
              date: this.utilsService.getLocalDateTime(),
              expectedDate: data.orderTimeline.processed.expectedDate,
            };
          }
          if (!orderTimeline.shipped.success) {
            orderTimeline.shipped = {
              success: true,
              date: this.utilsService.getLocalDateTime(),
              expectedDate: data.orderTimeline.shipped.expectedDate,
            };
          }
        } else if (orderStatus === OrderStatus.CANCEL) {
          orderTimeline.canceled = {
            success: true,
            date: this.utilsService.getLocalDateTime(),
            expectedDate: null,
          };
        } else if (orderStatus === OrderStatus.REFUND) {
          orderTimeline.refunded = {
            success: true,
            date: this.utilsService.getLocalDateTime(),
            expectedDate: null,
          };
        }
      } else {
        orderTimeline = null;
      }

      const mData = {
        courierLink: updateOrderStatusDto.courierLink,
        orderStatus: orderStatus,
        orderTimeline: orderTimeline,
        paymentStatus:
          orderStatus === OrderStatus.DELIVERED ? 'paid' : data.paymentStatus,
        deliveryDate: deliveryDate,
        deliveryDateString: deliveryDateString,
      };
      await this.orderModel.findByIdAndUpdate(id, {
        $set: mData,
      });

      // if (orderStatus === 6) {
      //   for (const f of data['orderedItems']) {
      //     await this.productModel.findByIdAndUpdate(f._id, {
      //       $inc: {
      //         quantity: f.quantity,
      //       },
      //     });
      //   }
      // }

      if (orderStatus === 2) {
        const message = `আপনার অর্ডার আইডি ${data?.orderId} নিশ্চিত করা হয়েছে। ডেলিভারি সময়: ঢাকার ভিতরে ১–২ কার্যদিবস, ঢাকার বাইরে ৩–৬ কার্যদিবস। ধন্যবাদ আলম বুক এর সঙ্গে থাকার জন্য।`;
        //const message = `Your order No: ${data?.orderId} has been Shipped. Total Amount ${data?.grandTotal} Tk. Thanks from alambook.com`;
        // const message = `Hi ${data.name} \nwe just conform your order from alambook.com. Your order is estimated to arrive in 1-2 business days.`;
        // const message = `অভিনন্দন! ${updateOrderStatusDto.name} আপনি সফলভাবে অর্ডারটি সম্পূর্ণ করেছেন।`;
        this.bulkSmsService.sentSingleSms(data.phoneNo, message);
        // console.log('orderStatus', data.phoneNo);
      }

      // if (orderStatus === 5) {
      //   const message = `Your order No: ${data?.orderId} has been Delivered. Total Amount ${data?.grandTotal} Tk. Thanks from alambook.com`;
      //   // const message = `অভিনন্দন! ${updateOrderStatusDto.name} আপনি সফলভাবে অর্ডারটি সম্পূর্ণ করেছেন।`;
      //   this.bulkSmsService.sentSingleSms(data.phoneNo, message);
      //   // console.log('orderStatus', data.phoneNo);
      // }

      // if (orderStatus === 4) {
      //   //const message = `Your order No: ${data?.orderId} has been Shipped. Total Amount ${data?.grandTotal} Tk. Thanks from alambook.com`;
      //   const message = `Hi ${data.name} \nwe just shipped your order from alambook.com. Your order is estimated to arrive in 1-2 business days.`;
      //   // const message = `অভিনন্দন! ${updateOrderStatusDto.name} আপনি সফলভাবে অর্ডারটি সম্পূর্ণ করেছেন।`;
      //   this.bulkSmsService.sentSingleSms(data.phoneNo, message);
      //   // console.log('orderStatus', data.phoneNo);
      // }

      if (orderStatus === 5) {
        for (const f of data['orderedItems']) {
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
      }

      return {
        success: true,
        message: 'Order updated successfully',
      } as ResponsePayload;
    } catch (err) {
      console.log(err);
      throw new InternalServerErrorException();
    }
  }

  /**
   * deleteOrderById
   * deleteMultipleOrderById
   */
  async deleteOrderById(
    id: string,
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    let data;
    try {
      data = await this.orderModel.findById(id);
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
    if (!data) {
      throw new NotFoundException('No Data found!');
    }
    try {
      await this.orderModel.findByIdAndDelete(id);
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  async deleteMultipleOrderById(
    ids: string[],
    checkUsage: boolean,
  ): Promise<ResponsePayload> {
    try {
      await this.orderModel.deleteMany({ _id: ids });
      return {
        success: true,
        message: 'Success',
      } as ResponsePayload;
    } catch (err) {
      throw new InternalServerErrorException(err.message);
    }
  }

  // New Order Make
  private async newOrderMake(orderData: any) {
    let cartItems: any[] = [];

    // Card Data Get
    if (!orderData?.user) {
      const fProducts = JSON.parse(
        JSON.stringify(
          await this.productModel.find({
            _id: { $in: orderData.carts.map((m) => new ObjectId(m)) },
          }),
        ),
      );

      // Fetch special package data if cartType is 1
      const fSpecialPackages = orderData.cartData
        .filter((item) => item.cartType === 1)
        .map((item) => item.specialPackage);

      const specialPackages = fSpecialPackages.length
        ? JSON.parse(
            JSON.stringify(
              await this.specialPackageModel.find({
                _id: { $in: fSpecialPackages.map((id) => new ObjectId(id)) },
              }),
            ),
          )
        : [];

      if ((fProducts && fProducts.length) || specialPackages) {
        cartItems = orderData.cartData.map((t1) => {
          const productFromFProducts = fProducts.find(
            (t2) => t2._id === t1.product,
          );
          const productFromSpecialPackages = specialPackages.find(
            (t2) => t2._id === t1.product,
          );
          return {
            ...t1,
            product: { ...productFromFProducts },
            specialPackage: { ...productFromSpecialPackages },
          };
        });
      }
    } else {
      cartItems = JSON.parse(
        JSON.stringify(
          await this.cartModel
            .find({ user: orderData.user })
            .populate(
              'product',
              'name nameEn slug author description publisher salePrice sku tax discountType discountAmount images quantity trackQuantity category subCategory brand tags unit',
            )
            .populate('specialPackage'),
        ),
      );
    }

    const finalData = cartItems
      .map((item: any) => {
        if (item.cartType === 1) {
          if (item.specialPackage) {
            const images = [item.specialPackage.image];
            return {
              ...item,
              product: { ...item.specialPackage, images },
            };
          }
          return null;
        }
        return item;
      })
      .filter((item) => item !== null);

    // Order Items

    const products: any = finalData.map((m) => ({
      _id: m.product._id,
      name: m.product.name,
      nameEn: m.product.nameEn,
      slug: m.product.slug,
      image: m.product.images?.[0] || null,
      category: {
        _id: m.product.category?._id,
        name: m.product.category?.name,
        slug: m.product.category?.slug,
      },
      author: {
        _id: m.product.author?._id,
        name: m.product.author?.name,
        slug: m.product.author?.slug,
      },
      publisher: {
        _id: m.product.publisher?._id,
        name: m.product.publisher?.name,
        slug: m.product.publisher?.slug,
      },
      subCategory: {
        _id: m.product.subCategory?._id,
        name: m.product.subCategory?.name,
        slug: m.product.subCategory?.slug,
      },
      brand: {
        _id: m.product.brand?._id,
        name: m.product.brand?.name,
        slug: m.product.brand?.slug,
      },
      discountType: m.product.discountType,
      discountAmount: m.product.discountAmount,
      regularPrice: this.utilsService.transform(m.product, 'regularPrice'),
      unitPrice: this.utilsService.transform(m.product, 'salePrice'),
      salePrice: this.utilsService.transform(m.product, 'salePrice'),
      quantity: m.selectedQty,
      orderType: 'regular',
    }));

    // Cart SubTotal
    const cartSubTotal = finalData.reduce(
      (acc, t) =>
        acc +
        this.utilsService.transform(t.product, 'regularPrice', t.selectedQty),
      0,
    );

    // Cart Discount Amount
    const cartDiscountAmount = finalData.reduce(
      (acc, t) =>
        acc +
        this.utilsService.transform(t.product, 'discountAmount', t.selectedQty),
      0,
    );

    // Coupon Discount
    const couponDiscount = await this.calculateCouponDiscount(
      cartSubTotal,
      orderData?.coupon,
    );

    // Order Discount
    const orderDiscount =
      cartSubTotal > 0
        ? await this.calculateOrderDiscount(
            cartSubTotal,
            orderData?.user,
            orderData.orderFrom,
          )
        : 0;

    // Calculate Weight-Based Delivery Charge (for record-keeping only)
    // Note: Frontend already includes weight charge in deliveryCharge, so we don't add it again to grandTotal
    const weightBasedDeliveryCharge = this.calculateWeightBasedDeliveryCharge(
      finalData,
      orderData?.division?.name,
      orderData?.area?.name,
      orderData?.zone?.name,
    );

    // Grand Total
    // Note: orderData?.deliveryCharge already includes weight-based charge from frontend
    // So we don't add weightBasedDeliveryCharge again to avoid double counting
    const grandTotal =
      cartSubTotal +
      orderData?.deliveryCharge -
      couponDiscount -
      cartDiscountAmount -
      orderDiscount;

    // New Order Data
    const newOrderData = {
      name: orderData?.name,
      phoneNo: orderData?.phoneNo,
      shippingAddress: orderData?.shippingAddress,
      division: orderData?.division,
      note: orderData?.note,
      area: orderData?.area,
      zone: orderData?.zone,
      city: orderData?.city,
      orderFrom: 'Website',
      paymentType: orderData?.paymentType,
      country: orderData?.country,
      paymentStatus: 'unpaid',
      orderStatus: OrderStatus.PENDING,
      orderedItems: products,
      subTotal: cartSubTotal,
      deliveryCharge: orderData?.deliveryCharge || 0,
      weightBasedDeliveryCharge: weightBasedDeliveryCharge,
      discount: cartDiscountAmount.toFixed(2),
      totalSave: cartDiscountAmount,
      grandTotal,
      discountTypes: [{ productDiscount: cartDiscountAmount.toFixed(2) }],
      checkoutDate: this.utilsService.getDateString(new Date()),
      user: orderData?.user || null,
      email: orderData?.email || null,
      coupon: orderData?.coupon ?? null,
      couponDiscount,
      hasOrderTimeline: true,
      orderTimeline: orderData?.orderTimeline,
    };

    return newOrderData;
  }

  // Calculate Coupon Discount
  async calculateCouponDiscount(
    cartSubTotal: number,
    couponId: any,
  ): Promise<ResponsePayload | any> {
    // Coupon data
    const coupon = JSON.parse(
      JSON.stringify(await this.couponModel.findOne({ _id: couponId })),
    );

    if (!coupon) {
      return 0;
    }

    const discount =
      coupon.discountType === DiscountTypeEnum.PERCENTAGE
        ? Math.floor((coupon.discountAmount / 100) * cartSubTotal)
        : Math.floor(coupon.discountAmount);

    return discount;
  }

  // Calculate Order Discount
  async calculateOrderDiscount(
    cartSubTotal: number,
    userId: any,
    orderFrom: any,
  ): Promise<ResponsePayload | any> {
    // Order Offer Data

    const fOrderOfferData = await this.orderOfferModel.findOne({});

    const orderOfferData = JSON.parse(JSON.stringify(fOrderOfferData));
    let finalData: any;
    let orderDiscount = 0;
    let orderDiscountFromApps = 0;

    // Order Offer Data

    if (orderOfferData) {
      // Order Count
      const orderCount = await this.orderModel.countDocuments({
        user: new ObjectId(userId),
      });
      const currentMonth = this.utilsService.getDateMonth(false, new Date());
      const currentYear = this.utilsService.getDateYear(new Date());

      // Order In Month
      const orderInMonth = await this.orderModel.find({
        user: new ObjectId(userId),
        month: currentMonth,
        year: currentYear,
      });
      const jOrderInMonth = JSON.parse(JSON.stringify(orderInMonth));

      let hasMonthDiscount = false;

      for (const data of jOrderInMonth) {
        if (data.hasMonthDiscount) {
          hasMonthDiscount = true;
        }
      }

      const orderInMonthAmount = jOrderInMonth
        .map((m: any) => m.grandTotal)
        .reduce((acc: number, value: number) => acc + value, 0);

      if (orderCount === 0) {
        finalData = {
          ...orderOfferData,
          ...{
            hasFirstOrderDiscount: true,
          },
        };
      } else {
        finalData = {
          ...orderOfferData,
          ...{
            hasFirstOrderDiscount: false,
            orderInMonthAmount: hasMonthDiscount ? 0 : orderInMonthAmount,
          },
        };
      }
    } else {
      finalData = {
        ...orderOfferData,
        ...{
          hasFirstOrderDiscount: false,
          orderInMonthAmount: null,
        },
      };
    }

    // Final Data
    if (finalData) {
      if (
        cartSubTotal >= finalData.amount3OrderMinAmount &&
        cartSubTotal < finalData.monthOrderMinAmount
      ) {
        if (
          finalData.amount3OrderDiscountType === DiscountTypeEnum.PERCENTAGE
        ) {
          orderDiscount = this.utilsService.roundNumber(
            (finalData.amount3OrderDiscountAmount / 100) * cartSubTotal,
          );
        } else {
          orderDiscount = this.utilsService.roundNumber(
            finalData.amount3OrderDiscountAmount,
          );
        }
      } else if (
        cartSubTotal >= finalData.amount3OrderMinAmount &&
        finalData.monthOrderMinAmount! >= 0
      ) {
        if (
          finalData.amount3OrderDiscountType === DiscountTypeEnum.PERCENTAGE
        ) {
          orderDiscount = this.utilsService.roundNumber(
            (finalData.amount3OrderDiscountAmount / 100) * cartSubTotal,
          );
        } else {
          orderDiscount = this.utilsService.roundNumber(
            finalData.amount3OrderDiscountAmount,
          );
        }
      } else if (
        cartSubTotal >= finalData.amount2OrderMinAmount &&
        cartSubTotal < finalData.amount3OrderMinAmount
      ) {
        if (
          finalData.amount2OrderDiscountType === DiscountTypeEnum.PERCENTAGE
        ) {
          orderDiscount = this.utilsService.roundNumber(
            (finalData.amount2OrderDiscountAmount / 100) * cartSubTotal,
          );
        } else {
          orderDiscount = this.utilsService.roundNumber(
            finalData.amount2OrderDiscountAmount,
          );
        }
      } else if (
        cartSubTotal >= finalData.amountOrderMinAmount &&
        cartSubTotal < finalData.amount2OrderMinAmount
      ) {
        if (finalData.amountOrderDiscountType === DiscountTypeEnum.PERCENTAGE) {
          orderDiscount = this.utilsService.roundNumber(
            (finalData.amountOrderDiscountAmount / 100) * cartSubTotal,
          );
        } else {
          orderDiscount = this.utilsService.roundNumber(
            finalData.amountOrderDiscountAmount,
          );
        }
      } else if (
        finalData.hasFirstOrderDiscount &&
        cartSubTotal >= finalData.firstOrderDiscountAmount &&
        cartSubTotal < finalData.amountOrderMinAmount
      ) {
        if (finalData.firstOrderDiscountType === DiscountTypeEnum.PERCENTAGE) {
          orderDiscount = this.utilsService.roundNumber(
            (finalData.firstOrderDiscountAmount / 100) * cartSubTotal,
          );
        } else {
          orderDiscount = this.utilsService.roundNumber(
            finalData.firstOrderDiscountAmount,
          );
        }
      } else if (
        finalData.orderInMonthAmount >= finalData.monthOrderValue &&
        finalData.monthOrderMinAmount <= cartSubTotal
      ) {
        if (finalData.monthOrderDiscountType === DiscountTypeEnum.PERCENTAGE) {
          orderDiscount = this.utilsService.roundNumber(
            (finalData.monthOrderDiscountAmount / 100) * cartSubTotal,
          );
        } else {
          orderDiscount = this.utilsService.roundNumber(
            finalData.monthOrderDiscountAmount,
          );
        }
      }

      // Order Discount From Apps

      if (orderFrom && orderFrom === 'Apps') {
        if (
          finalData.appsOrderMinAmount &&
          cartSubTotal >= finalData.appsOrderMinAmount
        ) {
          if (finalData.appsOrderDiscountType === DiscountTypeEnum.PERCENTAGE) {
            orderDiscountFromApps = this.utilsService.roundNumber(
              (finalData.appsOrderDiscountAmount / 100) * cartSubTotal,
            );
          } else {
            orderDiscountFromApps = this.utilsService.roundNumber(
              finalData.appsOrderDiscountAmount,
            );
          }
        }
      }

      return orderDiscount + orderDiscountFromApps;
    }
  }

  // Calculate Weight-Based Delivery Charge
  private calculateWeightBasedDeliveryCharge(
    cartItems: any[],
    division?: string,
    area?: string,
    zone?: string,
  ): number {
    // List of Dhaka areas that should NOT have weight charges (use outsideDhaka charge but no weight charge)
    const dhakaOutsideAreas = [
      'Savar >> সাভার',
      'Dohar — দোহার',
      'Nawabganj — নবাবগঞ্জ',
      'Keraniganj — কেরানীগঞ্জ',
      'Dhamrai — ধামরাই',
    ];

    // Check if division is Dhaka (with different possible formats)
    const isDhakaDivision =
      division === 'Dhaka > ঢাকা' ||
      division === 'Dhaka >> ঢাকা' ||
      division === 'Dhaka >ঢাকা';

    // Skip weight charge for:
    // 1. Dhaka division (all areas in Dhaka except specific outside areas)
    // 2. Specific areas in Dhaka that use outsideDhaka charge (Savar, Dohar, etc.)
    if (isDhakaDivision) {
      // If it's one of the specific outside areas, still skip weight charge
      // (they use outsideDhaka base charge but no weight-based charge)
      if (area && dhakaOutsideAreas.includes(area)) {
        return 0;
      }
      // For all other Dhaka areas, skip weight charge
      return 0;
    }

    // Calculate total weight of all items in the cart
    const totalWeight = cartItems.reduce((totalWeight, item) => {
      const itemWeight = item.product?.weight || 0; // Get weight from product, default to 0
      const quantity = item.selectedQty || 1;
      return totalWeight + itemWeight * quantity;
    }, 0);

    // If total weight is above 2000 grams (2 kg), calculate additional delivery charge
    // This only applies to areas outside Dhaka
    if (totalWeight > 2000) {
      const excessWeight = totalWeight - 2000; // Weight above 2000 grams
      const additionalKg = Math.ceil(excessWeight / 1000); // Convert to kg and round up
      const additionalCharge = additionalKg * 15; // 15 taka per kg
      return additionalCharge;
    }

    return 0; // No additional charge if weight is 2000 grams or less
  }

  // Job Scheduler For Courier Status
  private async checkAndUpdateCourierStatus() {
    // schedule.scheduleJob('*/1 * * * *', async () => {
    schedule.scheduleJob('0 */6 * * *', async () => {
      // schedule.scheduleJob('*/20 * * * *', async () => {
      console.log('Get All Courier Status And Update Start...');
      await this.getAllCourierStatusAndUpdate();
    });
  }

  // get All Courier Status And Update

  async getAllCourierStatusAndUpdate(): Promise<void> {
    const last3Days = new Date(
      this.utilsService.getNextDateString(new Date(), -15),
    );
    const formattedDate = last3Days.toISOString().split('T')[0];

    const orders = await this.orderModel.find({
      'courierData.createdAt': { $gte: formattedDate },
      courierData: { $exists: true, $ne: null },
    });

    if (orders.length === 0) {
      console.log('No orders found for the last 3 days with courierData.');
      return;
    }

    const courierMethodArray: { courier: any }[] = [];

    // Step 1: Prepare courier methods per shop
    try {
      const fSetting = await this.settingModel
        .findOne()
        .select('courierMethods -_id');

      const fCourierMethods = fSetting?.courierMethods ?? [];
      const activeCourier = fCourierMethods.find(
        (c: any) => c.status === 'active',
      );

      if (activeCourier) {
        courierMethodArray.push({ courier: activeCourier });
      }
    } catch (err) {
      console.error(`Failed to fetch courier setting`, err);
    }

    // Step 2: Batch process orders
    const BATCH_SIZE = 100;
    for (let i = 0; i < orders.length; i += BATCH_SIZE) {
      const batch = orders.slice(i, i + BATCH_SIZE);

      const batchPromises = batch.map(async (order) => {
        const matchedCourier: any = courierMethodArray;

        if (matchedCourier) {
          try {
            await this.getAndUpdateOrderStatusFromCourier(
              order,
              matchedCourier.courier,
            );
          } catch (err) {
            console.error(
              `Failed to update order ${order._id}`,
              err?.response?.data || err.message,
            );
          }
        }
      });

      // Wait for all promises in the batch to finish (even if some fail)
      await Promise.allSettled(batchPromises);
      console.log(`✅ Processed batch ${i / BATCH_SIZE + 1}`);
    }

    console.log('🎉 All courier status updates complete.');
  }

  async getAndUpdateOrderStatusFromCourier(order: any, courierMethod: any) {
    // Implement your logic here
    let orderStatus: any;
    // Courier Api Config
    const courierApiConfig: CourierApiConfig = {
      providerName: courierMethod?.providerName,
      apiKey: courierMethod?.apiKey,
      merchantCode: courierMethod?.merchantCode,
      pickMerchantThana: courierMethod?.thana,
      pickMerchantDistrict: courierMethod?.district,
      pickMerchantAddress: courierMethod?.address,
      pickMerchantName: courierMethod?.merchant_name,
      pickupMerchantPhone: courierMethod?.contact_number,
      secretKey: courierMethod?.secretKey,
      username: courierMethod?.username,
      password: courierMethod?.password,
    };

    if (order.courierData.consignmentId) {
      const courierResponse =
        await this.courierService.getOrderStatusFormCourier(
          courierApiConfig,
          order.courierData.consignmentId,
          order?.orderId,
        );

      switch (courierResponse && courierMethod?.providerName) {
        case 'Steadfast Courier':
          if (courierResponse.status === 200) {
            switch (courierResponse.delivery_status) {
              case 'delivered':
                orderStatus = 'delivered';
                break;
              case 'cancelled':
                orderStatus = 'cancelled';
                break;
            }

            await this.orderModel.findByIdAndUpdate(order.id, {
              $set: {
                orderStatus: orderStatus,
              },
            });
          }
          break;
        case 'Pathao Courier':
          if (courierResponse.code === 200) {
            console.log(
              'courierResponse.data.order_status',
              courierResponse.data.order_status,
            );
            switch (courierResponse.data.order_status) {
              case 'Delivered':
                orderStatus = 'delivered';
                break;
              case 'Cancelled':
                orderStatus = 'cancelled';
                break;
              case 'Cancel':
                orderStatus = 'cancelled';
                break;
              case 'Return':
                orderStatus = 'refunded';
                break;
              case 'Pending':
                orderStatus = 'Pathao Checking';
                break;

              // case 'Pending':
              //   console.log('Pending');
              //   orderStatus = 'confirmed';
              //   break;
              default:
                orderStatus = courierResponse.data.order_status; // default রাখবে
                break;
            }

            await this.orderModel.findByIdAndUpdate(order.id, {
              $set: {
                orderStatus: orderStatus,
              },
            });
          }
          break;

        case 'Paperfly Courier':
          if (
            courierResponse.response_code === 200 &&
            courierResponse.success?.trackingStatus?.length > 0
          ) {
            const statusObj = courierResponse.success.trackingStatus[0]; // array-এর প্রথম object

            // সবগুলা টাইম বের করে latest খুঁজে বের করি
            const statusKeys = [
              'Pick',
              'inTransit',
              'ReceivedAtPoint',
              'PickedForDelivery',
              'Delivered',
              'Returned',
              'Partial',
              'onHoldSchedule',
              'close',
              'Cancelled',
              'Cancel',
              'Not yet picked',
            ];

            let latestStatus = null;
            let latestTime = null;

            for (const key of statusKeys) {
              const timeKey = key + 'Time';
              const timeStr = statusObj[timeKey];
              if (timeStr) {
                const t = new Date(timeStr);
                if (!latestTime || t > latestTime) {
                  latestTime = t;
                  latestStatus = key;
                }
              }
            }

            let orderStatus: string;

            switch (latestStatus) {
              case 'Delivered':
                orderStatus = 'delivered';
                break;
              case 'Cancelled':
              case 'Cancel':
                orderStatus = 'cancelled';
                break;
              case 'inTransit':
                orderStatus = 'Order is in the processing';
                break;
              case 'ReceivedAtPoint':
                orderStatus = 'Order has been received at point';
                break;
              case 'Pick':
                orderStatus = 'Order has been picked';
                break;
              case 'PickedForDelivery':
                orderStatus = 'Picked for delivery';
                break;
              case 'Returned':
                orderStatus = 'Order has been returned';
                break;
              // default:
              //   orderStatus = latestStatus ?? 'unknown';
              //   break;
            }

            await this.orderModel.findByIdAndUpdate(order.id, {
              $set: {
                orderStatus,
              },
            });
          }
          break;
      }
    }
  }
}
