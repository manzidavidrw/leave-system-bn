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
      ? "http://localhost:8080/api"
      : "https://YOUR-GATEWAY-URL.onrender.com/api"
  };
})();
