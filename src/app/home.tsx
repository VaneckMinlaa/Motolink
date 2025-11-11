import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';
import BottomSheet  from '@gorhom/bottom-sheet';
import { LocationObjectCoords } from 'expo-location';
import { Chauffeur, Moto } from '../../server/entites';



import MotoSelector from '../../server/MotoSelector';
import ChauffeurSelector from '../../server/chauffeurSelector';

const Home = () => {

  const [selectedMoto, setSelectedMoto] = useState<Moto | null>(null);
  const [selectedChauffeur, setSelectedChauffeur] = useState<Chauffeur | null>(null);
  const [bottomStep, setBottomStep] = useState(0); // 0: moto, 1: chauffeur, 2: confirmation
  const [location, setLocation] = useState<LocationObjectCoords | null>(null);

 const sheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Permission refusée');
        return;
      }

      let loc = await Location.getCurrentPositionAsync({});
      setLocation(loc.coords);
    })();
  }, []);

  const handleOrder = () => {
    setBottomStep(0);
    sheetRef.current?.expand();
  };

  const handleMotoSelect = (Moto:Moto) => {
    setSelectedMoto(Moto);
    setBottomStep(1);
  };

  const handleChauffeurSelect = (Chauffeur:Chauffeur) => {
    setSelectedChauffeur(Chauffeur);
    setBottomStep(2);
  };

  const handleConfirm = () => {
    // 🔥 Call Firebase to create a course
    // Appel logique Firebase JS ici
    console.log('Course commandée', selectedMoto, selectedChauffeur);
    sheetRef.current?.close();
  };

  return (
    <View style={styles.container}>
      {location && (
        <MapView
          style={styles.map}
          region={{
            latitude: location.latitude,
            longitude: location.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
        >
          <Marker coordinate={location} title="Vous êtes ici" />
        </MapView>
      )}

      <View style={styles.buttonContainer}>
        <Button title="Commander une course" onPress={handleOrder} />
      </View>

      <BottomSheet
        ref={sheetRef}
        index={-1}
        snapPoints={['40%', '80%']}
      >
        {bottomStep === 0 && (
          <MotoSelector onSelect={handleMotoSelect} />
        )}
        {bottomStep === 1 && (
          <ChauffeurSelector moto={selectedMoto} onSelect={handleChauffeurSelect} />
        )}
        {bottomStep === 2 && (
          <View style={styles.confirmation}>
            <Text>Confirmer la commande ?</Text>
            <Button title="Confirmer" onPress={handleConfirm} />
          </View>
        )}
      </BottomSheet>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  buttonContainer: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
  },
  confirmation: {
    padding: 20,
    alignItems: 'center',
  },
});

export default Home;
