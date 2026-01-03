// screens/CartScreen.js
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  Alert, 
  ActivityIndicator, 
  TouchableOpacity, 
  Modal 
} from 'react-native';
import { useCart } from '../contexts/CartContext';
import { addDoc, collection, runTransaction, getDocs, query, where, doc } from 'firebase/firestore';
import { db, auth } from '../services/firebaseConfig';

const CartScreen = ({ navigation }) => {
  const { cartItems, clearCart, updateItemQuantity } = useCart();
  const [orderId, setOrderId] = useState(null);

  /*
  // Time-check states
  const [timeLoading, setTimeLoading] = useState(true);
  const [orderingDisabled, setOrderingDisabled] = useState(false);
  */


  // Timeslot modal states
  const [timeslotModalVisible, setTimeslotModalVisible] = useState(false);
  const [selectedTimeslot, setSelectedTimeslot] = useState(null);

  // Calculate total quantity and cost
  const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalCost = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0).toFixed(2);

  // 1) Configure the header: Navy background, cream title, centered
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'CART',
      headerTitleAlign: 'center',
      headerStyle: { backgroundColor: '#003B6F' }, // Navy
      headerTitleStyle: { color: '#fdf5e6', fontSize: 24, fontWeight: 'bold' }, // Cream text
    });
  }, [navigation]);

  /*
  // 2) Fetch server time from the API and determine if ordering is disabled
  useEffect(() => {
    async function fetchServerTime() {
      let minutes;
      try {
        console.log("Fetching server time...");
        const response = await fetch("https://timeapi.io/api/Time/current/zone?timeZone=Asia/Singapore");

        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }
        const data = await response.json();
        const serverTime = new Date(data.dateTime);
        minutes = serverTime.getHours() * 60 + serverTime.getMinutes();
        console.log("Fetched server time:", serverTime);
      } catch (error) {
        console.error("Error fetching server time:", error);
        // Fallback: use device local time
        const localTime = new Date();
        minutes = localTime.getHours() * 60 + localTime.getMinutes();
        console.warn("Using device local time instead:", localTime);
      } finally {
        // Define disabled intervals:
        const disableInterval1Start = 10 * 60; // 10:00 AM
        const disableInterval1End = 10 * 60 + 30; // 10:30 AM
        const disableInterval2Start = 12 * 60 + 30; // 12:30 PM
        const disableInterval2End = 24 * 60;       // 12:00 AM (adjust if needed)

        const isDisabled =
          (minutes >= disableInterval1Start && minutes < disableInterval1End) ||
          (minutes >= disableInterval2Start && minutes < disableInterval2End);

        setOrderingDisabled(isDisabled);
        setTimeLoading(false);
      }
    }
    fetchServerTime();
  }, []);
  */
  // 3) Generate the next order number for today
  const getNextOrderNumber = async () => {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0];
    const startOfDay = new Date(dateString);
    const endOfDay = new Date(dateString + "T23:59:59.999Z");

    const ordersQueryRef = query(
      collection(db, 'pendingOrders'),
      where('createdAt', '>=', startOfDay),
      where('createdAt', '<=', endOfDay)
    );

    const snapshot = await getDocs(ordersQueryRef);
    let maxOrderNumber = 999;
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.orderNumber && data.orderNumber > maxOrderNumber) {
        maxOrderNumber = data.orderNumber;
      }
    });
    return maxOrderNumber + 1;
  };

  // 4) Complete checkout
  const completeCheckout = async (selectedTimeslot) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Error', 'No user is logged in.');
      return;
    }

    try {
      const nextOrderNumber = await getNextOrderNumber();
      const orderRef = doc(collection(db, 'pendingOrders'));

      await runTransaction(db, async (transaction) => {
        const stockUpdates = [];

        for (const cartItem of cartItems) {
          const menuItemRef = doc(db, 'menuItems', cartItem.id);
          const menuItemDoc = await transaction.get(menuItemRef);

          if (!menuItemDoc.exists()) {
            throw new Error(`Item ${cartItem.name} does not exist.`);
          }
          const currentStock = menuItemDoc.data().stock;
          if (currentStock < cartItem.quantity) {
            throw new Error(`Insufficient stock for ${cartItem.name}. Available: ${currentStock}`);
          }
          stockUpdates.push({ menuItemRef, newStock: currentStock - cartItem.quantity });
        }

        // Update stock
        for (const update of stockUpdates) {
          transaction.update(update.menuItemRef, { stock: update.newStock });
        }

        // Create the order doc
        transaction.set(orderRef, {
          items: cartItems,
          totalQuantity,
          totalCost: parseFloat(totalCost),
          createdAt: new Date(),
          status: 'pending',
          userId: currentUser.uid,
          orderNumber: nextOrderNumber,
          timeslot: selectedTimeslot
        });
      });

      // Create a notification
      const notificationMessage = cartItems.map(item => `${item.name} x${item.quantity}`).join(", ");
      await addDoc(collection(db, "notifications"), {
        userId: currentUser.uid,
        title: "Order Placed!",
        message: `Your order #${nextOrderNumber} has been placed successfully.\nItems: ${notificationMessage}`,
        orderNumber: nextOrderNumber,
        timestamp: new Date(),
        status: "unread"
      });

      setOrderId(orderRef.id);
      clearCart();
      navigation.navigate('Menu');

    } catch (error) {
      console.error("Transaction Error:", error);
      Alert.alert('Order Error', error.message);
    }
  };

  // 5) Handle checkout
  const handleCheckout = () => {
    if (cartItems.length === 0) {
      Alert.alert('Cart is empty', 'Please add items to your cart.');
      return;
    }

    /*
    if (timeLoading) {
      Alert.alert("Please wait", "Checking ordering availability, please try again shortly.");
      return;
    }
    if (orderingDisabled) {
      Alert.alert('Ordering Unavailable', 'Ordering is currently unavailable.');
      return;
    }
    */

    if (totalQuantity > 3) {
      Alert.alert('Checkout Error', 'You cannot checkout if the total quantity exceeds 3 Items.');
      return;
    }
    setTimeslotModalVisible(true);
  };

  // 6) Render each cart item
  const renderItem = ({ item }) => {
    const itemTotalPrice = (item.price * item.quantity).toFixed(2);
    return (
      <View style={styles.itemContainer}>
        <Text style={styles.itemName}>{item.name}</Text>
        <View style={styles.itemRow}>
          <View style={styles.quantityControls}>
            {/* Replace <Button> with maroon touchable buttons if desired */}
            <TouchableOpacity
              style={styles.maroonButton}
              onPress={() => {
                if (item.quantity > 1) {
                  updateItemQuantity(item.id, item.quantity - 1);
                }
              }}
            >
              <Text style={styles.maroonButtonText}>-</Text>
            </TouchableOpacity>

            <Text style={styles.itemQuantityText}>{item.quantity}</Text>

            <TouchableOpacity
              style={styles.maroonButton}
              onPress={() => updateItemQuantity(item.id, item.quantity + 1)}
            >
              <Text style={styles.maroonButtonText}>+</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.itemPrice}>P{itemTotalPrice}</Text>
        </View>
      </View>
    );
  };

  /*
  // 7) Loading state
  if (timeLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }
  */
 
  // 8) Main render
  return (
    <View style={styles.container}>
      {/* Header row with "Your Cart" and "Clear Cart" */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Order</Text>
        <TouchableOpacity
          style={styles.maroonButton}
          onPress={() => {
            clearCart();
            Alert.alert('Cart Cleared', 'Your cart is now empty.');
          }}
        >
          <Text style={styles.maroonButtonText}>Clear Cart</Text>
        </TouchableOpacity>
      </View>

      {/* Cart Items */}
      <FlatList
        data={cartItems}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        ListEmptyComponent={<Text>Your cart is empty.</Text>}
      />

      {/* Summary Row */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>Total Quantity: {totalQuantity}</Text>
        <Text style={styles.summaryText}>P{totalCost}</Text>
      </View>

      {/* Checkout Button */}
      <TouchableOpacity style={[styles.maroonButton, { alignSelf: 'center' }]} onPress={handleCheckout}>
        <Text style={styles.maroonButtonText}>Checkout</Text>
      </TouchableOpacity>

      {/* Timeslot Selection Modal */}
      <Modal
        visible={timeslotModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setTimeslotModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.timeslotModalContainer}>
            <Text style={styles.modalTitle}>Select Timeslot</Text>

            {/* Option 1 */}
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setSelectedTimeslot("10:00-10:30 AM")}
            >
              <View style={styles.radioCircle}>
                {selectedTimeslot === "10:00-10:30 AM" && <View style={styles.selectedRb} />}
              </View>
              <Text style={styles.radioText}>10:00-10:30 AM</Text>
            </TouchableOpacity>

            {/* Option 2 */}
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setSelectedTimeslot("12:00-1:30 PM")}
            >
              <View style={styles.radioCircle}>
                {selectedTimeslot === "12:00-1:30 PM" && <View style={styles.selectedRb} />}
              </View>
              <Text style={styles.radioText}>12:00-1:30 PM</Text>
            </TouchableOpacity>

            {/* Confirm/Cancel row */}
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.maroonButton, { marginRight: 10 }]}
                onPress={() => {
                  if (!selectedTimeslot) {
                    Alert.alert('Selection Required', 'Please select a timeslot.');
                    return;
                  }
                  setTimeslotModalVisible(false);
                  completeCheckout(selectedTimeslot);
                }}
              >
                <Text style={styles.maroonButtonText}>Confirm</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.grayButton}
                onPress={() => setTimeslotModalVisible(false)}
              >
                <Text style={styles.grayButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default CartScreen;

// 9) Styles
const styles = StyleSheet.create({
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  container: { 
    flex: 1, 
    padding: 20, 
    backgroundColor: '#fdf5e6' // Cream background
  },
  header: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 20
  },
  title: {
    fontSize: 24, 
    fontWeight: 'bold',
    color: '#003B6F', // optional: navy text
  },
  // Each cart item container
  itemContainer: {
    padding: 15,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 15,
  },
  itemName: { 
    fontSize: 18, 
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#003B6F',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  maroonButton: {
    backgroundColor: '#800000',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: 'center',
    marginVertical: 5,
  },
  maroonButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  itemQuantityText: {
    fontSize: 16,
    marginHorizontal: 10,
  },
  itemPrice: { 
    fontSize: 16, 
    color: 'green'
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderColor: '#ccc',
    marginTop: 10,
    marginBottom: 20,
  },
  summaryText: {
    fontSize: 18,
    fontWeight: 'bold'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  timeslotModalContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center'
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20
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
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20
  },
  grayButton: {
    backgroundColor: 'gray',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 5,
  },
  grayButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
