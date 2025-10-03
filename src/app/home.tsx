import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Linking, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import BottomSheet from 'react-native-raw-bottom-sheet';
import getEnvVars from '../config/environment';
import { useWebSocket } from '../hooks/useWebSocket';

type Driver = {
  id: string;
  name: string;
  rating: number;
  location: { latitude: number; longitude: number };
};

type DriverLite = {
  id: string;
  name: string;
  phone: string | null;
  photoUrl: string | null;
  rating: number;
  badge?: string | null;
};

export default function Home() {
  const [currentLocation, setCurrentLocation] = useState<Location.LocationObject | null>(null);
  const [pickupLabel, setPickupLabel] = useState<string>('');
  const [destination, setDestination] = useState<string>('');
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driversLite, setDriversLite] = useState<DriverLite[]>([]);
  const [driversLoadError, setDriversLoadError] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [estimate, setEstimate] = useState<{ distanceKm: number; durationMin: number } | null>(null);
  const [suggestions, setSuggestions] = useState<Array<{ id: string; description: string; place_id?: string; coords?: { latitude: number; longitude: number } }>>([]);
  const [routeCoords, setRouteCoords] = useState<Array<{ latitude: number; longitude: number }>>([]);
  const { GOOGLE_MAPS_API_KEY, API_URL } = getEnvVars();
  const isGoogleEnabled = !!GOOGLE_MAPS_API_KEY 
    && !GOOGLE_MAPS_API_KEY.includes('YOUR_GOOGLE')
    && GOOGLE_MAPS_API_KEY !== 'TA_CLE_API_GOOGLE_ICI';
  const mapRef = useRef<MapView | null>(null);
  const [suggestionsCache, setSuggestionsCache] = useState<Record<string, Array<{ id: string; description: string; place_id?: string; coords?: { latitude: number; longitude: number } }>>>({});
  const bottomSheetRef = useRef<any>(null); // Utilisation de 'any' pour simplifier le typage de la référence du BottomSheet
  const [selectedDriver, setSelectedDriver] = useState<DriverLite | null>(null);
  const [rideStatus, setRideStatus] = useState<'idle' | 'pending' | 'accepted' | 'in_progress' | 'completed' | 'cancelled'>('idle');
  const [currentRide, setCurrentRide] = useState<{ courseId: string; mototaxiId: string; } | null>(null);
  const [clientName, setClientName] = useState<string | null>(null);
  const [clientPhone, setClientPhone] = useState<string | null>(null);
  const [clientUserId, setClientUserId] = useState<string | null>(null);
  const [showAllDrivers, setShowAllDrivers] = useState<boolean>(false);

  // WS: recevoir positions des mototaximen en temps réel
  const { sendMessage } = useWebSocket({
    onMototaxiLocation: (data: any) => {
      setDrivers(prev => {
        const exists = prev.find(d => d.id === String(data.mototaxiId));
        const updated: Driver = { id: String(data.mototaxiId), name: `Mototaxi ${data.mototaxiId}`, rating: 4.5, location: data.location };
        return exists ? prev.map(d => (d.id === updated.id ? updated : d)) : [...prev, updated];
      });
    },
    onRideAccepted: (data: any) => {
      Alert.alert('Course Acceptée', `Le mototaximan ${data.mototaxiId} a accepté votre course.`);
      setRideStatus('accepted');
      setCurrentRide({ courseId: data.courseId, mototaxiId: data.mototaxiId });
      bottomSheetRef.current?.close(); // Fermer le BottomSheet de proposition
    },
    onRideStarted: (data: any) => {
      Alert.alert('Course Démarrée', `Votre course avec le mototaximan ${data.mototaxiId} a démarré.`);
      setRideStatus('in_progress');
    },
    onRideFinished: (data: any) => {
      Alert.alert('Course Terminée', `Votre course avec le mototaximan ${data.mototaxiId} est terminée. Merci de laisser une note.`);
      setRideStatus('completed');
      // Afficher l'interface de notation
    },
    onRideCancelled: (data: any) => {
      Alert.alert('Course Annulée', `La course a été annulée par le mototaximan ${data.mototaxiId}.`);
      setRideStatus('idle');
      setCurrentRide(null);
    },
  });

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    const initializeLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setErrorMsg('Permission de localisation refusée');
          return;
        }

        const provider = await Location.getProviderStatusAsync();
        if (!provider.locationServicesEnabled) {
          setErrorMsg('Veuillez activer la localisation sur votre appareil');
          return;
        }

        const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setCurrentLocation(initial);

        try {
          const [place] = await Location.reverseGeocodeAsync({
            latitude: initial.coords.latitude,
            longitude: initial.coords.longitude
          });
          if (place) {
            const label = [place.name, place.street, place.city].filter(Boolean).join(', ');
            setPickupLabel(label || 'Ma position');
          }
        } catch {}

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 5000,
            distanceInterval: 10,
          },
          (loc) => setCurrentLocation(loc)
        );
      } catch (err) {
        console.error('Erreur de géolocalisation:', err);
        setErrorMsg('Erreur lors de l\'activation de la géolocalisation');
      }
    };

    initializeLocation();
    return () => {
      subscription?.remove();
    };
  }, []);

  // plus de faux mototaximen, on ne simule plus
  // Charger la disponibilité initiale des mototaximen proximités via l'API
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    const loadAvailableDrivers = async () => {
      try {
        const res = await fetch(`${API_URL}/api/mototaxi/available`);
        const data: Driver[] = await res.json();
        if (Array.isArray(data)) {
          setDrivers((prev) => {
            // Fusionner par id pour conserver d'éventuelles mises à jour WS
            const map: Record<string, Driver> = {};
            [...prev, ...data].forEach((d) => { map[d.id] = d; });
            return Object.values(map);
          });
        }
        setDriversLoadError(false);
      } catch (e) {
        // marquer une erreur réseau pour afficher un message à l'utilisateur
        setDriversLoadError(true);
      }
    };

    loadAvailableDrivers();
    // rafraîchir périodiquement pour capter les nouveaux disponibles
    interval = setInterval(loadAvailableDrivers, 20000);
    return () => { if (interval) clearInterval(interval as any); };
  }, [API_URL]);

  // Charger la liste complète (offline cache)
  useEffect(() => {
    const loadLite = async () => {
      try {
        const res = await fetch(`${API_URL}/api/mototaxi/list`);
        const data: DriverLite[] = await res.json();
        if (Array.isArray(data)) {
          setDriversLite(data);
          try { await AsyncStorage.setItem('driversLiteCache', JSON.stringify(data)); } catch {}
        }
      } catch (e) {
        try {
          const raw = await AsyncStorage.getItem('driversLiteCache');
          if (raw) setDriversLite(JSON.parse(raw));
        } catch {}
      }
    };
    loadLite();
  }, [API_URL]);

  // Ouvrir le BottomSheet quand un conducteur est sélectionné ou si un estimate est là
  useEffect(() => {
    if (selectedDriver && estimate && bottomSheetRef.current) {
      bottomSheetRef.current.open();
    }
  }, [selectedDriver, estimate]);

  // Charger les informations du client
  useEffect(() => {
    const loadClientInfo = async () => {
      try {
        const name = await AsyncStorage.getItem('userName'); // Assumer que userName est stocké
        const phone = await AsyncStorage.getItem('userPhone'); // Assumer que userPhone est stocké
        const userId = await AsyncStorage.getItem('userId'); // Assumer que userId est stocké
        setClientUserId(userId);
        setClientName(name);
        setClientPhone(phone);
      } catch (e) {
        console.error('Erreur lors du chargement des infos client:', e);
      }
    };
    loadClientInfo();
  }, []);

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      router.replace('/login');
    } catch (e) {
      console.error('Failed to remove the token from storage', e);
    }
  };

  const region = useMemo(() => {
    if (!currentLocation) return undefined as any;
    return {
      latitude: currentLocation.coords.latitude,
      longitude: currentLocation.coords.longitude,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };
  }, [currentLocation]);

  // Haversine (fallback calcul distance)
  const haversine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Décodage polyline Google
  const decodePolyline = (encoded: string) => {
    const poly: Array<{ latitude: number; longitude: number }> = [];
    let index = 0, lat = 0, lng = 0;
    while (index < encoded.length) {
      let b, shift = 0, result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
      lat += dlat;
      shift = 0; result = 0;
      do {
        b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 0x20);
      const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
      lng += dlng;
      poly.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
    }
    return poly;
  };

  // Autocomplete (Google Places)
  const fetchSuggestions = async (text: string) => {
    console.log('fetchSuggestions called with text:', text);
    console.log('currentLocation:', currentLocation);
    console.log('isGoogleEnabled:', isGoogleEnabled);
    
    if (!currentLocation) {
      console.log('No current location, returning');
      return;
    }
    
    if (!isGoogleEnabled) {
      // Nominatim (gratuit)
      // Simplifier la requête pour tester
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(text + ' Cameroun')}`;
      try {
        console.log('Nominatim request URL:', url);
        console.log('Making fetch request...');
        const res = await fetch(url, { headers: { 'User-Agent': 'motolink-app' } });
        console.log('Fetch response status:', res.status);
        const json = await res.json();
        console.log('Nominatim response:', json);
        console.log('Response length:', json ? json.length : 0);
        
        const list = (json || []).map((p: any) => ({
          id: p.place_id?.toString() || `${p.lat},${p.lon}`,
          description: p.display_name,
          coords: { latitude: parseFloat(p.lat), longitude: parseFloat(p.lon) }
        }));
        console.log('Processed suggestions:', list);
        setSuggestions(list);
        cacheSuggestions(text, list);
      } catch (e) {
        console.error('Nominatim autocomplete error:', e);
        // Fallback cache (préfixe)
        const cached = getCachedSuggestions(text);
        if (cached) setSuggestions(cached);
        else {
          // Essen fallback Cameroun
          try {
            const url2 = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=10&accept-language=fr&countrycodes=cm&q=${encodeURIComponent(text + ', Cameroun')}`;
            const res2 = await fetch(url2, { headers: { 'User-Agent': 'motolink-app' } });
            const json2 = await res2.json();
            const list2 = (json2 || []).map((p: any) => ({
              id: p.place_id?.toString() || `${p.lat},${p.lon}`,
              description: p.display_name,
              coords: { latitude: parseFloat(p.lat), longitude: parseFloat(p.lon) }
            }));
            setSuggestions(list2);
            cacheSuggestions(text, list2);
          } catch {}
        }
      }
      return;
    }
    // Google fallback si clé fournie
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(text)}&key=${GOOGLE_MAPS_API_KEY}&language=fr&components=country:CM&location=${currentLocation.coords.latitude},${currentLocation.coords.longitude}&radius=20000`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (json.status !== 'OK' || !Array.isArray(json.predictions) || json.predictions.length === 0) {
        return fetchSuggestionsNominatim(text);
      }
      const list = json.predictions.map((p: any) => ({ id: p.place_id, description: p.description, place_id: p.place_id }));
      setSuggestions(list);
      cacheSuggestions(text, list);
    } catch (e) {
      console.warn('Google autocomplete error:', e);
      // Repli direct vers Nominatim
      return fetchSuggestionsNominatim(text);
    }
  };

  // Version forcée Nominatim (pour fallback après Google échec)
  const fetchSuggestionsNominatim = async (text: string) => {
    if (!currentLocation) return;
    const lat = currentLocation.coords.latitude;
    const lon = currentLocation.coords.longitude;
    const d = 0.5;
    const viewbox = `${lon - d},${lat + d},${lon + d},${lat - d}`;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=10&accept-language=fr&autocomplete=1&countrycodes=cm&viewbox=${viewbox}&bounded=1&q=${encodeURIComponent(text)}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'motolink-app' } });
      const json = await res.json();
      const list = (json || []).map((p: any) => ({
        id: p.place_id?.toString() || `${p.lat},${p.lon}`,
        description: p.display_name,
        coords: { latitude: parseFloat(p.lat), longitude: parseFloat(p.lon) }
      }));
      setSuggestions(list);
      cacheSuggestions(text, list);
    } catch {}
  };

  // Place details -> coords
  const fetchPlaceCoords = async (placeId?: string) => {
    if (!placeId) return null;
    if (!GOOGLE_MAPS_API_KEY) return null; // avec Nominatim, on fournit déjà coords
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&key=${GOOGLE_MAPS_API_KEY}&fields=geometry`;
    const res = await fetch(url);
    const json = await res.json();
    const loc = json.result?.geometry?.location;
    if (loc) return { latitude: loc.lat, longitude: loc.lng };
    return null;
  };

  // Directions routières
  const fetchRoute = async (origin: { latitude: number; longitude: number }, dest: { latitude: number; longitude: number }) => {
    if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'TA_CLE_API_GOOGLE_ICI') {
      // OSRM public (gratuit)
      const url = `https://router.project-osrm.org/route/v1/driving/${origin.longitude.toFixed(8)},${origin.latitude.toFixed(8)};${dest.longitude.toFixed(8)},${dest.latitude.toFixed(8)}?overview=full&geometries=geojson&language=fr`;
      try {
        const res = await fetch(url);
        const json = await res.json();
        const route = json.routes?.[0];
        if (route?.geometry?.coordinates) {
          const pts = route.geometry.coordinates.map((c: [number, number]) => ({ latitude: c[1], longitude: c[0] }));
          setRouteCoords(pts);
          const distanceKm = (route.distance || 0) / 1000;
          const durationMin = (route.duration || 0) / 60;
          setEstimate({ distanceKm, durationMin });
          if (selectedDriver && bottomSheetRef.current) {
            bottomSheetRef.current.open();
          }
          fitMapToRoute(pts);
          return;
        }
      } catch (e) {
        console.warn('OSRM error:', e);
      }
      // fallback: ligne droite
      setRouteCoords([origin, dest]);
      const distanceKm = haversine(origin.latitude, origin.longitude, dest.latitude, dest.longitude);
      const durationMin = (distanceKm / 30) * 60;
      setEstimate({ distanceKm, durationMin });
      fitMapToRoute([origin, dest]);
      return;
    }
    // Google Directions si la clé existe
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${dest.latitude},${dest.longitude}&mode=driving&language=fr&key=${GOOGLE_MAPS_API_KEY}`;
    try {
      const res = await fetch(url);
      const json = await res.json();
      const route = json.routes?.[0];
      if (route) {
        const points = decodePolyline(route.overview_polyline.points);
        setRouteCoords(points);
        const leg = route.legs?.[0];
        if (leg) {
          const distanceKm = (leg.distance?.value || 0) / 1000;
          const durationMin = (leg.duration?.value || 0) / 60;
          setEstimate({ distanceKm, durationMin });
        }
        fitMapToRoute(points);
      } else {
        setRouteCoords([origin, dest]);
        fitMapToRoute([origin, dest]);
      }
    } catch (e) {
      console.warn('Google directions error:', e);
      setRouteCoords([origin, dest]);
      const distanceKm = haversine(origin.latitude, origin.longitude, dest.latitude, dest.longitude);
      const durationMin = (distanceKm / 30) * 60;
      setEstimate({ distanceKm, durationMin });
      fitMapToRoute([origin, dest]);
    }
  };

  // Ajuster la caméra pour englober le trajet
  const fitMapToRoute = (coords: Array<{ latitude: number; longitude: number }>) => {
    if (!mapRef.current || coords.length < 2) return;
    try {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 80, right: 40, bottom: 240, left: 40 },
        animated: true,
      });
    } catch {}
  };

  // Cache suggestions (LRU simple max 10)
  const cacheSuggestions = async (key: string, list: Array<{ id: string; description: string; place_id?: string; coords?: { latitude: number; longitude: number } }>) => {
    try {
      const newCache = { ...suggestionsCache };
      newCache[key] = list;
      const keys = Object.keys(newCache);
      if (keys.length > 10) {
        delete newCache[keys[0]];
      }
      setSuggestionsCache(newCache);
      await AsyncStorage.setItem('suggestionsCache', JSON.stringify(newCache));
    } catch {}
  };

  const getCachedSuggestions = (prefix: string) => {
    const lower = prefix.toLowerCase();
    const matches = Object.entries(suggestionsCache)
      .filter(([k]) => k.toLowerCase().startsWith(lower))
      .map(([, v]) => v);
    if (matches.length > 0) return matches[0];
    return null;
  };

  useEffect(() => {
    const loadCache = async () => {
      try {
        const raw = await AsyncStorage.getItem('suggestionsCache');
        if (raw) setSuggestionsCache(JSON.parse(raw));
      } catch {}
    };
    loadCache();
  }, []);

  const handleConfirmRide = async () => {
    if (!selectedDriver || !currentLocation || !destinationCoords || !clientName || !clientPhone || !destination) {
      Alert.alert('Erreur', 'Informations de course incomplètes. Veuillez vérifier votre sélection et votre destination.');
      return;
    }

    if (rideStatus !== 'idle') {
      Alert.alert('Erreur', 'Une course est déjà en cours ou en attente.');
      return;
    }

    try {
      sendMessage({
        type: 'request_ride',
        targetMototaxiId: selectedDriver.id,
        pickup: { latitude: currentLocation.coords.latitude, longitude: currentLocation.coords.longitude },
        destination: destinationCoords,
        clientName: clientName,
        clientPhone: clientPhone,
        pickupLabel: pickupLabel,
        destinationLabel: destination,
        estimate: estimate, // Inclure l'estimation pour le mototaximan
      });
      setRideStatus('pending');
      bottomSheetRef.current?.close();
      Alert.alert('Demande envoyée', `Votre demande a été envoyée à ${selectedDriver.name}. En attente de sa confirmation...`);
    } catch (e) {
      console.error('Erreur lors de l\'envoi de la demande de course:', e);
      Alert.alert('Erreur', 'Impossible d\'envoyer la demande de course. Veuillez réessayer.');
    }
  };

  const handleRateRide = async (rating: number, comment: string) => {
    if (!currentRide || !clientUserId) {
      Alert.alert('Erreur', 'Informations de course ou d\'utilisateur manquantes pour la notation.');
      return;
    }
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        Alert.alert('Erreur', 'Token d\'authentification manquant.');
        return;
      }
      const response = await fetch(`${API_URL}/api/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          mototaximanId: currentRide.mototaxiId,
          courseId: currentRide.courseId,
          rating: rating,
          comment: comment,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        Alert.alert('Succès', data.message);
        setRideStatus('idle'); // Réinitialiser après la notation
        setCurrentRide(null);
        setSelectedDriver(null);
      } else {
        Alert.alert('Erreur', data.message || 'Échec de la soumission de la note.');
      }
    } catch (e) {
      console.error('Erreur lors de la soumission de la note:', e);
      Alert.alert('Erreur', 'Impossible de soumettre la note. Veuillez réessayer.');
    }
  };

  const renderBottomSheetContent = () => {
    if (showAllDrivers) {
      return (
        <View style={styles.bottomSheetContent}>
          <Text style={styles.bottomTitle}>Tous les mototaximen</Text>
          {driversLite.length === 0 ? (
            <Text style={styles.bottomEmpty}>Aucun mototaximan disponible.</Text>
          ) : (
            <View>
              {driversLite.map((d) => (
                <View key={d.id} style={styles.allDriversItem}>
                  <View style={styles.allDriversInfo}>
                    <Text style={styles.allDriversName}>{d.name}</Text>
                    {d.phone ? <Text style={styles.allDriversPhone}>{d.phone}</Text> : null}
                  </View>
                  <View style={styles.allDriversActions}>
                    {d.phone ? (
                      <TouchableOpacity style={styles.proposalCallBtn} onPress={() => Linking.openURL(`tel:${d.phone}`)}>
                        <MaterialIcons name="call" size={20} color="#fff" />
                      </TouchableOpacity>
                    ) : null}
                    <TouchableOpacity style={styles.proposalChatBtn} onPress={() => Alert.alert('Chat', `Démarrer une conversation avec ${d.name}`)}>
                      <MaterialIcons name="chat" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
          <TouchableOpacity style={[styles.confirmButton, { marginTop: 10 }]} onPress={() => { setShowAllDrivers(false); bottomSheetRef.current?.close(); }}>
            <Text style={styles.confirmButtonText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      );
    }
    if (rideStatus === 'completed') {
      return (
        <View style={styles.bottomSheetContent}>
          <Text style={styles.etaText}>Comment évalueriez-vous votre course ?</Text>
          {/* Placeholder pour le formulaire de notation */}
          <RatingForm onRate={handleRateRide} />
          <TouchableOpacity style={styles.confirmButton} onPress={() => handleRateRide(5, 'Super course !')}>
            <Text style={styles.confirmButtonText}>Soumettre la note (Démo - 5 étoiles)</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (rideStatus === 'pending' || rideStatus === 'accepted' || rideStatus === 'in_progress') {
      const statusText = {
        'pending': 'En attente de confirmation...',
        'accepted': 'Course acceptée ! Le mototaximan arrive.',
        'in_progress': 'Course en cours...',
      }[rideStatus];
      return (
        <View style={styles.bottomSheetContent}>
          <Text style={styles.etaText}>Statut de la course</Text>
          <Text style={styles.etaValue}>{statusText}</Text>
          {/* Ici, on pourrait afficher la position du mototaximan en temps réel */}
          {/* Ou des infos sur le mototaximan, un bouton d'annulation, etc. */}
          {rideStatus !== 'in_progress' && (
            <TouchableOpacity style={styles.cancelButton} onPress={() => Alert.alert('Annuler', 'Annuler la course ?')}>
              <Text style={styles.cancelButtonText}>Annuler la course</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    // Contenu par défaut: proposition du mototaximan
    if (selectedDriver && estimate) {
      return (
        <View style={styles.bottomSheetContent}>
          <Text style={styles.etaText}>Heure d'arrivée estimée</Text>
          <Text style={styles.etaValue}>{formatTime(estimate.durationMin)}</Text>

          <View style={styles.driverProposalCard}>
            {selectedDriver.photoUrl ? (
              <Image source={{ uri: selectedDriver.photoUrl.startsWith('http') ? selectedDriver.photoUrl : `${API_URL}${selectedDriver.photoUrl}` }} style={styles.proposalAvatar} />
            ) : (
              <View style={styles.proposalAvatarPlaceholder}>
                <MaterialIcons name="person" size={30} color="#07393C" />
              </View>
            )}
            <View style={styles.proposalDriverInfo}>
              <Text style={styles.proposalDriverName}>{selectedDriver.name}</Text>
              <Text style={styles.proposalDriverDetails}>Mototaximan</Text>
              {typeof selectedDriver.rating === 'number' ? (
                <View style={styles.proposalRatingContainer}>
                  {[...Array(5)].map((_, i) => (
                    <MaterialIcons
                      key={i}
                      name={i < Math.floor(selectedDriver.rating) ? "star" : "star-border"}
                      size={18}
                      color="#FFD700"
                    />
                  ))}
                  <Text style={styles.proposalRatingValue}>{selectedDriver.rating.toFixed(1)}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.proposalActions}>
              {selectedDriver.phone ? (
                <TouchableOpacity style={styles.proposalChatBtn} onPress={() => Alert.alert('Chat', `Démarrer une conversation avec ${selectedDriver.name}`)}>
                  <MaterialIcons name="chat" size={24} color="#fff" />
                </TouchableOpacity>
              ) : null}
              {selectedDriver.phone ? (
                <TouchableOpacity style={styles.proposalCallBtn} onPress={() => Linking.openURL(`tel:${selectedDriver.phone}`)}>
                  <MaterialIcons name="call" size={24} color="#fff" />
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          <View style={styles.proposalRouteInfo}>
            <View style={styles.proposalRouteItem}>
              <MaterialIcons name="my-location" size={20} color="#07393C" />
              <Text style={styles.proposalRouteText}>{pickupLabel || 'Ma position'}</Text>
            </View>
            <View style={styles.proposalRouteItem}>
              <MaterialIcons name="location-on" size={20} color="#07393C" />
              <Text style={styles.proposalRouteText}>{destination}</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmRide}>
            <Text style={styles.confirmButtonText}>Confirmer la course</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  // Composant pour le formulaire de notation
  const RatingForm = ({ onRate }: { onRate: (rating: number, comment: string) => void }) => {
    const [rating, setRating] = useState(0);
    const [comment, setComment] = useState('');

    return (
      <View style={styles.ratingFormContainer}>
        <View style={styles.starRatingContainer}>
          {[...Array(5)].map((_, i) => (
            <TouchableOpacity key={i} onPress={() => setRating(i + 1)}>
              <MaterialIcons
                name={i < rating ? "star" : "star-border"}
                size={30}
                color="#FFD700"
                style={styles.starIcon}
              />
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.commentInput}
          placeholder="Ajoutez un commentaire (optionnel)"
          multiline
          value={comment}
          onChangeText={setComment}
        />
        <TouchableOpacity
          style={[styles.confirmButton, { marginTop: 15 }]} // Ajuster le style du bouton
          onPress={() => onRate(rating, comment)}
          disabled={rating === 0} // Désactiver si aucune note n'est sélectionnée
        >
          <Text style={styles.confirmButtonText}>Soumettre la note</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {currentLocation && (
        <View style={styles.mapContainer}>
          <MapView ref={mapRef} style={styles.map} region={region} showsUserLocation followsUserLocation loadingEnabled onPress={() => setSuggestions([])}>
            {drivers.map((d) => (
              <Marker
                key={d.id}
                coordinate={d.location}
                title={d.name}
                onPress={() => {
                  const driverLite = driversLite.find(dl => dl.id === d.id);
                  if (driverLite) {
                    setSelectedDriver(driverLite);
                    bottomSheetRef.current?.open();
                  } else {
                    // Fallback to basic driver info if detailed is not available (e.g., offline cache not loaded)
                    setSelectedDriver({ ...d, phone: '', photoUrl: null, badge: '', rating: d.rating });
                    bottomSheetRef.current?.open();
                  }
                }}
              >
                <View style={styles.driverMarker}>
                  <MaterialIcons name="motorcycle" size={20} color="#07393C" />
                </View>
              </Marker>
            ))}
            {destinationCoords && (
              <Marker coordinate={destinationCoords} title="Destination" />
            )}
            {routeCoords.length > 1 && (
              <Polyline
                coordinates={routeCoords}
                strokeColor="#07393C"
                strokeWidth={4}
              />
            )}
          </MapView>

          <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={styles.overlay}>
            <View style={styles.inputPanel}>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingTop: 50,
              }}>
                  <Text style={styles.logo}>Motolink</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity
                      style={styles.roundIconBtn}
                      onPress={() => { setShowAllDrivers(true); bottomSheetRef.current?.open(); }}
                    >
                      <MaterialIcons name="people" size={22} color="#07393C" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.profileIcon} onPress={() => router.push('/profile')}>
                      <FontAwesome name="user" size={24} color="#07393C" />
                    </TouchableOpacity>
                  </View>
              </View>
              <View style={styles.inputRow}>
                <FontAwesome name="map-marker" size={18} color="#07393C" style={styles.inputIcon} />
                <TextInput value={pickupLabel} editable={false} placeholder="Ma position" style={styles.input} />
              </View>
                <View style={[styles.inputRow, { zIndex: 3 }] }>
                <FontAwesome name="dot-circle-o" size={18} color="#07393C" style={styles.inputIcon} />
                <TextInput
                  value={destination}
                  onChangeText={async (text) => {
                    setDestination(text);
                    if (text.length < 3) {
                      setDestinationCoords(null);
                      setEstimate(null);
                      setSuggestions([]);
                      setRouteCoords([]);
                      return;
                    }
                    fetchSuggestions(text);
                  }}
                  placeholder="Saisir votre destination"
                  style={styles.input}
                />
              </View>
              {suggestions.length > 0 && (
                <View style={[styles.suggestionsBox, { zIndex: 4 }] }>
                  {suggestions.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={styles.suggestionItem}
                      onPress={async () => {
                        setDestination(s.description);
                        setSuggestions([]);
                        let coords: { latitude: number; longitude: number } | null | undefined = s.coords;
                        if (!coords) {
                          coords = await fetchPlaceCoords(s.place_id);
                        }
                        if (coords != null) {
                          setDestinationCoords(coords);
                          if (currentLocation) {
                            fetchRoute(
                              { latitude: currentLocation.coords.latitude, longitude: currentLocation.coords.longitude },
                              coords
                            );
                          }
                        }
                      }}
                    >
                      <Text numberOfLines={2} style={styles.suggestionText}>{s.description}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {estimate && (
                <Text style={styles.estimateText}>
                  ~ {estimate.distanceKm.toFixed(2)} km • {Math.round(estimate.durationMin)} min
                </Text>
              )}
              {drivers.length === 0 && (
                <View style={styles.infoBox}>
                  <Text style={styles.infoTitle}>Aucun mototaximan à proximité</Text>
                  <Text style={styles.infoText}>
                    {driversLoadError
                      ? 'Impossible de charger la disponibilité. Vérifiez votre connexion réseau.'
                      : 'Réessayez dans un instant ou élargissez votre zone.'}
                  </Text>
                </View>
              )}
            </View>

          </KeyboardAvoidingView>

      </View>
      )}

      <BottomSheet
        ref={bottomSheetRef}
        height={350} // Hauteur à ajuster selon le contenu
        openDuration={250}
        closeDuration={250}
        customStyles={{
          container: styles.bottomSheetContainer,
        }}
      >
        {renderBottomSheetContent()}
      </BottomSheet>

      {/* Pas de composant utilitaire ici, la fonction formatTime est globale */}

      {errorMsg ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{errorMsg}</Text>
      </View>
      ) : null}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  mapContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#07393C',
  },
  profileIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  inputPanel: {
    marginTop: 0, // Ajuster pour être juste sous le topBar
    marginHorizontal: 0,
    backgroundColor: 'white',
    borderRadius: 1,
    padding: 12,
    elevation: 5,
    zIndex: 2,
  },
  panelTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f4f8',
    borderRadius: 12,
    marginBottom: 10,
    paddingHorizontal: 10,
    height: 44,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#222',
  },
  bottomList: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 10,
    paddingHorizontal: 10,
    gap: 10,
  },
  driverCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 10,
    elevation: 4,
  },
  driverInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eee',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e8f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5d5',
  },
  driverPlate: {
    color: '#333',
  },
  driverInfoRight: {
    alignItems: 'flex-end',
  },
  driverName: {
    color: '#333',
    fontWeight: '600',
  },
  driverPhone: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
  },
  driverBadge: {
    color: '#333',
    fontSize: 12,
    marginTop: 2,
    fontWeight: 'bold',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  driverRating: {
    color: '#666',
    marginLeft: 4,
    fontSize: 12,
  },
  callBtn: {
    marginTop: 6,
    backgroundColor: '#07393C',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chatBtn: {
    marginTop: 6,
    backgroundColor: '#1E88E5', // Un bleu pour le chat
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
  },
  driverMarker: {
    backgroundColor: '#fff',
    padding: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#07393C',
  },
  suggestionsBox: {
    backgroundColor: 'white',
    borderRadius: 8,
    elevation: 4,
    marginHorizontal: 6,
    marginTop: -6,
    maxHeight: 200,
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  suggestionText: {
    color: '#222',
    fontSize: 14,
  },
  
  errorText: {
    color: 'red',
    textAlign: 'center',
  },
  centerBox: {
    padding: 10,
  },
  estimateText: {
    textAlign: 'center',
    color: '#07393C',
    fontWeight: '600',
  },
  bottomSheetContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  bottomSheetContent: {
    // Styles pour le contenu global du BottomSheet
  },
  bottomTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#07393C',
    textAlign: 'center',
    marginBottom: 10,
  },
  bottomEmpty: {
    textAlign: 'center',
    color: '#666',
    marginBottom: 10,
  },
  allDriversItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  allDriversInfo: {
    flex: 1,
    marginRight: 10,
  },
  allDriversName: {
    fontSize: 16,
    color: '#07393C',
    fontWeight: '600',
  },
  allDriversPhone: {
    color: '#666',
    marginTop: 3,
  },
  allDriversActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roundIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    marginRight: 10,
  },
  infoBox: {
    backgroundColor: '#f8f9fb',
    borderRadius: 10,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e6eaef',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#07393C',
    marginBottom: 4,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 13,
    color: '#555',
    textAlign: 'center',
  },
  etaText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 5,
  },
  etaValue: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#07393C',
    textAlign: 'center',
    marginBottom: 20,
  },
  driverProposalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f4f8',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  proposalAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  proposalAvatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e8f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 1,
    borderColor: '#cbd5d5',
  },
  proposalDriverInfo: {
    flex: 1,
  },
  proposalDriverName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#07393C',
  },
  proposalDriverDetails: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  proposalRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proposalRatingValue: {
    fontSize: 14,
    color: '#666',
    marginLeft: 5,
  },
  proposalActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  proposalChatBtn: {
    backgroundColor: '#1E88E5',
    borderRadius: 20,
    padding: 8,
    marginLeft: 10,
  },
  proposalCallBtn: {
    backgroundColor: '#07393C',
    borderRadius: 20,
    padding: 8,
    marginLeft: 10,
  },
  proposalRouteInfo: {
    marginBottom: 20,
  },
  proposalRouteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  proposalRouteText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  confirmButton: {
    backgroundColor: '#07393C',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  ratingFormContainer: {
    padding: 10,
    alignItems: 'center',
  },
  starRatingContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  starIcon: {
    marginHorizontal: 5,
  },
  commentInput: {
    width: '100%',
    height: 80,
    borderColor: '#ddd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    textAlignVertical: 'top',
    marginBottom: 10,
  },
  cancelButton: {
    backgroundColor: '#D32F2F', // Rouge pour annuler
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

// Fonction utilitaire pour formatter l'heure d'arrivée
const formatTime = (durationMin: number) => {
  const now = new Date();
  const arrival = new Date(now.getTime() + durationMin * 60 * 1000);
  const hours = arrival.getHours();
  const mins = arrival.getMinutes();

  const formatSingleTime = (h: number, m: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const formattedHours = h % 12 === 0 ? 12 : h % 12;
    const formattedMins = m < 10 ? '0' + m : m;
    return `${formattedHours}:${formattedMins} ${ampm}`;
  };

  const startTime = formatSingleTime(new Date(now.getTime() + (durationMin - 5) * 60 * 1000).getHours(), new Date(now.getTime() + (durationMin - 5) * 60 * 1000).getMinutes());
  const endTime = formatSingleTime(new Date(now.getTime() + (durationMin + 5) * 60 * 1000).getHours(), new Date(now.getTime() + (durationMin + 5) * 60 * 1000).getMinutes());

  return `${startTime} - ${endTime}`;
};
