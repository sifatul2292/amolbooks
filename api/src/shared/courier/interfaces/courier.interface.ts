export interface CourierApiConfig {
  providerName: string;
  apiKey: string;
  secretKey: string;
  username?: string;
  password?: string;
  merchantCode?: string;
  pickMerchantThana: any,
  pickMerchantDistrict: any,
  pickMerchantAddress: any,
  pickMerchantName: any,
  pickupMerchantPhone: any,
  specialInstruction?: any;
  storeId?: any;
}

export interface SteadfastCourierPayload {
  invoice: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  cod_amount: number;
  note?: string;
  item_description?: string;
  recipient_email?: string;
}
