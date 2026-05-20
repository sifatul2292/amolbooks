import { NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { Model } from 'mongoose';
import { RedirectUrl } from '../interfaces/common/redirect-url.interface';
export declare class RedirectUrlMiddleware implements NestMiddleware {
    private readonly redirectUrlModel;
    private cache;
    private lastFetched;
    private readonly TTL;
    private inflight;
    constructor(redirectUrlModel: Model<RedirectUrl>);
    private getRedirects;
    use(req: Request, res: Response, next: NextFunction): Promise<void>;
}
