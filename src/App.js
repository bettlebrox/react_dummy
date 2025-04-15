import React, { useState, useEffect } from 'react';
import { MsalProvider, useMsal, useIsAuthenticated } from '@azure/msal-react';
import { PublicClientApplication, EventType } from '@azure/msal-browser';

const msalConfig = {
  auth: {
    clientId: process.env.REACT_APP_AUTH_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${process.env.REACT_APP_AUTH_TENANT_ID}`,
    redirectUri: window.location.origin + '/',
  },
  cache: {
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  }
};

const msalInstance = new PublicClientApplication(msalConfig);

// Account selection logic is app dependent. Adjust as needed for different use cases.
const accounts = msalInstance.getAllAccounts();
if (accounts.length > 0) {
  msalInstance.setActiveAccount(accounts[0]);
}

msalInstance.addEventCallback((event) => {
  if (event.eventType === EventType.LOGIN_SUCCESS && event.payload.account) {
    const account = event.payload.account;
    msalInstance.setActiveAccount(account);
  }
});

function AppContent() {
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const account = instance.getActiveAccount();
    if (account) {
      setUserName(account.name || account.username);
    }
  }, [instance]);

  const handleLogin = async () => {
    try {
      await instance.loginPopup({
        scopes: [process.env.REACT_APP_AUTH_SCOPES],
      });
    } catch (error) {
      console.error("Login failed:", error);
      setError("Login failed. Please try again.");
    }
  };

  const handleLogout = () => {
    instance.logoutPopup();
  };

  const getAccessToken = async () => {
    try {
      const account = instance.getActiveAccount();
      if (!account) {
        throw new Error("No active account");
      }

      const response = await instance.acquireTokenSilent({
        scopes: [process.env.REACT_APP_AUTH_SCOPES],
        account: account
      });
      return response.accessToken;
    } catch (error) {
      // Fallback to interaction when silent call fails
      const response = await instance.acquireTokenPopup({
        scopes: [process.env.REACT_APP_AUTH_SCOPES]
      });
      return response.accessToken;
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

function App() {
  return (
    <MsalProvider instance={msalInstance}>
      <AppContent />
    </MsalProvider>
  );
}

export default App; 