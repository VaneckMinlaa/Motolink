const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

// Middleware pour vérifier si l'utilisateur est admin
const verifyAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Token d\'accès requis' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt');
    
    // Vérifier que l'utilisateur est admin
    const query = 'SELECT role FROM utilisateurs WHERE id = ?';
    db.query(query, [decoded.id], (err, results) => {
      if (err) {
        return res.status(500).json({ message: 'Erreur lors de la vérification du rôle' });
      }
      
      if (results.length === 0 || results[0].role !== 'admin') {
        return res.status(403).json({ message: 'Accès refusé. Rôle administrateur requis.' });
      }
      
      req.user = decoded;
      next();
    });
  } catch (error) {
    return res.status(401).json({ message: 'Token invalide' });
  }
};

// Route pour créer un compte admin (à utiliser uniquement en développement)
router.post('/api/admin/create', async (req, res) => {
  const { nom_complet, email, numero_telephone, mot_de_passe } = req.body;
  
  if (!nom_complet || !email || !numero_telephone || !mot_de_passe) {
    return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
  }

  try {
    const hash = await bcrypt.hash(mot_de_passe, 10);
    const query = 'INSERT INTO utilisateurs (nom_complet, email, numero_telephone, mot_de_passe, role) VALUES (?, ?, ?, ?, "admin")';
    
    db.query(query, [nom_complet, email, numero_telephone, hash], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: 'Ce numéro de téléphone ou email existe déjà' });
        }
        return res.status(500).json({ message: 'Erreur lors de la création du compte admin' });
      }
      
      res.status(201).json({ 
        message: 'Compte administrateur créé avec succès',
        adminId: result.insertId 
      });
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du hachage du mot de passe' });
  }
});

// Route pour obtenir toutes les inscriptions en attente de validation
router.get('/api/admin/pending-registrations', verifyAdmin, (req, res) => {
  const query = `
    SELECT 
      m.id as mototaximan_id,
      u.id as user_id,
      u.nom_complet,
      u.numero_telephone,
      u.email,
      u.photo_url,
      m.numero_gillet,
      m.cni_url,
      m.statut,
      u.created_at
    FROM mototaximen m
    JOIN utilisateurs u ON m.utilisateur_id = u.id
    WHERE m.statut = 'en_attente'
    ORDER BY u.created_at DESC
  `;
  
  db.query(query, [], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur lors de la récupération des inscriptions' });
    }
    
    res.json(results);
  });
});

// Route pour valider une inscription mototaximan
router.post('/api/admin/validate-mototaximan/:id', verifyAdmin, (req, res) => {
  const mototaximanId = req.params.id;
  const { action, commentaire } = req.body; // action: 'approuver' ou 'refuser'
  
  if (!action || !['approuver', 'refuser'].includes(action)) {
    return res.status(400).json({ message: 'Action invalide. Utilisez "approuver" ou "refuser"' });
  }
  
  const newStatus = action === 'approuver' ? 'approuve' : 'refuse';
  
  // Mettre à jour le statut
  const updateQuery = 'UPDATE mototaximen SET statut = ? WHERE id = ?';
  db.query(updateQuery, [newStatus, mototaximanId], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur lors de la mise à jour du statut' });
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Mototaximan non trouvé' });
    }
    
    // Enregistrer l'action admin
    const actionQuery = `
      INSERT INTO admin_actions (admin_id, action_type, target_mototaximan_id, details)
      VALUES (?, 'validation_mototaximan', ?, ?)
    `;
    const details = JSON.stringify({
      action: action,
      commentaire: commentaire || '',
      timestamp: new Date().toISOString()
    });
    
    db.query(actionQuery, [req.user.id, mototaximanId, details], (err) => {
      if (err) {
        console.error('Erreur lors de l\'enregistrement de l\'action admin:', err);
      }
    });
    
    res.json({ 
      message: `Inscription ${action === 'approuver' ? 'approuvée' : 'refusée'} avec succès` 
    });
  });
});

