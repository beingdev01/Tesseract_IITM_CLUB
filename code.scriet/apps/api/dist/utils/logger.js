class Logger {
    formatLog(entry) {
        const contextStr = entry.context ? ` ${JSON.stringify(entry.context)}` : '';
        return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${contextStr}`;
    }
    log(level, message, context) {
        const entry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            context,
        };
        const formattedLog = this.formatLog(entry);
        switch (level) {
            case 'error':
                console.error(formattedLog);
                break;
            case 'warn':
                console.warn(formattedLog);
                break;
            case 'debug':
                if (process.env.NODE_ENV !== 'production') {
                    console.debug(formattedLog);
                }
                break;
            default:
                console.info(formattedLog);
        }
    }
    debug(message, context) {
        this.log('debug', message, context);
    }
    info(message, context) {
        this.log('info', message, context);
    }
    warn(message, context) {
        this.log('warn', message, context);
    }
    error(message, context) {
        this.log('error', message, context);
    }
    // Log HTTP request
    request(req, res, duration) {
        const context = {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            duration: `${duration}ms`,
            ip: req.ip,
            userAgent: req.get('user-agent'),
        };
        const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
        this.log(level, `${req.method} ${req.originalUrl}`, context);
    }
}
export const logger = new Logger();
// Request logging middleware
export const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.request(req, res, duration);
    });
    next();
};
