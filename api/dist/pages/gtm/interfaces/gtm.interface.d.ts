export interface GtmPageView {
    eventId: string;
    eventName: string;
    pageUrl?: string;
    pageTitle?: string;
    referrer?: string;
    email?: string;
    phoneNo?: string;
    clientIp?: string;
    clientUserAgent?: string;
    clientTime?: number;
}
export interface GtmViewContent extends GtmPageView {
    contentId?: string;
    contentName?: string;
    contentSubCategory?: string;
    contentCategory?: string;
    currency?: string;
    value?: number;
    quantity?: number;
}
