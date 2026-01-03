// screens/MenuScreen.js
import React, { useEffect, useState, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Alert,
  Button
} from 'react-native';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../services/firebaseConfig';
import { useCart } from '../contexts/CartContext';
import QRCode from 'react-native-qrcode-svg';

const MenuScreen = ({ navigation }) => {
  const [menuItems, setMenuItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [pendingOrder, setPendingOrder] = useState(null);
  const [showOrderId, setShowOrderId] = useState(false);

  const { addItemToCart } = useCart();

  // Configure custom header with navy background, cream "MENU" title,
  // plus a maroon Logout button with white text.
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'MENU',
      headerTitleAlign: 'center',
      headerStyle: {
        backgroundColor: '#003B6F', // Navy blue
      },
      headerTitleStyle: {
        color: '#fdf5e6', // Cream text
        fontSize: 24,
        fontWeight: 'bold',
      },
      headerRight: () => (
        <TouchableOpacity
          style={styles.logoutButton}
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
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Subscribe to menuItems collection from Firestore.
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'menuItems'),
      (snapshot) => {
        const items = snapshot.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .filter((item) => item.stock > 0);
        setMenuItems(items);
      },
      (error) => {
        console.error('Error fetching menu items: ', error);
      }
    );
    return () => unsubscribe();
  }, []);

  // Check for any pending orders (pending or prepared)
  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const pendingQueryRef = query(
        collection(db, 'pendingOrders'),
        where('userId', '==', currentUser.uid),
        where('status', 'in', ['pending', 'prepared'])
      );
      const preparedQueryRef = query(
        collection(db, 'preparedOrders'),
        where('userId', '==', currentUser.uid),
        where('status', 'in', ['pending', 'prepared'])
      );

      const unsubscribePending = onSnapshot(
        pendingQueryRef,
        (pendingSnapshot) => {
          const pendingOrders = pendingSnapshot.docs.map((doc) => ({
            id: doc.id,
            orderNumber: doc.data().orderNumber,
          }));

          const unsubscribePrepared = onSnapshot(
            preparedQueryRef,
            (preparedSnapshot) => {
              const preparedOrders = preparedSnapshot.docs.map((doc) => ({
                id: doc.id,
                orderNumber: doc.data().orderNumber,
              }));

              const allOrders = [...pendingOrders, ...preparedOrders];
              if (allOrders.length > 0) {
                setPendingOrder(allOrders[0]);
              } else {
                setPendingOrder(null);
              }
            },
            (error) => {
              console.error('Error fetching prepared orders:', error);
            }
          );

          return () => unsubscribePrepared();
        },
        (error) => {
          console.error('Error fetching pending orders:', error);
        }
      );

      return () => unsubscribePending();
    } catch (error) {
      console.error('Error setting up Firestore listeners:', error);
    }
  }, []);

  // Refresh function to re-check for active orders
  const refreshOrders = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    try {
      const pendingQueryRef = query(
        collection(db, 'pendingOrders'),
        where('userId', '==', currentUser.uid),
        where('status', 'in', ['pending', 'prepared'])
      );
      const preparedQueryRef = query(
        collection(db, 'preparedOrders'),
        where('userId', '==', currentUser.uid),
        where('status', 'in', ['pending', 'prepared'])
      );

      const [pendingSnapshot, preparedSnapshot] = await Promise.all([
        getDocs(pendingQueryRef),
        getDocs(preparedQueryRef),
      ]);

      const pendingOrders = pendingSnapshot.docs.map((doc) => ({
        id: doc.id,
        orderNumber: doc.data().orderNumber,
      }));
      const preparedOrders = preparedSnapshot.docs.map((doc) => ({
        id: doc.id,
        orderNumber: doc.data().orderNumber,
      }));

      const allOrders = [...pendingOrders, ...preparedOrders];
      if (allOrders.length > 0) {
        setPendingOrder(allOrders[0]);
      } else {
        setPendingOrder(null);
      }
    } catch (error) {
      console.error('Error refreshing orders:', error);
    }
  };

  // If a pending order exists, show the QR code screen
  if (pendingOrder) {
    return (
      <View style={styles.qrContainer}>
        <View style={styles.qrBox}>
          {/* 1) Heading */}
          <Text style={styles.qrHeading}>YOUR NUMBER</Text>
  
          {/* 2) Large Order Number (zero-padded to 4 digits if you want) */}
          <Text style={styles.qrNumber}>
            {String(pendingOrder.orderNumber).padStart(4, '0')}
          </Text>
  
          {/* 3) Sub-heading */}
          <Text style={styles.qrSubHeading}>GENERATED QR TO CLAIM</Text>
  
          {/* 4) QR Code */}
          <QRCode value={pendingOrder.id} size={200} />
  
          {/* 5) "SCAN ME" label */}
          <Text style={styles.qrScanText}>SCAN ME</Text>
  
  
          {/* 7) Toggle Order ID text link */}
          <TouchableOpacity
            onPress={() => setShowOrderId(!showOrderId)}
            style={styles.orderIdToggle}
          >
            {showOrderId ? (
              <Text style={styles.orderIdText}>Order ID: {pendingOrder.id}</Text>
            ) : (
              <Text style={styles.showOrderIdLink}>Show Order ID</Text>
            )}
          </TouchableOpacity>
  
          {/* 8) Maroon "Refresh" button */}
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={refreshOrders}
          >
            <Text style={styles.refreshButtonText}>Refresh Order Status</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Otherwise, render the normal menu
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => {
        setSelectedItem(item);
        setSelectedQuantity(1);
        setModalVisible(true);
      }}
    >
      <Text style={styles.itemName}>{item.name}</Text>
      <Text style={styles.itemPrice}>P{item.price}</Text>
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
                <Text style={styles.stockText}>Available Stock: {selectedItem.stock}</Text>
                
                {/* Quantity Row */}
                <View style={styles.quantityContainer}>
                  {/* Minus Button */}
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                  >
                    <Text style={styles.quantityButtonText}>−</Text>
                  </TouchableOpacity>

                  <Text style={styles.quantityText}>{selectedQuantity}</Text>

                  {/* Plus Button */}
                  <TouchableOpacity
                    style={styles.quantityButton}
                    onPress={() => setSelectedQuantity(selectedQuantity + 1)}
                  >
                    <Text style={styles.quantityButtonText}>+</Text>
                  </TouchableOpacity>
                </View>

                {/* Add/Cancel Buttons Row */}
                <View style={styles.modalButtonContainer}>
                  {/* Cancel on the left */}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.cancelButton]}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={styles.actionButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  {/* Add to Cart on the right */}
                  <TouchableOpacity
                    style={[styles.actionButton, styles.addButton]}
                    onPress={() => {
                      // Validate quantity vs stock
                      if (selectedQuantity > selectedItem.stock) {
                        Alert.alert('Order Exceeds Stock', 'The selected quantity exceeds available stock.');
                        return;
                      }
                      // Add to cart logic
                      addItemToCart(selectedItem, selectedQuantity);
                      Alert.alert('Success', 'Item added to cart!');
                      setModalVisible(false);
                    }}
                  >
                    <Text style={styles.actionButtonText}>Add to Cart</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default MenuScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fdf5e6' // Cream background
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
    backgroundColor: '#fdf5e6', // Cream background (or use "#fff" if preferred)
    borderWidth: 2,            // Thicker outline
    borderColor: '#003B6F',    // Navy border
    borderRadius: 15,          // Rounded corners
    padding: 15,
    marginBottom: 15,
    position: 'relative'
  },
  itemName: {
    fontSize: 18,
    color: '#003B6F',   // Navy text
    fontWeight: 'bold'
  },
  itemPrice: {
    position: 'absolute',
    right: 15,
    bottom: 15,
    fontSize: 14,
    color: '#003B6F',
    fontWeight: 'bold'
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
  // New style for quantity buttons (for "+" and "−")
  quantityButton: {
    backgroundColor: '#800000', // Maroon
    borderRadius: 5,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 10,
  },
  quantityButtonText: {
    color: '#fff', // White text
    fontSize: 18,
    fontWeight: 'bold'
  },
  // New style for the action buttons row in the modal
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%'
  },
  // Shared style for both action buttons
  actionButton: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 12,
    borderRadius: 5,
    alignItems: 'center'
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  // Cancel button on the left
  cancelButton: {
    backgroundColor: 'gray' // Change this to your desired color for cancel
  },
  // Add to Cart button on the right
  addButton: {
    backgroundColor: '#800000' // Maroon
  },
  logoutButton: {
    marginRight: 15,
    backgroundColor: '#800000', // Maroon background for logout button
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  logoutButtonText: {
    color: '#fff', // White text for logout
    fontWeight: 'bold',
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  radioCircle: {
    height: 20,
    width: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#2e86de',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10
  },
  selectedRb: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2e86de'
  },
  radioText: {
    fontSize: 16,
    color: '#000'
  },

  // 1) Outer container for the pending order screen
  qrContainer: {
    flex: 1,
    backgroundColor: '#fdf5e6', // Cream background
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  // 2) Box that holds the heading, QR code, etc.
  qrBox: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#003B6F', // Navy outline
    borderRadius: 10,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },

  // "YOUR NUMBER" text
  qrHeading: {
    fontSize: 16,
    color: '#003B6F', 
    fontWeight: 'bold',
    marginBottom: 5,
  },

  // Large order number (e.g., "0019")
  qrNumber: {
    fontSize: 48,
    color: '#003B6F',
    fontWeight: 'bold',
    marginBottom: 5,
  },

  // "GENERATED QR TO CLAIM" text
  qrSubHeading: {
    fontSize: 14,
    color: '#003B6F',
    marginBottom: 15,
  },

  // "SCAN ME" text
  qrScanText: {
    fontSize: 16,
    color: '#003B6F',
    marginTop: 10,
  },
  // Container for toggling the Order ID text link
  orderIdToggle: {
    marginTop: 10,
  },

  // If the user clicked "Show Order ID"
  orderIdText: {
    fontSize: 14,
    color: '#003B6F',
    textAlign: 'center',
  },

  // The "Show Order ID" link styling
  showOrderIdLink: {
    fontSize: 14,
    color: '#800000', // Maroon
    textDecorationLine: 'underline',
  },

  // Maroon "Refresh Order Status" button
  refreshButton: {
    marginTop: 20,
    backgroundColor: '#800000',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  refreshButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },

});
