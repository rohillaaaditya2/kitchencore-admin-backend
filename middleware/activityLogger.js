const Log = require('../models/Log');

const activityLogger = async (req, res, next) => {
  const originalSend = res.send;
  
  res.send = function (data) {
    res.send = originalSend;
    
    // Only log certain methods or paths if needed, or log everything
    // For now, let's log failed requests (4xx, 5xx) and important activities
    if (res.statusCode >= 400 || req.method !== 'GET') {
      const logData = {
        type: res.statusCode >= 400 ? 'error' : 'activity',
        message: `${req.method} ${req.path} - ${res.statusCode}`,
        details: {
          body: req.method !== 'GET' ? req.body : undefined,
          query: req.query,
        },
        restaurantId: req.restaurantId || null,
        ip: req.ip || req.headers['x-forwarded-for'],
        userAgent: req.get('user-agent'),
        path: req.path,
        method: req.method,
        statusCode: res.statusCode
      };

      // Background log
      Log.create(logData).catch(err => console.error('Logging failed', err));
    }
    
    return originalSend.apply(res, arguments);
  };
  
  next();
};

module.exports = activityLogger;
