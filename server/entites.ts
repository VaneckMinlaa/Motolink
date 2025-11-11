// Enums

export enum StatutCourse {
  EN_ATTENTE = "EN_ATTENTE",
  CHAUFFEUR_EN_ROUTE = "CHAUFFEUR_EN_ROUTE",
  EN_COURS = "EN_COURS",
  TERMINEE = "TERMINEE",
  ANNULEE = "ANNULEE",
}

export enum StatutChauffeur {
  LIBRE = "LIBRE",
  EN_COURSE = "EN_COURSE",
  HORS_LIGNE = "HORS_LIGNE",
}

export enum ModePaiement {
  LIQUIDE = "LIQUIDE",
  MOBILE_MONEY = "MOBILE_MONEY",
}

// Type pour coordonnées

export type Coordinates = {
  latitude: number;
  longitude: number;
};

// Classes

export abstract class Utilisateur {
  id: string;
  nom: string;
  telephone: string;
  localisation: Coordinates;

  constructor(
    id: string,
    nom: string,
    telephone: string,
    localisation: Coordinates
  ) {
    this.id = id;
    this.nom = nom;
    this.telephone = telephone;
    this.localisation = localisation;
  }
}

export class Client extends Utilisateur {
  historiqueCourses: Course[];

  constructor(
    id: string,
    nom: string,
    telephone: string,
    localisation: Coordinates,
    historiqueCourses: Course[] = []
  ) {
    super(id, nom, telephone, localisation);
    this.historiqueCourses = historiqueCourses;
  }
}

export class Chauffeur extends Utilisateur {
  statut: StatutChauffeur;
  immatriculation: string;
  modeleMoto: string;
  noteMoyenne: number;

  constructor(
    id: string,
    nom: string,
    telephone: string,
    localisation: Coordinates,
    statut: StatutChauffeur,
    immatriculation: string,
    modeleMoto: string,
    noteMoyenne: number
  ) {
    super(id, nom, telephone, localisation);
    this.statut = statut;
    this.immatriculation = immatriculation;
    this.modeleMoto = modeleMoto;
    this.noteMoyenne = noteMoyenne;
  }
}

export class Course {
  id: string;
  statut: StatutCourse;
  pointDepart: Coordinates;
  pointArrivee: Coordinates;
  dateHeureCreation: Date;
  dateHeurePriseEnCharge?: Date;
  dateHeureArrivee?: Date;
  estimationPrix: number;
  estimationDuree: number;
  modePaiement: ModePaiement;
  note?: number;
  commentaire?: string;

  constructor(
    id: string,
    statut: StatutCourse,
    pointDepart: Coordinates,
    pointArrivee: Coordinates,
    dateHeureCreation: Date,
    estimationPrix: number,
    estimationDuree: number,
    modePaiement: ModePaiement,
    dateHeurePriseEnCharge?: Date,
    dateHeureArrivee?: Date,
    note?: number,
    commentaire?: string
  ) {
    this.id = id;
    this.statut = statut;
    this.pointDepart = pointDepart;
    this.pointArrivee = pointArrivee;
    this.dateHeureCreation = dateHeureCreation;
    this.estimationPrix = estimationPrix;
    this.estimationDuree = estimationDuree;
    this.modePaiement = modePaiement;
    this.dateHeurePriseEnCharge = dateHeurePriseEnCharge;
    this.dateHeureArrivee = dateHeureArrivee;
    this.note = note;
    this.commentaire = commentaire;
  }
}

// Interfaces pour les services

export interface SystemePaiement {
  processerPaiement(courseId: string, montant: number): boolean;
}

export interface ServiceCalculTrajet {
  calculerItineraire(depart: Coordinates, arrivee: Coordinates): Itineraire;
  estimerCout(itineraire: Itineraire): number;
  estimerDuree(itineraire: Itineraire): number;
}

// Itineraire type (à définir plus précisément selon besoin)

export type Itineraire = {
  distance: number; // en mètres
  duree: number; // en secondes
  points: Coordinates[];
};

// Ajouté au reste du fichier models.ts

// Classe Moto
export class Moto {
  id: string;
  marque: string;
  modele: string;
  couleur: string;

  constructor(id: string, marque: string, modele: string, couleur: string) {
    this.id = id;
    this.marque = marque;
    this.modele = modele;
    this.couleur = couleur;
  }
}
