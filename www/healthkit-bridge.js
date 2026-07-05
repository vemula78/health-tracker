// HealthKit bridge for Capacitor
// Provides access to native HealthKit data from the web app

(async () => {
  // Only load in Capacitor environment
  if (typeof window.Capacitor === 'undefined') return;

  window.HealthKit = {
    async requestPermission() {
      try {
        const { HealthKit } = window.Capacitor.Plugins;
        return await HealthKit.requestAuthorization();
      } catch (e) {
        console.error('HealthKit permission request failed:', e);
        return { authorized: false };
      }
    },

    async getTodayData() {
      try {
        const { HealthKit } = window.Capacitor.Plugins;
        return await HealthKit.getTodayData();
      } catch (e) {
        console.error('Failed to fetch HealthKit data:', e);
        return null;
      }
    }
  };

  // Auto-sync on app startup if permissions are granted
  if (navigator.userAgent.includes('Capacitor')) {
    // Give the app a moment to load
    setTimeout(() => {
      // Check if this is the first load or a refresh
      const lastSync = sessionStorage.getItem('lastHealthKitSync');
      if (!lastSync) {
        sessionStorage.setItem('lastHealthKitSync', Date.now().toString());
        // Attempt to sync on startup (will prompt for permission if needed)
        HealthKit.getTodayData().then(data => {
          if (data && Object.keys(data).some(k => data[k] !== undefined && data[k] !== null && data[k] !== '')) {
            // Trigger a custom event that the app can listen to
            window.dispatchEvent(new CustomEvent('healthKitDataAvailable', { detail: data }));
          }
        });
      }
    }, 500);
  }
})();
