/**
 * Socket Broadcasting Manager for NodeFlow
 * Integrates Socket.io for real-time WebSocket events.
 */
class Socket {
  static io = null;

  /**
   * Bind Socket.io to HTTP Server
   * @param {object} server - Node HTTP Server instance
   */
  static init(server) {
    const { Server } = require('socket.io');
    this.io = new Server(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });

    this.io.on('connection', (socket) => {
      // Connect hook
      socket.on('disconnect', () => {
        // Disconnect hook
      });
    });

    return this.io;
  }

  /**
   * Broadcast an event to all connected clients
   * @param {string} event 
   * @param {object} payload 
   */
  static broadcast(event, payload = {}) {
    if (this.io) {
      this.io.emit(event, payload);
      return true;
    }
    return false;
  }
}

module.exports = Socket;
