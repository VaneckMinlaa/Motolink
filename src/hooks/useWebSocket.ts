import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import getEnvVars from '../config/environment';

interface WebSocketHookOptions {
  onMototaxiLocation?: (data: any) => void;
  onNewRequest?: (request: any) => void;
  onRideAccepted?: (data: any) => void;
  onRideStarted?: (data: any) => void;
  onRideFinished?: (data: any) => void;
  onRideCancelled?: (data: any) => void;
}

export function useWebSocket(options: WebSocketHookOptions) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { API_URL } = getEnvVars() as { API_URL?: string };
  const wsUrl: string | null = typeof API_URL === 'string' && API_URL.length > 0
    ? (API_URL.startsWith('https') ? API_URL.replace('https', 'wss') : API_URL.replace('http', 'ws'))
    : null;
  const currentUserId = useRef<string | null>(null);

  useEffect(() => {
    connectWebSocket();
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, []);

  const connectWebSocket = async () => {
    const token = await AsyncStorage.getItem('userToken');
    const userRole = (await AsyncStorage.getItem('userRole')) || 'client';

    if (!token) {
      console.error('No token found');
      return;
    }

    if (!wsUrl) {
      console.error('API_URL non défini: impossible d\'établir la connexion WebSocket');
      return;
    }
    ws.current = new WebSocket(`${wsUrl}?token=${token}`);

    ws.current.onopen = async () => {
      setIsConnected(true);
      // Récupérer l'ID utilisateur et envoyer l'authentification attendue par le serveur
      try {
        if (!API_URL) throw new Error('API_URL undefined');
        const res = await fetch(`${API_URL}/api/user`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const user = await res.json();
        if (ws.current) {
          currentUserId.current = String(user.id);
          ws.current.send(JSON.stringify({
            type: 'auth',
            userId: user.id,
            userType: userRole
          }));
        }
      } catch (e) {
        // Repli: utiliser userId stocké localement pour permettre au serveur d\'associer la connexion
        try {
          const fallbackUserId = await AsyncStorage.getItem('userId');
          if (fallbackUserId && ws.current) {
            currentUserId.current = fallbackUserId;
            ws.current.send(JSON.stringify({
              type: 'auth',
              userId: fallbackUserId,
              userType: userRole
            }));
          } else {
            console.error('Erreur récupération user pour WS auth:', e);
          }
        } catch (e2) {
          console.error('Erreur récupération userId local pour WS auth:', e2);
        }
      }
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      // Tentative de reconnexion après 5 secondes
      setTimeout(connectWebSocket, 5000);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'mototaxi_location':
          options.onMototaxiLocation?.(data);
          break;
        case 'new_request':
          options.onNewRequest?.(data);
          break;
        case 'ride_accepted':
          options.onRideAccepted?.(data);
          break;
        case 'ride_started':
          options.onRideStarted?.(data);
          break;
        case 'ride_finished':
          options.onRideFinished?.(data);
          break;
        case 'ride_cancelled':
          options.onRideCancelled?.(data);
          break;
      }
    };
  };

  const sendMessage = (data: any) => {
    if (ws.current && isConnected) {
      ws.current.send(JSON.stringify(data));
    }
  };

  const updateLocation = (location: { latitude: number; longitude: number }) => {
    sendMessage({
      type: 'location_update',
      userId: currentUserId.current,
      location,
    });
  };

  const acceptRide = (rideId: string, clientId: string) => {
    sendMessage({
      type: 'accept_ride',
      rideId,
      clientId
    });
  };

  return {
    isConnected,
    sendMessage,
    updateLocation,
    acceptRide
  };
}