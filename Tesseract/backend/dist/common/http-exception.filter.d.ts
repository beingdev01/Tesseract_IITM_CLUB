import { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
export declare class HttpErrorFilter implements ExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost): void;
}