// Route pour obtenir tous les utilisateurs avec leurs informations
router.get('/api/admin/users', verifyAdmin, (req, res) => {
  const { page = 1, limit = 20, role, statut } = req.query;
  const offset = (page - 1) * limit;
  
  let whereClause = 'WHERE 1=1';
  const params = [];
  
  if (role) {
    whereClause += ' AND u.role = ?';
    params.push(role);
  }
  
  if (statut && role === 'mototaximan') {
    whereClause += ' AND m.statut = ?';
    params.push(statut);
  }
  
  const query = `
    SELECT 
      u.id,
      u.nom_complet,
      u.email,
      u.numero_telephone,
      u.photo_url,
      u.role,
      u.created_at,
      m.id as mototaximan_id,
      m.numero_gillet,
      m.statut as mototaximan_statut,
      m.disponible
    FROM utilisateurs u
    LEFT JOIN mototaximen m ON u.id = m.utilisateur_id
    ${whereClause}
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  params.push(parseInt(limit), offset);
  
  db.query(query, params, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur lors de la récupération des utilisateurs' });
    }
    
    // Compter le total pour la pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM utilisateurs u
      LEFT JOIN mototaximen m ON u.id = m.utilisateur_id
      ${whereClause}
    `;
    
    db.query(countQuery, params.slice(0, -2), (err, countResult) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Erreur lors du comptage des utilisateurs' });
      }
      
      res.json({
        users: results,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: countResult[0].total,
          pages: Math.ceil(countResult[0].total / limit)
        }
      });
    });
  });
});

// Route pour suspendre/désactiver un utilisateur
router.post('/api/admin/suspend-user/:id', verifyAdmin, (req, res) => {
  const userId = req.params.id;
  const { action, raison } = req.body; // action: 'suspendre' ou 'activer'
  
  if (!action || !['suspendre', 'activer'].includes(action)) {
    return res.status(400).json({ message: 'Action invalide. Utilisez "suspendre" ou "activer"' });
  }
  
  // Vérifier si l'utilisateur existe et n'est pas déjà admin
  const checkQuery = 'SELECT role FROM utilisateurs WHERE id = ?';
  db.query(checkQuery, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Erreur lors de la vérification de l\'utilisateur' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    if (results[0].role === 'admin') {
      return res.status(403).json({ message: 'Impossible de suspendre un administrateur' });
    }
    
    // Mettre à jour le statut
    let updateQuery, newStatus;
    
    if (results[0].role === 'mototaximan') {
      newStatus = action === 'suspendre' ? 'suspendu' : 'approuve';
      updateQuery = 'UPDATE mototaximen SET statut = ? WHERE utilisateur_id = ?';
    } else {
      // Pour les clients, on peut ajouter un champ is_active dans utilisateurs
      // Pour l'instant, on utilise le statut mototaximan même pour les clients
      newStatus = action === 'suspendre' ? 'suspendu' : 'approuve';
      updateQuery = 'UPDATE mototaximen SET statut = ? WHERE utilisateur_id = ?';
    }
    
    db.query(updateQuery, [newStatus, userId], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Erreur lors de la mise à jour du statut' });
      }
      
      // Enregistrer l'action admin
      const actionQuery = `
        INSERT INTO admin_actions (admin_id, action_type, target_user_id, details)
        VALUES (?, ?, ?, ?)
      `;
      const actionType = action === 'suspendre' ? 'suspension_utilisateur' : 'activation_utilisateur';
      const details = JSON.stringify({
        action: action,
        raison: raison || '',
        timestamp: new Date().toISOString()
      });
      
      db.query(actionQuery, [req.user.id, actionType, userId, details], (err) => {
        if (err) {
          console.error('Erreur lors de l\'enregistrement de l\'action admin:', err);
        }
      });
      
      res.json({ 
        message: `Utilisateur ${action === 'suspendre' ? 'suspendu' : 'activé'} avec succès` 
      });
    });
  });
});

