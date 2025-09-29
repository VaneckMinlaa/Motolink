const mysql = require('mysql2');

const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: 'root',
  database: 'motolink_bd'
});

const createTableQuery = `
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

db.connect((err) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }
  console.log('Successfully connected to the database.');

  db.query(createTableQuery, (err, result) => {
    if (err) {
      console.error('Error creating table:', err);
      return;
    }
    console.log('Table "utilisateurs" is ready.');
  });
});

module.exports = db;
