import React, { useState, useEffect } from 'react';
import './App.css';
import LoginScreen from './components/LoginScreen';
import MainScreen from './components/MainScreen';
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { ThemeProvider, createTheme } from "@mui/material/styles";

const firebaseConfig = {
  apiKey: "AIzaSyAukAveK_q1hCnUHVfogob9zRPOMox6t5I",
  authDomain: "qr-homework.firebaseapp.com",
  projectId: "qr-homework",
  storageBucket: "qr-homework.firebasestorage.app",
  messagingSenderId: "389308985074",
  appId: "1:389308985074:web:fb5408b850ea75f712aa6b"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const theme = createTheme();

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleLogin = (email, password) => {
    console.log('ログイン試行:', email, password);
    // Firebase Authentication ロジックをここに追加
    setIsAuthenticated(true); // 仮の認証成功処理
  };

  const handleLogout = () => {
    console.log('ログアウト');
    // Firebase Authentication ロジックをここに追加
    setIsAuthenticated(false);
  };

  return (
    <ThemeProvider theme={theme}>
      <div className="App">
        {isAuthenticated ? (
          <MainScreen onLogout={handleLogout} />
        ) : (
          <LoginScreen onLogin={handleLogin} />
        )}
      </div>
    </ThemeProvider>
  );
};

export default App;
