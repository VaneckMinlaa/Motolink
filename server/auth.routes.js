const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');

// Route de connexion
router.post('/api/login', (req, res) => {
  const { identifier, mot_de_passe } = req.body;

  if (!identifier || !mot_de_passe) {
    return res.status(400).json({ message: 'Tous les champs sont obligatoires.' });
  }

  // Rechercher l'utilisateur par email ou numéro de téléphone avec vérification du statut mototaximan
  const query = `
    SELECT u.*, m.statut as mototaximan_statut 
    FROM utilisateurs u 
    LEFT JOIN mototaximen m ON u.id = m.utilisateur_id 
    WHERE u.numero_telephone = ? OR u.email = ?
  `;
  db.query(query, [identifier, identifier], (err, results) => {
    if (err) {
      return res.status(500).json({ message: 'Erreur lors de la connexion.' });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: 'Identifiants incorrects.' });
    }

    const user = results[0];
    
    // Vérifier si c'est un mototaximan en attente de validation
    if (user.role === 'mototaximan' && user.mototaximan_statut === 'en_attente') {
      return res.status(403).json({ 
        message: 'Votre inscription est en cours de validation par un administrateur. Vous recevrez une notification une fois approuvée.' 
      });
    }
    
    // Vérifier si c'est un mototaximan refusé
    if (user.role === 'mototaximan' && user.mototaximan_statut === 'refuse') {
      return res.status(403).json({ 
        message: 'Votre inscription a été refusée. Contactez le support pour plus d\'informations.' 
      });
    }
    
    // Vérifier si c'est un mototaximan suspendu
    if (user.role === 'mototaximan' && user.mototaximan_statut === 'suspendu') {
      return res.status(403).json({ 
        message: 'Votre compte a été suspendu. Contactez le support pour plus d\'informations.' 
      });
    }
    
    bcrypt.compare(mot_de_passe, user.mot_de_passe, (err, isMatch) => {
      if (err) {
        return res.status(500).json({ message: 'Erreur lors de la vérification du mot de passe.' });
      }

      if (!isMatch) {
        return res.status(401).json({ message: 'Identifiants incorrects.' });
      }

      // Déterminer le rôle de l'utilisateur
      const role = user.role || 'client'; // Utilise le rôle stocké dans la base de données

      // Créer le token avec les informations de l'utilisateur
      const token = jwt.sign(
        { id: user.id, role: role },
        process.env.JWT_SECRET || 'votre_secret_jwt',
        { expiresIn: '24h' }
      );

      res.json({
        message: 'Connexion réussie',
        token,
        role,
        user: {
          id: user.id,
          nom_complet: user.nom_complet,
          numero_telephone: user.numero_telephone,
          photo_url: user.photo_url
        }
      });
    });
  });
});

module.exports = router;