// Route pour supprimer un utilisateur
router.delete('/api/admin/delete-user/:id', verifyAdmin, (req, res) => {
  const userId = req.params.id;
  
  // Vérifier si l'utilisateur existe et n'est pas admin
  const checkQuery = 'SELECT role FROM utilisateurs WHERE id = ?';
  db.query(checkQuery, [userId], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Erreur lors de la vérification de l\'utilisateur' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }
    
    if (results[0].role === 'admin') {
      return res.status(403).json({ message: 'Impossible de supprimer un administrateur' });
    }
    
    // Supprimer l'utilisateur (cascade supprimera aussi mototaximen)
    const deleteQuery = 'DELETE FROM utilisateurs WHERE id = ?';
    db.query(deleteQuery, [userId], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Erreur lors de la suppression de l\'utilisateur' });
      }
      
      // Enregistrer l'action admin
      const actionQuery = `
        INSERT INTO admin_actions (admin_id, action_type, target_user_id, details)
        VALUES (?, 'suppression_utilisateur', ?, ?)
      `;
      const details = JSON.stringify({
        timestamp: new Date().toISOString()
      });
      
      db.query(actionQuery, [req.user.id, userId, details], (err) => {
        if (err) {
          console.error('Erreur lors de l\'enregistrement de l\'action admin:', err);
        }
      });
      
      res.json({ message: 'Utilisateur supprimé avec succès' });
    });
  });
});

// Route pour obtenir les statistiques du système
router.get('/api/admin/stats', verifyAdmin, (req, res) => {
  const queries = {
    totalUsers: 'SELECT COUNT(*) as count FROM utilisateurs',
    totalClients: 'SELECT COUNT(*) as count FROM utilisateurs WHERE role = "client"',
    totalMototaximen: 'SELECT COUNT(*) as count FROM utilisateurs WHERE role = "mototaximan"',
    pendingRegistrations: 'SELECT COUNT(*) as count FROM mototaximen WHERE statut = "en_attente"',
    activeMototaximen: 'SELECT COUNT(*) as count FROM mototaximen WHERE statut = "approuve" AND disponible = true',
    totalCourses: 'SELECT COUNT(*) as count FROM courses',
    totalRatings: 'SELECT COUNT(*) as count FROM evaluations'
  };
  
  const stats = {};
  let completedQueries = 0;
  const totalQueries = Object.keys(queries).length;
  
  Object.keys(queries).forEach(key => {
    db.query(queries[key], [], (err, results) => {
      if (err) {
        console.error(`Erreur pour la requête ${key}:`, err);
        stats[key] = 0;
      } else {
        stats[key] = results[0].count;
      }
      
      completedQueries++;
      if (completedQueries === totalQueries) {
        res.json(stats);
      }
    });
  });
});

// Route pour obtenir les connexions mensuelles
router.get('/api/admin/monthly-connections', verifyAdmin, (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  
  const query = `
    SELECT 
      MONTH(created_at) as month,
      COUNT(*) as connections
    FROM utilisateurs 
    WHERE YEAR(created_at) = ? 
      AND role != 'admin'
    GROUP BY MONTH(created_at)
    ORDER BY MONTH(created_at)
  `;
  
  db.query(query, [year], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur lors de la récupération des connexions mensuelles' });
    }
    
    // Créer un tableau avec tous les mois de l'année
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
    const monthlyData = [];
    
    // Initialiser tous les mois avec 0 connexions
    for (let i = 1; i <= 12; i++) {
      monthlyData.push({
        month: months[i - 1],
        connections: 0
      });
    }
    
    // Remplir avec les données réelles
    results.forEach(row => {
      monthlyData[row.month - 1].connections = row.connections;
    });
    
    res.json(monthlyData);
  });
});

// Route pour obtenir l'historique des actions admin
router.get('/api/admin/actions-history', verifyAdmin, (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  
  const query = `
    SELECT 
      aa.id,
      aa.action_type,
      aa.details,
      aa.created_at,
      u.nom_complet as admin_name,
      target_user.nom_complet as target_user_name
    FROM admin_actions aa
    JOIN utilisateurs u ON aa.admin_id = u.id
    LEFT JOIN utilisateurs target_user ON aa.target_user_id = target_user.id
    ORDER BY aa.created_at DESC
    LIMIT ? OFFSET ?
  `;
  
  db.query(query, [parseInt(limit), offset], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur lors de la récupération de l\'historique' });
    }
    
    res.json(results);
  });
});

module.exports = router;
