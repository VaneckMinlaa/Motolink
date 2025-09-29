import { AntDesign, FontAwesome } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Link, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import getEnvVars from '../config/environment';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  useEffect(() => {
    const loadRememberedUser = async () => {
      const rememberedIdentifier = await AsyncStorage.getItem('rememberedIdentifier');
      if (rememberedIdentifier) {
        setIdentifier(rememberedIdentifier);
        setRememberMe(true);
      }
    };
    loadRememberedUser();
  }, []);

  const handleSocialLogin = async (provider: 'facebook' | 'google' | 'apple') => {
    try {
      Alert.alert('Info', `Connexion avec ${provider} à implémenter`);
      // TODO: Implémenter la connexion sociale
    } catch (error) {
      console.error(`Erreur lors de la connexion avec ${provider}:`, error);
      Alert.alert('Erreur', `La connexion avec ${provider} a échoué`);
    }
  };

  const handleLogin = async () => {
    if (!identifier || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    try {
      const { API_URL } = getEnvVars();
      const response = await axios.post(`${API_URL}/login`, {
        identifier: identifier,
        mot_de_passe: password,
      });

      const { token } = response.data;
      await AsyncStorage.setItem('userToken', token);
      Alert.alert('Succès', 'Connexion réussie.');
      router.replace('/home'); // Rediriger vers la page d'accueil ou autre
    } catch (error: any) {
      if (error.response) {
        Alert.alert('Erreur', error.response.data.message);
      } else {
        Alert.alert('Erreur', 'Une erreur est survenue lors de la connexion.');
        console.error(error);
      }
    }
    // Gérer la persistance du login
    if (rememberMe) {
      await AsyncStorage.setItem('rememberedIdentifier', identifier);
    } else {
      await AsyncStorage.removeItem('rememberedIdentifier');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>

        <Text style={styles.title}>Connexion</Text>
        <Text style={styles.subtitle}>Connecter vous à votre compte</Text>
        
        <View style={styles.inputContainer}>
          <FontAwesome name="phone" size={20} color="#07393C" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, styles.emailInput]}
            placeholder="Email ou Numéro de téléphone"
            value={identifier}
            onChangeText={setIdentifier}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.inputContainer}>
          <FontAwesome name="lock" size={20} color="#07393C" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Entrer votre mot de passe"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
        </View>
        <TouchableOpacity style={styles.mainButton} onPress={handleLogin}>
          <Text style={styles.mainButtonText}>Connexion</Text>
        </TouchableOpacity>

        <View style={styles.optionsRow}>
          <TouchableOpacity style={styles.checkboxContainer} onPress={() => setRememberMe(!rememberMe)}>
            <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}/>
            <Text style={styles.optionText}>Se rappeller de moi</Text>
          </TouchableOpacity>
          <Link href="/forgotPassword" asChild>
            <TouchableOpacity>
              <Text style={styles.optionText}>Mot de Passe Oublié ?</Text>
            </TouchableOpacity>
          </Link>
        </View>

        <View style={styles.divider}>
          <View style={styles.line} />
          <Text style={styles.dividerText}>Connectez-vous avec</Text>
          <View style={styles.line} />
        </View>

        <View style={styles.socialButtons}>
          <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialLogin('facebook')}>
            <FontAwesome name="facebook" size={24} color="#4267B2" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialLogin('google')}>
            <AntDesign name="google" size={24} color="#DB4437" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.socialButton} onPress={() => handleSocialLogin('apple')}>
            <AntDesign name="apple" size={24} color="#000000" />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Vous n&apos;avez pas un compte?</Text>
          <Link href="/inscription">
            <Text style={styles.footerLink}>s&apos;inscrire</Text>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputError: {
    borderWidth: 1,
    borderColor: '#ff0000',
  },
  errorText: {
    color: '#ff0000',
    fontSize: 12,
    marginTop: 4,
  },
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    zIndex: 1,
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
    position: 'relative',
  }, 
  inputContainers: {
    marginBottom: 16,
    position: 'relative',
  },
  input: {
    height: 50,
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    paddingHorizontal: 16,
    fontSize: 14,
    marginBottom: 16,
    color: '#000',
  },
  emailInput: {
    marginBottom: 1,
    paddingRight: 50,
  },
  passwordInput: {
    paddingRight: 50,
  },
  inputIcon: {
    marginRight: 8,
  },
  iconText: {
    fontSize: 20,
  },
  mainButton: {
    height: 56,
    backgroundColor: '#07393C',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center'
  },
  mainButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 4,
    marginRight: 8,
  },
  checkboxChecked: {
    backgroundColor: '#07393C',
    borderColor: '#07393C',
  },
  optionText: {
    fontSize: 10,
    color: '#666',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#e0e0e0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#666',
    fontSize: 14,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  socialIcon: {
    fontSize: 20,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 32,
  },
  footerText: {
    color: '#666',
  },
  footerLink: {
    color: '#07393C',
    fontWeight: 'bold',
  },
});
