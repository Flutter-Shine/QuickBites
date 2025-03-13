// screens/NotificationScreen.js
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';

const NotificationScreen = () => {
  const [notifications, setNotifications] = useState([]);
  const [expandedNotification, setExpandedNotification] = useState(null);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
  
    // Query Firestore to get notifications for the logged-in user, sorted by timestamp descending
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      orderBy('timestamp', 'desc') // 🔥 This ensures newest notifications appear first
    );
  
    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setNotifications(notificationList);
    });
  
    return () => unsubscribe();
  }, []);

  const renderItem = ({ item }) => {
    // Convert Firestore timestamp to a readable format
    const formattedTimestamp = item.timestamp
      ? new Date(item.timestamp.seconds * 1000).toLocaleString()
      : 'Unknown time';
  
    return (
      <TouchableOpacity 
        style={styles.notificationItem} 
        onPress={() => setExpandedNotification(expandedNotification === item.id ? null : item.id)}
      >
        <View style={styles.notificationHeader}>
          <Text style={styles.notificationTitle}>{item.title}</Text>
          <Text style={styles.notificationTime}>{formattedTimestamp}</Text>
        </View>
        <Text style={styles.notificationOrder}>Order #{item.orderNumber}</Text>
  
        {expandedNotification === item.id && (
          <Text style={styles.notificationMessage}>{item.message}</Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.screenTitle}>Notifications</Text>
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.emptyText}>No notifications yet.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  screenTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  notificationItem: { 
    padding: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#ccc' 
  },
  notificationHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  notificationTitle: { fontSize: 18, fontWeight: 'bold' },
  notificationTime: { fontSize: 14, color: 'gray' },
  notificationOrder: { fontSize: 16, color: '#555' },
  notificationDescription: { marginTop: 10, fontSize: 16, color: '#333' },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16, color: 'gray' }
});

export default NotificationScreen;
