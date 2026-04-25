"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const product_module_1 = require("./pages/product/product.module");
const banner_carosel_module_1 = require("./pages/customization/banner/banner-carosel.module");
const common_1 = require("@nestjs/common");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const config_1 = require("@nestjs/config");
const configuration_1 = require("./config/configuration");
const mongoose_1 = require("@nestjs/mongoose");
const user_module_1 = require("./pages/user/user.module");
const admin_module_1 = require("./pages/admin/admin.module");
const utils_module_1 = require("./shared/utils/utils.module");
const upload_module_1 = require("./pages/upload/upload.module");
const db_tools_module_1 = require("./shared/db-tools/db-tools.module");
const promo_offer_module_1 = require("./pages/offers/promo-offer/promo-offer.module");
const job_scheduler_module_1 = require("./shared/job-scheduler/job-scheduler.module");
const dashboard_module_1 = require("./pages/dashboard/dashboard.module");
const carousel_module_1 = require("./pages/customization/carousel/carousel.module");
const category_module_1 = require("./pages/catalog/category/category.module");
const sub_category_module_1 = require("./pages/catalog/sub-category/sub-category.module");
const publisher_module_1 = require("./pages/catalog/publisher/publisher.module");
const author_module_1 = require("./pages/catalog/author/author.module");
const blog_module_1 = require("./pages/blog/blog/blog.module");
const contact_module_1 = require("./pages/contact/contact/contact.module");
const newsletter_module_1 = require("./pages/contact/newsletter/newsletter.module");
const tag_module_1 = require("./pages/catalog/tag/tag.module");
const brand_module_1 = require("./pages/catalog/brand/brand.module");
const review_module_1 = require("./pages/review/review.module");
const profile_module_1 = require("./pages/profile/profile/profile.module");
const order_module_1 = require("./pages/sales/order/order.module");
const shipping_charge_module_1 = require("./pages/sales/shipping-charge/shipping-charge.module");
const coupon_module_1 = require("./pages/offers/coupon/coupon.module");
const additional_page_module_1 = require("./pages/additional-page/additional-page.module");
const cart_module_1 = require("./pages/cart/cart.module");
const wish_list_module_1 = require("./pages/wish-list/wish-list.module");
const multi_Promo_offer_module_1 = require("./pages/offers/multi-promo-offer/multi-Promo-offer.module");
const discount_percent_module_1 = require("./pages/discount-percent/discount-percent.module");
const file_folder_module_1 = require("./pages/file-folder/file-folder.module");
const gallery_module_1 = require("./pages/gallery/gallery.module");
const special_package_module_1 = require("./pages/offers/special-package/special-package.module");
const shop_information_module_1 = require("./pages/customization/shop-information/shop-information.module");
const manuscript_module_1 = require("./pages/manuscript/manuscript.module");
const youtube_video_module_1 = require("./pages/youtube-video/youtube-video.module");
const area_module_1 = require("./pages/address/area/area.module");
const zone_module_1 = require("./pages/address/zone/zone.module");
const division_module_1 = require("./pages/address/division/division.module");
const popup_module_1 = require("./pages/customization/popup/popup.module");
const blog_comment_module_1 = require("./pages/blog-comments/blog-comment.module");
const payment_module_1 = require("./pages/payment/payment.module");
const bulk_sms_module_1 = require("./shared/bulk-sms/bulk-sms.module");
const email_module_1 = require("./shared/email/email.module");
const sslcommerz_module_1 = require("./shared/sslcommerz/sslcommerz.module");
const praptisthana_module_1 = require("./pages/praptisthana/praptisthana.module");
const otp_module_1 = require("./pages/otp/otp.module");
const notification_module_1 = require("./pages/notification/notification.module");
const order_offer_module_1 = require("./pages/offers/order-offer/order-offer.module");
const activities_module_1 = require("./pages/activities/activities/activities.module");
const activities_comment_module_1 = require("./pages/activities-comments/activities-comment.module");
const seo_page_module_1 = require("./pages/seo-page/seo-page.module");
const path_1 = require("path");
const serve_static_1 = require("@nestjs/serve-static");
const sitemap_module_1 = require("./pages/sitemap/sitemap.module");
const redirect_url_module_1 = require("./pages/redirect-url/redirect-url.module");
const setting_module_1 = require("./pages/customization/setting/setting.module");
const fb_catalog_module_1 = require("./shared/fb-catalog/fb-catalog.module");
const analytics_module_1 = require("./shared/analytics/analytics.module");
const gtm_module_1 = require("./pages/gtm/gtm.module");
const courier_module_1 = require("./shared/courier/courier.module");
const pre_order_module_1 = require("./pages/pre-order/pre-order.module");
let AppModule = class AppModule {
};
AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            serve_static_1.ServeStaticModule.forRoot({
                rootPath: (0, path_1.join)(__dirname, '..', 'upload', 'invoice'),
                serveRoot: '/invoice',
            }, {
                rootPath: (0, path_1.join)(__dirname, '..', '..', 'ui', 'dist', 'angular-ui', 'browser'),
                serveRoot: '/',
            }),
            config_1.ConfigModule.forRoot({
                load: [configuration_1.default],
                isGlobal: true,
            }),
            mongoose_1.MongooseModule.forRoot((0, configuration_1.default)().mongoCluster),
            common_1.CacheModule.register({ ttl: 200, max: 10, isGlobal: true }),
            admin_module_1.AdminModule,
            user_module_1.UserModule,
            utils_module_1.UtilsModule,
            db_tools_module_1.DbToolsModule,
            upload_module_1.UploadModule,
            promo_offer_module_1.PromoOfferModule,
            job_scheduler_module_1.JobSchedulerModule,
            dashboard_module_1.DashboardModule,
            product_module_1.ProductModule,
            carousel_module_1.CarouselModule,
            banner_carosel_module_1.BannerCaroselModule,
            category_module_1.CategoryModule,
            sub_category_module_1.SubCategoryModule,
            publisher_module_1.PublisherModule,
            author_module_1.AuthorModule,
            blog_module_1.BlogModule,
            contact_module_1.ContactModule,
            newsletter_module_1.NewsletterModule,
            tag_module_1.TagModule,
            review_module_1.ReviewModule,
            profile_module_1.ProfileModule,
            order_module_1.OrderModule,
            shipping_charge_module_1.ShippingChargeModule,
            coupon_module_1.CouponModule,
            additional_page_module_1.AdditionalPageModule,
            brand_module_1.BrandModule,
            cart_module_1.CartModule,
            wish_list_module_1.WishListModule,
            multi_Promo_offer_module_1.MultiPromoOfferModule,
            discount_percent_module_1.DiscountPercentModule,
            file_folder_module_1.FileFolderModule,
            gallery_module_1.GalleryModule,
            special_package_module_1.SpecialPackageModule,
            shop_information_module_1.ShopInformationModule,
            user_module_1.UserModule,
            manuscript_module_1.ManuscriptModule,
            contact_module_1.ContactModule,
            youtube_video_module_1.YoutubeVideoModule,
            division_module_1.DivisionModule,
            area_module_1.AreaModule,
            popup_module_1.PopupModule,
            zone_module_1.ZoneModule,
            bulk_sms_module_1.BulkSmsModule,
            email_module_1.EmailModule,
            sslcommerz_module_1.SslcommerzModule,
            payment_module_1.PaymentModule,
            blog_comment_module_1.BlogCommentModule,
            praptisthana_module_1.PraptisthanaModule,
            otp_module_1.OtpModule,
            notification_module_1.NotificationModule,
            order_offer_module_1.OrderOfferModule,
            activities_module_1.ActivitiesModule,
            activities_comment_module_1.ActivitiesCommentModule,
            seo_page_module_1.SeoPageModule,
            sitemap_module_1.SitemapModule,
            redirect_url_module_1.RedirectUrlModule,
            setting_module_1.SettingModule,
            analytics_module_1.AnalyticsModule,
            gtm_module_1.GtmModule,
            fb_catalog_module_1.FbCatalogModule,
            courier_module_1.CourierModule,
            pre_order_module_1.PreOrderModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
exports.AppModule = AppModule;
//# sourceMappingURL=app.module.js.map