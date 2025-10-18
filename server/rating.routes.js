const express = require('express');
const router = express.Router();
const db = require('./db'); // Assurez-vous que le chemin est correct
const jwt = require('jsonwebtoken');

// Middleware pour vérifier le token JWT (simplifié pour l'exemple)
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: 'Token non fourni' });

  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Format de token invalide' });

  jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt', (err, user) => {
    if (err) return res.status(403).json({ message: 'Token invalide' });
    req.user = user; // Contient { id, role }
    next();
  });
};

// POST /api/ratings - Soumettre une évaluation pour un mototaximan
router.post('/api/ratings', verifyToken, async (req, res) => {
  const { mototaximanId, courseId, rating, comment } = req.body;
  const clientId = req.user.id; // L'ID du client est extrait du token

  if (!mototaximanId || !courseId || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: 'Données d\'évaluation incomplètes ou invalides.' });
  }

  try {
    // Vérifier si la course a bien été terminée et n'a pas déjà été évaluée (optionnel mais recommandé)
    const [courseRows] = await db.promise().query(
      'SELECT statut FROM courses WHERE id = ? AND client_id = ? AND mototaximan_id = ?',
      [courseId, clientId, mototaximanId]
    );

    if (courseRows.length === 0 || courseRows[0].statut !== 'terminee') {
      return res.status(403).json({ message: 'Course non terminée ou non éligible pour évaluation.' });
    }
    
    // Vérifier si le client a déjà évalué cette course (pour éviter les doublons)
    const [existingRating] = await db.promise().query(
      'SELECT id FROM evaluations WHERE client_id = ? AND mototaximan_id = ? AND course_id = ?',
      [clientId, mototaximanId, courseId]
    );

    if (existingRating.length > 0) {
      return res.status(409).json({ message: 'Vous avez déjà évalué cette course.' });
    }

    // Insérer la nouvelle évaluation
    await db.promise().query(
      'INSERT INTO evaluations (mototaximan_id, client_id, course_id, note, commentaire) VALUES (?, ?, ?, ?, ?)',
      [mototaximanId, clientId, courseId, rating, comment]
    );

    // Recalculer la note moyenne du mototaximan
    const [avgResult] = await db.promise().query(
      'SELECT AVG(note) AS average_rating FROM evaluations WHERE mototaximan_id = ?',
      [mototaximanId]
    );
    const newAverageRating = avgResult[0].average_rating || 0;

    await db.promise().query(
      'UPDATE mototaximen SET note_moyenne = ? WHERE id = ?',
      [newAverageRating.toFixed(2), mototaximanId]
    );

    res.status(201).json({ message: 'Évaluation soumise avec succès et note moyenne mise à jour.', newAverageRating });

  } catch (err) {
    console.error('Erreur lors de la soumission de l\'évaluation:', err);
    res.status(500).json({ message: 'Erreur serveur lors de la soumission de l\'évaluation.' });
  }
});

module.exports = router;
