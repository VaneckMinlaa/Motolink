import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { router } from 'expo-router'; 
import getEnvVars from '../config/environment'; 
import FontAwesome from '@expo/vector-icons/FontAwesome'; 

// Définition de l'interface pour les données utilisateur, alignée sur votre API
interface UserData {
  nom_complet: string;
  email: string;
  numero_telephone: string;
  photo_url: string | null;
}

export default function EditProfileScreen() {
  // Initialisation des états locaux pour les champs modifiables
  const [nomComplet, setNomComplet] = useState('');
  const [numeroTelephone, setNumeroTelephone] = useState('');
  // L'email n'est généralement pas modifiable ou nécessite une validation spéciale, on le gère séparément
  const [email, setEmail] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const { API_URL } = getEnvVars();

  useEffect(() => {
    loadUserDataForEditing();
  }, []);

  // Fonction pour charger les données actuelles de l'utilisateur
  const loadUserDataForEditing = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        // Redirige vers la connexion si pas de token
        router.replace('/login');
        return;
      }

      // Utilise le même endpoint que votre vue de profil pour obtenir les données
      const response = await fetch(`${API_URL}/api/user`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data: UserData = await response.json();
        // Pré-rempli les champs avec les données actuelles
        setNomComplet(data.nom_complet);
        setNumeroTelephone(data.numero_telephone);
        setEmail(data.email);
        setPhotoUrl(data.photo_url);
        setIsLoading(false);
      } else {
        const error = await response.json();
        Alert.alert('Erreur de chargement', error.message);
        router.back(); // Retourne à l'écran précédent en cas d'erreur de chargement
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les informations de l\'utilisateur');
      router.back();
    }
  };

  const handleImagePick = () => {
    // Logique pour ouvrir la galerie ou la caméra (nécessite une bibliothèque externe comme expo-image-picker)
    Alert.alert('Image Picker', 'Veuillez intégrer une bibliothèque de sélection d\'image ici.');
    // Après sélection et upload, mettez à jour l'état :
    // setPhotoUrl('nouvelle_url_de_l_image_uploadée');
  };

  // Fonction principale pour sauvegarder les modifications
  const handleSave = async () => {
    setIsSaving(true);

    const updatedData = {
      nom_complet: nomComplet,
      numero_telephone: numeroTelephone,
      // email n'est pas inclus ici car il est souvent non modifiable via ce formulaire standard
      photo_url: photoUrl, // L'URL finale après l'upload de l'image
    };

    try {
      const token = await AsyncStorage.getItem('userToken');
      if (!token) return;

      // Endpoint de mise à jour (à confirmer avec votre camarade, souvent PUT ou POST sur /api/user)
      const response = await fetch(`${API_URL}/api/user/update`, {
        method: 'PUT', // Méthode HTTP pour la mise à jour
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedData),
      });

      if (response.ok) {
        Alert.alert('Succès', 'Profil mis à jour avec succès !');
        // Optionnel: Rediriger l'utilisateur vers la vue de profil après la sauvegarde
        // router.back();
      } else {
        const error = await response.json();
        Alert.alert('Erreur de sauvegarde', error.message || 'Une erreur est survenue.');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Échec de la communication avec le serveur.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Chargement du profil...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Modifier le profil</Text>

      <TouchableOpacity onPress={handleImagePick} style={styles.photoContainer}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.profileImage} />
        ) : (
          <View style={styles.placeholderImage}>
             <FontAwesome name="camera" size={30} color="#666" />
          </View>
        )}
      </TouchableOpacity>

      <Text style={styles.label}>Nom complet</Text>
      <TextInput
        style={styles.input}
        value={nomComplet}
        onChangeText={setNomComplet}
        autoCapitalize="words"
      />

      <Text style={styles.label}>Adresse e-mail</Text>
      <TextInput
        style={[styles.input, styles.disabledInput]}
        value={email}
        editable={false} // L'email n'est pas modifiable
      />

      <Text style={styles.label}>Numéro de téléphone</Text>
      <TextInput
        style={styles.input}
        value={numeroTelephone}
        onChangeText={setNumeroTelephone}
        keyboardType="phone-pad"
      />

      <View style={styles.buttonContainer}>
        <Button
          title={isSaving ? "Sauvegarde en cours..." : "Enregistrer les modifications"}
          onPress={handleSave}
          disabled={isSaving}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    marginTop: 15,
    color: '#333',
  },
  input: {
    height: 45,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: '#fff',
  },
  disabledInput: {
    backgroundColor: '#f0f0f0',
    color: '#888',
  },
  photoContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#ccc',
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  buttonContainer: {
    marginTop: 30,
  },
});
