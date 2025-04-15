import React, { useState, useEffect } from 'react';
import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';

const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_AUTH_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.REACT_APP_AUTH_TENANT_ID}`,
    redirectUri: process.env.REACT_APP_AUTH_REDIRECT_URI,
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  }
};

const msalInstance = new PublicClientApplication(msalConfig);

function App() {
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    // Initialize MSAL
    msalInstance.initialize().then(() => {
      // Check if user is already signed in
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) {
        setIsAuthenticated(true);
        setUserName(accounts[0].name || accounts[0].username);
      }
    }).catch(error => {
      console.error("MSAL initialization failed:", error);
      setError("Authentication initialization failed. Please refresh the page.");
    });
  }, []);

  const handleLogin = async () => {
    try {
      const loginResponse = await msalInstance.loginPopup({
        scopes: [process.env.REACT_APP_AUTH_SCOPES],
      });
      setIsAuthenticated(true);
      setUserName(loginResponse.account.name || loginResponse.account.username);
    } catch (error) {
      console.error("Login failed:", error);
      setError("Login failed. Please try again.");
    }
  };

  const handleLogout = () => {
    msalInstance.logoutPopup();
    setIsAuthenticated(false);
    setUserName('');
  };

  const getAccessToken = async () => {
    try {
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const silentRequest = {
        scopes: [process.env.REACT_APP_AUTH_SCOPES],
        account: accounts[0]
      };

      const response = await msalInstance.acquireTokenSilent(silentRequest);
      return response.accessToken;
    } catch (error) {
      if (error instanceof InteractionRequiredAuthError) {
        // Fallback to interaction when silent call fails
        const response = await msalInstance.acquireTokenPopup({
          scopes: [process.env.REACT_APP_AUTH_SCOPES]
        });
        return response.accessToken;
      }
      throw error;
    }
  };

  const sendMessage = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      const response = await fetch(process.env.REACT_APP_API_URL + "/chat?message=" + inputMessage, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'accept': 'application/json',
          'Authorization': `Bearer ${token}`
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

  if (!isAuthenticated) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px' }}>
        <h1>Welcome to Audrey AI</h1>
        <button onClick={handleLogin} style={{ padding: '10px 20px', fontSize: '16px' }}>
          Sign In with Microsoft
        </button>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px' }}>
        <h1>Chat with Gpt-4o-mini</h1>
        <div>
          <span style={{ marginRight: '10px' }}>Welcome, {userName}</span>
          <button onClick={handleLogout}>Sign Out</button>
        </div>
      </div>
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
