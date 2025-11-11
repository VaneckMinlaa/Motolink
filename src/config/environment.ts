// Configuration de l'environnement
const ENV = {
    development: {
        API_URL: 'http://192.168.184.29',
    },
    production: {
        API_URL: 'http://votre-api-production.com', // À changer avec l'URL de production
    },
};

const getEnvVars = () => {
    // Par défaut, on utilise l'environnement de développement
    return ENV.development;
};

export default getEnvVars;