"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const process = require("node:process");
exports.default = () => ({
    productionBuild: process.env.PRODUCTION_BUILD === 'true',
    hostname: `http://localhost:${process.env.PORT || 3000}`,
    port: parseInt(process.env.PORT, 10) || 3000,
    mongoCluster: process.env.PRODUCTION_BUILD === 'true'
        ? `mongodb://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@127.0.0.1:${process.env.DB_PORT}/${process.env.DB_NAME}?authSource=${process.env.AUTH_SOURCE}`
        : `mongodb+srv://rejakazi02:tsVvjOhOIqgbsa23@test-softlab-project.wesh3ba.mongodb.net/alambooks?retryWrites=true&w=majority`,
    userJwtSecret: process.env.JWT_PRIVATE_KEY_USER,
    adminJwtSecret: process.env.JWT_PRIVATE_KEY_ADMIN,
    userTokenExpiredTime: 604800,
    adminTokenExpiredTime: 604800,
    STORE_ID: 'alambook0live2',
    STORE_PASSWORD: '65C9FA62BE068362152',
    cdnUrlBase: process.env.PRODUCTION_BUILD === 'true'
        ? 'https://api.alambook.com'
        : 'http://localhost:4001',
    gmail: 'contact.tee24@gmail.com',
    googleClientId1: '512308839711-28b3nld6pl4m4u5nbti96iqnc1nk00fp.apps.googleusercontent.com',
    googleClientSecret1: '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',
    googleClientRedirectUrl: 'https://developers.google.com/oauthplayground',
    googleRefreshToken1: '1//04_8qMYSyOp1vCgYIARAAGAQSNwF-L9IrlYOcOO_Zq5Udy4ENmxlAx-Hq0c6dXArXkNGZ7xRZayuiBC22tWmrJOzyjs2Lmxm_R28',
    api_token: 'z4r4xk1w-mimzoqkz-4gzjceyh-4xojungi-fnqcxo492',
    sid: 'alambook2',
    SSL_SMS_API: 'https://smsplus.sslwireless.com/api/v3/send-sms',
    promoOfferSchedule: 'Promo_Offer_Schedule',
    promoOfferScheduleOnStart: 'Promo_Offer_Schedule_On_Start',
    promoOfferScheduleOnEnd: 'Promo_Offer_Schedule_On_End',
    smsSenderUsername: '8809617628939',
    smsSenderSecret: 'BHYMlbh16lZ36WPL2tku',
    smsSenderPassword: 'YV6H7B8N',
    smsSenderId: '8809617628939',
    dbAdminUsername: 'ikbalsazib11',
    dbAdminPassword: 'IKBALsazib11',
    backupDB: process.env.DB_NAME,
    backupPath: './backup/db',
    restorePath: `./restore/${process.env.DB_NAME}`,
    driveFolder: '1HzP7UXlS3j0fGDk502l1nRV5CbAMPsnE',
    googleRedirectUrl: 'https://developers.google.com/oauthplayground',
    googleClientId: '23922428634-gg6mvr1qnbucbicgronh0ii67kplemn0.apps.googleusercontent.com',
    googleClientSecret: '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',
    googleRefreshToken: '1//04pvQHjbzuCmLCgYIARAAGAQSNwF-L9Irh0V61NXGh4Zawa0A9MX_zsLQSO1n8jyn610KUQxFF0V-xcduxcJ_genZpPTA1R2VT6A',
    accountGmail: 'softlabit.drive@gmail.com',
    fraudspyApiKey: process.env.FRAUDSPY_API_KEY || 'fs_live_4b3b_7dc0067d-8ed2-4322-915e-37b419008ae9_110e494edd31cc0f',
});
//# sourceMappingURL=configuration.js.map