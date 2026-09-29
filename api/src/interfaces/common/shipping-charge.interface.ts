export interface ShippingChargeRule {
  fromGram: number;
  toGram: number;
  cost: number;
}

export interface ShippingCharge {
  _id?: string;
  deliveryInDhaka?: number;
  deliveryOutsideDhaka?: number;
  deliveryOutsideBD?: number;
  insideDhakaRules?: ShippingChargeRule[];
  outsideDhakaRules?: ShippingChargeRule[];
  createdAt?: Date;
  updatedAt?: Date;
}
