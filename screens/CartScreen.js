// screens/CartScreen.js
import React, { useState } from 'react';
import { View, Text, FlatList, StyleSheet, Button, Alert } from 'react-native';
import { useCart } from '../contexts/CartContext';
import { addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../services/firebaseConfig';
import QRCode from 'react-native-qrcode-svg';

const CartScreen = ({ navigation }) => {
  // Destructure cartItems, clearCart, and updateItemQuantity from the context
  const { cartItems, clearCart, updateItemQuantity } = useCart();
  const [orderId, setOrderId] = useState(null);
  
  // Calculate total quantity and cost
  const totalQuantity = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalCost = cartItems
    .reduce((acc, item) => acc + item.price * item.quantity, 0)
    .toFixed(2);
  
  // Function to handle checkout
  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      Alert.alert('Cart is empty', 'Please add items to your cart.');
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
    
    // Build the order object including the userId
    const order = {
      items: cartItems,
      totalQuantity,
      totalCost: parseFloat(totalCost),
      createdAt: new Date(),
      status: 'pending',
      userId: currentUser.uid
    };
    
    try {
      // Add the order to Firestore's "pendingOrders" collection
      const orderRef = await addDoc(collection(db, 'pendingOrders'), order);
      setOrderId(orderRef.id);
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
  }
});
  
export default CartScreen;
