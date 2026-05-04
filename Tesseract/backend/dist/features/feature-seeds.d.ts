export type FlagCategory = "admin_gate" | "user_pref";
export type FlagValueType = "bool" | "int" | "string";
export type FeatureSeed = {
    key: string;
    displayName: string;
    description: string;
    category: FlagCategory;
    valueType: FlagValueType;
    defaultValue: boolean | number | string;
};
export declare const featureSeeds: FeatureSeed[];
