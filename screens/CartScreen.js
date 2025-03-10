// screens/CartScreen.js
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Button, Alert, ActivityIndicator } from 'react-native';
import { useCart } from '../contexts/CartContext';
import { addDoc, collection } from 'firebase/firestore';
import { runTransaction, getDocs, query, where } from 'firebase/firestore';
import { db, auth } from '../services/firebaseConfig';
import QRCode from 'react-native-qrcode-svg';

const CartScreen = ({ navigation }) => {
  // Destructure cartItems, clearCart, and updateItemQuantity from the context
  const { cartItems, clearCart, updateItemQuantity } = useCart();
  const [orderId, setOrderId] = useState(null);

  // New states for time-check using API time (Asia/Singapore, GMT+8)
  const [timeLoading, setTimeLoading] = useState(true);
  const [orderingDisabled, setOrderingDisabled] = useState(false);

  // Calculate total quantity and cost
  const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalCost = cartItems
    .reduce((acc, item) => acc + item.price * item.quantity, 0)
    .toFixed(2);

  // Fetch server time from the API and determine if ordering is disabled
  useEffect(() => {
    async function fetchServerTime() {
      try {
        // Use Asia/Singapore timezone for GMT+8
        const response = await fetch('https://timeapi.io/api/Time/current/zone?timeZone=Asia/Singapore');
        const data = await response.json();
        // Expect data.dateTime as an ISO string, e.g., "2025-03-05T10:15:30.000Z"
        const serverTime = new Date(data.dateTime);
        const minutes = serverTime.getHours() * 60 + serverTime.getMinutes();

        // Define disabled intervals:
        // 10:00 AM - 10:30 AM => 600 to 630 minutes
        // 12:30 PM - 4:00 PM   => 750 to 960 minutes
        const disableInterval1Start = 10 * 60; // 600
        const disableInterval1End = 10 * 60 + 30; // 630
        const disableInterval2Start = 12 * 60 + 30; // 750
        const disableInterval2End = 16 * 60; // 960

        const isDisabled =
          (minutes >= disableInterval1Start && minutes < disableInterval1End) ||
          (minutes >= disableInterval2Start && minutes < disableInterval2End);
        setOrderingDisabled(isDisabled);
      } catch (error) {
        console.error('Error fetching server time:', error);
        // Optionally, set orderingDisabled to false as fallback.
      } finally {
        setTimeLoading(false);
      }
    }
    fetchServerTime();
  }, []);

  // Function to handle checkout
  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Cart is empty', 'Please add items to your cart.');
      return;
    }
    
    // If still loading time, ask user to try again shortly.
    if (timeLoading) {
      Alert.alert("Please wait", "Checking ordering availability, please try again shortly.");
      return;
    }
    
    // Check if ordering is available.
    if (orderingDisabled) {
      Alert.alert('Ordering Unavailable', 'Ordering is currently unavailable.');
      return;
    }
    
    // Get the current user's UID from auth
    const currentUser = auth.currentUser;
    if (!currentUser) {
      Alert.alert('Error', 'No user is logged in.');
      return;
    }
    
    // Check if total quantity exceeds 3
    if (totalQuantity > 3) {
      Alert.alert('Checkout Error', 'You cannot checkout if the total quantity exceeds 3 Items.');
      return;
    }
    
    // Function to generate the next order number for today
    const getNextOrderNumber = async () => {
      const today = new Date();
      // Create a date string for today (ISO format without time)
      const dateString = today.toISOString().split('T')[0]; // e.g. "2023-02-13"
      // Create Date objects for the beginning and end of today
      const startOfDay = new Date(dateString);
      const endOfDay = new Date(dateString + "T23:59:59.999Z");
      
      // Query all orders created today from the "pendingOrders" collection
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
    
    try {
      // Use a transaction to generate the next order number and add the order
      await runTransaction(db, async (transaction) => {
        const nextOrderNumber = await getNextOrderNumber();
        
        // Build the order object including the order number and userId
        const order = {
          items: cartItems,
          totalQuantity,
          totalCost: parseFloat(totalCost),
          createdAt: new Date(),
          status: 'pending',
          userId: currentUser.uid,
          orderNumber: nextOrderNumber
        };
        
        // Add the order document to the "pendingOrders" collection
        const orderRef = await addDoc(collection(db, 'pendingOrders'), order);
        // Save the generated order ID to state if needed
        setOrderId(orderRef.id);
      });
      clearCart(); // Clear cart after checkout
      navigation.navigate('Menu'); // Navigate to the Menu screen immediately
    } catch (error) {
      Alert.alert('Order Error', error.message);
    }
  };
  
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
    </View>
  );
};
  
const styles = StyleSheet.create({
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  }
});
  
export default CartScreen;
