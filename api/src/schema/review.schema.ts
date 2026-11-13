const mongoose = require('mongoose');
const Schema = mongoose.Schema;

export const ReviewSchema = new mongoose.Schema(
  {
    user: {
      _id: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      name: {
        type: String,
      },
      profileImg: {
        type: String,
      },
    },
    product: {
      _id: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
      },
      name: {
        type: String,
      },
      images: {
        type: [String],
      },
      slug: {
        type: String,
      },
    },
    reviewDate: {
      type: Date,
      required: false,
      default: Date.now(),
    },
    review: {
      type: String,
      required: true,
    },
    isReview: {
      type: Boolean,
      required: false,
    },
    rating: {
      type: Number,
      required: true,
    },
    status: {
      type: Boolean,
      required: true,
    },
    images: {
      type: [String],
      required: false,
      default: [],
    },
    reply: {
      type: String,
      required: false,
    },
    replyDate: {
      type: Date,
      required: false,
    },
    // Written from the order's review link (amolbooks.com/rate/<token>, owner 2026-11-13): the
    // customer bought this book in that order, so the shop may show "verified buyer".
    order: {
      _id: {
        type: Schema.Types.ObjectId,
        ref: 'Order',
        required: false,
      },
      orderId: {
        type: String,
        required: false,
      },
    },
    verifiedPurchase: {
      type: Boolean,
      required: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

ReviewSchema.index({ 'product._id': 1, status: 1 });
// One review per book per order from the review link.
ReviewSchema.index(
  { 'order._id': 1, 'product._id': 1 },
  { name: 'review_order_product', unique: true, partialFilterExpression: { 'order._id': { $type: 'objectId' } } },
);
