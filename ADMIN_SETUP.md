# Système d'Administration Motolink

## Vue d'ensemble

Le système d'administration Motolink permet aux administrateurs de :
- ✅ Valider les inscriptions des mototaximen
- ✅ Gérer tous les utilisateurs du système
- ✅ Suspendre/activer des comptes
- ✅ Supprimer des utilisateurs
- ✅ Consulter les statistiques du système
- ✅ Suivre l'historique des actions administratives

## Configuration initiale

### 1. Créer un compte administrateur

Exécutez le script pour créer un compte admin par défaut :

```bash
cd server
node create-admin.js
```

**Identifiants par défaut :**
- 📧 Email: `admin@motolink.com`
- 📱 Téléphone: `+237123456789`
- 🔑 Mot de passe: `admin123`

⚠️ **IMPORTANT :** Changez ce mot de passe après votre première connexion !

### 2. Structure de la base de données

Le système ajoute automatiquement les tables suivantes :

#### Table `admin_actions`
Enregistre toutes les actions administratives pour l'audit.

#### Table `notifications_admin`
Stocke les notifications pour les administrateurs.

#### Modification de la table `utilisateurs`
- Ajout du rôle `admin` dans l'enum `role`

#### Modification de la table `mototaximen`
- Le statut par défaut est `en_attente`
- Statuts possibles : `en_attente`, `approuve`, `refuse`, `suspendu`

## Utilisation du panneau d'administration

### 1. Connexion administrateur

1. Ouvrez l'application Motolink
2. Connectez-vous avec les identifiants administrateur
3. Vous serez automatiquement redirigé vers `/admin`

### 2. Tableau de bord

Le tableau de bord affiche :
- 📊 Nombre total d'utilisateurs
- 👥 Nombre de clients
- 🏍️ Nombre de mototaximen
- ⏳ Inscriptions en attente
- ✅ Mototaximen actifs
- 🚗 Nombre de courses
- ⭐ Nombre d'évaluations

### 3. Validation des inscriptions

#### Onglet "En attente"
- 📋 Liste de toutes les inscriptions en attente
- 👤 Informations complètes du mototaximan
- 📄 Visualisation des documents (CNI)
- ✅ Bouton "Approuver"
- ❌ Bouton "Refuser"

#### Processus de validation
1. L'administrateur consulte les documents
2. Clique sur "Approuver" ou "Refuser"
3. Confirme l'action
4. Le statut est mis à jour automatiquement
5. L'action est enregistrée dans l'historique

### 4. Gestion des utilisateurs

#### Onglet "Utilisateurs"
- 🔍 Recherche par nom ou téléphone
- 🏷️ Filtres par rôle (Tous, Clients, Mototaximen)
- 📊 Liste complète des utilisateurs

#### Actions disponibles
- ⏸️ **Suspendre/Activer** : Empêche ou autorise la connexion
- 🗑️ **Supprimer** : Suppression définitive (avec confirmation)

#### Restrictions
- ❌ Impossible de supprimer un administrateur
- ❌ Impossible de suspendre un administrateur
- ✅ Protection contre les actions sur les comptes admin

## API Endpoints

### Authentification Admin
- `POST /api/admin/create` - Créer un compte admin (développement)
- `GET /api/admin/pending-registrations` - Inscriptions en attente
- `POST /api/admin/validate-mototaximan/:id` - Valider/refuser une inscription

### Gestion des utilisateurs
- `GET /api/admin/users` - Liste des utilisateurs (avec pagination)
- `POST /api/admin/suspend-user/:id` - Suspendre/activer un utilisateur
- `DELETE /api/admin/delete-user/:id` - Supprimer un utilisateur

### Statistiques et historique
- `GET /api/admin/stats` - Statistiques du système
- `GET /api/admin/actions-history` - Historique des actions admin

## Sécurité

### Middleware de vérification
- 🔐 Vérification du token JWT
- 👑 Vérification du rôle administrateur
- 🛡️ Protection contre les accès non autorisés

### Audit trail
- 📝 Toutes les actions sont enregistrées
- 🕒 Horodatage des actions
- 👤 Identification de l'administrateur responsable

## Flux de validation des mototaximen

### 1. Inscription
1. Le mototaximan s'inscrit via l'app
2. Les documents sont uploadés (CNI, photo)
3. Le statut est défini sur `en_attente`
4. Une notification est créée pour l'admin

### 2. Validation
1. L'admin consulte l'onglet "En attente"
2. Vérifie les documents
3. Approuve ou refuse l'inscription
4. Le statut est mis à jour

### 3. Conséquences
- ✅ **Approuvé** : Le mototaximan peut se connecter
- ❌ **Refusé** : Le mototaximan ne peut pas se connecter
- ⏸️ **Suspendu** : Le mototaximan ne peut pas se connecter

## Messages d'erreur personnalisés

### Pour les mototaximen en attente
```
"Votre inscription est en cours de validation par un administrateur. 
Vous recevrez une notification une fois approuvée."
```

### Pour les mototaximen refusés
```
"Votre inscription a été refusée. 
Contactez le support pour plus d'informations."
```

### Pour les comptes suspendus
```
"Votre compte a été suspendu. 
Contactez le support pour plus d'informations."
```

## Déploiement

### Variables d'environnement
Assurez-vous que `JWT_SECRET` est configuré dans votre environnement.

### Base de données
Les tables sont créées automatiquement au démarrage du serveur.

### Première utilisation
1. Démarrez le serveur
2. Exécutez `node create-admin.js`
3. Connectez-vous avec les identifiants par défaut
4. Changez le mot de passe administrateur
5. Commencez à valider les inscriptions !

## Support

Pour toute question ou problème avec le système d'administration :
1. Vérifiez les logs du serveur
2. Consultez l'historique des actions admin
3. Vérifiez la connectivité à la base de données
4. Contactez l'équipe de développement

---

🎉 **Le système d'administration Motolink est maintenant prêt à être utilisé !**
