import axios from "axios";
import { Stack } from "expo-router";
import React, { useEffect, useRef } from "react";
import { Alert } from "react-native";

export default function RootLayout() {
  const lastAlertTimeRef = useRef<number>(0);

  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const isNetworkError = !error.response && (error.code === 'ECONNABORTED' || error.message === 'Network Error' || error.request);
        if (isNetworkError) {
          const now = Date.now();
          if (now - lastAlertTimeRef.current > 5000) {
            lastAlertTimeRef.current = now;
            Alert.alert(
              "Impossible de joindre le serveur. Vérifiez votre connexion internet.",
            );
          }
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.response.eject(interceptorId);
    };
  }, []);
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: 'white',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        animation: 'slide_from_right',
        presentation: 'card',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="admin"
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="login"
        options={{
          title: 'Connexion',
          headerTitle: '',
          headerTransparent: true,
        }}
      />
      <Stack.Screen
        name="home"
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="inscription"
        options={{
          title: 'Inscription',
          headerTitle: '',
          headerTransparent: true,
        }}
      />
      <Stack.Screen
        name="profile"
        options={{
          title: 'Profil',
          headerStyle: {
            backgroundColor: '#f4f4f8',
          },
          headerTintColor: '#07393C',
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="inscription-mototaximan"
        options={{
          title: 'Devenir Mototaximan',
          headerTitle: '',
          headerTransparent: true,
        }}
      />
      <Stack.Screen
        name="forgotPassword"
        options={{
          title: 'Mot de Passe Oublié',
          headerTitle: '',
          headerTransparent: true,
        }}
      />
      <Stack.Screen
        name="driver"
        options={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
    </Stack>
  );
}
