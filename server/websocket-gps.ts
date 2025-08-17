import WebSocket, { WebSocketServer } from 'ws';
import type { Server } from 'http';
import { DRIVER_LOCATIONS, updateDriverLocation } from './driver-storage';

export class GPSWebSocketServer {
  private wss: WebSocketServer;
  private clients: Set<WebSocket> = new Set();

  constructor(server: Server, path: string = '/gps-live') {
    // Create WebSocket server on distinct path to avoid Vite HMR conflicts
    this.wss = new WebSocketServer({ 
      server, 
      path 
    });

    console.log('🔴 GPS LIVE WEBSOCKET: Server started on /gps-live');

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('📡 GPS CLIENT CONNECTED');
      this.clients.add(ws);

      // Send current GPS data immediately when client connects
      this.sendCurrentGPSData(ws);

      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('📍 GPS LIVE RECEIVED:', message);

          if (message.type === 'gps_update') {
            // Update driver location instantly
            await updateDriverLocation(message.vehicleId, {
              lat: parseFloat(message.latitude),
              lng: parseFloat(message.longitude),
              speed: message.speed || 0,
              heading: message.heading || 0,
              driverName: message.driverName || 'Unknown'
            });

            // Broadcast to ALL connected clients instantly
            this.broadcastGPSUpdate(message);
          }
        } catch (error) {
          console.error('❌ GPS WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        console.log('📡 GPS CLIENT DISCONNECTED');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('❌ GPS WebSocket error:', error);
        this.clients.delete(ws);
      });
    });
  }

  private sendCurrentGPSData(ws: WebSocket) {
    if (ws.readyState === WebSocket.OPEN) {
      const currentData = Array.from(DRIVER_LOCATIONS.entries()).map(([id, data]) => ({
        vehicleId: id,
        latitude: data.lat,
        longitude: data.lng,
        speed: data.speed || 0,
        heading: data.heading || 0,
        driverName: data.driverName || `Driver ${id}`,
        timestamp: data.timestamp
      }));

      ws.send(JSON.stringify({
        type: 'initial_gps_data',
        drivers: currentData
      }));
    }
  }

  private broadcastGPSUpdate(message: any) {
    const broadcast = JSON.stringify({
      type: 'gps_live_update',
      vehicleId: message.vehicleId,
      latitude: message.latitude,
      longitude: message.longitude,
      speed: message.speed || 0,
      heading: message.heading || 0,
      driverName: message.driverName,
      timestamp: Date.now()
    });

    // Send to ALL connected clients instantly
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(broadcast);
      }
    });

    console.log(`📡 GPS BROADCAST: Sent to ${this.clients.size} clients`);
  }

  // Periodic broadcast of all GPS positions every second
  public startPeriodicBroadcast() {
    setInterval(() => {
      if (this.clients.size > 0) {
        const allGPSData = Array.from(DRIVER_LOCATIONS.entries()).map(([id, data]) => ({
          vehicleId: id,
          latitude: data.lat,
          longitude: data.lng,
          speed: data.speed || 0,
          heading: data.heading || 0,
          driverName: data.driverName || `Driver ${id}`,
          timestamp: data.timestamp
        }));

        const broadcast = JSON.stringify({
          type: 'all_gps_positions',
          drivers: allGPSData,
          timestamp: Date.now()
        });

        this.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(broadcast);
          }
        });

        console.log(`🔄 GPS LIVE: Broadcasting ${allGPSData.length} positions to ${this.clients.size} clients`);
      }
    }, 1000); // Every 1 second - LIVE!
  }
}