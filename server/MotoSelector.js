import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { getDocs, collection } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // Chemin à adapter selon ton projet


const MotoSelector = ({ onSelect }) => {
  const [motos, setMotos] = useState([]);

  useEffect(() => {
    const fetchMotos = async () => {
       const snapshot = await getDocs(collection(db, 'motos'));
      setMotos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchMotos();
  }, []);

  return (
    <View>
      <Text>Choisissez un modèle de moto :</Text>
      {motos.map(moto => (
        <TouchableOpacity key={moto.id} onPress={() => onSelect(moto)}>
          <Text>{moto.modele}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default MotoSelector;
