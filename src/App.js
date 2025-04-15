import React, { useState, useEffect } from 'react';

function App() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inputMessage, setInputMessage] = useState('');

  const sendMessage = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(process.env.REACT_APP_API_URL + "/chat?message=" + inputMessage, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setMessage(data.response);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Chat with AI</h1>
      <div>
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Type your message..."
        />
        <button onClick={sendMessage} disabled={loading}>
          {loading ? 'Sending...' : 'Send'}
        </button>
      </div>
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
      {message && (
        <div>
          <h2>Response:</h2>
          <p>{message}</p>
        </div>
      )}
    </div>
  );
}

export default App;
