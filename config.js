/**
 * Global application configuration
 * Loaded before all other JS files
 */

(function () {
  const isLocalhost =
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1";

  window.APP_CONFIG = {
    API_BASE_URL: isLocalhost
      ? "https://api-gateway-366n.onrender.com/api"
      : "https://api-gateway-366n.onrender.com/api"
  };
})();
