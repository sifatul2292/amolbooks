"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SitemapModule = void 0;
const common_1 = require("@nestjs/common");
const sitemap_controller_1 = require("./sitemap.controller");
const sitemap_service_1 = require("./sitemap.service");
const product_module_1 = require("../product/product.module");
const blog_module_1 = require("../blog/blog/blog.module");
let SitemapModule = class SitemapModule {
};
SitemapModule = __decorate([
    (0, common_1.Module)({
        imports: [product_module_1.ProductModule, blog_module_1.BlogModule],
        controllers: [sitemap_controller_1.SitemapController],
        providers: [sitemap_service_1.SitemapService],
    })
], SitemapModule);
exports.SitemapModule = SitemapModule;
//# sourceMappingURL=sitemap.module.js.map