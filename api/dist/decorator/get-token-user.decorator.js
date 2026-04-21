"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GetTokenUser = void 0;
const common_1 = require("@nestjs/common");
exports.GetTokenUser = (0, common_1.createParamDecorator)((data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
});
//# sourceMappingURL=get-token-user.decorator.js.map