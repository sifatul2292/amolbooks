import * as mongoose from 'mongoose';

export const StoreInfoSchema = new mongoose.Schema(
  {
    readOnly: {
      type: Boolean,
      required: false,
    },
    storeName: {
      type: String,
      required: true
    },
    address: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    map: {
        type: String,
        required: true
    },
    district: {
        type: String,
        required: true
    },
    country: {
        type: String,
        required: true
    }
  },
  {
    versionKey: false,
    timestamps: true,
  },
);
