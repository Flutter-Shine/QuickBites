// screens/MenuScreen.js
import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Button,
  Alert
} from 'react-native';
import { collection, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../services/firebaseConfig';

const MenuScreen = ({ navigation }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Set up the logout button in the header.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Button
          onPress={() => {
            Alert.alert(
              'Logout',
              'Are you sure you want to log out?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Logout',
                  onPress: () => {
                    // Simply sign out; the onAuthStateChanged listener in App.js will switch navigators.
                    signOut(auth).catch((error) => {
                      console.error('Error signing out: ', error);
                    });
                  },
                  style: 'destructive'
                }
              ]
            );
          }}
          title="Logout"
          color="#000"
        />
      )
    });
  }, [navigation]);

  // Listen for real-time updates from the "menuItems" collection.
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'menuItems'),
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data()
        }));
        setMenuItems(items);
      },
      (error) => {
        console.error('Error fetching menu items: ', error);
      }
    );
    return () => unsubscribe();
  }, []);

  // Render each menu item as a button showing only its name and price.
  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => {
        setSelectedItem(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.itemContainer}>
        <Text style={styles.itemName}>{item.name}</Text>
        <Text style={styles.itemPrice}>${item.price}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={menuItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text>No menu items available.</Text>}
      />

      {/* Modal for item details */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {selectedItem && (
              <>
                <Text style={styles.modalTitle}>{selectedItem.name}</Text>
                <Text style={styles.modalDescription}>{selectedItem.description}</Text>
                <View style={styles.modalButtonContainer}>
                  <Button
                    title="Add to Cart"
                    onPress={() => {
                      Alert.alert('Success', 'Add to cart is working');
                      setModalVisible(false);
                    }}
                  />
                  <Button
                    title="Cancel"
                    onPress={() => setModalVisible(false)}
                  />
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff'
  },
  itemContainer: {
    marginBottom: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5
  },
  itemName: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  itemPrice: {
    fontSize: 16,
    color: 'green',
    marginVertical: 5
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  modalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10
  },
  modalDescription: {
    fontSize: 16,
    marginBottom: 20
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%'
  }
});

export default MenuScreen;
