"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderStatus = void 0;
var OrderStatus;
(function (OrderStatus) {
    OrderStatus[OrderStatus["NONE"] = 0] = "NONE";
    OrderStatus[OrderStatus["PENDING"] = 1] = "PENDING";
    OrderStatus[OrderStatus["CONFIRM"] = 2] = "CONFIRM";
    OrderStatus[OrderStatus["PROCESSING"] = 3] = "PROCESSING";
    OrderStatus[OrderStatus["SHIPPING"] = 4] = "SHIPPING";
    OrderStatus[OrderStatus["DELIVERED"] = 5] = "DELIVERED";
    OrderStatus[OrderStatus["CANCEL"] = 6] = "CANCEL";
    OrderStatus[OrderStatus["REFUND"] = 7] = "REFUND";
    OrderStatus[OrderStatus["Courier"] = 8] = "Courier";
    OrderStatus[OrderStatus["RETURN"] = 9] = "RETURN";
    OrderStatus[OrderStatus["HOLD"] = 10] = "HOLD";
})(OrderStatus = exports.OrderStatus || (exports.OrderStatus = {}));
//# sourceMappingURL=order.enum.js.map