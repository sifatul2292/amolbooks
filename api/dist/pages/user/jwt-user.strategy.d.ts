import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserJwtPayload } from '../../interfaces/user/user.interface';
declare const JwtUserStrategy_base: new (...args: any[]) => Strategy;
export declare class JwtUserStrategy extends JwtUserStrategy_base {
    private configService;
    constructor(configService: ConfigService);
    validate(payload: UserJwtPayload): Promise<{
        _id: string;
        username: string;
    }>;
}
export {};
