"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardModule = void 0;
const common_1 = require("@nestjs/common");
const dashboard_service_1 = require("./dashboard.service");
const dashboard_controller_1 = require("./dashboard.controller");
const mongoose_1 = require("@nestjs/mongoose");
const user_schema_1 = require("../../schema/user.schema");
const admin_schema_1 = require("../../schema/admin.schema");
const product_schema_1 = require("../../schema/product.schema");
const order_schema_1 = require("../../schema/order.schema");
const manual_sale_schema_1 = require("../../schema/manual-sale.schema");
const axios_1 = require("@nestjs/axios");
const decision_dashboard_service_1 = require("./decision-dashboard.service");
const analytics_action_schema_1 = require("./schema/analytics-action.schema");
const meta_ad_spend_schema_1 = require("../meta-ads/schema/meta-ad-spend.schema");
let DashboardModule = class DashboardModule {
};
DashboardModule = __decorate([
    (0, common_1.Module)({
        imports: [
            axios_1.HttpModule,
            mongoose_1.MongooseModule.forFeature([
                { name: 'Admin', schema: admin_schema_1.AdminSchema },
                { name: 'User', schema: user_schema_1.UserSchema },
                { name: 'Product', schema: product_schema_1.ProductSchema },
                { name: 'Order', schema: order_schema_1.OrderSchema },
                { name: 'ManualSale', schema: manual_sale_schema_1.ManualSaleSchema },
                { name: 'MetaAdSpend', schema: meta_ad_spend_schema_1.MetaAdSpendSchema },
                { name: 'AnalyticsAction', schema: analytics_action_schema_1.AnalyticsActionSchema },
            ]),
        ],
        providers: [dashboard_service_1.DashboardService, decision_dashboard_service_1.DecisionDashboardService],
        controllers: [dashboard_controller_1.DashboardController],
    })
], DashboardModule);
exports.DashboardModule = DashboardModule;
//# sourceMappingURL=dashboard.module.js.map