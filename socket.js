let io;

const init = (server) => {
  const { Server } = require('socket.io');
  io = new Server(server, {
    cors: {
      origin: "*", // Adjust as needed for production
      methods: ["GET", "POST"]
    }
  });

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Join a room based on restaurantId
    socket.on('join', (restaurantId) => {
      if (restaurantId) {
        socket.join(restaurantId);
        console.log(`Socket ${socket.id} joined room: ${restaurantId}`);
      }
    });

    socket.on('disconnect', () => {
      console.log('User disconnected');
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

// Helper to emit and save notification
const sendNotification = async (restaurantId, data) => {
  try {
    const Notification = require('./models/Notification');
    
    // Save to DB
    const notification = new Notification({
      restaurantId,
      type: data.type,
      title: data.title,
      message: data.message,
      orderId: data.orderId
    });
    await notification.save();

    // Emit to room
    if (io) {
      io.to(restaurantId.toString()).emit('notification', notification);
      console.log(`Notification sent to room ${restaurantId}: ${data.title}`);
    }
  } catch (error) {
    console.error('Error sending notification:', error);
  }
};

module.exports = { init, getIO, sendNotification };
