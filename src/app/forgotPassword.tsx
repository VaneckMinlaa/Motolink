import axios from 'axios';
import { Link } from 'expo-router';
import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import getEnvVars from '../config/environment';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');

  const handlePasswordReset = async () => {
    if (!email) {
      Alert.alert('Erreur', 'Veuillez entrer votre adresse e-mail.');
      return;
    }
    
    try {
      const { API_URL } = getEnvVars();
      const response = await axios.post(`${API_URL}/forgot-password`, { email });
      Alert.alert('Demande envoyée', response.data.message);
    } catch (error: any) {
      if (error.response) {
        Alert.alert('Erreur', error.response.data.message);
      } else {
        Alert.alert('Erreur', 'Une erreur est survenue.');
        console.error(error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Mot de passe oublié</Text>
        <Text style={styles.subtitle}>
          Entrez votre e-mail pour recevoir un lien de réinitialisation.
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Entrez votre adresse e-mail"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity style={styles.mainButton} onPress={handlePasswordReset}>
          <Text style={styles.mainButtonText}>Envoyer</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Link href="/login">
            <Text style={styles.footerLink}>Retour à la connexion</Text>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignContent: 'center',
  },
  formContainer: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#07393C',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666ff',
    marginBottom: 32,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    height: 50,
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    paddingHorizontal: 16,
    fontSize: 14,
    color: '#000',
  },
  mainButton: {
    height: 56,
    backgroundColor: '#07393C',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerLink: {
    color: '#07393C',
    fontWeight: 'bold',
  },
});
