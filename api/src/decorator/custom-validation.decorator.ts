import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';
import { UserRegTypes } from '../enum/user-reg-types.enum';

export function CheckUserRegType(validationOptions?: ValidationOptions) {
  return (object: any, propertyName: string) => {
    registerDecorator({
      name: 'CheckUserRegType',
      target: object.constructor,
      propertyName,
      constraints: [],
      options: validationOptions,
      validator: {
        validate(value: string, args: ValidationArguments) {
          const allowedTypes: string[] = [
            UserRegTypes.DEFAULT,
            UserRegTypes.PHONE_NUMBER,
            UserRegTypes.GOOGLE,
            UserRegTypes.FACEBOOK,
            UserRegTypes.EMAIL,
          ];
          const isStatusValid = (status: any) => {
            const index = allowedTypes.indexOf(status);
            return index !== -1;
          };
          return isStatusValid(value);
        },
      },
    });
  };
}
