import { collection, addDoc,db,doc,getDoc, updateDoc,deleteDoc } from 'firebase/firestore';


async function ajouterChauffeur(chauffeur) {
  try {
    const docRef = await addDoc(collection(db, "chauffeurs"), chauffeur);
    console.log("Chauffeur ajouté avec ID:", docRef.id);
    return docRef.id;
  } catch (e) {
    console.error("Erreur ajout chauffeur:", e);
  }
}

// Exemple d'objet chauffeur
const chauffeurExemple = {
  nom: "Jean Dupont",
  telephone: "+237699123456",
  localisation: { latitude: 3.8767, longitude: 11.5121 },
  statut: "LIBRE",  // StatutChauffeur : LIBRE, EN_COURSE, HORS_LIGNE
  immatriculation: "123ABC",
  modeleMoto: "Honda CG 125",
  noteMoyenne: 4.8,
};


async function getChauffeur(id) {
  const docRef = doc(db, "chauffeurs", id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    console.log("Aucun chauffeur trouvé avec cet ID");
    return null;
  }
}


async function updateChauffeur(id, data) {
  const docRef = doc(db, "chauffeurs", id);
  await updateDoc(docRef, data);
  console.log("Chauffeur mis à jour !");
}


async function deleteChauffeur(id) {
  await deleteDoc(doc(db, "chauffeurs", id));
  console.log("Chauffeur supprimé !");
}


async function ajouterMoto(moto) {
  try {
    const docRef = await addDoc(collection(db, "motos"), moto);
    console.log("Moto ajoutée avec ID:", docRef.id);
    return docRef.id;
  } catch (e) {
    console.error("Erreur ajout moto:", e);
  }
}

// Exemple moto
const motoExemple = {
  marque: "Honda",
  modele: "CG 125",
  annee: 2020,
  immatriculation: "456DEF",
};


async function getMoto(id) {
  const docRef = doc(db, "motos", id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    console.log("Aucune moto trouvée avec cet ID");
    return null;
  }
}

async function updateMoto(id, data) {
  const docRef = doc(db, "motos", id);
  await updateDoc(docRef, data);
  console.log("Moto mise à jour !");
}


async function deleteMoto(id) {
  await deleteDoc(doc(db, "motos", id));
  console.log("Moto supprimée !");
}



async function ajouterCourse(course) {
  try {
    const docRef = await addDoc(collection(db, "courses"), course);
    console.log("Course ajoutée avec ID:", docRef.id);
    return docRef.id;
  } catch (e) {
    console.error("Erreur ajout course:", e);
  }
}

// Exemple course
const courseExemple = {
  statut: "EN_ATTENTE",  // StatutCourse : EN_ATTENTE, CHAUFFEUR_EN_ROUTE, EN_COURS, TERMINEE, ANNULEE
  pointDepart: { latitude: 3.8767, longitude: 11.5121 },
  pointArrivee: { latitude: 3.8700, longitude: 11.5200 },
  dateHeureCreation: new Date(),
  dateHeurePriseEnCharge: null,
  dateHeureArrivee: null,
  estimationPrix: 1500,
  estimationDuree: 20,  // minutes
  modePaiement: "LIQUIDE", // ModePaiement : LIQUIDE, MOBILE_MONEY
  note: null,
  commentaire: null,
  idClient: "id_mysql_client",   // Si tu veux garder le lien avec MySQL
  idChauffeur: null,
};


async function getCourse(id) {
  const docRef = doc(db, "courses", id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return docSnap.data();
  } else {
    console.log("Aucune course trouvée avec cet ID");
    return null;
  }
}


async function updateCourse(id, data) {
  const docRef = doc(db, "courses", id);
  await updateDoc(docRef, data);
  console.log("Course mise à jour !");
}


async function deleteCourse(id) {
  await deleteDoc(doc(db, "courses", id));
  console.log("Course supprimée !");
}
