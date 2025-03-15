import React, { useEffect, useState, useLayoutEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../services/firebaseConfig';

const NotificationScreen = ({ navigation }) => {
  const [notifications, setNotifications] = useState([]);
  const [expandedNotification, setExpandedNotification] = useState(null);

  // 1) Configure a navy header with a cream title, centered
  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: 'Notifications',
      headerTitleAlign: 'center',
      headerStyle: { backgroundColor: '#003B6F' }, // Navy
      headerTitleStyle: { color: '#fdf5e6', fontSize: 22, fontWeight: 'bold' }, // Cream text
    });
  }, [navigation]);

  useEffect(() => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    // Query Firestore to get notifications for the logged-in user, sorted by timestamp descending
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationList = snapshot.docs.map((doc) => ({
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
      <FlatList
        data={notifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.emptyText}>No notifications yet.</Text>}
      />
    </View>
  );
};

export default NotificationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fdf5e6' // Cream background
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#003B6F' // Navy text
  },
  notificationItem: { 
    padding: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#ccc' 
  },
  notificationHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between' 
  },
  notificationTitle: { 
    fontSize: 18, 
    fontWeight: 'bold',
    color: '#003B6F' // Navy text
  },
  notificationTime: { 
    fontSize: 14, 
    color: 'gray' // Keep the timestamp gray
  },
  notificationOrder: { 
    fontSize: 16, 
    color: '#003B6F' // Navy text
  },
  notificationMessage: {
    marginTop: 10,
    fontSize: 16,
    color: '#003B6F' // Navy text
  },
  emptyText: { 
    textAlign: 'center', 
    marginTop: 20, 
    fontSize: 16, 
    color: '#003B6F' // Navy text
  }
});
