// App.js
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import AppNavigator from './navigation/AppNavigator'; // Navigator that includes MenuScreen, etc.
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebaseConfig';
import { CartProvider } from './contexts/CartContext';

const AuthStack = createStackNavigator();

const AuthStackScreen = () => (
  <AuthStack.Navigator
    screenOptions={{
      headerShown: false, // Hide header for every screen in this stack
    }}
  >
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Listen for authentication state changes.
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    return unsubscribe;
  }, []);

  return (
    <NavigationContainer>
      <CartProvider>
        {isAuthenticated ? <AppNavigator /> : <AuthStackScreen />}
      </CartProvider>
    </NavigationContainer>
  );
};

export default App;
