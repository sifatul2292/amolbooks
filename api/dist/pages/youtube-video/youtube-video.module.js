"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.YoutubeVideoModule = void 0;
const common_1 = require("@nestjs/common");
const youtube_video_service_1 = require("./youtube-video.service");
const youtube_video_controller_1 = require("./youtube-video.controller");
const mongoose_1 = require("@nestjs/mongoose");
const youtube_video_schema_1 = require("../../schema/youtube-video.schema");
const user_schema_1 = require("../../schema/user.schema");
let YoutubeVideoModule = class YoutubeVideoModule {
};
YoutubeVideoModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'YoutubeVideo', schema: youtube_video_schema_1.YoutubeVideoSchema },
                { name: 'User', schema: user_schema_1.UserSchema },
            ]),
        ],
        providers: [youtube_video_service_1.YoutubeVideoService],
        controllers: [youtube_video_controller_1.YoutubeVideoController],
    })
], YoutubeVideoModule);
exports.YoutubeVideoModule = YoutubeVideoModule;
//# sourceMappingURL=youtube-video.module.js.map