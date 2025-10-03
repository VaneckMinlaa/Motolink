const express = require('express');
const router = express.Router();
const db = require('./db');
const { authenticateToken } = require('./middleware/auth');

// Route pour obtenir les courses actives d'un mototaximan
router.get('/api/mototaxi/courses/actives', authenticateToken, async (req, res) => {
  const query = `
    SELECT c.*, 
           u.nom_complet as client_nom, 
           u.numero_telephone as client_telephone
    FROM courses c
    JOIN utilisateurs u ON c.client_id = u.id
    WHERE c.mototaximan_id = ? 
    AND c.statut IN ('acceptee', 'en_cours')
  `;
  
  try {
    const result = await db.query(query, [req.user.id]);
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la récupération des courses' });
  }
});

// Route pour mettre à jour le statut d'une course
router.put('/api/courses/:courseId/statut', authenticateToken, async (req, res) => {
  const { courseId } = req.params;
  const { statut } = req.body;
  
  try {
    await db.query(
      'UPDATE courses SET statut = ? WHERE id = ? AND (mototaximan_id = ? OR client_id = ?)',
      [statut, courseId, req.user.id, req.user.id]
    );
    res.json({ message: 'Statut mis à jour avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du statut' });
  }
});

// Route pour mettre à jour la position du mototaximan
router.post('/api/mototaxi/position', authenticateToken, async (req, res) => {
  const { latitude, longitude } = req.body;
  
  try {
    await db.query(
      'INSERT INTO positions_mototaximen (mototaximan_id, latitude, longitude) VALUES (?, ?, ?)',
      [req.user.id, latitude, longitude]
    );
    res.json({ message: 'Position mise à jour avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour de la position' });
  }
});

// Route pour obtenir les détails d'une course
router.get('/api/courses/:courseId', authenticateToken, async (req, res) => {
  const { courseId } = req.params;
  
  try {
    const [course] = await db.query(
      `SELECT c.*, 
              u_client.nom_complet as client_nom,
              u_client.numero_telephone as client_telephone,
              u_moto.nom_complet as mototaximan_nom,
              u_moto.numero_telephone as mototaximan_telephone
       FROM courses c
       JOIN utilisateurs u_client ON c.client_id = u_client.id
       LEFT JOIN mototaximen m ON c.mototaximan_id = m.id
       LEFT JOIN utilisateurs u_moto ON m.utilisateur_id = u_moto.id
       WHERE c.id = ? AND (c.client_id = ? OR c.mototaximan_id = ?)`,
      [courseId, req.user.id, req.user.id]
    );
    
    if (!course) {
      return res.status(404).json({ message: 'Course non trouvée' });
    }
    
    res.json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de la récupération des détails de la course' });
  }
});

// Route pour noter une course
router.post('/api/courses/:courseId/evaluation', authenticateToken, async (req, res) => {
  const { courseId } = req.params;
  const { note, commentaire } = req.body;
  
  try {
    const [course] = await db.query('SELECT * FROM courses WHERE id = ?', [courseId]);
    
    if (!course) {
      return res.status(404).json({ message: 'Course non trouvée' });
    }
    
    await db.query(
      'INSERT INTO evaluations (mototaximan_id, client_id, note, commentaire) VALUES (?, ?, ?, ?)',
      [course.mototaximan_id, req.user.id, note, commentaire]
    );
    
    // Mettre à jour la note moyenne du mototaximan
    await db.query(`
      UPDATE mototaximen 
      SET note_moyenne = (
        SELECT AVG(note) 
        FROM evaluations 
        WHERE mototaximan_id = ?
      )
      WHERE id = ?
    `, [course.mototaximan_id, course.mototaximan_id]);
    
    res.json({ message: 'Évaluation enregistrée avec succès' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erreur lors de l\'enregistrement de l\'évaluation' });
  }
});

module.exports = router;