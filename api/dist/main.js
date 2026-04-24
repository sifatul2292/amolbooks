"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const express_1 = require("express");
const path_1 = require("path");
const express = require("express");
async function bootstrap() {
    const logger = new common_1.Logger('Bootstrap');
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { cors: true });
    app.enableCors({
        origin: [
            'http://localhost:4200',
            'http://localhost:42002',
            'http://localhost:3001',
            'http://localhost:3002',
            'http://localhost:3007',
            'http://localhost:3005',
            'http://localhost:3004',
            'http://localhost:3003',
            'http://localhost:3006',
            'http://localhost:3008',
            'https://www.alambook.com',
            'https://alambook.com',
            'https://admin.alambook.com',
            'https://adminsub.amolbooks.com',
            'https://uisub.amolbooks.com',
            'https://apisub.amolbooks.com',
        ],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        allowedHeaders: 'Content-Type,Authorization,administrator',
        credentials: true,
    });
    app.use('/upload/static', express.static((0, path_1.join)(__dirname, '..', 'upload/static')));
    app.enableVersioning({
        type: common_1.VersioningType.URI,
    });
    app.use((0, express_1.json)({ limit: '50mb' }));
    app.use((0, express_1.urlencoded)({ extended: true, limit: '50mb' }));
    app.setGlobalPrefix('api');
    const port = process.env.PORT || 3000;
    await app.listen(port);
    logger.log(`Application is running on port ${port}`);
}
bootstrap();
//# sourceMappingURL=main.js.map