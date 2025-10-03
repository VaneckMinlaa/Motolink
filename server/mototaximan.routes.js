const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('./db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(process.cwd(), 'uploads');

// Configurer le stockage des fichiers
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + Date.now() + ext);
  }
});
const upload = multer({ storage });

// Route d'inscription mototaximan
router.post('/api/inscription-mototaximan', upload.fields([
  { name: 'photo_profil', maxCount: 1 },
  { name: 'cni', maxCount: 1 }
]), (req, res) => {
  console.log('Requête reçue:', { 
    body: req.body,
    files: req.files,
    headers: req.headers
  });
  
  // Vérifier si les fichiers sont bien reçus
  console.log('Files received:', {
    photo_profil: req.files['photo_profil'] ? req.files['photo_profil'][0].filename : 'No photo',
    cni: req.files['cni'] ? req.files['cni'][0].filename : 'No CNI'
  });

  // Créer le dossier uploads s'il n'existe pas
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('Created uploads directory:', uploadDir);
  }
  const { nom_complet, numero_telephone, mot_de_passe, gillet } = req.body;
  if (!nom_complet || !numero_telephone || !mot_de_passe || !gillet) {
    return res.status(400).json({ message: 'Tous les champs sont obligatoires.' });
  }
  const photoUrl = req.files['photo_profil'] ? '/uploads/' + req.files['photo_profil'][0].filename : null;
  const cniUrl = req.files['cni'] ? '/uploads/' + req.files['cni'][0].filename : null;
  bcrypt.hash(mot_de_passe, 10, (err, hash) => {
    if (err) return res.status(500).json({ message: 'Erreur lors du hachage du mot de passe.' });
    // Insérer d'abord dans la table utilisateurs
    const userQuery = 'INSERT INTO utilisateurs (nom_complet, numero_telephone, mot_de_passe, photo_url, role) VALUES (?, ?, ?, ?, "mototaximan")';
    db.query(userQuery, [nom_complet, numero_telephone, hash, photoUrl], (err, userResult) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: 'Ce numéro existe déjà.' });
        }
        return res.status(500).json({ message: 'Erreur lors de la création du compte.' });
      }

      // Ensuite, insérer dans la table mototaximen
      const motoQuery = 'INSERT INTO mototaximen (utilisateur_id, numero_gillet, cni_url) VALUES (?, ?, ?)';
      db.query(motoQuery, [userResult.insertId, gillet, cniUrl], (err, motoResult) => {
        if (err) {
          // Si erreur, supprimer l'utilisateur créé
          db.query('DELETE FROM utilisateurs WHERE id = ?', [userResult.insertId]);
          return res.status(500).json({ message: 'Erreur lors de la création du profil mototaximan.' });
        }
        res.status(201).json({ message: 'Inscription mototaximan réussie !' });
      });
    });
  });
});

// Lister les mototaximen "disponibles" (ayant une position connue)
router.get('/api/mototaxi/available', async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id as utilisateur_id,
        u.nom_complet as name,
        COALESCE(m.note_moyenne, 4.5) as rating,
        latest_pm.latitude AS latitude,
        latest_pm.longitude AS longitude
      FROM mototaximen m
      JOIN utilisateurs u ON m.utilisateur_id = u.id
      LEFT JOIN (
        SELECT
          mototaximan_id,
          latitude,
          longitude,
          timestamp
        FROM positions_mototaximen
        WHERE (mototaximan_id, timestamp) IN (
          SELECT mototaximan_id, MAX(timestamp)
          FROM positions_mototaximen
          GROUP BY mototaximan_id
        )
      ) AS latest_pm ON m.id = latest_pm.mototaximan_id;
    `;
    db.query(query, [], (err, results) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: 'Erreur lors de la récupération des mototaximen' });
      }
      const drivers = results.map((row) => ({
        id: String(row.utilisateur_id),
        name: row.name,
        rating: Number(row.rating || 4.5),
        location: { latitude: Number(row.latitude), longitude: Number(row.longitude) }
      }));
      res.json(drivers);
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// Liste complète des mototaximen (nom, téléphone, photo) pour affichage/offline
router.get('/api/mototaxi/list', (req, res) => {
  const query = `
    SELECT 
      u.id AS id,
      u.nom_complet AS nom,
      u.numero_telephone AS telephone,
      u.photo_url AS photoUrl,
      COALESCE(m.note_moyenne, 0.0) AS rating,
      m.numero_gillet AS numeroGillet
    FROM utilisateurs u
    LEFT JOIN mototaximen m ON m.utilisateur_id = u.id
    WHERE u.role = 'mototaximan'
    ORDER BY u.nom_complet ASC
  `;
  db.query(query, [], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Erreur lors de la récupération des mototaximen' });
    }
    const list = results.map((row) => ({
      id: String(row.id),
      name: row.nom,
      phone: row.telephone,
      photoUrl: row.photoUrl,
      rating: Number(row.rating),
      badge: row.numeroGillet
    }));
    res.json(list);
  });
});

module.exports = router;
