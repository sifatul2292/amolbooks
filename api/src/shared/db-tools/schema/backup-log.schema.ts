import * as mongoose from 'mongoose';

//  data: { id: '16qoOl_wPErAywn6eVzQ_KOwjghGdFIUq' },
export const BackupLogSchema = new mongoose.Schema(
  {
    fileId: {
      type: String,
      required: true,
    },
    dateString: {
      type: String,
      required: true,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);
