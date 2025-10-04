const WebSocket = require('ws');
const db = require('./db');

function setupWebSocketServer(server) {
  const wss = new WebSocket.Server({ server });

  // Stocker les connexions des mototaximen et des clients
  const mototaxiConnections = new Map(); // mototaxiId -> ws
  const clientConnections = new Map(); // clientId -> ws

  wss.on('connection', (ws) => {
    let userId = null;
    let userType = null;

    ws.on('message', async (message) => {
      const data = JSON.parse(message);

      switch (data.type) {
        case 'auth':
          // Authentifier et stocker la connexion
          userId = data.userId;
          userType = data.userType;
          if (userType === 'mototaximan') {
            // Récupérer le mototaximan_id réel depuis la table mototaximen
            const getMototaximanIdQuery = 'SELECT id FROM mototaximen WHERE utilisateur_id = ?';
            const [motoRows] = await db.promise().query(getMototaximanIdQuery, [userId]);
            if (motoRows.length > 0) {
              const mototaxiActualId = motoRows[0].id;
              mototaxiConnections.set(mototaxiActualId, ws); // Utiliser le mototaximan.id
            } else {
              console.warn(`Mototaximan avec utilisateur_id ${userId} non trouvé lors de l'authentification.`);
            }
          } else {
            clientConnections.set(userId, ws);
          }
          break;

        case 'location_update':
          // Mettre à jour la position du mototaximan
          if (userType === 'mototaximan' && data.userId) {
            // userId reçu de la requête du mototaximan (utilisateurs.id)
            await updateMototaxiPosition(data.userId, data.location);
            // Informer les clients proches (la diffusion est déjà basée sur mototaxiId interne)
            // Pas besoin de modifier broadcastLocationToNearbyClients ici, elle utilise mototaxiId directement.
          }
          break;

        case 'request_ride':
          // Client demande une course à un mototaximan spécifique
          if (userType === 'client' && userId && data.targetMototaxiId) {
            await handleRideRequest(userId, data.targetMototaxiId, data, mototaxiConnections);
          }
          break;

        case 'accept_ride':
          // Mototaximan accepte une course
          if (userType === 'mototaximan' && data.mototaxiId) {
            // mototaxiId est l'ID réel du mototaximan (pas utilisateurs.id)
            await handleRideAcceptance(data.mototaxiId, data, clientConnections);
          }
          break;
        case 'start_ride':
          if (userType === 'mototaximan' && data.mototaxiId && data.courseId) {
            await handleRideStatusUpdate(data.courseId, 'en_cours', clientConnections, data.clientId);
          }
          break;
        case 'finish_ride':
          if (userType === 'mototaximan' && data.mototaxiId && data.courseId) {
            await handleRideStatusUpdate(data.courseId, 'terminee', clientConnections, data.clientId);
          }
          break;
        case 'cancel_ride':
          if (userType === 'mototaximan' && data.mototaxiId && data.courseId) {
            await handleRideStatusUpdate(data.courseId, 'annulee', clientConnections, data.clientId);
          }
          break;
      }
    });

    ws.on('close', () => {
      if (userType === 'mototaximan') {
        // Au lieu de userId, il faut trouver le mototaxiActualId pour le supprimer
        // Cela nécessite une recherche inverse ou un stockage plus complexe. Pour l'instant, on laisse comme ça.
        // Ou on peut stocker le `mototaxiActualId` dans le `ws` object lors de l'auth pour un cleanup facile.
        mototaxiConnections.forEach((value, key) => {
          if (value === ws) {
            mototaxiConnections.delete(key);
            console.log(`Mototaximan ${key} déconnecté.`);
          }
        });
      } else {
        clientConnections.delete(userId);
      }
    });
  });

  // Fonction pour mettre à jour la position d'un mototaximan
  async function updateMototaxiPosition(mototaxiId, location) {
      // mototaxiId ici est en fait utilisateurs.id
      const getMototaxiActualIdQuery = 'SELECT id FROM mototaximen WHERE utilisateur_id = ?';
      const [motoRows] = await db.promise().query(getMototaxiActualIdQuery, [mototaxiId]);
      
      if (motoRows.length > 0) {
        const actualMototaxiId = motoRows[0].id;
        const query = `
          INSERT INTO positions_mototaximen (mototaximan_id, latitude, longitude)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude), timestamp = CURRENT_TIMESTAMP;
        `;
        await db.promise().query(query, [actualMototaxiId, location.latitude, location.longitude]);
        // Après la mise à jour de la position, diffuser à tous les clients connectés
        broadcastLocationToNearbyClients(actualMototaxiId, location);
      } else {
        console.warn(`Mototaximan avec utilisateur_id ${mototaxiId} non trouvé pour la mise à jour de position.`);
      }
    }

  // Fonction pour diffuser la position aux clients proches
  function broadcastLocationToNearbyClients(mototaxiId, location) {
    clientConnections.forEach((ws, clientId) => {
      // Vous pouvez ajouter une logique pour filtrer les clients par distance
      ws.send(JSON.stringify({
        type: 'mototaxi_location',
        mototaxiId,
        location
      }));
    });
  }

  // Fonction pour gérer une demande de course
  async function handleRideRequest(clientId, targetMototaxiId, data, mototaxiConnections) {
    // Enregistrer la demande dans la base de données avec le mototaximan ciblé
    const query = 'INSERT INTO courses (client_id, mototaximan_id, position_depart, position_arrivee, statut) VALUES (?, ?, ?, ?, "en_attente")';
    const result = await db.promise().query(query, [
      clientId,
      targetMototaxiId, // L'ID du mototaximan ciblé
      JSON.stringify(data.pickup),
      JSON.stringify(data.destination)
    ]);

    const courseId = result[0].insertId;

    // Notifier UNIQUEMENT le mototaximan ciblé
    const targetWs = mototaxiConnections.get(targetMototaxiId);
    if (targetWs) {
      targetWs.send(JSON.stringify({
        type: 'new_request',
        courseId,
        clientId,
        pickup: data.pickup,
        destination: data.destination,
        pickupLabel: data.pickupLabel,
        destinationLabel: data.destinationLabel,
        clientName: data.clientName, // Ajouter le nom du client pour le mototaximan
        clientPhone: data.clientPhone, // Ajouter le téléphone du client
        estimate: data.estimate, // Ajouter l'estimation
      }));
    } else {
      console.warn(`Mototaximan ${targetMototaxiId} non connecté pour la demande de course.`);
      // Optionnel: informer le client que le mototaximan n'est pas disponible
    }
  }

  // Fonction pour gérer l'acceptation d'une course
  async function handleRideAcceptance(mototaxiActualId, data, clientConnections) {
    // Mettre à jour le statut de la course
    const query = 'UPDATE courses SET mototaximan_id = ?, statut = "acceptee" WHERE id = ?';
    await db.promise().query(query, [mototaxiActualId, data.courseId]);

    // Notifier le client
    const clientWs = clientConnections.get(data.clientId);
    if (clientWs) {
      clientWs.send(JSON.stringify({
        type: 'ride_accepted',
        courseId: data.courseId,
        mototaxiId: mototaxiActualId, // Envoyer le bon ID au client
      }));
    }
  }

  // Fonction générique pour mettre à jour le statut d'une course et notifier le client
  async function handleRideStatusUpdate(courseId, newStatus, clientConnections, clientId) {
    try {
      const query = 'UPDATE courses SET statut = ? WHERE id = ?';
      await db.promise().query(query, [newStatus, courseId]);
 
      // Notifier le client
      const clientWs = clientConnections.get(clientId);
      if (clientWs) {
        let messageType = 'ride_status_update';
        if (newStatus === 'en_cours') messageType = 'ride_started';
        if (newStatus === 'terminee') messageType = 'ride_finished';
        if (newStatus === 'annulee') messageType = 'ride_cancelled';
 
        clientWs.send(JSON.stringify({
          type: messageType,
          courseId: courseId,
          status: newStatus,
        }));
      }
    } catch (e) {
      console.error(`Erreur lors de la mise à jour du statut de la course ${courseId} vers ${newStatus}:`, e);
    }
  }
}

module.exports = setupWebSocketServer;