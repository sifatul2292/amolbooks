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
var GtmController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GtmController = void 0;
const common_1 = require("@nestjs/common");
const gtm_service_1 = require("./gtm.service");
const gtm_dto_1 = require("./dto/gtm.dto");
let GtmController = GtmController_1 = class GtmController {
    constructor(gtmService) {
        this.gtmService = gtmService;
        this.logger = new common_1.Logger(GtmController_1.name);
    }
    async trackThemePageView(req, addGtmThemePageViewDto) {
        return await this.gtmService.trackThemePageView(req, addGtmThemePageViewDto);
    }
    async trackThemeViewContent(req, addGtmThemeViewContentDto) {
        return await this.gtmService.trackThemeViewContent(req, addGtmThemeViewContentDto);
    }
    async trackThemeAddToCart(req, bodyData) {
        return await this.gtmService.trackThemeAddToCart(req, bodyData);
    }
    async trackThemeInitialCheckout(req, bodyData) {
        return await this.gtmService.trackThemeInitialCheckout(req, bodyData);
    }
    async trackThemePurchase(req, bodyData) {
        return await this.gtmService.trackThemePurchase(req, bodyData);
    }
};
__decorate([
    (0, common_1.Post)('/track-theme-page-view'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, gtm_dto_1.AddGtmThemePageViewDto]),
    __metadata("design:returntype", Promise)
], GtmController.prototype, "trackThemePageView", null);
__decorate([
    (0, common_1.Post)('/track-theme-view-content'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, gtm_dto_1.AddGtmThemeViewContentDto]),
    __metadata("design:returntype", Promise)
], GtmController.prototype, "trackThemeViewContent", null);
__decorate([
    (0, common_1.Post)('/track-theme-add-to-cart'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GtmController.prototype, "trackThemeAddToCart", null);
__decorate([
    (0, common_1.Post)('/track-theme-initial-checkout'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GtmController.prototype, "trackThemeInitialCheckout", null);
__decorate([
    (0, common_1.Post)('/track-theme-purchase'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], GtmController.prototype, "trackThemePurchase", null);
GtmController = GtmController_1 = __decorate([
    (0, common_1.Controller)('gtag'),
    __metadata("design:paramtypes", [gtm_service_1.GtmService])
], GtmController);
exports.GtmController = GtmController;
//# sourceMappingURL=gtm.controller.js.map