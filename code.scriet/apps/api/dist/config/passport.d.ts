import { PassportStatic } from 'passport';
export declare class InvalidDomainError extends Error {
    code: string;
    constructor(message?: string);
}
export declare function setupPassport(passport: PassportStatic): void;
