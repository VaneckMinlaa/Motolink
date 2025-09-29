import { Feather, FontAwesome } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { ActivityIndicator, Image, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import getEnvVars from '../config/environment';

export default function InscriptionMototaximan() {
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [cniFile, setCniFile] = useState<{
    uri: string;
    name: string;
    mimeType: string;
  } | null>(null);
  const [gillet, setGillet] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handlePickProfileImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const handlePickCni = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: Platform.OS === 'web' ? ['image/*', 'application/pdf'] : ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (!result.canceled && result.assets.length > 0) {
        const selectedFile = result.assets[0];
        setCniFile({
          uri: selectedFile.uri,
          name: selectedFile.name,
          mimeType: selectedFile.mimeType || 'application/octet-stream'
        });
      }
    } catch (error) {
      console.log('Erreur lors de la sélection du document:', error);
    }
  };

  const handleInscription = async () => {
    if (password !== confirmPassword) {
      alert('Les mots de passe ne correspondent pas.');
      return;
    }
    setLoading(true);
    try {
      // Vérifier que nous avons bien le fichier CNI
      console.log('CNI file to upload:', cniFile);
      const formData = new FormData();
      formData.append('nom_complet', nom);
      formData.append('numero_telephone', telephone);
      formData.append('mot_de_passe', password);
      formData.append('gillet', gillet);
      if (profileImage) {
        formData.append('photo_profil', {
          uri: profileImage,
          name: 'photo_profil.jpg',
          type: 'image/jpeg',
        } as any);
      }
      if (cniFile) {
        formData.append('cni', {
          uri: cniFile.uri,
          name: cniFile.name,
          type: cniFile.mimeType,
        } as any);
      }
      const { API_URL } = getEnvVars();
      console.log('Sending request to:', `${API_URL}/api/inscription-mototaximan`);
      const response = await fetch(`${API_URL}/api/inscription-mototaximan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      const data = await response.json();
      if (response.ok) {
        alert('Inscription réussie !');
      } else {
        alert(data.message || 'Erreur lors de l\'inscription');
      }
    } catch (error) {
      console.error('Erreur lors de l\'inscription:', error);
      alert('Erreur lors de l\'inscription');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Inscription Mototaximan</Text>
      <Text style={styles.subtitle}>Créer votre compte Chauffeur</Text>
      <View style={styles.avatarContainer}>
        <TouchableOpacity onPress={handlePickProfileImage}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.avatar} />
          ) : (
            <Image source={require('../../assets/images/icon.png')} style={styles.avatar} />
          )}
          <View style={styles.cameraIcon}>
            <Feather name="camera" size={18} color="#fff" />
          </View>
        </TouchableOpacity>
        <Text style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Photo de profil</Text>
      </View>
      <View style={styles.inputWrapper}>
        <FontAwesome name="user" size={20} color="#07393C" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Nom Complet"
          value={nom}
          onChangeText={setNom}
        />
      </View>
      <View style={styles.inputWrapper}>
        <FontAwesome name="phone" size={20} color="#07393C" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Téléphone"
          value={telephone}
          onChangeText={setTelephone}
          keyboardType="phone-pad"
        />
      </View>
      <View style={styles.inputWrapper}>
        <FontAwesome name="lock" size={20} color="#07393C" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
          <Feather name={showPassword ? 'eye' : 'eye-off'} size={20} color="#07393C" />
        </TouchableOpacity>
      </View>
      <View style={styles.inputWrapper}>
        <FontAwesome name="lock" size={20} color="#07393C" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Confirmer le mot de passe"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showPassword}
        />
      </View>
      <View style={styles.inputWrapper}>
        <FontAwesome name="id-card" size={20} color="#07393C" style={styles.inputIcon} />
        <TouchableOpacity style={{ flex: 1 }} onPress={handlePickCni}>
          <Text style={{ color: cniFile ? '#222' : '#888', fontSize: 16 }}>
            {cniFile ? (cniFile.name || cniFile.uri.split('/').pop()) : 'Téléverser votre CNI (image ou PDF)'}
          </Text>
        </TouchableOpacity>
        {cniFile && (
          <Feather name="check-circle" size={20} color="green" style={{ marginLeft: 8 }} />
        )}
      </View>
      <View style={styles.inputWrapper}>
        <FontAwesome name="motorcycle" size={20} color="#07393C" style={styles.inputIcon} />
        <TextInput
          style={styles.input}
          placeholder="Numéro de Gillet"
          value={gillet}
          onChangeText={setGillet}
        />
      </View>
      <TouchableOpacity style={styles.button} onPress={handleInscription} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Inscription</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    paddingTop: 40,
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#07393C',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
  },
  avatarContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eee',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#07393C',
    borderRadius: 15,
    padding: 5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f4f8',
    borderRadius: 12,
    marginBottom: 15,
    paddingHorizontal: 10,
    width: 300,
    height: 48,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#222',
  },
  button: {
    backgroundColor: '#07393C',
    borderRadius: 15,
    marginTop: 20,
    paddingVertical: 14,
    width: 300,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
