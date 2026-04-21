import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
} from '@nestjs/common';

@Injectable()
export class MongoIdValidationPipe implements PipeTransform {
  transform(value: string, metadata: ArgumentMetadata) {
    if (value && value.length === 24) {
      return value;
    } else {
      throw new BadRequestException(`"${value}" is an invalid _id`);
    }
  }
}

@Injectable()
export class MongoMultiIdValidationPipe implements PipeTransform {
  transform(values: string[], metadata: ArgumentMetadata) {
    if (values.length) {
      let isValid;
      for (let i = 0; i <= values.length; i++) {
        const value = values[i];
        if (value && value.length === 24) {
          isValid = true;
        } else {
          isValid = false;
          break;
        }
      }

      if (isValid) {
        return values;
      } else {
        throw new BadRequestException(`Some Id is an invalid _id`);
      }
    }
  }
}
