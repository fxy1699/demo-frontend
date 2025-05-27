// This script checks if the backend is properly configured
// and redirects to the setup page if necessary
(function() {
  // Function to check backend status
  async function checkBackendStatus() {
    try {
      const response = await fetch('/api/status');
      const data = await response.json();
      
      // If the backend URL is not set, redirect to setup page
      if (data.status === 'setup_required') {
        window.location.href = '/setup.html';
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Error checking backend status:', error);
      // If there's an error, still redirect to setup page
      window.location.href = '/setup.html';
      return false;
    }
  }
  
  // Check backend status when the page loads
  window.addEventListener('DOMContentLoaded', checkBackendStatus);
})(); 