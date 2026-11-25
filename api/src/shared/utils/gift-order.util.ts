import { BadRequestException } from "@nestjs/common";

export const GIFT_WRAP_CHARGE = 30;

// Recipient delivery details use the existing name/phone/address fields.
export function giftOrderDetails(input: any) {
  for (const key of ["isGiftOrder", "giftWrap"]) {
    if (input[key] != null && typeof input[key] !== "boolean") {
      throw new BadRequestException(`${key} must be a boolean`);
    }
  }
  const isGiftOrder = input.isGiftOrder === true;
  const giftWrap = isGiftOrder && input.giftWrap === true;
  let gift;
  if (isGiftOrder) {
    if (input.paymentType !== "online_payment") {
      throw new BadRequestException("Gift orders require online payment");
    }
    const text = (value: any, max: number, required = false) => {
      if (value != null && typeof value !== "string") {
        throw new BadRequestException("Invalid gift details");
      }
      const result = (value || "").trim();
      if ((required && !result) || result.length > max) {
        throw new BadRequestException("Please check the gift details");
      }
      return result;
    };
    const senderName = text(input.gift?.senderName, 100, true);
    const senderPhone = text(input.gift?.senderPhone, 20, true);
    if (!/^(?:\+?8801|01)[3-9]\d{8}$/.test(senderPhone)) {
      throw new BadRequestException("Please enter a valid sender phone number");
    }
    if (
      ["name", "phoneNo", "shippingAddress"].some(
        (key) => typeof input[key] !== "string" || !input[key].trim()
      )
    ) {
      throw new BadRequestException(
        "Please complete the gift recipient details"
      );
    }
    if (!/^(?:\+?8801|01)[3-9]\d{8}$/.test(input.phoneNo.trim())) {
      throw new BadRequestException(
        "Please enter a valid recipient phone number"
      );
    }
    const occasionDate = text(input.gift?.occasionDate, 10);
    const recipientAlternativePhone = text(input.gift?.recipientAlternativePhone, 20);
    if (recipientAlternativePhone && !/^(?:\+?8801|01)[3-9]\d{8}$/.test(recipientAlternativePhone)) {
      throw new BadRequestException("Please enter a valid alternative phone number");
    }
    const date = new Date(occasionDate + "T00:00:00Z");
    if (occasionDate && (!/^\d{4}-\d{2}-\d{2}$/.test(occasionDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== occasionDate)) {
      throw new BadRequestException("Please enter a valid occasion date");
    }
    gift = {
      occasionDate,
      recipientAlternativePhone,
      senderName,
      senderPhone,
      occasion: text(input.gift?.occasion, 60),
      message: text(input.gift?.message, 120),
    };
  }
  return {
    isGiftOrder,
    giftWrap,
    giftWrapCharge: giftWrap ? GIFT_WRAP_CHARGE : 0,
    gift,
  };
}

export function giftFulfilmentNote(
  details: ReturnType<typeof giftOrderDetails>,
  note?: string
) {
  if (!details.isGiftOrder && !details.giftWrap) return note;
  return [
    note,
    details.isGiftOrder &&
      `Gift order — From: ${details.gift.senderName} (${details.gift.senderPhone})`,
    details.giftWrap && "Gift wrap: Tk 30",
    details.gift?.occasion && `Occasion: ${details.gift.occasion}`,
    details.gift?.occasionDate && `Occasion date: ${details.gift.occasionDate}`,
    details.gift?.recipientAlternativePhone && `Recipient alternative phone: ${details.gift.recipientAlternativePhone}`,
    details.gift?.message && `Gift message: ${details.gift.message}`,
  ]
    .filter(Boolean)
    .join("\n");
}
