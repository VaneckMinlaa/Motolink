import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import getEnvVars from '../config/environment';
import { useWebSocket } from '../hooks/useWebSocket';

interface RideRequestData {
  courseId: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  pickup: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
  pickupLabel: string;
  destinationLabel: string;
  estimate: { distanceKm: number; durationMin: number };
}

export default function Driver() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [isAvailable, setIsAvailable] = useState(false);
  const [rideRequest, setRideRequest] = useState<RideRequestData | null>(null);
  const [currentRide, setCurrentRide] = useState<RideRequestData & { status: 'accepted' | 'in_progress' } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [mototaxiActualId, setMototaxiActualId] = useState<string | null>(null);
  const { sendMessage, updateLocation } = useWebSocket({
    onNewRequest: (data: RideRequestData) => {
      if (!rideRequest && !currentRide) { // Seulement si aucune course n'est déjà en attente/cours
        setRideRequest(data);
        Alert.alert(
          'Nouvelle demande de course',
          `De: ${data.clientName} (${data.clientPhone})
De: ${data.pickupLabel}
À: ${data.destinationLabel}
Distance: ${data.estimate.distanceKm.toFixed(2)} km
Durée: ${Math.round(data.estimate.durationMin)} min`
        );
      } else {
        console.log('Demande de course ignorée: déjà une course en attente/cours.');
        // Optionnel: envoyer un message au client pour l'informer que le mototaximan est occupé
      }
    },
    onRideCancelled: (data: { courseId: string; mototaxiId: string }) => {
      if (currentRide && currentRide.courseId === data.courseId) {
        Alert.alert('Course Annulée', 'Le client a annulé la course.');
        setCurrentRide(null);
      } else if (rideRequest && rideRequest.courseId === data.courseId) {
        Alert.alert('Demande Annulée', 'Le client a annulé la demande de course.');
        setRideRequest(null);
      }
    },
  });

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const setupLocation = async () => {
      try {
        // Demander les permissions de localisation
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission de localisation refusée');
          return;
        }

        // Activer le GPS si nécessaire
        const providerStatus = await Location.getProviderStatusAsync();
        if (!providerStatus.locationServicesEnabled) {
          setErrorMsg('Veuillez activer la localisation sur votre appareil');
          return;
        }

        // Obtenir la position initiale
        const initialLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced
        });
        
        if (initialLocation) {
          setLocation(initialLocation);
          console.log('Position initiale:', initialLocation.coords);
        }

        // Mettre en place le suivi en temps réel
        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000, // Mise à jour toutes les 5 secondes
            distanceInterval: 10 // Mise à jour tous les 10 mètres
          },
          (newLocation) => {
            console.log('Nouvelle position:', newLocation.coords);
            setLocation(newLocation);
          }
        );

        // Rien à retourner ici; le cleanup sera géré par le useEffect ci-dessous
      } catch (error) {
        console.error('Erreur de géolocalisation:', error);
        setErrorMsg('Erreur lors de l\'activation de la géolocalisation');
      }
    };
    setupLocation();
    return () => {
      try { subscription && subscription.remove(); } catch {}
    };
  }, []);

  // Envoyer la position via WebSocket en utilisant l'identité utilisateur (utilisateurs.id)
  useEffect(() => {
    if (location) {
      updateLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    }
  }, [location]);

  // Récupérer l'ID réel du mototaximan depuis la base de données
  useEffect(() => {
    const getMototaxiId = async () => {
      try {
        const userId = await AsyncStorage.getItem('userId'); // Supposons que l'userId est stocké
        if (userId) {
          // Appel API au backend pour obtenir le mototaximan.id depuis utilisateurs.id
          const token = await AsyncStorage.getItem('userToken');
          const { API_URL } = getEnvVars();
          const response = await fetch(`${API_URL}/api/mototaxi/id/${userId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await response.json();
          if (response.ok && data.mototaxiId) {
            setMototaxiActualId(String(data.mototaxiId));
          } else {
            console.error('Impossible de récupérer le mototaximan ID:', data.message);
          }
        }
      } catch (e) {
        console.error('Erreur lors de la récupération de mototaxiActualId:', e);
      }
    };
    getMototaxiId();
  }, []);

  useEffect(() => {
    // Suppression de la logique de mockClients
  }, []); // Vide car la logique est gérée par les websockets

  const toggleAvailability = async (value: boolean) => {
    setIsAvailable(value);
    try {
      const { API_URL } = getEnvVars();
      const token = await AsyncStorage.getItem('userToken');
      // À implémenter : mise à jour du statut dans la base de données
      // await axios.post(`${API_URL}/driver/availability`, { isAvailable: value }, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour votre statut');
    }
  };

  const handleAcceptRequest = () => {
    if (!rideRequest || !mototaxiActualId) return;
    sendMessage({
      type: 'accept_ride',
      courseId: rideRequest.courseId,
      clientId: rideRequest.clientId,
      mototaxiId: mototaxiActualId,
    });
    setCurrentRide({ ...rideRequest, status: 'accepted' });
    setRideRequest(null);
    Alert.alert('Course acceptée', `Vous avez accepté la course de ${rideRequest.clientName}.`);
  };

  const handleRejectRequest = () => {
    if (!rideRequest || !mototaxiActualId) return;
    sendMessage({
      type: 'cancel_ride', // Le mototaximan annule la demande
      courseId: rideRequest.courseId,
      clientId: rideRequest.clientId,
      mototaxiId: mototaxiActualId,
    });
    setRideRequest(null);
    Alert.alert('Demande refusée', `Vous avez refusé la demande de course de ${rideRequest.clientName}.`);
  };

  const handleStartRide = () => {
    if (!currentRide || !mototaxiActualId) return;
    sendMessage({
      type: 'start_ride',
      courseId: currentRide.courseId,
      clientId: currentRide.clientId,
      mototaxiId: mototaxiActualId,
    });
    setCurrentRide(prev => prev ? { ...prev, status: 'in_progress' } : null);
    Alert.alert('Course démarrée', 'Le trajet a commencé.');
  };

  const handleFinishRide = () => {
    if (!currentRide || !mototaxiActualId) return;
    sendMessage({
      type: 'finish_ride',
      courseId: currentRide.courseId,
      clientId: currentRide.clientId,
      mototaxiId: mototaxiActualId,
    });
    Alert.alert('Course terminée', 'Le trajet est terminé. Merci !');
    setCurrentRide(null);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userRole');
      router.replace('/login');
    } catch (e) {
      console.error('Failed to remove the token from storage', e);
    }
  };

  if (errorMsg) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {location && (
        <View style={styles.mapContainer}>
          <View style={styles.availabilityContainerOverlay}>
            <View style={styles.availabilityContent}>
              <Text style={styles.availabilityText}>
                {isAvailable ? 'Disponible' : 'Indisponible'}
              </Text>
              <Switch
                value={isAvailable}
                onValueChange={toggleAvailability}
                trackColor={{ false: '#767577', true: '#81b0ff' }}
                thumbColor={isAvailable ? '#07393C' : '#f4f3f4'}
              />
            </View>
            <TouchableOpacity 
              style={styles.profileButton} 
              onPress={() => router.push('/profile')}
            >
              <FontAwesome name="user" size={24} color="#07393C" />
            </TouchableOpacity>
          </View>
          <MapView
            style={styles.map}
            region={{
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
              latitudeDelta: 0.005,
              longitudeDelta: 0.005,
            }}
            showsUserLocation={true}
            showsMyLocationButton={true}
            followsUserLocation={true}
            loadingEnabled={true}
            showsCompass={true}
          >
            {/* Marqueur pour le mototaximan */}
            <Marker
              coordinate={{
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }}
              title="Ma position"
            >
              <View style={styles.markerContainer}>
                <MaterialIcons name="motorcycle" size={24} color="#07393C" />
              </View>
            </Marker>

            {/* Marqueurs pour les clients */}
            {isAvailable && rideRequest && (
              <Marker
                coordinate={rideRequest.pickup}
                title="Demande de course"
                onPress={handleAcceptRequest}
              >
                <View style={styles.clientMarkerContainer}>
                  <MaterialIcons name="person-pin" size={24} color="#FF6B6B" />
                </View>
              </Marker>
            )}
            {currentRide && (
              <Marker
                coordinate={currentRide.pickup}
                title="Course en cours"
                onPress={() => {/* No action for now */}}
              >
                <View style={styles.clientMarkerContainer}>
                  <MaterialIcons name="directions-car" size={24} color="#007BFF" />
                </View>
              </Marker>
            )}
            {currentRide?.destination && (
              <Marker coordinate={currentRide.destination} title="Destination" pinColor="#07393C" />
            )}
          </MapView>
          {rideRequest && (
            <View style={styles.rideRequestCard}>
              <Text style={styles.requestTitle}>Nouvelle Demande de Course</Text>
              <Text style={styles.requestText}><Text style={{ fontWeight: 'bold' }}>Client:</Text> {rideRequest.clientName} ({rideRequest.clientPhone})</Text>
              <Text style={styles.requestText}><Text style={{ fontWeight: 'bold' }}>De:</Text> {rideRequest.pickupLabel}</Text>
              <Text style={styles.requestText}><Text style={{ fontWeight: 'bold' }}>À:</Text> {rideRequest.destinationLabel}</Text>
              <Text style={styles.requestText}><Text style={{ fontWeight: 'bold' }}>Distance:</Text> {rideRequest.estimate.distanceKm.toFixed(2)} km</Text>
              <Text style={styles.requestText}><Text style={{ fontWeight: 'bold' }}>Durée:</Text> {Math.round(rideRequest.estimate.durationMin)} min</Text>
              <View style={styles.requestButtons}>
                <TouchableOpacity style={[styles.button, styles.acceptButton]} onPress={handleAcceptRequest}>
                  <Text style={styles.buttonText}>Accepter</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.rejectButton]} onPress={handleRejectRequest}>
                  <Text style={styles.buttonText}>Refuser</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {currentRide && currentRide.status === 'accepted' && (
            <View style={styles.rideControlCard}>
              <Text style={styles.rideControlTitle}>Course acceptée avec {currentRide.clientName}</Text>
              <Text style={styles.rideControlText}>Prise en charge à: {currentRide.pickupLabel}</Text>
              <Text style={styles.rideControlText}>Destination: {currentRide.destinationLabel}</Text>
              <TouchableOpacity style={[styles.button, styles.startButton]} onPress={handleStartRide}>
                <Text style={styles.buttonText}>Démarrer la course</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.cancelRideButton]} onPress={handleRejectRequest}> {/* Utiliser reject pour annuler avant le départ */}
                <Text style={styles.buttonText}>Annuler la course</Text>
              </TouchableOpacity>
            </View>
          )}

          {currentRide && currentRide.status === 'in_progress' && (
            <View style={styles.rideControlCard}>
              <Text style={styles.rideControlTitle}>Course en cours avec {currentRide.clientName}</Text>
              <Text style={styles.rideControlText}>Vers: {currentRide.destinationLabel}</Text>
              <TouchableOpacity style={[styles.button, styles.finishButton]} onPress={handleFinishRide}>
                <Text style={styles.buttonText}>Terminer la course</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.cancelRideButton]} onPress={handleRejectRequest}> {/* Utiliser reject pour annuler avant le départ */}
                <Text style={styles.buttonText}>Annuler la course</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity 
            style={styles.logoutButton} 
            onPress={handleLogout}
          >
            <Text style={styles.logoutButtonText}>Déconnexion</Text>
          </TouchableOpacity>

        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  availabilityContainerOverlay: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 1,
  },
  availabilityContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  markerContainer: {
    backgroundColor: '#fff',
    padding: 5,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#07393C',
  },
  clientMarkerContainer: {
    backgroundColor: '#fff',
    padding: 5,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 5,
    borderRadius: 20,
  },
  availabilityText: {
    marginRight: 10,
    fontSize: 14,
    color: '#07393C',
  },
  logoutButton: {
    backgroundColor: '#07393C',
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 15,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
    textAlign: 'center',
    marginTop: 20,
  },
  rideRequestCard: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 10,
  },
  requestTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#07393C',
  },
  requestText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  requestButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 5,
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  startButton: {
    backgroundColor: '#2196F3',
  },
  finishButton: {
    backgroundColor: '#07393C',
  },
  cancelRideButton: {
    backgroundColor: '#F44336',
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  rideControlCard: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 10,
  },
  rideControlTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
    color: '#07393C',
  },
  rideControlText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
});