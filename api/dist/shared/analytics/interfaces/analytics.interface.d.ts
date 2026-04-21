export interface FbConversionEvent {
    event_name: string;
    event_time: number;
    user_data: Record<string, any>;
    custom_data?: Record<string, any>;
}
