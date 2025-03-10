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
  Alert,
  ActivityIndicator
} from 'react-native';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../services/firebaseConfig';
import { useCart } from '../contexts/CartContext';
import QRCode from 'react-native-qrcode-svg';

const MenuScreen = ({ navigation }) => {
  // 1. Declare all state variables
  const [menuItems, setMenuItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [showOrderId, setShowOrderId] = useState(false);

  const { addItemToCart } = useCart();

  // 2. Configure the logout button in the header.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Button
          onPress={() => {
            Alert.alert('Logout', 'Are you sure you want to log out?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Logout',
                onPress: () => {
                  signOut(auth).catch((error) => {
                    console.error('Error signing out: ', error);
                  });
                },
                style: 'destructive'
              }
            ]);
          }}
          title="Logout"
          color="#000"
        />
      )
    });
  }, [navigation]);

  // 3. Subscribe to menuItems collection from Firestore.
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'menuItems'),
      (snapshot) => {
        // Map each document to an object and filter out items with stock <= 1.
        const items = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((item) => item.stock > 1);
        setMenuItems(items);
      },
      (error) => {
        console.error('Error fetching menu items: ', error);
      }
    );
    return () => unsubscribe();
  }, []);

  // 4. Check for any pending orders for the current user.
  useEffect(() => {
    const currentUser = auth.currentUser;
    console.log('Current User:', currentUser);
    if (!currentUser) return;

    const ordersQuery = query(
      collection(db, 'pendingOrders'),
      where('userId', '==', currentUser.uid),
      where('status', '==', 'pending')
    );
    const unsubscribeOrders = onSnapshot(
      ordersQuery,
      (snapshot) => {
        console.log('Pending orders snapshot size:', snapshot.size);
        if (!snapshot.empty) {
          const orderDoc = snapshot.docs[0];
          console.log('Pending order found:', orderDoc.data());
          setPendingOrder({
            id: orderDoc.id,
            orderNumber: orderDoc.data().orderNumber
          });
        } else {
          setPendingOrder(null);
        }
      },
      (error) => {
        console.error('Error fetching pending orders: ', error);
      }
    );
    return () => unsubscribeOrders();
  }, []);

  // 5. Conditional returns (after all hooks)
  // a) If a pending order exists, show the pending order QR screen (this takes priority).
  if (pendingOrder) {
    return (
      <View style={styles.container}>
        <Text style={styles.pendingText}>You have a pending order.</Text>
        <Text style={styles.pendingText}>Please Proceed to the Canteen</Text>
        <Text style={styles.orderNumberText}>Order Number: {pendingOrder.orderNumber}</Text>
        <View style={styles.qrContainer}>
          <QRCode value={pendingOrder.id} size={250} />
        </View>
        <Button
          title={showOrderId ? 'Hide Order ID' : 'Show Order ID'}
          onPress={() => setShowOrderId(!showOrderId)}
        />
        {showOrderId && (
          <Text style={styles.orderIdText}>Order ID: {pendingOrder.id}</Text>
        )}
      </View>
    );
  }

  // b) Otherwise, render the normal menu.
  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => {
        setSelectedItem(item);
        setSelectedQuantity(1); // Reset quantity when opening modal.
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

      {/* Modal for item details and quantity selection */}
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
                {/* Display available stock */}
                <Text style={styles.stockText}>Available Stock: {selectedItem.stock}</Text>
                <View style={styles.quantityContainer}>
                  <Button
                    title="-"
                    onPress={() =>
                      setSelectedQuantity(Math.max(1, selectedQuantity - 1))
                    }
                  />
                  <Text style={styles.quantityText}>{selectedQuantity}</Text>
                  <Button
                    title="+"
                    onPress={() => setSelectedQuantity(selectedQuantity + 1)}
                  />
                </View>
                <View style={styles.modalButtonContainer}>
                  <Button
                    title="Add to Cart"
                    onPress={() => {
                      if (selectedQuantity > selectedItem.stock) {
                        Alert.alert('Order Exceeds Stock', 'The selected quantity exceeds available stock.');
                        return;
                      }
                      addItemToCart(selectedItem, selectedQuantity);
                      Alert.alert('Success', 'Item added to cart!');
                      setModalVisible(false);
                    }}
                  />
                  <Button title="Cancel" onPress={() => setModalVisible(false)} />
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff'
  },
  pendingText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 10
  },
  orderNumberText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10
  },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 10
  },
  orderIdText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20
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
  stockText: {
    fontSize: 16,
    marginBottom: 10,
    color: 'red'
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20
  },
  quantityText: {
    fontSize: 18,
    marginHorizontal: 10
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%'
  }
});

export default MenuScreen;
