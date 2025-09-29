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
    const query = 'INSERT INTO utilisateurs (nom_complet, numero_telephone, mot_de_passe, photo_url, cni_url, gillet) VALUES (?, ?, ?, ?, ?, ?)';
    db.query(query, [nom_complet, numero_telephone, hash, photoUrl, cniUrl, gillet], (err, result) => {
      if (err) {
        if (err.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({ message: 'Ce numéro existe déjà.' });
        }
        return res.status(500).json({ message: 'Erreur lors de la création du compte.' });
      }
      res.status(201).json({ message: 'Inscription mototaximan réussie !' });
    });
  });
});

module.exports = router;
