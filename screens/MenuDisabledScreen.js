// screens/MenuDisabledScreen.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const MenuDisabledScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>
        The menu is currently disabled. Please check back later.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  message: {
    fontSize: 20,
    color: 'red',
    textAlign: 'center',
  },
});

export default MenuDisabledScreen;
