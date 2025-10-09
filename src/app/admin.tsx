import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, Image, Linking, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import getEnvVars from '../config/environment';

type PendingRegistration = {
  mototaximan_id: number;
  user_id: number;
  nom_complet: string;
  numero_telephone: string;
  email: string;
  photo_url: string;
  numero_gillet: string;
  cni_url: string;
  statut: string;
  created_at: string;
};

type User = {
  id: number;
  nom_complet: string;
  email: string;
  numero_telephone: string;
  photo_url: string;
  role: string;
  created_at: string;
  mototaximan_id?: number;
  numero_gillet?: string;
  mototaximan_statut?: string;
  disponible?: boolean;
};

type Stats = {
  totalUsers: number;
  totalClients: number;
  totalMototaximen: number;
  pendingRegistrations: number;
  activeMototaximen: number;
  totalCourses: number;
  totalRatings: number;
};

export default function AdminPanel() {
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'pending' | 'users'>('dashboard');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'client' | 'mototaximan'>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<'all' | 'approuve' | 'en_attente' | 'refuse' | 'suspendu'>('all');
  const [showMenu, setShowMenu] = useState(false);
  const { API_URL } = getEnvVars();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadPendingRegistrations(),
        loadUsers(),
        loadStats()
      ]);
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      Alert.alert('Erreur', 'Impossible de charger les données');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingRegistrations = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/admin/pending-registrations`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPendingRegistrations(data);
      } else {
        throw new Error('Erreur lors du chargement des inscriptions en attente');
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      let url = `${API_URL}/api/admin/users?page=1&limit=50`;
      
      if (userRoleFilter !== 'all') {
        url += `&role=${userRoleFilter}`;
      }
      if (userStatusFilter !== 'all' && userRoleFilter === 'mototaximan') {
        url += `&statut=${userStatusFilter}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      } else {
        throw new Error('Erreur lors du chargement des utilisateurs');
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };


  const loadStats = async () => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      const response = await fetch(`${API_URL}/api/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        throw new Error('Erreur lors du chargement des statistiques');
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const handleValidateRegistration = async (mototaximanId: number, action: 'approuver' | 'refuser') => {
    Alert.alert(
      `Confirmer ${action === 'approuver' ? 'l\'approbation' : 'le refus'}`,
      `Êtes-vous sûr de vouloir ${action === 'approuver' ? 'approuver' : 'refuser'} cette inscription ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const response = await fetch(`${API_URL}/api/admin/validate-mototaximan/${mototaximanId}`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  action: action,
                  commentaire: `Validation ${action === 'approuver' ? 'approuvée' : 'refusée'} par l'administrateur`
                })
              });

              if (response.ok) {
                Alert.alert('Succès', `Inscription ${action === 'approuver' ? 'approuvée' : 'refusée'} avec succès`);
                loadPendingRegistrations();
                loadStats();
              } else {
                const errorData = await response.json();
                Alert.alert('Erreur', errorData.message);
              }
            } catch (error) {
              console.error('Erreur:', error);
              Alert.alert('Erreur', 'Une erreur est survenue');
            }
          }
        }
      ]
    );
  };

  const handleSuspendUser = async (userId: number, action: 'suspendre' | 'activer') => {
    Alert.alert(
      `Confirmer ${action === 'suspendre' ? 'la suspension' : 'l\'activation'}`,
      `Êtes-vous sûr de vouloir ${action === 'suspendre' ? 'suspendre' : 'activer'} cet utilisateur ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const response = await fetch(`${API_URL}/api/admin/suspend-user/${userId}`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  action: action,
                  raison: `${action === 'suspendre' ? 'Suspension' : 'Activation'} par l'administrateur`
                })
              });

              if (response.ok) {
                Alert.alert('Succès', `Utilisateur ${action === 'suspendre' ? 'suspendu' : 'activé'} avec succès`);
                loadUsers();
                loadStats();
              } else {
                const errorData = await response.json();
                Alert.alert('Erreur', errorData.message);
              }
            } catch (error) {
              console.error('Erreur:', error);
              Alert.alert('Erreur', 'Une erreur est survenue');
            }
          }
        }
      ]
    );
  };

  const handleDeleteUser = async (userId: number) => {
    Alert.alert(
      'Confirmer la suppression',
      'Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('userToken');
              const response = await fetch(`${API_URL}/api/admin/delete-user/${userId}`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                }
              });

              if (response.ok) {
                Alert.alert('Succès', 'Utilisateur supprimé avec succès');
                loadUsers();
                loadStats();
              } else {
                const errorData = await response.json();
                Alert.alert('Erreur', errorData.message);
              }
            } catch (error) {
              console.error('Erreur:', error);
              Alert.alert('Erreur', 'Une erreur est survenue');
            }
          }
        }
      ]
    );
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userRole');
      router.replace('/login');
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.nom_complet.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.numero_telephone.includes(searchQuery);
    // Exclure l'admin de la liste des utilisateurs
    const isNotAdmin = user.role !== 'admin';
    
    // Appliquer le filtre de rôle
    const matchesRole = userRoleFilter === 'all' || user.role === userRoleFilter;
    
    // Appliquer le filtre de statut pour les mototaximen
    const matchesStatus = userStatusFilter === 'all' || 
                         (userRoleFilter === 'mototaximan' && user.mototaximan_statut === userStatusFilter) ||
                         (userRoleFilter !== 'mototaximan');
    
    return matchesSearch && isNotAdmin && matchesRole && matchesStatus;
  });

  const renderPendingRegistration = ({ item }: { item: PendingRegistration }) => (
    <View style={styles.registrationCard}>
      <View style={styles.registrationHeader}>
        {item.photo_url ? (
          <Image source={{ uri: item.photo_url.startsWith('http') ? item.photo_url : `${API_URL}${item.photo_url}` }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <MaterialIcons name="person" size={24} color="#07393C" />
          </View>
        )}
        <View style={styles.registrationInfo}>
          <Text style={styles.registrationName}>{item.nom_complet}</Text>
          <Text style={styles.registrationPhone}>{item.numero_telephone}</Text>
          <Text style={styles.registrationGillet}>Gillet: {item.numero_gillet}</Text>
        </View>
      </View>
      
      <View style={styles.documentSection}>
        <Text style={styles.documentTitle}>Documents:</Text>
        {item.cni_url && (
          <TouchableOpacity 
            style={styles.documentButton}
            onPress={() => Linking.openURL(`${API_URL}${item.cni_url}`)}
          >
              <MaterialIcons name="description" size={20} color="#07393C" />
            <Text style={styles.documentText}>Voir CNI</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.approveButton]}
          onPress={() => handleValidateRegistration(item.mototaximan_id, 'approuver')}
        >
          <MaterialIcons name="check" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Approuver</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.rejectButton]}
          onPress={() => handleValidateRegistration(item.mototaximan_id, 'refuser')}
        >
          <MaterialIcons name="close" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Refuser</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approuve':
        return '#4CAF50'; // Vert
      case 'en_attente':
        return '#FF9800'; // Orange
      case 'refuse':
        return '#F44336'; // Rouge
      case 'suspendu':
        return '#9E9E9E'; // Gris
      default:
        return '#FF9800'; // Orange par défaut
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approuve':
        return 'check-circle';
      case 'en_attente':
        return 'pending';
      case 'refuse':
        return 'cancel';
      case 'suspendu':
        return 'pause-circle';
      default:
        return 'pending';
    }
  };

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.avatarContainer}>
          {item.photo_url ? (
            <Image source={{ uri: item.photo_url.startsWith('http') ? item.photo_url : `${API_URL}${item.photo_url}` }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <MaterialIcons name="person" size={28} color="#666" />
            </View>
          )}
          {item.mototaximan_statut && (
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.mototaximan_statut) }]}>
              <MaterialIcons 
                name={getStatusIcon(item.mototaximan_statut) as any} 
                size={12} 
                color="#fff" 
              />
            </View>
          )}
        </View>
        
        <View style={styles.userInfo}>
          <View style={styles.userNameContainer}>
            <Text style={styles.userName}>{item.nom_complet}</Text>
            <View style={[styles.roleBadge, { backgroundColor: item.role === 'client' ? '#E3F2FD' : '#FFF3E0' }]}>
              <Text style={[styles.roleText, { color: item.role === 'client' ? '#1976D2' : '#F57C00' }]}>
                {item.role === 'client' ? 'Client' : 'Mototaximan'}
              </Text>
            </View>
          </View>
          
          <View style={styles.userDetails}>
            <View style={styles.detailRow}>
              <MaterialIcons name="phone" size={16} color="#666" />
              <Text style={styles.userPhone}>{item.numero_telephone}</Text>
            </View>
            
            <View style={styles.detailRow}>
              <MaterialIcons name="email" size={16} color="#666" />
              <Text style={styles.userEmail}>{item.email}</Text>
            </View>
            
            {item.numero_gillet && (
              <View style={styles.detailRow}>
                <MaterialIcons name="local-taxi" size={16} color="#666" />
                <Text style={styles.gilletNumber}>Gillet: {item.numero_gillet}</Text>
              </View>
            )}
            
            {item.mototaximan_statut && (
              <View style={styles.detailRow}>
                <MaterialIcons 
                  name={getStatusIcon(item.mototaximan_statut) as any} 
                  size={16} 
                  color={getStatusColor(item.mototaximan_statut)} 
                />
                <Text style={[styles.userStatus, { color: getStatusColor(item.mototaximan_statut) }]}>
                  {item.mototaximan_statut.charAt(0).toUpperCase() + item.mototaximan_statut.slice(1).replace('_', ' ')}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
      
      <View style={styles.userActions}>
        {item.role !== 'admin' && (
          <>
            <TouchableOpacity 
              style={[styles.userActionButton, styles.suspendButton]}
              onPress={() => handleSuspendUser(item.id, item.mototaximan_statut === 'suspendu' ? 'activer' : 'suspendre')}
            >
              <MaterialIcons 
                name={item.mototaximan_statut === 'suspendu' ? 'play-arrow' : 'pause'} 
                size={18} 
                color="#fff" 
              />
              <Text style={styles.userActionButtonText}>
                {item.mototaximan_statut === 'suspendu' ? 'Activer' : 'Suspendre'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.userActionButton, styles.deleteButton]}
              onPress={() => handleDeleteUser(item.id)}
            >
              <MaterialIcons name="delete" size={18} color="#fff" />
              <Text style={styles.userActionButtonText}>Supprimer</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );


  const renderDashboard = () => (
    <ScrollView style={styles.dashboard} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      {stats && (
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <MaterialIcons name="people" size={24} color="#07393C" />
            <Text style={styles.statNumber}>{stats.totalUsers}</Text>
            <Text style={styles.statLabel}>Utilisateurs totaux</Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialIcons name="person" size={24} color="#07393C" />
            <Text style={styles.statNumber}>{stats.totalClients}</Text>
            <Text style={styles.statLabel}>Clients</Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialIcons name="motorcycle" size={24} color="#07393C" />
            <Text style={styles.statNumber}>{stats.totalMototaximen}</Text>
            <Text style={styles.statLabel}>Mototaximen</Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialIcons name="pending" size={24} color="#FFA500" />
            <Text style={styles.statNumber}>{stats.pendingRegistrations}</Text>
            <Text style={styles.statLabel}>En attente</Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialIcons name="check-circle" size={24} color="#4CAF50" />
            <Text style={styles.statNumber}>{stats.activeMototaximen}</Text>
            <Text style={styles.statLabel}>Actifs</Text>
          </View>
          
          <View style={styles.statCard}>
            <MaterialIcons name="local-taxi" size={24} color="#07393C" />
            <Text style={styles.statNumber}>{stats.totalCourses}</Text>
            <Text style={styles.statLabel}>Courses</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );

  const renderPendingTab = () => (
    <View style={styles.tabContent}>
      {pendingRegistrations.length === 0 ? (
        <View style={styles.emptyState}>
          <MaterialIcons name="check-circle" size={48} color="#4CAF50" />
          <Text style={styles.emptyStateText}>Aucune inscription en attente</Text>
        </View>
      ) : (
        <FlatList
          data={pendingRegistrations}
          renderItem={renderPendingRegistration}
          keyExtractor={(item) => item.mototaximan_id.toString()}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}
    </View>
  );

  const renderUsersTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.filters}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher un utilisateur..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        
        <View style={styles.filterButtons}>
          <TouchableOpacity 
            style={[styles.filterButton, userRoleFilter === 'all' && styles.filterButtonActive]}
            onPress={() => setUserRoleFilter('all')}
          >
            <Text style={[styles.filterButtonText, userRoleFilter === 'all' && styles.filterButtonTextActive]}>Tous</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, userRoleFilter === 'client' && styles.filterButtonActive]}
            onPress={() => setUserRoleFilter('client')}
          >
            <Text style={[styles.filterButtonText, userRoleFilter === 'client' && styles.filterButtonTextActive]}>Clients</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterButton, userRoleFilter === 'mototaximan' && styles.filterButtonActive]}
            onPress={() => setUserRoleFilter('mototaximan')}
          >
            <Text style={[styles.filterButtonText, userRoleFilter === 'mototaximan' && styles.filterButtonTextActive]}>Mototaximen</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      <FlatList
        data={filteredUsers}
        renderItem={renderUser}
        keyExtractor={(item) => item.id.toString()}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      />
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <MaterialIcons name="admin-panel-settings" size={48} color="#07393C" />
        <Text style={styles.loadingText}>Chargement du panneau d'administration...</Text>
      </View>
    );
  }

  const menuItems = [
    { key: 'dashboard', label: 'Tableau de bord', icon: 'dashboard' },
    { key: 'pending', label: 'En attente', icon: 'pending' },
    { key: 'users', label: 'Utilisateurs', icon: 'people' }
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.menuButton} onPress={() => setShowMenu(!showMenu)}>
          <MaterialIcons name="menu" size={24} color="#07393C" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialIcons name="logout" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      
      {/* Menu déroulant */}
      {showMenu && (
        <TouchableOpacity 
          style={styles.menuOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <TouchableOpacity 
            style={styles.menuContainer}
            activeOpacity={1}
            onPress={() => {}} // Empêche la fermeture en cliquant sur le menu
          >
            <Text style={styles.menuTitle}>Menu</Text>
            {menuItems.map((item) => (
              <TouchableOpacity
                key={item.key}
                style={[
                  styles.menuItem,
                  activeTab === item.key && styles.menuItemActive
                ]}
                onPress={() => {
                  setActiveTab(item.key as any);
                  setShowMenu(false);
                }}
              >
                <MaterialIcons 
                  name={item.icon as any} 
                  size={20} 
                  color={activeTab === item.key ? '#fff' : '#07393C'} 
                />
                <Text style={[
                  styles.menuItemText,
                  activeTab === item.key && styles.menuItemTextActive
                ]}>
                  {item.label}
                </Text>
                {item.key === 'pending' && stats && stats.pendingRegistrations > 0 && (
                  <View style={styles.menuBadge}>
                    <Text style={styles.menuBadgeText}>{stats.pendingRegistrations}</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      )}
      
      {/* Indicateur de l'onglet actuel */}
      <View style={styles.currentTabIndicator}>
        <MaterialIcons 
          name={menuItems.find(item => item.key === activeTab)?.icon as any || 'dashboard'} 
          size={16} 
          color="#07393C" 
        />
        <Text style={styles.currentTabText}>
          {menuItems.find(item => item.key === activeTab)?.label || 'Tableau de bord'}
        </Text>
      </View>
      
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'pending' && renderPendingTab()}
      {activeTab === 'users' && renderUsersTab()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#07393C',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuButton: {
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#07393C',
  },
  logoutButton: {
    backgroundColor: '#D32F2F',
    padding: 8,
    borderRadius: 8,
  },
  menuOverlay: {
    position: 'absolute',
    top: 90,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1000,
  },
  menuContainer: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 12,
    elevation: 5,
    shadowColor: '#07393C',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#07393C',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuItemActive: {
    backgroundColor: '#07393C',
  },
  menuItemText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#07393C',
    flex: 1,
  },
  menuItemTextActive: {
    color: '#fff',
  },
  menuBadge: {
    backgroundColor: '#FFA500',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  menuBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  currentTabIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    elevation: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  currentTabText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#07393C',
  },
  tabContent: {
    flex: 1,
  },
  dashboard: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#07393C',
    marginBottom: 20,
  },
  tabHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    elevation: 1,
  },
  refreshButton: {
    padding: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 1,
    alignItems: 'center',
    width: '48%',
    marginBottom: 15,
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#07393C',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  filters: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInput: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    fontSize: 16,
  },
  filterButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  filterButtonActive: {
    backgroundColor: '#07393C',
  },
  filterButtonText: {
    fontSize: 14,
    color: '#07393C',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  registrationCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
  },
  registrationHeader: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  userCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 1,
    elevation: 3,
    shadowColor: '#07393C',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#fff',
  },
  userHeader: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 15,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#f0f0f0',
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#e0e0e0',
  },
  statusBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  registrationInfo: {
    flex: 1,
  },
  userInfo: {
    flex: 1,
  },
  userNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginRight: 10,
    flex: 1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 'auto',
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userPhone: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  userEmail: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  gilletNumber: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  registrationName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#07393C',
  },
  registrationPhone: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  registrationGillet: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#07393C',
    marginTop: 4,
    fontWeight: '600',
  },
  userStatus: {
    fontSize: 14,
    color: '#FFA500',
    marginTop: 4,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  documentSection: {
    marginBottom: 15,
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#07393C',
    marginBottom: 10,
  },
  documentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  documentText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#07393C',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
    justifyContent: 'center',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#F44336',
  },
  actionButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 'bold',
  },
  userActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  userActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    minWidth: 100,
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#07393C',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  suspendButton: {
    backgroundColor: '#FF9800',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  userActionButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
});
