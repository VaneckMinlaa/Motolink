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
    let actualMototaxiId = null; // Stocker l'ID réel du mototaximan

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
              actualMototaxiId = motoRows[0].id;
              mototaxiConnections.set(actualMototaxiId, ws); // Utiliser le mototaximan.id
              console.log(`Mototaximan authentifié: userId=${userId}, mototaxiId=${actualMototaxiId}`);
            } else {
              console.warn(`Mototaximan avec utilisateur_id ${userId} non trouvé lors de l'authentification.`);
            }
          } else {
            clientConnections.set(userId, ws);
            console.log(`Client authentifié: userId=${userId}`);
          }
          break;

        case 'location_update':
          // Mettre à jour la position du mototaximan
          if (userType === 'mototaximan' && actualMototaxiId) {
            await updateMototaxiPosition(actualMototaxiId, data.location);
            // Informer les клиенты proches
            broadcastLocationToNearbyClients(actualMototaxiId, data.location);
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
          if (userType === 'mototaximan' && actualMototaxiId) {
            // Utiliser actualMototaxiId stocké lors de l'authentification
            await handleRideAcceptance(actualMototaxiId, data, clientConnections);
          }
          break;
        case 'start_ride':
          if (userType === 'mototaximan' && actualMototaxiId && data.courseId) {
            await handleRideStatusUpdate(data.courseId, 'en_cours', clientConnections, data.clientId);
          }
          break;
        case 'finish_ride':
          if (userType === 'mototaximan' && actualMototaxiId && data.courseId) {
            await handleRideStatusUpdate(data.courseId, 'terminee', clientConnections, data.clientId);
          }
          break;
        case 'cancel_ride':
          if (userType === 'mototaximan' && actualMototaxiId && data.courseId) {
            await handleRideStatusUpdate(data.courseId, 'annulee', clientConnections, data.clientId);
          }
          break;
      }
    });

    ws.on('close', () => {
      if (userType === 'mototaximan' && actualMototaxiId) {
        mototaxiConnections.delete(actualMototaxiId);
        console.log(`Mototaximan ${actualMototaxiId} déconnecté.`);
      } else if (userType === 'client' && userId) {
        clientConnections.delete(userId);
        console.log(`Client ${userId} déconnecté.`);
      }
    });
  });

  // Fonction pour mettre à jour la position d'un mototaximan
  async function updateMototaxiPosition(mototaxiId, location) {
      // mototaxiId côté serveur est maintenant l'ID réel du mototaximan
      const query = `
        INSERT INTO positions_mototaximen (mototaximan_id, latitude, longitude)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude), timestamp = CURRENT_TIMESTAMP;
      `;
      await db.promise().query(query, [mototaxiId, location.latitude, location.longitude]);
      console.log(`Position mise à jour pour mototaxi ${mototaxiId}: lat=${location.latitude}, lng=${location.longitude}`);
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
    console.log(`Demande de course reçue: client=${clientId}, mototaxi=${targetMototaxiId}`);
    console.log(`Mototaximen connectés:`, [...mototaxiConnections.keys()]);

    // Traduire l'ID reçu (qui peut être un utilisateur_id) en mototaximen.id réel
    const translateQuery = 'SELECT id FROM mototaximen WHERE id = ? OR utilisateur_id = ? LIMIT 1';
    const numericTargetId = Number(targetMototaxiId);
    const [rows] = await db.promise().query(translateQuery, [numericTargetId, numericTargetId]);
    if (!rows || rows.length === 0) {
      console.warn(`Aucun mototaximan trouvé pour l'identifiant ${targetMototaxiId}`);
      return;
    }
    const actualTargetMototaxiId = rows[0].id;

    // Enregistrer la demande dans la base de données avec le mototaximan ciblé (ID réel)
    const insertQuery = 'INSERT INTO courses (client_id, mototaximan_id, position_depart, position_arrivee, statut) VALUES (?, ?, ?, ?, "en_attente")';
    const result = await db.promise().query(insertQuery, [
      clientId,
      actualTargetMototaxiId,
      JSON.stringify(data.pickup),
      JSON.stringify(data.destination)
    ]);

    const courseId = result[0].insertId;
    console.log(`Course créée avec ID: ${courseId}`);

    // Notifier UNIQUEMENT le mototaximan ciblé (connexion indexée par mototaximen.id)
    const targetWs = mototaxiConnections.get(Number(actualTargetMototaxiId));
    if (targetWs) {
      const requestMessage = {
        type: 'new_request',
        courseId,
        clientId,
        pickup: data.pickup,
        destination: data.destination,
        pickupLabel: data.pickupLabel,
        destinationLabel: data.destinationLabel,
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        estimate: data.estimate,
      };
      console.log('Envoi de notification au mototaximan:', requestMessage);
      targetWs.send(JSON.stringify(requestMessage));
    } else {
      console.warn(`Mototaximan ${actualTargetMototaxiId} non connecté pour la demande de course.`);
      console.warn(`Vérification typique - Les IDs disponibles:`, [...mototaxiConnections.keys()]);
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
      // Récupérer le nom du mototaximan pour l'afficher côté client
      let mototaxiName = undefined;
      try {
        const [rows] = await db.promise().query(
          'SELECT u.nom_complet as name FROM mototaximen m JOIN utilisateurs u ON m.utilisateur_id = u.id WHERE m.id = ? LIMIT 1',
          [mototaxiActualId]
        );
        if (rows && rows.length > 0) mototaxiName = rows[0].name;
      } catch {}

      clientWs.send(JSON.stringify({
        type: 'ride_accepted',
        courseId: data.courseId,
        mototaxiId: mototaxiActualId,
        mototaxiName,
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

        // Récupérer le mototaximan lié à la course et son nom
        let mototaxiId = undefined;
        let mototaxiName = undefined;
        try {
          const [courseRows] = await db.promise().query(
            'SELECT mototaximan_id FROM courses WHERE id = ? LIMIT 1',
            [courseId]
          );
          if (courseRows && courseRows.length > 0) {
            mototaxiId = courseRows[0].mototaximan_id;
            const [rows] = await db.promise().query(
              'SELECT u.nom_complet as name FROM mototaximen m JOIN utilisateurs u ON m.utilisateur_id = u.id WHERE m.id = ? LIMIT 1',
              [mototaxiId]
            );
            if (rows && rows.length > 0) mototaxiName = rows[0].name;
          }
        } catch (e) {
          console.warn('Erreur récupération nom mototaximan pour WS:', e);
        }

        clientWs.send(JSON.stringify({
          type: messageType,
          courseId: courseId,
          status: newStatus,
          mototaxiId,
          mototaxiName,
        }));
      }
    } catch (e) {
      console.error(`Erreur lors de la mise à jour du statut de la course ${courseId} vers ${newStatus}:`, e);
    }
  }
}

module.exports = setupWebSocketServer;