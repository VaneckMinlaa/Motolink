import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { db } from '../firebaseConfig'; // Assure-toi que le chemin est bon
import { collection, getDocs, query, where } from 'firebase/firestore';

const ChauffeurSelector = ({ moto, onSelect }) => {
  const [chauffeurs, setChauffeurs] = useState([]);

  useEffect(() => {
    const fetchChauffeurs = async () => {
      try {
        const q = query(
          collection(db, 'chauffeurs'),
          where('modeleMoto', '==', moto.modele),
          where('statut', '==', 'LIBRE')
        );

        const snapshot = await getDocs(q);

        const results = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));

        setChauffeurs(results);
      } catch (error) {
        console.error('Erreur lors du chargement des chauffeurs :', error);
      }
    };

    if (moto?.modele) {
      fetchChauffeurs();
    }
  }, [moto]);

  return (
    <View>
      <Text>Choisissez un chauffeur :</Text>
      {chauffeurs.map(chauffeur => (
        <TouchableOpacity key={chauffeur.id} onPress={() => onSelect(chauffeur)}>
          <Text>{chauffeur.nom} ({chauffeur.noteMoyenne}⭐)</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default ChauffeurSelector;
