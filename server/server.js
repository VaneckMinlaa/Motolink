const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const http = require('http');
const setupWebSocketServer = require('./websocket');

const app = express();
const port = 3002;

const uploadDir = path.join(process.cwd(), 'uploads');
const db = require('./db');

// Pour servir les fichiers uploadés
app.use('/uploads', express.static(uploadDir));

// Routes
app.use(express.json());
app.use(cors());

const mototaximanRoutes = require('./mototaximan.routes');
const authRoutes = require('./auth.routes');
const ratingRoutes = require('./rating.routes');
const adminRoutes = require('./admin.routes');

app.use(mototaximanRoutes);
app.use(authRoutes);
app.use(ratingRoutes);
app.use(adminRoutes);


// Middleware d'authentification
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Token manquant' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Token invalide' });
        }
        req.user = user;
        next();
    });
};

// Route d'inscription
app.post('/inscription', (req, res) => {
    const { nom_complet, email, numero_telephone, mot_de_passe } = req.body;

    if (!nom_complet || !numero_telephone || !mot_de_passe) {
        return res.status(400).json({ message: 'Veuillez remplir tous les champs obligatoires.' });
    }

    bcrypt.hash(mot_de_passe, 10, (err, hash) => {
        if (err) {
            return res.status(500).json({ message: 'Erreur lors du hachage du mot de passe.' });
        }

        const query = 'INSERT INTO utilisateurs (nom_complet, email, numero_telephone, mot_de_passe) VALUES (?, ?, ?, ?)';
        db.query(query, [nom_complet, email, numero_telephone, hash], (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ message: 'Cet utilisateur existe déjà.' });
                }
                return res.status(500).json({ message: 'Erreur lors de la création de l\'utilisateur.' });
            }
            res.status(201).json({ message: 'Utilisateur créé avec succès.' });
        });
    });
});

// Route de connexion
app.post('/login', (req, res) => {
    const { identifier, mot_de_passe } = req.body; // identifier peut être email ou numero_telephone

    if (!identifier || !mot_de_passe) {
        return res.status(400).json({ message: 'Veuillez fournir un identifiant et un mot de passe.' });
    }

    const query = 'SELECT * FROM utilisateurs WHERE email = ? OR numero_telephone = ?';
    db.query(query, [identifier, identifier], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Erreur du serveur.' });
        }

        if (results.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }

        const user = results[0];

        bcrypt.compare(mot_de_passe, user.mot_de_passe, (err, isMatch) => {
            if (err) {
                return res.status(500).json({ message: 'Erreur lors de la vérification du mot de passe.' });
            }

            if (isMatch) {
                const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET || 'votre_secret_jwt', { expiresIn: '24h' });
                res.json({ token, message: 'Connexion réussie.' });
            } else {
                res.status(401).json({ message: 'Mot de passe incorrect.' });
            }
        });
    });
});

// Route pour mot de passe oublié
app.post('/forgot-password', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Veuillez fournir une adresse e-mail.' });
    }

    const query = 'SELECT * FROM utilisateurs WHERE email = ?';
    db.query(query, [email], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Erreur du serveur.' });
        }

        if (results.length === 0) {
            // Répondre positivement même si l'email n'existe pas pour éviter l'énumération d'utilisateurs
            return res.status(200).json({ message: 'Si un compte est associé à cet email, un nouveau mot de passe a été envoyé.' });
        }

        const user = results[0];
        const newPassword = crypto.randomBytes(8).toString('hex'); // Génère un mot de passe aléatoire

        bcrypt.hash(newPassword, 10, (err, hash) => {
            if (err) {
                return res.status(500).json({ message: 'Erreur lors du hachage du nouveau mot de passe.' });
            }

            const updateQuery = 'UPDATE utilisateurs SET mot_de_passe = ? WHERE id = ?';
            db.query(updateQuery, [hash, user.id], async (err, result) => {
                if (err) {
                    return res.status(500).json({ message: 'Erreur lors de la mise à jour du mot de passe.' });
                }

                // Configuration de Nodemailer pour envoyer l'email
                try {
                    let transporter = nodemailer.createTransport({
                        host: "smtp.gmail.com",
                        port: 587,
                        secure: false, // true for 465, false for other ports
                        auth: {
                            user: 'minlaaalex0@gmail.com', 
                            pass: 'jkhd rrkw gzcs vmey', 
                        },
                    });

                    let info = await transporter.sendMail({
                        from: '"MotoLink Support" <minlaaalex0@gmail.com>',
                        to: user.email,
                        subject: "Votre nouveau mot de passe",
                        text: `Bonjour, voici votre nouveau mot de passe : ${newPassword}`,
                        html: `<b>Bonjour,</b><br>Voici votre nouveau mot de passe : <b>${newPassword}</b><br><p>Nous vous recommandons de le changer après vous être connecté.</p><br><p>Cordialement Support Motolink</p></br>`,
                    });

                    console.log("Message sent: %s", info.messageId);

                    res.status(200).json({ message: 'Si un compte est associé à cet email, un nouveau mot de passe a été envoyé.' });

                } catch (mailError) {
                    console.error(mailError);
                    return res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'email.' });
                }
            });
        });
    });
});


// Route protégée pour récupérer les informations de l'utilisateur
// Route pour vérifier la validité du token
app.get('/api/verify-token', authenticateToken, (req, res) => {
    // Si le middleware authenticateToken passe, le token est valide
    res.status(200).json({ valid: true });
});

app.get('/api/user', authenticateToken, (req, res) => {
    const query = 'SELECT id, nom_complet, email, numero_telephone, photo_url FROM utilisateurs WHERE id = ?';
    db.query(query, [req.user.id], (err, results) => {
        if (err) {
            return res.status(500).json({ message: 'Erreur lors de la récupération des informations.' });
        }
        if (results.length === 0) {
            return res.status(404).json({ message: 'Utilisateur non trouvé.' });
        }
        res.json(results[0]);
    });
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

const server = http.createServer(app);
setupWebSocketServer(server);

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
