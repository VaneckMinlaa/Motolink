const mysql = require('mysql2');

const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'root',
  database: 'motolink_bd'
});

const createTablesQueries = [
  `CREATE TABLE IF NOT EXISTS utilisateurs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom_complet VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    numero_telephone VARCHAR(255) NOT NULL UNIQUE,
    mot_de_passe VARCHAR(255) NOT NULL,
    photo_url VARCHAR(1024),
    role ENUM('client', 'mototaximan') DEFAULT 'client',
    reset_token VARCHAR(255),
    reset_token_expires BIGINT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,

  `CREATE TABLE IF NOT EXISTS mototaximen (
    id INT AUTO_INCREMENT PRIMARY KEY,
    utilisateur_id INT NOT NULL UNIQUE,
    numero_gillet VARCHAR(255) NOT NULL UNIQUE,
    cni_url VARCHAR(1024) NOT NULL,
    statut ENUM('en_attente', 'approuve', 'refuse', 'suspendu') DEFAULT 'en_attente',
    zone_operation VARCHAR(255),
    note_moyenne DECIMAL(3,2) DEFAULT 0.00,
    disponible BOOLEAN DEFAULT false,
    FOREIGN KEY (utilisateur_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS courses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_id INT NOT NULL,
    mototaximan_id INT,
    position_depart JSON NOT NULL,
    position_arrivee JSON NOT NULL,
    statut ENUM('en_attente', 'acceptee', 'en_cours', 'terminee', 'annulee') DEFAULT 'en_attente',
    prix DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES utilisateurs(id),
    FOREIGN KEY (mototaximan_id) REFERENCES mototaximen(id)
  )`,
  
  `CREATE TABLE IF NOT EXISTS positions_mototaximen (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mototaximan_id INT NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mototaximan_id) REFERENCES mototaximen(id)
  )`,

  `CREATE TABLE IF NOT EXISTS evaluations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    mototaximan_id INT NOT NULL,
    client_id INT NOT NULL,
    note INT NOT NULL CHECK (note BETWEEN 1 AND 5),
    commentaire TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (mototaximan_id) REFERENCES mototaximen(id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES utilisateurs(id) ON DELETE CASCADE
  )`
];

db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Successfully connected to the database.');

  // Créer les tables de manière séquentielle
  for (const query of createTablesQueries) {
    db.query(query, (err, result) => {
      if (err) {
        console.error('Error creating table:', err);
        return;
      }
      console.log('Table created successfully');
    });
  }
});

module.exports = db;
