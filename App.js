// App.js
import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import MenuScreen from './screens/MenuScreen';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebaseConfig';

const AuthStack = createStackNavigator();
const AppStack = createStackNavigator();

const AuthStackScreen = () => (
  <AuthStack.Navigator>
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

const AppStackScreen = () => (
  <AppStack.Navigator>
    <AppStack.Screen
      name="Menu"
      component={MenuScreen}
      options={{ headerRight: () => null }} // No logout here; we'll handle logout inside MenuScreen if needed.
    />
  </AppStack.Navigator>
);

const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Listen for auth state changes (assuming Firebase Auth is being used)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
    });
    return unsubscribe;
  }, []);

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStackScreen /> : <AuthStackScreen />}
    </NavigationContainer>
  );
};

export default App;
