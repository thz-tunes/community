// config.js - Configuração do Frontend

const config = {
  development: {
    API_URL: 'http://localhost:5000',
    SOCKET_URL: 'http://localhost:5000'
  },
  production: {
    API_URL: 'https://community-production-5ff9.up.railway.app',
    SOCKET_URL: 'https://community-production-5ff9.up.railway.app'
  }
};

// Detecta o ambiente automaticamente
const isDevelopment = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1';

// Se estiver no GitHub Pages, força produção
const isGitHubPages = window.location.hostname.includes('github.io');

let currentConfig;
if (isDevelopment) {
  currentConfig = config.development;
} else if (isGitHubPages) {
  currentConfig = config.production;
  console.log('🌐 GitHub Pages detectado - usando API de produção');
} else {
  currentConfig = config.production;
}

// Exporta as configurações
window.APP_CONFIG = currentConfig;

console.log('🔧 Ambiente:', isDevelopment ? 'DESENVOLVIMENTO' : 'PRODUÇÃO');
console.log('🌐 API URL:', currentConfig.API_URL);
console.log('💬 Socket URL:', currentConfig.SOCKET_URL);
console.log('🏠 Hostname:', window.location.hostname);