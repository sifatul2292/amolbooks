import { PaginationDto } from './pagination.dto';
export declare class ShippingChargeRuleDto {
    fromGram: number;
    toGram: number;
    cost: number;
}
export declare class AddShippingChargeDto {
    deliveryInDhaka: number;
    deliveryOutsideDhaka: number;
    deliveryOutsideBD: number;
    insideDhakaRules: ShippingChargeRuleDto[];
    outsideDhakaRules: ShippingChargeRuleDto[];
}
export declare class FilterShippingChargeDto {
    name: string;
    visibility: boolean;
    quantity: number;
    price: number;
}
export declare class OptionShippingChargeDto {
    deleteMany: boolean;
}
export declare class UpdateShippingChargeDto {
    deliveryInDhaka: number;
    deliveryOutsideDhaka: number;
    deliveryOutsideBD: number;
    ids: string[];
}
export declare class FilterAndPaginationShippingChargeDto {
    filter: FilterShippingChargeDto;
    pagination: PaginationDto;
    sort: object;
    select: any;
}
