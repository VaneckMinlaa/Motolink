import { Entypo, Feather, FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { jwtDecode } from 'jwt-decode';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import getEnvVars from '../config/environment';

const MenuItem = ({ icon, title, subtitle, onPress }: { icon: React.ReactNode, title: string, subtitle: string, onPress?: () => void }) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuIcon}>{icon}</View>
    <View style={styles.menuTextContainer}>
      <Text style={styles.menuTitle}>{title}</Text>
      <Text style={styles.menuSubtitle}>{subtitle}</Text>
    </View>
    <FontAwesome name="chevron-right" size={16} color="#ccc" />
  </TouchableOpacity>
);

export default function ProfileScreen() {
  const [userData, setUserData] = useState({
    nom_complet: '',
    email: '',
    numero_telephone: '',
    photo_url: null
  });

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          router.replace('/login');
          return;
        }

        const decoded = jwtDecode(token);
        const { API_URL } = getEnvVars();
        const response = await fetch(`${API_URL}/api/user`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUserData(data);
        } else {
          const error = await response.json();
          Alert.alert('Erreur', error.message);
          if (response.status === 401) {
            await AsyncStorage.removeItem('userToken');
            router.replace('/login');
          }
        }
      } catch (error) {
        Alert.alert('Erreur', 'Impossible de charger les informations de l\'utilisateur');
      }
    };

    loadUserData();
  }, []);

  const handleLogout = async () => {
    await AsyncStorage.removeItem('userToken');
    router.replace('/login');
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileSection}>
        <View style={styles.profileImageContainer}>
          {userData.photo_url ? (
            <Image
              source={{ uri: userData.photo_url }}
              style={styles.profileImage}
            />
          ) : (
            <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
              <Text style={styles.profileImagePlaceholderText}>
                {userData.nom_complet ? userData.nom_complet.charAt(0).toUpperCase() : '?'}
              </Text>
            </View>
          )}
          <TouchableOpacity style={styles.cameraIconContainer}>
            <Feather name="camera" size={16} color="white" />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{userData.nom_complet}</Text>
        <Text style={styles.userEmail}>{userData.email}</Text>
      </View>

      <View style={styles.menuWrapper}>
        <MenuItem icon={<MaterialIcons name="payment" size={24} color="#07393C" />} title="Modes de paiement" subtitle="Espèces" />
        </View>
        <View style={styles.menuWrapper}>
        <MenuItem icon={<FontAwesome name="history" size={24} color="#07393C" />} title="Historique" subtitle="Paiement" />
        <MenuItem icon={<Entypo name="location-pin" size={24} color="#07393C" />} title="Trajet" subtitle="Historique" />
      </View>

      <View style={styles.menuWrapper}>
        <MenuItem icon={<MaterialIcons name="feedback" size={24} color="#07393C" />} title="Evaluation et FeedBack" subtitle="Notation" />
        <MenuItem icon={<Ionicons name="headset" size={24} color="#07393C" />} title="Support Utilisateur" subtitle="Assistant" />
      </View>

      <View style={styles.menuWrapper}>
        <MenuItem icon={<Ionicons name="settings-sharp" size={24} color="#07393C" />} title="Paramètre" subtitle="Paiement" />
        <MenuItem icon={<FontAwesome name="info-circle" size={24} color="#07393C" />} title="Information" subtitle="Historique" />
      </View>
      
      <View style={styles.menuWrapper}>
        <MenuItem
          icon={<FontAwesome name="user-plus" size={24} color="#07393C" />}
          title="Devenir Chauffeur"
          subtitle="Mototximan"
          onPress={() => router.push('/inscription-mototaximan')}
        />
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Déconnexion</Text>
      </TouchableOpacity>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f4f4f8',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
  },
  profileSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  profileImageContainer: {
    position: 'relative',
    marginBottom: 10,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#07393C',
    padding: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#f4f4f8',
  },
  userName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#07393C',
  },
  menuWrapper: {
    backgroundColor: '#fff',
    borderRadius: 15,
    marginHorizontal: 20,
    marginBottom: 20,
    paddingVertical: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  menuIcon: {
    width: 40,
    alignItems: 'center',
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: 20,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#888',
  },
  logoutButton: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#ff4d4d',
    borderRadius: 15,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  profileImagePlaceholder: {
    backgroundColor: '#07393C',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImagePlaceholderText: {
    color: '#fff',
    fontSize: 40,
    fontWeight: 'bold',
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
});
