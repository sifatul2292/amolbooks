import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class AnalyticsAction extends Document {
  @Prop({ required: true, index: true })
  opportunityKey: string;

  @Prop({ required: true })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  action: string;

  @Prop()
  targetId?: string;

  @Prop({ required: true })
  rangeStart: string;

  @Prop({ required: true })
  rangeEnd: string;

  @Prop({ type: Object, required: true })
  baseline: Record<string, number | null>;

  @Prop()
  note?: string;

  @Prop({ default: Date.now })
  actedOnAt: Date;
}

export const AnalyticsActionSchema = SchemaFactory.createForClass(AnalyticsAction);
