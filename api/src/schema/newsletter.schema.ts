import * as mongoose from 'mongoose';

export const NewsletterSchema = new mongoose.Schema(
  {
    readOnly: {
      type: Boolean,
      required: false,
    },
    email: {
      type: String,
      required: false,
    },
    number: {
      type: String,
      required: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);
