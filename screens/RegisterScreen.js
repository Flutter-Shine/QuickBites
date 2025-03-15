// RegisterScreen.js
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  Button, 
  StyleSheet, 
  Alert, 
  TouchableOpacity 
} from 'react-native';
import { createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [learnerRefNumber, setLearnerRefNumber] = useState('');

  const handleRegister = async () => {
    // Basic validation
    if (!name.trim() || !email.trim() || !learnerRefNumber.trim()) {
      Alert.alert('Validation Error', 'All fields are required.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match.');
      return;
    }

    try {
      // Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Optionally update the displayName
      await updateProfile(user, { displayName: name });

      // Save user details in Firestore (No push token included)
      await setDoc(doc(db, 'users', user.uid), {
        userId: user.uid,
        name,
        learnerRefNumber,
        email,
        createdAt: new Date(),
      });

      // Sign out the user after registration
      await signOut(auth);

      Alert.alert('Registration Successful', 'Your account has been created. Please log in.');
      navigation.navigate('Login');  
    } catch (error) {
      console.error('Registration Error:', error);
      Alert.alert('Registration Error', error.message);
    }
  };

  return (
    <View style={styles.screenContainer}>
      <View style={styles.registerBox}>
        <Text style={styles.registerTitle}>Sign In</Text>

        <TextInput
          style={styles.input}
          placeholder="Name"
          placeholderTextColor="#cce0ff"
          value={name}
          onChangeText={setName}
        />

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

        <TextInput
          style={styles.input}
          placeholder="Confirm Password"
          placeholderTextColor="#cce0ff"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TextInput
          style={styles.input}
          placeholder="Learners Reference Number"
          placeholderTextColor="#cce0ff"
          value={learnerRefNumber}
          onChangeText={setLearnerRefNumber}
        />

        <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
          <Text style={styles.registerButtonText}>Start Ordering Today!</Text>
        </TouchableOpacity>

        <View style={styles.linkRow}>
          <Text style={styles.linkText}>I already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.link}>Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default RegisterScreen;

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#fdf5e6',  // Cream background
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  registerBox: {
    backgroundColor: '#003B6F',  // Navy
    borderRadius: 20,
    padding: 30,
    width: '85%',
    alignItems: 'center',
  },
  registerTitle: {
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
  registerButton: {
    backgroundColor: '#800000', // Maroon
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 30,
    marginTop: 10,
    marginBottom: 20,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  linkText: {
    color: '#fff',
    fontSize: 14,
  },
  link: {
    color: '#ffd700',
    fontSize: 14,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});
