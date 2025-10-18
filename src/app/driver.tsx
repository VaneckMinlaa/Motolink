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
      console.log('Nouvelle demande de course reçue:', data);
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
        const token = await AsyncStorage.getItem('userToken');
        if (!token) {
          console.log('No token found, redirecting to login');
          router.replace('/login');
          return;
        }

        console.log('Loading mototaxi ID from API...');
        const { API_URL } = getEnvVars();
        const response = await fetch(`${API_URL}/api/user`, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const userData = await response.json();
          console.log('User data loaded:', userData);
          
          // Stocker l'userId pour usage futur
          await AsyncStorage.setItem('userId', String(userData.id));
          
          // Appel API au backend pour obtenir le mototaximan.id depuis utilisateurs.id
          try {
            const mototaxiResponse = await fetch(`${API_URL}/api/mototaxi/id/${userData.id}`, {
              headers: { 
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });
            
            console.log('Mototaxi response status:', mototaxiResponse.status);
            
            if (mototaxiResponse.ok) {
              const mototaxiData = await mototaxiResponse.json();
              console.log('Mototaxi data received:', mototaxiData);
              
              if (mototaxiData.mototaxiId) {
                setMototaxiActualId(String(mototaxiData.mototaxiId));
                console.log('Mototaxi ID set:', mototaxiData.mototaxiId);
              } else {
                console.warn('No mototaxiId in response, using userId as fallback');
                setMototaxiActualId(String(userData.id));
              }
            } else {
              console.error('Mototaxi API error:', mototaxiResponse.status, mototaxiResponse.statusText);
              // Fallback: utiliser l'userId comme mototaxiId
              setMototaxiActualId(String(userData.id));
            }
          } catch (apiError) {
            console.error('Error calling mototaxi API:', apiError);
            // Fallback: utiliser l'userId comme mototaxiId
            setMototaxiActualId(String(userData.id));
          }
        } else {
          console.error('Failed to load user data:', response.status);
          // Fallback: utiliser des données par défaut pour permettre le test
          setMototaxiActualId('demo_mototaxi_id');
        }
      } catch (e) {
        console.error('Erreur lors de la récupération de mototaxiActualId:', e);
        // Fallback: utiliser des données par défaut pour permettre le test
        setMototaxiActualId('demo_mototaxi_id');
      }
    };
    getMototaxiId();
  }, []);

  useEffect(() => {
    // Suppression de la logique de mockClients
  }, []); // Vide car la logique est gérée par les websockets

  const toggleAvailability = async (value: boolean) => {
    console.log('Toggling availability to:', value);
    setIsAvailable(value);
    try {
      const { API_URL } = getEnvVars();
      const token = await AsyncStorage.getItem('userToken');
      // À implémenter : mise à jour du statut dans la base de données
      // await axios.post(`${API_URL}/driver/availability`, { isAvailable: value }, {
      //   headers: { Authorization: `Bearer ${token}` }
      // });
      
      // Pour le moment, juste logger le changement
      console.log('Availability changed to:', value ? 'Available' : 'Unavailable');
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
    // Désactiver automatiquement la disponibilité
    setIsAvailable(false);
    console.log('Disponibilité désactivée après acceptation de course');
    Alert.alert('Course acceptée', `Vous avez accepté la course de ${rideRequest.clientName}. Votre disponibilité a été désactivée.`);
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
    // Note: On ne désactive pas la disponibilité lors du refus pour permettre d'autres demandes
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
    // Réactiver la disponibilité à la fin de la course
    setIsAvailable(true);
    console.log('Disponibilité réactivée après fin de course');
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
          </View>
          <MapView
            style={styles.map}
            region={(() => {
              // Si une course est acceptée, centrer sur la position du client
              if (currentRide && currentRide.status === 'accepted') {
                return {
                  latitude: currentRide.pickup.latitude,
                  longitude: currentRide.pickup.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                };
              }
              
              // Si une course est en cours, centrer sur la destination
              if (currentRide && currentRide.status === 'in_progress') {
                return {
                  latitude: currentRide.destination.latitude,
                  longitude: currentRide.destination.longitude,
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                };
              }
              
              // Par défaut, centrer sur la position du mototaximan
              return {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              };
            })()}
            showsUserLocation={!currentRide} // Ne pas montrer la position GPS si une course est active
            showsMyLocationButton={!currentRide}
            followsUserLocation={!currentRide}
            loadingEnabled={true}
            showsCompass={true}
          >
            {/* Marqueur pour le mototaximan - seulement si pas de course active */}
            {!currentRide && (
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
            )}

            {/* Marqueur pour la demande de course */}
            {isAvailable && rideRequest && !currentRide && (
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

            {/* Marqueurs pour la course acceptée */}
            {currentRide && currentRide.status === 'accepted' && (
              <>
                <Marker
                  coordinate={currentRide.pickup}
                  title="Position du client"
                >
                  <View style={styles.clientMarkerContainer}>
                    <MaterialIcons name="person-pin" size={24} color="#4CAF50" />
                  </View>
                </Marker>
                <Marker
                  coordinate={currentRide.destination}
                  title="Destination"
                >
                  <View style={styles.destinationMarkerContainer}>
                    <MaterialIcons name="place" size={24} color="#FF5722" />
                  </View>
                </Marker>
              </>
            )}

            {/* Marqueurs pour la course en cours */}
            {currentRide && currentRide.status === 'in_progress' && (
              <>
                <Marker
                  coordinate={currentRide.destination}
                  title="Destination"
                >
                  <View style={styles.destinationMarkerContainer}>
                    <MaterialIcons name="place" size={24} color="#FF5722" />
                  </View>
                </Marker>
              </>
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

          {/* Debug info */}
          <View style={styles.debugInfo}>
            <Text style={styles.debugText}>Debug: Mototaxi ID: {mototaxiActualId || 'Non défini'}</Text>
            <Text style={styles.debugText}>Disponible: {isAvailable ? 'Oui' : 'Non'}</Text>
            <Text style={styles.debugText}>Demande en attente: {rideRequest ? 'Oui' : 'Non'}</Text>
            <Text style={styles.debugText}>Course en cours: {currentRide ? `${currentRide.status}` : 'Non'}</Text>
            <Text style={styles.debugText}>API URL: {getEnvVars().API_URL}</Text>
          </View>

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
  destinationMarkerContainer: {
    backgroundColor: '#fff',
    padding: 5,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#FF5722',
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
  debugInfo: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    padding: 10,
    zIndex: 5,
  },
  debugText: {
    color: 'white',
    fontSize: 12,
    marginBottom: 2,
  },
});