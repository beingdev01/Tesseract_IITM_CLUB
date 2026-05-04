export declare const IITM_DOMAINS: readonly ["ds.study.iitm.ac.in", "es.study.iitm.ac.in"];
export type IitmBranch = 'Data Science' | 'Electronic Systems';
export declare function isIitmEmail(email: string): boolean;
export declare function getBranchFromEmail(email: string): IitmBranch | null;
