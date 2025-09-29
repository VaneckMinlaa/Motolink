// Configuration de l'environnement
const ENV = {
    development: {
        API_URL: 'http://10.148.50.163:3001',
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