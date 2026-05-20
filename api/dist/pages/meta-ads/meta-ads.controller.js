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
exports.MetaAdsController = void 0;
const common_1 = require("@nestjs/common");
const meta_ads_service_1 = require("./meta-ads.service");
let MetaAdsController = class MetaAdsController {
    constructor(metaAdsService) {
        this.metaAdsService = metaAdsService;
    }
    getAuthUrl() {
        const url = this.metaAdsService.getAuthUrl();
        if (!url)
            return { success: false, message: 'META_APP_ID or META_REDIRECT_URI not configured' };
        return { success: true, url };
    }
    async callback(code, res) {
        try {
            await this.metaAdsService.handleCallback(code);
            return res.redirect('https://apisub.amolbooks.com/upload/static/profit-dashboard.html?meta=connected');
        }
        catch (err) {
            return res.redirect('https://apisub.amolbooks.com/upload/static/profit-dashboard.html?meta=error');
        }
    }
    getStatus() {
        return this.metaAdsService.getStatus();
    }
    getSpend(startDate, endDate) {
        return this.metaAdsService.getSpend(startDate, endDate);
    }
    sync(body) {
        return this.metaAdsService.syncSpend(body === null || body === void 0 ? void 0 : body.startDate, body === null || body === void 0 ? void 0 : body.endDate);
    }
    setAccount(body) {
        return this.metaAdsService.setAdAccountId(body.adAccountId);
    }
    manualSpend(body) {
        return this.metaAdsService.saveManualSpend(body.date, body.spend);
    }
    deleteSpend(id) {
        return this.metaAdsService.deleteSpend(id);
    }
    diagnose() {
        return this.metaAdsService.diagnose();
    }
    disconnect() {
        return this.metaAdsService.disconnect();
    }
    getExpenses(startDate, endDate) {
        return { success: true, data: [] };
    }
    addExpense(body) {
        return { success: true, data: body };
    }
    deleteExpense(id) {
        return { success: true };
    }
};
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('auth-url'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MetaAdsController.prototype, "getAuthUrl", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('callback'),
    __param(0, (0, common_1.Query)('code')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MetaAdsController.prototype, "callback", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('status'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MetaAdsController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('spend'),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MetaAdsController.prototype, "getSpend", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('sync'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MetaAdsController.prototype, "sync", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('set-account'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MetaAdsController.prototype, "setAccount", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('manual-spend'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MetaAdsController.prototype, "manualSpend", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Delete)('spend/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MetaAdsController.prototype, "deleteSpend", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('diagnose'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MetaAdsController.prototype, "diagnose", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('disconnect'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MetaAdsController.prototype, "disconnect", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('expenses'),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MetaAdsController.prototype, "getExpenses", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('expenses'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MetaAdsController.prototype, "addExpense", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Delete)('expenses/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MetaAdsController.prototype, "deleteExpense", null);
MetaAdsController = __decorate([
    (0, common_1.Controller)('meta-ads'),
    __metadata("design:paramtypes", [meta_ads_service_1.MetaAdsService])
], MetaAdsController);
exports.MetaAdsController = MetaAdsController;
//# sourceMappingURL=meta-ads.controller.js.map