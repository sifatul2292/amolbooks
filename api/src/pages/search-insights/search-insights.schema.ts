import { Schema } from 'mongoose';

// One row per shop search. A visitor's quick follow-up that only extends or trims the
// same words ("sob" -> "sobor") updates their last row instead of adding a new one.
export const SearchLogSchema = new Schema(
  {
    term: { type: String, required: true },
    // Lowercase letters and digits only: groups "Sobor", "sobor " and "sobor!" together.
    key: { type: String, required: true },
    // Daily hash of IP + browser; no IP, account or phone number is stored.
    visitor: { type: String, required: true },
    // Books the shop search returned for this term.
    results: { type: Number, default: 0 },
    at: { type: Date, default: Date.now },
  },
  { versionKey: false },
);
// Kept for a year.
SearchLogSchema.index({ at: 1 }, { expireAfterSeconds: 366 * 24 * 60 * 60 });
SearchLogSchema.index({ visitor: 1, at: -1 });
