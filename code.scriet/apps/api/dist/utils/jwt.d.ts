export interface AccessTokenPayload {
    userId: string;
    id: string;
    name?: string;
    email: string;
    role: string;
}
export interface OAuthExchangeCodePayload {
    userId: string;
    intent?: 'network';
    networkType?: 'professional' | 'alumni';
}
export interface InvitationClaimTokenPayload {
    invitationId: string;
    email: string;
}
export declare const getJwtSecret: () => string;
export declare const signAccessToken: (payload: AccessTokenPayload) => string;
export declare const signOAuthExchangeCode: (payload: OAuthExchangeCodePayload) => string;
export declare const signInvitationClaimToken: (payload: InvitationClaimTokenPayload) => string;
export declare const verifyOAuthExchangeCode: (code: string) => OAuthExchangeCodePayload;
export declare const verifyInvitationClaimToken: (token: string) => InvitationClaimTokenPayload;
export declare const verifyToken: (token: string) => AccessTokenPayload;
