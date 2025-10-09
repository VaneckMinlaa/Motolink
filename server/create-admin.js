const bcrypt = require('bcryptjs');
const db = require('./db');

// Script pour créer un compte administrateur par défaut
async function createAdmin() {
  const adminData = {
    nom_complet: 'MotoLink',
    email: 'minlaaalex0@gmail.com',
    numero_telephone: '123456789',
    mot_de_passe: 'admin123'
  };

  try {
    // Vérifier si un admin existe déjà
    const checkQuery = 'SELECT id FROM utilisateurs WHERE role = "admin"';
    db.query(checkQuery, [], (err, results) => {
      if (err) {
        console.error('Erreur lors de la vérification:', err);
        return;
      }

      if (results.length > 0) {
        console.log('Un administrateur existe déjà dans le système.');
        return;
      }

      // Créer le mot de passe haché
      bcrypt.hash(adminData.mot_de_passe, 10, (err, hash) => {
        if (err) {
          console.error('Erreur lors du hachage:', err);
          return;
        }

        // Insérer l'administrateur
        const insertQuery = `
          INSERT INTO utilisateurs (nom_complet, email, numero_telephone, mot_de_passe, role) 
          VALUES (?, ?, ?, ?, 'admin')
        `;

        db.query(insertQuery, [
          adminData.nom_complet,
          adminData.email,
          adminData.numero_telephone,
          hash
        ], (err, result) => {
          if (err) {
            console.error('Erreur lors de la création de l\'admin:', err);
            return;
          }

          console.log('✅ Compte administrateur créé avec succès !');
          console.log('📧 Email:', adminData.email);
          console.log('📱 Téléphone:', adminData.numero_telephone);
          console.log('🔑 Mot de passe:', adminData.mot_de_passe);
          console.log('⚠️  IMPORTANT: Changez ce mot de passe après votre première connexion !');
          
          process.exit(0);
        });
      });
    });
  } catch (error) {
    console.error('Erreur générale:', error);
    process.exit(1);
  }
}

// Exécuter le script
createAdmin();
