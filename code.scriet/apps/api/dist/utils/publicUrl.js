function trimTrailingSlash(value) {
    return value.replace(/\/+$/, '');
}
function ensureApiSuffix(baseUrl) {
    const trimmed = trimTrailingSlash(baseUrl);
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}
export function getPublicApiBaseUrl() {
    const explicitBaseUrl = process.env.API_BASE_URL || process.env.PUBLIC_API_BASE_URL;
    if (explicitBaseUrl) {
        return ensureApiSuffix(explicitBaseUrl);
    }
    const renderBaseUrl = process.env.RENDER_EXTERNAL_URL;
    if (renderBaseUrl) {
        return ensureApiSuffix(renderBaseUrl);
    }
    if (process.env.NODE_ENV !== 'production') {
        return `http://localhost:${process.env.PORT || 5001}/api`;
    }
    throw new Error('Missing public API base URL. Set API_BASE_URL or RENDER_EXTERNAL_URL for production certificate links.');
}
export function buildPublicCertificateDownloadUrl(certId) {
    return `${getPublicApiBaseUrl()}/certificates/verify/${certId}/download`;
}
