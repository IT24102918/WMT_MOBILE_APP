import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem('thowil_user')
      .then(val => { if (val) setUser(JSON.parse(val)); })
      .finally(() => setLoading(false));
  }, []);

  const login = async (userData) => {
    setUser(userData);
    await AsyncStorage.setItem('thowil_user', JSON.stringify(userData));
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem('thowil_user');
    await AsyncStorage.removeItem('thowil_cart');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
