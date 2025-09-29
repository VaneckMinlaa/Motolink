import axios from 'axios';
import { Link, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import getEnvVars from '../config/environment';
import { FontAwesome } from '@expo/vector-icons';

export default function Inscription() {
  const [nomComplet, setNomComplet] = useState('');
  const [email, setEmail] = useState('');
  const [numeroTelephone, setNumeroTelephone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordsMatch, setPasswordsMatch] = useState(true);

  useEffect(() => {
    if (password || confirmPassword) {
      setPasswordsMatch(password === confirmPassword);
    } else {
      setPasswordsMatch(true);
    }
  }, [password, confirmPassword]);

  const handleInscription = async () => {
    if (!nomComplet || !numeroTelephone || !password || !confirmPassword) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs obligatoires');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    try {
      const { API_URL } = getEnvVars();
      const response = await axios.post(`${API_URL}/inscription`, {
        nom_complet: nomComplet,
        email: email,
        numero_telephone: numeroTelephone,
        mot_de_passe: password,
      });

      Alert.alert('Succès', response.data.message);
      router.replace('/login');
    } catch (error: any) {
      if (error.response) {
        Alert.alert('Erreur', error.response.data.message);
      } else {
        Alert.alert('Erreur', 'Une erreur est survenue lors de l\'inscription.');
        console.error(error);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Inscription</Text>
        <Text style={styles.subtitle}>Créer votre nouveau compte</Text>
        
        <View style={styles.inputContainer}>
          <FontAwesome name="phone" size={20} color="#07393C" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Nom Complet"
            autoCapitalize="words"
            value={nomComplet}
            onChangeText={setNomComplet}
          />
        </View>

        <View style={styles.inputContainer}>
          <FontAwesome name="phone" size={20} color="#07393C" style={styles.inputIcon} />
          <TextInput
            style={[styles.input, styles.emailInput]}
            placeholder="Utilisateur@gmail.com (Optionnel)"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>
        <View style={styles.inputContainer}>
          <FontAwesome name="phone" size={20} color="#07393C" style={styles.inputIcon} />
          <TextInput
            style={styles.input}
            placeholder="Numéro de téléphone"
            value={numeroTelephone}
            onChangeText={setNumeroTelephone}
            keyboardType="phone-pad"
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

        <View style={styles.inputContainer}>
          <FontAwesome name="lock" size={20} color="#07393C" style={styles.inputIcon} />
          <TextInput
            style={[
              styles.input,
              styles.passwordInput,
              !passwordsMatch && password && confirmPassword ? styles.inputError : null
            ]}
            placeholder="Confirmer votre mot de passe"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
          />
          {!passwordsMatch && password && confirmPassword && (
            <Text style={styles.errorText}>Les mots de passe ne correspondent pas</Text>
          )}
        </View>

        <TouchableOpacity style={styles.mainButton} onPress={handleInscription}>
          <Text style={styles.mainButtonText}>Inscription</Text>
        </TouchableOpacity>

        <View style={styles.optionsRow}>
          <TouchableOpacity style={styles.checkboxContainer}>
            <View style={styles.checkbox} />
            <Text style={styles.optionText}>Se rappeller de moi</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.optionText}>Mot de Passe Oublié ?</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Avez vous déjà un compte? </Text>
          <Link href="/login">
            <Text style={styles.footerLink}>connexion</Text>
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
  input: {
    height: 50,
    backgroundColor: '#f5f5f5',
    borderRadius: 24,
    paddingHorizontal: 16,
    fontSize: 14,
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
