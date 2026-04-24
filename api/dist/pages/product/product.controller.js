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
var ProductController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductController = void 0;
const common_1 = require("@nestjs/common");
const admin_roles_decorator_1 = require("../../decorator/admin-roles.decorator");
const admin_roles_enum_1 = require("../../enum/admin-roles.enum");
const admin_roles_guard_1 = require("../../guards/admin-roles.guard");
const admin_permissions_decorator_1 = require("../../decorator/admin-permissions.decorator");
const admin_permission_enum_1 = require("../../enum/admin-permission.enum");
const admin_permission_guard_1 = require("../../guards/admin-permission.guard");
const admin_jwt_auth_guard_1 = require("../../guards/admin-jwt-auth.guard");
const product_service_1 = require("./product.service");
const product_dto_1 = require("../../dto/product.dto");
const mongo_id_validation_pipe_1 = require("../../pipes/mongo-id-validation.pipe");
let ProductController = ProductController_1 = class ProductController {
    constructor(productService) {
        this.productService = productService;
        this.logger = new common_1.Logger(ProductController_1.name);
    }
    async getAllTagForUi(query) {
        return await this.productService.getAllProductForUi(query);
    }
    async addProduct(addProductDto) {
        return await this.productService.addProduct(addProductDto);
    }
    async cloneSingleProduct(id) {
        return await this.productService.cloneSingleProduct(id);
    }
    async insertManyProduct(body) {
        return await this.productService.insertManyProduct(body.data, body.option);
    }
    async getAllProducts(filterProductDto, searchString) {
        return this.productService.getAllProducts(filterProductDto, searchString);
    }
    async getProductByIds(getProductByIdsDto, select) {
        return await this.productService.getProductByIds(getProductByIdsDto, select);
    }
    async getRelatedProductsByMultiCategoryId(body) {
        return await this.productService.getRelatedProductsByMultiCategoryId(body);
    }
    async getProductById(id, select) {
        return await this.productService.getProductById(id, select);
    }
    async getProductBySlug(slug, select) {
        return await this.productService.getProductBySlug(slug, select);
    }
    async updateProductById(id, updateProductDto) {
        return await this.productService.updateProductById(id, updateProductDto);
    }
    async updateMultipleProductById(updateProductDto) {
        return await this.productService.updateMultipleProductById(updateProductDto.ids, updateProductDto);
    }
    async deleteProductById(id) {
        return await this.productService.deleteProductById(id);
    }
    async deleteMultipleProductById(data) {
        return await this.productService.deleteMultipleProductById(data.ids);
    }
    async setProductQtyNotNull() {
        return await this.productService.setProductQtyNotNull();
    }
    async setProductImageHttpToHttps() {
        return await this.productService.setProductImageHttpToHttps();
    }
    async getBoughtTogetherProducts() {
        return await this.productService.getBoughtTogetherProducts();
    }
    async setBoughtTogetherProducts(body) {
        return await this.productService.setBoughtTogetherProducts(body.productIds);
    }
    async getBoughtTogetherByProduct(id) {
        return await this.productService.getBoughtTogetherByProduct(id);
    }
};
__decorate([
    (0, common_1.Get)('/get-all-data'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "getAllTagForUi", null);
__decorate([
    (0, common_1.Post)('/add'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN, admin_roles_enum_1.AdminRoles.EDITOR),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.CREATE),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [product_dto_1.AddProductDto]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "addProduct", null);
__decorate([
    (0, common_1.Post)('/clone'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN, admin_roles_enum_1.AdminRoles.EDITOR),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.CREATE),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Body)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "cloneSingleProduct", null);
__decorate([
    (0, common_1.Post)('/insert-many'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN, admin_roles_enum_1.AdminRoles.EDITOR),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.CREATE),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "insertManyProduct", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/get-all'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [product_dto_1.FilterAndPaginationProductDto, String]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "getAllProducts", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/get-products-by-ids'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [product_dto_1.GetProductByIdsDto, String]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "getProductByIds", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/get-related-products-by-category-ids'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "getRelatedProductsByMultiCategoryId", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/:id'),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "getProductById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/get-by-slug/:slug'),
    __param(0, (0, common_1.Param)('slug')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "getProductBySlug", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update/:id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN, admin_roles_enum_1.AdminRoles.EDITOR),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.EDIT),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, product_dto_1.UpdateProductDto]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "updateProductById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Put)('/update-multiple'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN, admin_roles_enum_1.AdminRoles.EDITOR),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.EDIT),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [product_dto_1.UpdateProductDto]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "updateMultipleProductById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Delete)('/delete/:id'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.DELETE),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Param)('id', mongo_id_validation_pipe_1.MongoIdValidationPipe)),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "deleteProductById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/delete-multiple'),
    (0, common_1.UsePipes)(common_1.ValidationPipe),
    (0, admin_roles_decorator_1.AdminMetaRoles)(admin_roles_enum_1.AdminRoles.SUPER_ADMIN),
    (0, common_1.UseGuards)(admin_roles_guard_1.AdminRolesGuard),
    (0, admin_permissions_decorator_1.AdminMetaPermissions)(admin_permission_enum_1.AdminPermissions.DELETE),
    (0, common_1.UseGuards)(admin_permission_guard_1.AdminPermissionGuard),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "deleteMultipleProductById", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/set-product-not-null'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "setProductQtyNotNull", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/set-product-image-https'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "setProductImageHttpToHttps", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/get-bought-together'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "getBoughtTogetherProducts", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Post)('/set-bought-together'),
    (0, common_1.UseGuards)(admin_jwt_auth_guard_1.AdminJwtAuthGuard),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "setBoughtTogetherProducts", null);
__decorate([
    (0, common_1.Version)(common_1.VERSION_NEUTRAL),
    (0, common_1.Get)('/get-bought-together-by-product/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProductController.prototype, "getBoughtTogetherByProduct", null);
ProductController = ProductController_1 = __decorate([
    (0, common_1.Controller)('product'),
    __metadata("design:paramtypes", [product_service_1.ProductService])
], ProductController);
exports.ProductController = ProductController;
//# sourceMappingURL=product.controller.js.map