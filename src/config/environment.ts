// Configuration de l'environnement
const ENV = {
    development: {
<<<<<<< HEAD
        API_URL: 'http://192.168.1.45:3002',
=======
        API_URL: 'http://10.69.165.207:3002',
>>>>>>> Paiements
        GOOGLE_MAPS_API_KEY: 'TA_CLE_API_GOOGLE_ICI', // Remplace par ta vraie clé API
    },
    production: {
        API_URL: 'http://votre-api-production.com', // À changer avec l'URL de production
        GOOGLE_MAPS_API_KEY: 'YOUR_GOOGLE_MAPS_API_KEY_HERE',
    },
};

const getEnvVars = () => {
    // Par défaut, on utilise l'environnement de développement
    return ENV.development;
};

export default getEnvVars;