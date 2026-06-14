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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedirectUrlMiddleware = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const STATIC_EXT_RE = /\.(js|css|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|eot|json|map|txt|xml|pdf|mp4|mp3|zip)$/i;
let RedirectUrlMiddleware = class RedirectUrlMiddleware {
    constructor(redirectUrlModel) {
        this.redirectUrlModel = redirectUrlModel;
        this.cache = [];
        this.lastFetched = 0;
        this.TTL = 60000;
        this.inflight = null;
    }
    async getRedirects() {
        const now = Date.now();
        if (now - this.lastFetched < this.TTL && this.lastFetched > 0) {
            return this.cache;
        }
        if (this.inflight) {
            return this.inflight;
        }
        this.inflight = (async () => {
            try {
                const docs = await this.redirectUrlModel.find({}).lean();
                this.cache = docs
                    .filter((d) => d.fromUrl && d.toUrl)
                    .map((d) => {
                    const hasWildcard = d.fromUrl.endsWith('*');
                    const cleanFrom = d.fromUrl.replace(/\*$/, '');
                    let fromPath;
                    try {
                        fromPath = new URL(cleanFrom).pathname;
                    }
                    catch (_a) {
                        fromPath = cleanFrom.startsWith('/') ? cleanFrom : '/' + cleanFrom;
                    }
                    try {
                        fromPath = decodeURIComponent(fromPath);
                    }
                    catch (_b) { }
                    if (fromPath !== '/')
                        fromPath = fromPath.replace(/\/+$/, '');
                    return { fromPath, toUrl: d.toUrl, wildcard: hasWildcard };
                });
                console.log(`[RedirectMiddleware] loaded ${this.cache.length} rules from DB`);
                this.lastFetched = Date.now();
            }
            catch (err) {
                console.error('[RedirectMiddleware] DB fetch error:', err);
            }
            finally {
                this.inflight = null;
            }
            return this.cache;
        })();
        return this.inflight;
    }
    async use(req, res, next) {
        if (STATIC_EXT_RE.test(req.path) || req.path.startsWith('/upload/') || req.path.startsWith('/api/')) {
            return next();
        }
        try {
            const redirects = await this.getRedirects();
            let reqPath;
            try {
                reqPath = decodeURIComponent(req.path);
            }
            catch (_a) {
                reqPath = req.path;
            }
            const normalizedReqPath = reqPath === '/' ? '/' : reqPath.replace(/\/+$/, '');
            console.log(`[RedirectMiddleware] checking "${normalizedReqPath}" against ${redirects.length} rules`);
            for (const r of redirects) {
                const matches = r.wildcard
                    ? normalizedReqPath.startsWith(r.fromPath)
                    : normalizedReqPath === r.fromPath;
                if (matches) {
                    console.log(`[RedirectMiddleware] match: "${normalizedReqPath}" → ${r.toUrl}`);
                    return res.redirect(301, r.toUrl);
                }
            }
        }
        catch (err) {
            console.error('[RedirectMiddleware] error:', err);
        }
        return next();
    }
};
RedirectUrlMiddleware = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('RedirectUrl')),
    __metadata("design:paramtypes", [mongoose_2.Model])
], RedirectUrlMiddleware);
exports.RedirectUrlMiddleware = RedirectUrlMiddleware;
//# sourceMappingURL=redirect-url.middleware.js.map