const Log = require('../models/Log');

const errorLogger = async (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  
  try {
    await Log.create({
      type: 'error',
      message: err.message || 'Internal Server Error',
      details: {
        stack: err.stack,
        body: req.body,
        query: req.query,
        params: req.params
      },
      restaurantId: req.restaurantId || null,
      ip: req.ip || req.headers['x-forwarded-for'],
      userAgent: req.get('user-agent'),
      path: req.path,
      method: req.method,
      statusCode: statusCode
    });
  } catch (logError) {
    console.error('Error logging to database:', logError);
  }

  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = errorLogger;
