"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const core_1 = require("@nestjs/core");
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const app_module_1 = require("./app.module");
const env_1 = require("./config/env");
const feature_service_1 = require("./features/feature.service");
async function bootstrap() {
    (0, env_1.assertProductionSecrets)();
    const app = await core_1.NestFactory.create(app_module_1.AppModule, { cors: false });
    app.setGlobalPrefix(env_1.env.apiPrefix.replace(/^\//, ""));
    app.enableCors({
        origin: env_1.env.frontendOrigins,
        credentials: true,
        methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Authorization", "Content-Type", "Idempotency-Key", "x-skip-auth-refresh"]
    });
    app.use((0, cookie_parser_1.default)());
    await app.get(feature_service_1.FeatureService).ensureSeeded();
    await app.listen(env_1.env.port);
}
void bootstrap();
//# sourceMappingURL=main.js.map