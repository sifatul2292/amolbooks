import { ProductModule } from './pages/product/product.module';
import { BannerCaroselModule } from './pages/customization/banner/banner-carosel.module';
import { CacheModule, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from './pages/user/user.module';
import { AdminModule } from './pages/admin/admin.module';
import { UtilsModule } from './shared/utils/utils.module';
import { UploadModule } from './pages/upload/upload.module';
import { DbToolsModule } from './shared/db-tools/db-tools.module';
import { PromoOfferModule } from './pages/offers/promo-offer/promo-offer.module';
import { JobSchedulerModule } from './shared/job-scheduler/job-scheduler.module';
import { DashboardModule } from './pages/dashboard/dashboard.module';
import { CarouselModule } from './pages/customization/carousel/carousel.module';
import { CategoryModule } from './pages/catalog/category/category.module';
import { SubCategoryModule } from './pages/catalog/sub-category/sub-category.module';
import { PublisherModule } from './pages/catalog/publisher/publisher.module';
import { AuthorModule } from './pages/catalog/author/author.module';
import { BlogModule } from './pages/blog/blog/blog.module';
import { ContactModule } from './pages/contact/contact/contact.module';
import { NewsletterModule } from './pages/contact/newsletter/newsletter.module';
import { TagModule } from './pages/catalog/tag/tag.module';
import { BrandModule } from './pages/catalog/brand/brand.module';
import { ReviewModule } from './pages/review/review.module';
import { ProfileModule } from './pages/profile/profile/profile.module';
import { OrderModule } from './pages/sales/order/order.module';
import { ShippingChargeModule } from './pages/sales/shipping-charge/shipping-charge.module';
import { CouponModule } from './pages/offers/coupon/coupon.module';
import { AdditionalPageModule } from './pages/additional-page/additional-page.module';
import { CartModule } from './pages/cart/cart.module';
import { WishListModule } from './pages/wish-list/wish-list.module';
import { MultiPromoOfferModule } from './pages/offers/multi-promo-offer/multi-Promo-offer.module';
import { DiscountPercentModule } from './pages/discount-percent/discount-percent.module';
import { FileFolderModule } from './pages/file-folder/file-folder.module';
import { GalleryModule } from './pages/gallery/gallery.module';
import { SpecialPackageModule } from './pages/offers/special-package/special-package.module';
import { ShopInformationModule } from './pages/customization/shop-information/shop-information.module';
import { ManuscriptModule } from './pages/manuscript/manuscript.module';
import { YoutubeVideoModule } from './pages/youtube-video/youtube-video.module';
import { AreaModule } from './pages/address/area/area.module';
import { ZoneModule } from './pages/address/zone/zone.module';
import { DivisionModule } from './pages/address/division/division.module';
import { PopupModule } from './pages/customization/popup/popup.module';
import { BlogCommentModule } from './pages/blog-comments/blog-comment.module';
import { PaymentModule } from './pages/payment/payment.module';
import { BulkSmsModule } from './shared/bulk-sms/bulk-sms.module';
import { EmailModule } from './shared/email/email.module';
import { SslcommerzModule } from './shared/sslcommerz/sslcommerz.module';
import { PraptisthanaModule } from './pages/praptisthana/praptisthana.module';
import { OtpModule } from './pages/otp/otp.module';
import { NotificationModule } from './pages/notification/notification.module';
import { OrderOfferModule } from './pages/offers/order-offer/order-offer.module';
import { ActivitiesModule } from './pages/activities/activities/activities.module';
import { ActivitiesCommentModule } from './pages/activities-comments/activities-comment.module';
import { SeoPageModule } from './pages/seo-page/seo-page.module';
import { join } from 'path';
import { ServeStaticModule } from '@nestjs/serve-static';
import { SitemapModule } from './pages/sitemap/sitemap.module';
import { RedirectUrlModule } from './pages/redirect-url/redirect-url.module';
import { SettingModule } from './pages/customization/setting/setting.module';
import { FbCatalogModule } from './shared/fb-catalog/fb-catalog.module';
import { AnalyticsModule } from './shared/analytics/analytics.module';
import { GtmModule } from './pages/gtm/gtm.module';
import { CourierModule } from './shared/courier/courier.module';
import { PreOrderModule } from './pages/pre-order/pre-order.module';
@Module({
  imports: [
    ServeStaticModule.forRoot(
      {
        rootPath: join(__dirname, '..', 'upload', 'invoice'),
        serveRoot: '/invoice',
      },
    ),
    ConfigModule.forRoot({
      load: [configuration],
      isGlobal: true,
    }),
    MongooseModule.forRoot(configuration().mongoCluster),
    CacheModule.register({ ttl: 200, max: 10, isGlobal: true }),
    AdminModule,
    UserModule,
    UtilsModule,
    DbToolsModule,
    UploadModule,
    PromoOfferModule,
    JobSchedulerModule,
    DashboardModule,
    ProductModule,
    CarouselModule,
    BannerCaroselModule,
    CategoryModule,
    SubCategoryModule,
    PublisherModule,
    AuthorModule,
    BlogModule,
    ContactModule,
    NewsletterModule,
    TagModule,
    ReviewModule,
    ProfileModule,
    OrderModule,
    ShippingChargeModule,
    CouponModule,
    AdditionalPageModule,
    BrandModule,
    CartModule,
    WishListModule,
    MultiPromoOfferModule,
    DiscountPercentModule,
    FileFolderModule,
    GalleryModule,
    SpecialPackageModule,
    ShopInformationModule,
    UserModule,
    ManuscriptModule,
    ContactModule,
    YoutubeVideoModule,
    DivisionModule,
    AreaModule,
    PopupModule,
    ZoneModule,
    BulkSmsModule,
    EmailModule,
    SslcommerzModule,
    PaymentModule,
    BlogCommentModule,
    PraptisthanaModule,
    OtpModule,
    NotificationModule,
    OrderOfferModule,
    ActivitiesModule,
    ActivitiesCommentModule,
    SeoPageModule,
    SitemapModule,
    RedirectUrlModule,
    SettingModule,
    AnalyticsModule,
    GtmModule,
    FbCatalogModule,
    CourierModule,
    PreOrderModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
