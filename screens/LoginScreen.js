// LoginScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  Alert, 
  TouchableOpacity, 
  Image
} from 'react-native';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebaseConfig';

// Adjust the path to your logo file as needed
const quickBitesLogo = require('../assets/Quickbiteslogo.png');

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    signInWithEmailAndPassword(auth, email, password)
      .catch((error) => {
        Alert.alert('Login Error', error.message);
      });
  };

  return (
    <View style={styles.screenContainer}>
      {/* Logo at the top */}
      <Image source={quickBitesLogo} style={styles.logo} />

      {/* Login box */}
      <View style={styles.loginBox}>
        <Text style={styles.loginTitle}>Login</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#cce0ff"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#cce0ff"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>

        <View style={styles.registerRow}>
          <Text style={styles.registerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerLink}>Create one</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#fdf5e6',
    // Move everything toward the top
    justifyContent: 'flex-start', 
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 40, // Add top padding so the logo sits higher
  },
  logo: {
    width: 200,
    height: 200,
    resizeMode: 'contain',
    marginBottom: 20,
  },
  loginBox: {
    backgroundColor: '#003B6F',
    borderRadius: 20,
    padding: 30,
    width: '85%',
    alignItems: 'center',
  },
  loginTitle: {
    fontSize: 24,
    color: '#fff',
    marginBottom: 20,
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    height: 40,
    borderColor: '#fff',
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 15,
    paddingHorizontal: 10,
    color: '#fff',
  },
  loginButton: {
    backgroundColor: '#800000', 
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 30,
    marginTop: 10,
    marginBottom: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  registerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  registerText: {
    color: '#fff',
    fontSize: 14,
  },
  registerLink: {
    color: '#ffd700', 
    fontSize: 14,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});
