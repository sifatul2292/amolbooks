"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckUserRegType = void 0;
const class_validator_1 = require("class-validator");
const user_reg_types_enum_1 = require("../enum/user-reg-types.enum");
function CheckUserRegType(validationOptions) {
    return (object, propertyName) => {
        (0, class_validator_1.registerDecorator)({
            name: 'CheckUserRegType',
            target: object.constructor,
            propertyName,
            constraints: [],
            options: validationOptions,
            validator: {
                validate(value, args) {
                    const allowedTypes = [
                        user_reg_types_enum_1.UserRegTypes.DEFAULT,
                        user_reg_types_enum_1.UserRegTypes.PHONE_NUMBER,
                        user_reg_types_enum_1.UserRegTypes.GOOGLE,
                        user_reg_types_enum_1.UserRegTypes.FACEBOOK,
                        user_reg_types_enum_1.UserRegTypes.EMAIL,
                    ];
                    const isStatusValid = (status) => {
                        const index = allowedTypes.indexOf(status);
                        return index !== -1;
                    };
                    return isStatusValid(value);
                },
            },
        });
    };
}
exports.CheckUserRegType = CheckUserRegType;
//# sourceMappingURL=custom-validation.decorator.js.map