import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface CourseDetailsProps {
  course: {
    id: string;
    client_nom: string;
    client_telephone: string;
    position_depart: {
      latitude: number;
      longitude: number;
      adresse?: string;
    };
    position_arrivee: {
      latitude: number;
      longitude: number;
      adresse?: string;
    };
    statut: 'en_attente' | 'acceptee' | 'en_cours' | 'terminee' | 'annulee';
  };
  visible: boolean;
  onClose: () => void;
  onAccept: () => void;
  onStart: () => void;
  onFinish: () => void;
}

export default function CourseDetails({ 
  course, 
  visible, 
  onClose, 
  onAccept, 
  onStart, 
  onFinish 
}: CourseDetailsProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={24} color="#07393C" />
          </TouchableOpacity>

          <Text style={styles.title}>Détails de la course</Text>
          
          <View style={styles.clientInfo}>
            <MaterialIcons name="person" size={24} color="#07393C" />
            <View style={styles.clientDetails}>
              <Text style={styles.clientName}>{course.client_nom}</Text>
              <Text style={styles.clientPhone}>{course.client_telephone}</Text>
            </View>
          </View>

          <View style={styles.locationInfo}>
            <View style={styles.locationRow}>
              <MaterialIcons name="location-on" size={24} color="#07393C" />
              <Text style={styles.locationText}>
                {course.position_depart.adresse || 'Point de départ'}
              </Text>
            </View>
            <View style={styles.locationRow}>
              <MaterialIcons name="flag" size={24} color="#07393C" />
              <Text style={styles.locationText}>
                {course.position_arrivee.adresse || 'Destination'}
              </Text>
            </View>
          </View>

          {course.statut === 'en_attente' && (
            <TouchableOpacity style={styles.actionButton} onPress={onAccept}>
              <Text style={styles.actionButtonText}>Accepter la course</Text>
            </TouchableOpacity>
          )}

          {course.statut === 'acceptee' && (
            <TouchableOpacity style={styles.actionButton} onPress={onStart}>
              <Text style={styles.actionButtonText}>Démarrer la course</Text>
            </TouchableOpacity>
          )}

          {course.statut === 'en_cours' && (
            <TouchableOpacity style={styles.actionButton} onPress={onFinish}>
              <Text style={styles.actionButtonText}>Terminer la course</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: '50%',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    top: 20,
    zIndex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#07393C',
    marginBottom: 20,
    marginTop: 10,
  },
  clientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  clientDetails: {
    marginLeft: 10,
  },
  clientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#07393C',
  },
  clientPhone: {
    fontSize: 14,
    color: '#666',
  },
  locationInfo: {
    marginBottom: 20,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
  },
  locationText: {
    marginLeft: 10,
    fontSize: 16,
    color: '#333',
  },
  actionButton: {
    backgroundColor: '#07393C',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 20,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});