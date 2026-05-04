import type { Request } from "express";
import { FeatureService } from "./feature.service";
export declare class FeaturesController {
    private readonly features;
    constructor(features: FeatureService);
    me(req: Request & {
        user: {
            id: string;
        };
    }): Promise<Record<string, string | number | boolean>>;
    patchMe(body: unknown, req: Request & {
        user: {
            id: string;
        };
    }): Promise<Record<string, string | number | boolean>>;
}
