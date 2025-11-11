const mysql = require('mysql2');

const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'dell',
  database: 'motolink_bd'
});

const createUsersTable = `
CREATE TABLE IF NOT EXISTS utilisateurs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nom_complet VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  numero_telephone VARCHAR(255) NOT NULL UNIQUE,
  mot_de_passe VARCHAR(255) NOT NULL,
  photo_url VARCHAR(1024),
  cni_url VARCHAR(1024),
  gillet VARCHAR(255),
  reset_token VARCHAR(255),
  reset_token_expires BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;

const createClientsTable = `
CREATE TABLE IF NOT EXISTS clients (
  id INT PRIMARY KEY,
  FOREIGN KEY (id) REFERENCES utilisateurs(id) ON DELETE CASCADE
);`;

const createMotosTable = `
CREATE TABLE IF NOT EXISTS motos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  marque VARCHAR(100) NOT NULL,
  modele VARCHAR(100) NOT NULL,
  couleur VARCHAR(50)
);`;

const createChauffeursTable = `
CREATE TABLE IF NOT EXISTS chauffeurs (
  id INT PRIMARY KEY,
  statut ENUM('LIBRE', 'EN_COURSE', 'HORS_LIGNE') NOT NULL,
  immatriculation VARCHAR(50) NOT NULL,
  moto_id INT,
  note_moyenne FLOAT,
  FOREIGN KEY (id) REFERENCES utilisateurs(id) ON DELETE CASCADE,
  FOREIGN KEY (moto_id) REFERENCES motos(id)
);`;

const createCoursesTable = `
CREATE TABLE IF NOT EXISTS courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  statut ENUM('EN_ATTENTE', 'CHAUFFEUR_EN_ROUTE', 'EN_COURS', 'TERMINEE', 'ANNULEE') NOT NULL,
  point_depart_latitude DOUBLE NOT NULL,
  point_depart_longitude DOUBLE NOT NULL,
  point_arrivee_latitude DOUBLE NOT NULL,
  point_arrivee_longitude DOUBLE NOT NULL,
  date_heure_creation TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  date_heure_prise_en_charge TIMESTAMP NULL,
  date_heure_arrivee TIMESTAMP NULL,
  estimation_prix DOUBLE,
  estimation_duree DOUBLE,
  mode_paiement ENUM('LIQUIDE', 'MOBILE_MONEY') NOT NULL,
  note INT,
  commentaire TEXT,
  client_id INT,
  chauffeur_id INT,
  FOREIGN KEY (client_id) REFERENCES clients(id),
  FOREIGN KEY (chauffeur_id) REFERENCES chauffeurs(id)
);`;

db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Successfully connected to the database.');

  db.query(createUsersTable, (err) => {
    if (err) {
      console.error('Error creating "utilisateurs" table:', err);
      return;
    }
    console.log('Table "utilisateurs" is ready.');

    db.query(createClientsTable, (err) => {
      if (err) {
        console.error('Error creating "clients" table:', err);
        return;
      }
      console.log('Table "clients" is ready.');

      db.query(createMotosTable, (err) => {
        if (err) {
          console.error('Error creating "motos" table:', err);
          return;
        }
        console.log('Table "motos" is ready.');

        db.query(createChauffeursTable, (err) => {
          if (err) {
            console.error('Error creating "chauffeurs" table:', err);
            return;
          }
          console.log('Table "chauffeurs" is ready.');

          db.query(createCoursesTable, (err) => {
            if (err) {
              console.error('Error creating "courses" table:', err);
              return;
            }
            console.log('Table "courses" is ready.');
          });
        });
      });
    });
  });
});

module.exports = db;
