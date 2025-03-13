// screens/CartScreen.js
import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  Button, 
  Alert, 
  ActivityIndicator, 
  TouchableOpacity, 
  Modal 
} from 'react-native';
import { useCart } from '../contexts/CartContext';
import { addDoc, collection, runTransaction, getDocs, query, where, doc } from 'firebase/firestore';
import { db, auth } from '../services/firebaseConfig';
import QRCode from 'react-native-qrcode-svg';

const CartScreen = ({ navigation }) => {
  // Destructure cartItems, clearCart, and updateItemQuantity from the context
  const { cartItems, clearCart, updateItemQuantity } = useCart();
  const [orderId, setOrderId] = useState(null);

  // New states for time-check using API time (Asia/Singapore, GMT+8)
  const [timeLoading, setTimeLoading] = useState(true);
  const [orderingDisabled, setOrderingDisabled] = useState(false);

  // New states for timeslot modal
  const [timeslotModalVisible, setTimeslotModalVisible] = useState(false);
  const [selectedTimeslot, setSelectedTimeslot] = useState(null);

  // Calculate total quantity and cost
  const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalCost = cartItems
    .reduce((acc, item) => acc + item.price * item.quantity, 0)
    .toFixed(2);

  // Fetch server time from the API and determine if ordering is disabled
  useEffect(() => {
    async function fetchServerTime() {
      let minutes;
      try {
        // Use Asia/Singapore timezone for GMT+8
        const response = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=Asia/Singapore');
        const data = await response.json();
        // Expect data.dateTime as an ISO string, e.g., "2025-03-05T10:15:30.000Z"
        const serverTime = new Date(data.dateTime);
        minutes = serverTime.getHours() * 60 + serverTime.getMinutes();
      } catch (error) {
        console.error('Error fetching server time:', error);
        // Fallback: use device local time
        const localTime = new Date();
        minutes = localTime.getHours() * 60 + localTime.getMinutes();
      } finally {
        // Define disabled intervals:
        // 10:00 AM - 10:30 AM => 600 to 630 minutes
        // 12:30 PM - 4:00 PM   => 750 to 960 minutes
        const disableInterval1Start = 10 * 60;      // 600
        const disableInterval1End = 10 * 60 + 30;     // 630
        const disableInterval2Start = 12 * 60 + 30;   // 750
        const disableInterval2End = 16 * 60;          // 960

        const isDisabled =
          (minutes >= disableInterval1Start && minutes < disableInterval1End) ||
          (minutes >= disableInterval2Start && minutes < disableInterval2End);
        setOrderingDisabled(isDisabled);
        setTimeLoading(false);
      }
    }
    fetchServerTime();
  }, []);

  // Function to generate the next order number for today
  const getNextOrderNumber = async () => {
    const today = new Date();
    const dateString = today.toISOString().split('T')[0]; // e.g., "2023-02-13"
    const startOfDay = new Date(dateString);
    const endOfDay = new Date(dateString + "T23:59:59.999Z");

    const ordersQuery = query(
      collection(db, 'pendingOrders'),
      where('createdAt', '>=', startOfDay),
      where('createdAt', '<=', endOfDay)
    );

    const snapshot = await getDocs(ordersQuery);
    let maxOrderNumber = 999;
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.orderNumber && data.orderNumber > maxOrderNumber) {
        maxOrderNumber = data.orderNumber;
      }
    });
    return maxOrderNumber + 1;
  };

  // Helper function to complete checkout, updating stock and creating the order document
  const completeCheckout = async (selectedTimeslot) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Error', 'No user is logged in.');
      return;
    }
  
    try {
      // ✅ Step 1: Get the next order number BEFORE the transaction starts
      const nextOrderNumber = await getNextOrderNumber();
  
      await runTransaction(db, async (transaction) => {
        // ✅ Step 2: Read stock levels first
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
          // ✅ Step 3: Now update stock levels
          transaction.update(menuItemRef, { stock: currentStock - cartItem.quantity });
        }
  
        // ✅ Step 4: Create the order document inside the transaction
        const order = {
          items: cartItems,
          totalQuantity,
          totalCost: parseFloat(totalCost),
          createdAt: new Date(),
          status: 'pending',
          userId: currentUser.uid,
          orderNumber: nextOrderNumber,
          timeslot: selectedTimeslot
        };
  
        const orderRef = await addDoc(collection(db, 'pendingOrders'), order);
        setOrderId(orderRef.id);
      });
  
      // ✅ Step 5: Create a notification for the order
      const notificationMessage = cartItems.map(item => `${item.name} x${item.quantity}`).join(", ");
      
      const notification = {
        userId: currentUser.uid,
        title: "Order Placed!",
        message: `Your order #${nextOrderNumber} has been placed successfully.\nItems: ${notificationMessage}`,
        orderNumber: nextOrderNumber,
        timestamp: new Date(),
        status: "unread",
      };
  
      await addDoc(collection(db, "notifications"), notification);
  
      clearCart();
      navigation.navigate('Menu');
  
    } catch (error) {
      Alert.alert('Order Error', error.message);
    }
  };

  // Function to handle checkout. Instead of Alert options, we open the timeslot modal.
  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Cart is empty', 'Please add items to your cart.');
      return;
    }
    if (timeLoading) {
      Alert.alert("Please wait", "Checking ordering availability, please try again shortly.");
      return;
    }
    if (orderingDisabled) {
      Alert.alert('Ordering Unavailable', 'Ordering is currently unavailable.');
      return;
    }
    if (totalQuantity > 3) {
      Alert.alert('Checkout Error', 'You cannot checkout if the total quantity exceeds 3 Items.');
      return;
    }
    // Open the timeslot modal
    setTimeslotModalVisible(true);
  };

  // Render each cart item
  const renderItem = ({ item }) => {
    const itemTotalPrice = (item.price * item.quantity).toFixed(2);
    return (
      <View style={styles.itemContainer}>
        <Text style={styles.itemName}>{item.name}</Text>
        <View style={styles.itemRow}>
          <View style={styles.quantityControls}>
            <Button
              title="-"
              onPress={() => {
                if (item.quantity > 1) {
                  updateItemQuantity(item.id, item.quantity - 1);
                }
              }}
            />
            <Text style={styles.itemQuantityText}>{item.quantity}</Text>
            <Button
              title="+"
              onPress={() => updateItemQuantity(item.id, item.quantity + 1)}
            />
          </View>
          <Text style={styles.itemPrice}>${itemTotalPrice}</Text>
        </View>
      </View>
    );
  };

  if (timeLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with title on the left and Clear Cart button on the right */}
      <View style={styles.header}>
        <Text style={styles.title}>Your Cart</Text>
        <Button 
          title="Clear Cart" 
          onPress={() => {
            clearCart();
            Alert.alert('Cart Cleared', 'Your cart is now empty.');
          }} 
        />
      </View>
      <FlatList
        data={cartItems}
        keyExtractor={(item, index) => index.toString()}
        renderItem={renderItem}
        ListEmptyComponent={<Text>Your cart is empty.</Text>}
      />

      {/* Summary Row */}
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>Total Quantity: {totalQuantity}</Text>
        <Text style={styles.summaryText}>${totalCost}</Text>
      </View>

      {/* Checkout Button */}
      <Button title="Checkout" onPress={handleCheckout} />

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
            {/* Radio option 1 */}
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setSelectedTimeslot("10:00-10:30 AM")}
            >
              <View style={styles.radioCircle}>
                {selectedTimeslot === "10:00-10:30 AM" && <View style={styles.selectedRb} />}
              </View>
              <Text style={styles.radioText}>10:00-10:30 AM</Text>
            </TouchableOpacity>
            {/* Radio option 2 */}
            <TouchableOpacity
              style={styles.radioOption}
              onPress={() => setSelectedTimeslot("12:00-1:30 PM")}
            >
              <View style={styles.radioCircle}>
                {selectedTimeslot === "12:00-1:30 PM" && <View style={styles.selectedRb} />}
              </View>
              <Text style={styles.radioText}>12:00-1:30 PM</Text>
            </TouchableOpacity>
            <View style={styles.modalButtonContainer}>
              <Button
                title="Confirm"
                onPress={() => {
                  if (!selectedTimeslot) {
                    Alert.alert('Selection Required', 'Please select a timeslot.');
                    return;
                  }
                  setTimeslotModalVisible(false);
                  completeCheckout(selectedTimeslot);
                }}
              />
              <Button title="Cancel" onPress={() => setTimeslotModalVisible(false)} />
            </View>
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
  header: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
    marginBottom: 20
  },
  title: {
    fontSize: 24, 
    fontWeight: 'bold'
  },
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
  }
});

export default CartScreen;
