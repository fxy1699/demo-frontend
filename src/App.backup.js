import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>SkyrisAI</h1>
        <p>
          Welcome to SkyrisAI - The world's first flying embodied intelligence.
        </p>
        <a
          className="App-link"
          href="/api/status"
          target="_blank"
          rel="noopener noreferrer"
        >
          Check API Status
        </a>
      </header>
    </div>
  );
}

export default App; 