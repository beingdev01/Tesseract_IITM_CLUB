// Tesseract is gated to IITM BS Degree students only. Branch is derived from
// the email subdomain — keep this list narrow because branch derivation
// depends on the exact subdomain.
export const IITM_DOMAINS = ['ds.study.iitm.ac.in', 'es.study.iitm.ac.in'];
export function isIitmEmail(email) {
    const domain = email.split('@')[1]?.trim().toLowerCase() ?? '';
    return IITM_DOMAINS.includes(domain);
}
export function getBranchFromEmail(email) {
    const domain = email.split('@')[1]?.trim().toLowerCase() ?? '';
    if (domain === 'ds.study.iitm.ac.in')
        return 'Data Science';
    if (domain === 'es.study.iitm.ac.in')
        return 'Electronic Systems';
    return null;
}
