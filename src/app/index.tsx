import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import getEnvVars from '../config/environment';

export default function Index() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (token) {
          // Vérifier si le token est valide en appelant l'API
          const { API_URL } = getEnvVars();
          const response = await fetch(`${API_URL}/api/verify-token`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (response.ok) {
            // Vérifier le rôle pour rediriger vers la bonne page
            const userRole = await AsyncStorage.getItem('userRole');
            if (userRole === 'mototaximan') {
              router.replace('/driver');
            } else if (userRole === 'admin') {
              router.replace('/admin');
            } else {
              router.replace('/home');
            }
          } else {
            // Si le token n'est pas valide, le supprimer et rediriger vers login
            await AsyncStorage.removeItem('userToken');
            await AsyncStorage.removeItem('userRole');
            router.replace('/login');
          }
        } else {
          router.replace('/login');
        }
      } catch (e) {
        console.error('Failed to verify authentication:', e);
        // En cas d'erreur, rediriger vers login par sécurité
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('userRole');
        router.replace('/login');
      } finally {
        setLoading(false);
      }
    };

    checkToken();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return null; 
}