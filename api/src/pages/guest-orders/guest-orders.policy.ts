import { BadRequestException } from '@nestjs/common';

const bangla = '০১২৩৪৫৬৭৮৯';
export function normalizeOrderPhone(value: string): string {
  if (typeof value !== 'string' || value.length > 32)
    throw new BadRequestException('সঠিক মোবাইল নম্বর দিন');
  let phone = value
    .replace(/[০-৯]/g, (digit) => String(bangla.indexOf(digit)))
    .replace(/[\s()+-]/g, '');
  if (phone.startsWith('0088')) phone = phone.slice(4);
  else if (phone.startsWith('88')) phone = phone.slice(2);
  if (!/^01[3-9]\d{8}$/.test(phone))
    throw new BadRequestException('সঠিক মোবাইল নম্বর দিন');
  return phone;
}
export function orderPhoneAliases(phone: string): string[] {
  return [phone, '88' + phone, '+88' + phone, '0088' + phone].flatMap(
    (value) => [value, value.replace(/\d/g, (digit) => bangla[Number(digit)])],
  );
}
export function unbookedOrderFilter(): any {
  return {
    customerCancelledAt: { $exists: false },
    courierBookingStartedAt: { $exists: false },
    stockOperationInProgress: { $ne: true },
    $and: [
      {
        $or: [
          { courierData: { $exists: false } },
          { courierData: null },
          { courierData: {} },
        ],
      },
      {
        $or: [
          { courierLink: { $exists: false } },
          { courierLink: null },
          { courierLink: '' },
        ],
      },
    ],
  };
}
export function canCustomerCancel(order: any): boolean {
  return (
    [1, 2, 3].includes(order.orderStatus) &&
    !order.customerCancelledAt &&
    !order.courierBookingStartedAt &&
    !order.stockOperationInProgress &&
    !order.courierLink &&
    !Object.values(order.courierData || {}).some(Boolean)
  );
}
