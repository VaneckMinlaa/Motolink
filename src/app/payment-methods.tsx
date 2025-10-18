import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import ProgressBar from '../components/ProgressBar';
import { CashIcon, MobileMoneyIcon, OrangeMoneyIcon } from '../components/icons';

interface PaymentMethod {
  id: string;
  name: string;
  type: 'cash' | 'mobile_money';
  icon: React.ComponentType<{size?: number, color?: string}>;
  description: string;
  available: boolean;
  isDefault?: boolean;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: 'orange_money',
    name: 'Orange Money',
    type: 'mobile_money',
    icon: OrangeMoneyIcon,
    description: 'Payer en utilisant Orange Money',
    available: true,
    isDefault: true,
  },
  {
    id: 'mobile_money',
    name: 'Mobile Money',
    type: 'mobile_money',
    icon: MobileMoneyIcon,
    description: 'Payer en utilisant Mobile Money',
    available: true,
    isDefault: false,
  },
  {
    id: 'cash',
    name: 'Espèces',
    type: 'cash',
    icon: CashIcon,
    description: 'Payer sur place',
    available: true,
    isDefault: false,
  },
];

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const [selectedMethod, setSelectedMethod] = useState<string>('orange_money');

  const handleSelectMethod = async (methodId: string) => {
    const method = paymentMethods.find(m => m.id === methodId);
    if (method && !method.available) {
      Alert.alert(
        'Méthode indisponible',
        'Cette méthode de paiement n\'est pas encore disponible.'
      );
      return;
    }

    if (methodId === 'orange_money') {
      const montant = 1000;
      const numeroChauffeur = '237694000000';
      
      const ussdCode = `tel:#150*1*${numeroChauffeur}*${montant}#`;
      
      try {
        await Linking.openURL(ussdCode);
        setSelectedMethod(methodId);
      } catch (error) {
        console.log('Erreur lors de l\'ouverture du dialer:', error);
        Alert.alert('Erreur', 'Impossible d\'ouvrir le dialer. Essayez manuellement.');
      }
      return;
    }

    setSelectedMethod(methodId);
  };

  const handleNext = () => {
    const selected = paymentMethods.find(m => m.id === selectedMethod);
    if (selected) {
      Alert.alert(
        'Confirmation',
        `Vous avez choisi: ${selected.name}. Voulez-vous continuer ?`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Oui', onPress: () => {
            if (selected.id === 'orange_money') {
              handleSelectMethod('orange_money');
            }
            router.push('/');
          } }
        ]
      );
    }
  };

  const renderPaymentMethod = (method: PaymentMethod) => {
    const isSelected = selectedMethod === method.id;
    const isUnavailable = !method.available;
    const IconComponent = method.icon;

    return (
      <TouchableOpacity
        key={method.id}
        style={styles.paymentMethodItem}
        onPress={() => handleSelectMethod(method.id)}
        disabled={isUnavailable}
      >
        <View style={styles.iconContainer}>
          <IconComponent size={40} />
        </View>
        <View style={styles.methodInfo}>
          <Text style={[styles.methodName, isUnavailable && styles.unavailableText]}>
            {method.name}
          </Text>
          <Text style={[styles.methodDescription, isUnavailable && styles.unavailableText]}>
            {method.description}
          </Text>
        </View>
        <View style={styles.radioContainer}>
          <View style={[
            styles.radioCircle,
            isSelected ? styles.radioSelected : styles.radioUnselected
          ]}>
            {isSelected && <View style={styles.radioInner} />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.backButtonCircle}>
            <Feather name="chevron-left" size={24} color="#666" />
          </View>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Page paiement</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ProgressBar 
        currentStep={0} 
        steps={['Paiements', 'Confirmation']} 
      />

      <ScrollView style={styles.content}>
        <Text style={styles.sectionTitle}>Modes de Paiements</Text>
        <View style={styles.methodsList}>
          {paymentMethods.map(renderPaymentMethod)}
        </View>
      </ScrollView>

      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextButtonText}>Suivant</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 4,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    flex: 1,
    textAlign: 'center',
    marginRight: 44,
  },
  headerSpacer: {
    width: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#28a745',
    marginTop: 24,
    marginBottom: 24,
  },
  methodsList: {
    marginBottom: 20,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  iconContainer: {
    marginRight: 16,
  },
  methodInfo: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  methodDescription: {
    fontSize: 14,
    color: '#666',
  },
  unavailableText: {
    color: '#ccc',
  },
  radioContainer: {
    marginLeft: 16,
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioSelected: {
    backgroundColor: '#28a745',
    borderWidth: 0,
  },
  radioUnselected: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#ddd',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  nextButton: {
    backgroundColor: '#28a745',
    paddingVertical: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 30,
    borderRadius: 25,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});