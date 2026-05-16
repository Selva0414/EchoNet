import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useAuth } from './AuthContext';

interface SocketContextType {
  socket: Socket | null;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    registerForPushNotificationsAsync();
  }, []);

  useEffect(() => {
    if (user) {
      const socketUrl = process.env.EXPO_PUBLIC_SOCKET_URL || 'http://localhost:3001';
      const newSocket = io(socketUrl);

      newSocket.on('connect', () => {
        const cleanId = String(user.id).replace(/['"]+/g, '').trim();
        console.log('Socket connected:', newSocket.id, 'Joining room:', cleanId);
        newSocket.emit('join', cleanId);
      });

      newSocket.on('receive_message', async (message) => {
        try {
          // Show notification if not in background (simple check)
          await Notifications.scheduleNotificationAsync({
            content: {
              title: `Message from ${message.senderName || 'Contact'}`,
              body: message.type === 'text' ? message.content : `Sent a ${message.type}`,
              data: { senderId: message.senderId },
            },
            trigger: null,
          });
        } catch (error) {
          console.error('Notification error:', error);
        }
      });

      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    } else {
      setSocket(null);
    }
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket }}>
      {children}
    </SocketContext.Provider>
  );
}

async function registerForPushNotificationsAsync() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      return;
    }
  }
}

export function useSocket() {
  const context = useContext(SocketContext);
  return context;
}
