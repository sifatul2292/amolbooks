import * as mongoose from 'mongoose';

/**
 * WhatsApp Inbox (owner, 2026-11-10): one row per customer number that wrote to (or got a
 * message from) the API number. The list on the inbox page shows chats where the customer
 * wrote (lastCustomerAt), newest first.
 */
export const WhatsappChatSchema = new mongoose.Schema(
  {
    // 8801XXXXXXXXX (Meta's wa_id)
    wa: { type: String, required: true, unique: true },
    // The customer's WhatsApp profile name, from the webhook.
    name: { type: String },
    lastAt: { type: Date },
    lastText: { type: String },
    // in (customer) | out (shop)
    lastDirection: { type: String },
    // Who wrote the latest message: customer | order | auto | staff (lastBy = the staff name).
    lastKind: { type: String },
    lastBy: { type: String },
    // The staff member who answered last, shown in the chat list (owner, 2026-11-11).
    lastStaff: {
      name: { type: String },
      at: { type: Date },
    },
    // The customer's latest message: staff may reply for 24 hours after it (Meta's rule).
    lastCustomerAt: { type: Date },
    unread: { type: Number, default: 0 },
    readAt: { type: Date },
    readBy: { type: String },
  },
  { timestamps: true, versionKey: false },
);
WhatsappChatSchema.index(
  { lastAt: -1 },
  { name: 'customer_chats_latest', partialFilterExpression: { lastCustomerAt: { $exists: true } } },
);

/** Every message on the API number: the customer's, the shop's automatic ones and staff replies. */
export const WhatsappChatMessageSchema = new mongoose.Schema(
  {
    wa: { type: String, required: true },
    // in (customer) | out (shop)
    direction: { type: String, required: true },
    // customer | order (template message) | auto (automatic answer) | staff (inbox reply)
    kind: { type: String },
    // text | image | audio | video | document | sticker | location | contacts | button | reaction | template | unsupported
    type: { type: String },
    text: { type: String },
    // Photos, voice notes, files: Meta keeps them for 30 days; the inbox reads them through the API.
    media: {
      id: { type: String },
      mime: { type: String },
      filename: { type: String },
    },
    // Meta's message id (wamid…); a message delivered twice is stored once.
    messageId: { type: String },
    // out: sent | delivered | read | failed
    status: { type: String },
    error: { type: String },
    // Shop order number when the message is about one (order message, button tap).
    orderId: { type: String },
    // Staff who wrote an inbox reply.
    by: {
      _id: { type: mongoose.Schema.Types.ObjectId },
      name: { type: String },
    },
    at: { type: Date, required: true },
  },
  { timestamps: true, versionKey: false },
);
WhatsappChatMessageSchema.index({ wa: 1, at: -1 });
WhatsappChatMessageSchema.index(
  { messageId: 1 },
  { unique: true, name: 'whatsapp_message_once', partialFilterExpression: { messageId: { $type: 'string' } } },
);
WhatsappChatMessageSchema.index({ 'media.id': 1 }, { sparse: true });
