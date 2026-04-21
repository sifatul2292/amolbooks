"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SitemapController = void 0;
const common_1 = require("@nestjs/common");
const sitemap_service_1 = require("./sitemap.service");
let SitemapController = class SitemapController {
    constructor(sitemapService) {
        this.sitemapService = sitemapService;
    }
    async getSitemap(res) {
        const sitemap = await this.sitemapService.generateSitemapXml();
        res.setHeader('Content-Type', 'application/xml');
        res.status(200).send(sitemap);
    }
};
__decorate([
    (0, common_1.Get)('sitemap.xml'),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SitemapController.prototype, "getSitemap", null);
SitemapController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [sitemap_service_1.SitemapService])
], SitemapController);
exports.SitemapController = SitemapController;
//# sourceMappingURL=sitemap.controller.js.map