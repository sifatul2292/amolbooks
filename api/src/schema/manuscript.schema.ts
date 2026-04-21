import * as mongoose from 'mongoose';

export const ManuscriptSchema = new mongoose.Schema(
  {
    readOnly: {
      type: Boolean,
      required: false,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: false,
    },
    phone: {
      type: String,
      required: false,
    },
    birthDayDate: {
      type: Date,
      required: false,
    },
    profession: {
      type: String,
      required: false,
    },
    docFile: {
      type: String,
      required: false,
    },
    address: {
      type: String,
      required: false,
    },
    manuScriptName: {
      type: String,
      required: false,
    },
    manuScriptWords: {
      type: String,
      required: false,
    },
    manuScriptContents: {
      type: String,
      required: false,
    },
    targrtReaderClasses: {
      type: String,
      required: false,
    },
    manuScriptSummery: {
      type: String,
      required: false,
    },
    manuScriptComment: {
      type: String,
      required: false,
    },
    manuScriptLink: {
      type: String,
      required: false,
    },
  },
  {
    versionKey: false,
    timestamps: true,
  },
);
