import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    AsyncStorage.getItem('thowil_cart').then(val => {
      if (val) setCart(JSON.parse(val));
    });
  }, []);

  const persist = (items) => {
    setCart(items);
    AsyncStorage.setItem('thowil_cart', JSON.stringify(items));
  };

  const addItem = (product) => {
    const existing = cart.find(i => i._id === product._id);
    if (existing) {
      persist(cart.map(i => i._id === product._id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      persist([...cart, { ...product, qty: 1 }]);
    }
  };

  const removeItem = (id) => persist(cart.filter(i => i._id !== id));

  const updateQty = (id, qty) => {
    if (qty <= 0) return removeItem(id);
    persist(cart.map(i => i._id === id ? { ...i, qty } : i));
  };

  const clearCart = () => persist([]);

  const total = cart.reduce((sum, i) => sum + (i.price || 0) * i.qty, 0);

  return (
    <CartContext.Provider value={{ cart, addItem, removeItem, updateQty, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
