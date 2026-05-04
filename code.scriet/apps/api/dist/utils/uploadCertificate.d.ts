/**
 * Uploads a PDF buffer to Cloudinary as a raw file.
 * Returns the secure Cloudinary URL of the uploaded file.
 */
export declare function uploadCertificate(certId: string, pdfBuffer: Buffer): Promise<string>;
