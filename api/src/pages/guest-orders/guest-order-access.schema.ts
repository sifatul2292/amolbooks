import { Schema } from 'mongoose';

// Purpose-scoped OTP/session; never grants account or password-reset access.
export const GuestOrderAccessSchema = new Schema(
  {
    phoneNo: { type: String, required: true, unique: true },
    codeHash: String,
    codeExpiresAt: Date,
    attempts: { type: Number, default: 0 },
    resendAfter: Date,
    sends: { type: Number, default: 0 },
    sendWindowResetAt: Date,
    sessionHash: { type: String, unique: true, sparse: true },
    sessionExpiresAt: Date,
    purgeAt: { type: Date, expires: 0 },
  },
  { versionKey: false, autoIndex: true },
);
