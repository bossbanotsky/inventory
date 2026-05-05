import React, { useEffect, useState } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useInventoryStore, Item, Receiver, Transaction } from '../lib/store';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  const { setItems, setReceivers, setTransactions } = useInventoryStore();

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      setLoading(false);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Subscribe to Items
    const unsubItems = onSnapshot(collection(db, 'items'), (snap) => {
      const dbItems: Item[] = [];
      snap.forEach(d => dbItems.push({ id: d.id, ...d.data() } as Item));
      setItems(dbItems);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'items'));

    // Subscribe to Receivers
    const unsubReceivers = onSnapshot(collection(db, 'receivers'), (snap) => {
      const dbReceivers: Receiver[] = [];
      snap.forEach(d => dbReceivers.push({ id: d.id, ...d.data() } as Receiver));
      setReceivers(dbReceivers);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'receivers'));

    // Subscribe to Transactions
    const unsubTransactions = onSnapshot(query(collection(db, 'transactions'), orderBy('date', 'desc')), (snap) => {
      const dbTransactions: Transaction[] = [];
      snap.forEach(d => dbTransactions.push({ id: d.id, ...d.data() } as Transaction));
      setTransactions(dbTransactions);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'transactions'));

    return () => {
      unsubItems();
      unsubReceivers();
      unsubTransactions();
    };
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      console.error(e);
      alert('Failed to log in');
    }
  };

  if (loading) {
    return <div className="h-screen w-full flex items-center justify-center bg-gray-50 text-gray-500">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Inventory System</h1>
        <p className="text-gray-600 mb-8 max-w-sm">Please sign in with your administrator account to access the inventory dashboard and manage disbursements.</p>
        <button 
          onClick={handleLogin}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg shadow-sm transition-colors active:scale-95"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
