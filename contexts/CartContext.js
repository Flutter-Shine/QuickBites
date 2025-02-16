// contexts/CartContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);

  // Load cart items from AsyncStorage when the app starts
  useEffect(() => {
    const loadCart = async () => {
      try {
        const storedCart = await AsyncStorage.getItem('cart');
        if (storedCart) {
          setCartItems(JSON.parse(storedCart));
        }
      } catch (error) {
        console.error('Failed to load cart items', error);
      }
    };
    loadCart();
  }, []);

  // Save cart items to AsyncStorage whenever they change
  useEffect(() => {
    const saveCart = async () => {
      try {
        await AsyncStorage.setItem('cart', JSON.stringify(cartItems));
      } catch (error) {
        console.error('Failed to save cart items', error);
      }
    };
    saveCart();
  }, [cartItems]);

  // Add item to cart (with specified quantity)
  const addItemToCart = (item, quantity = 1) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find(cartItem => cartItem.id === item.id);
      if (existingItem) {
        // Increase quantity by the specified amount
        return prevItems.map(cartItem =>
          cartItem.id === item.id 
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem
        );
      } else {
        // Add new item with the specified quantity
        return [...prevItems, { ...item, quantity }];
      }
    });
  };

  // Update the quantity of a specific item
  const updateItemQuantity = (itemId, newQuantity) => {
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const clearCart = () => setCartItems([]);

  return (
    <CartContext.Provider value={{ cartItems, addItemToCart, updateItemQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
