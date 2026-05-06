import React, { useEffect, useState } from 'react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useInventoryStore, Item, Receiver, Transaction } from '../lib/store';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

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

    // Subscribe to Transactions (Limited to last 100 to save on reads/quota)
    const txQuery = query(
      collection(db, 'transactions'), 
      orderBy('date', 'desc'), 
      limit(100)
    );
    
    const unsubTransactions = onSnapshot(txQuery, (snap) => {
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
      <div className="min-h-screen bg-[#FDFDFD] flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
        {/* Subtle Background Elements */}
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-50/50 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-blue-100/30 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="w-full max-w-[440px] z-10">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600 mb-6 shadow-xl shadow-blue-200/50">
              <span className="text-white font-black text-2xl tracking-tighter">IS</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-3">Inventory System</h1>
            <p className="text-gray-500 text-lg">Streamlined warehouse management for precision and efficiency.</p>
          </div>

          <div className="bg-white border border-gray-100 p-8 sm:p-10 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.04)] ring-1 ring-gray-200/50">
            <div className="space-y-6">
              <div className="text-center space-y-1 mb-8">
                <h2 className="text-xl font-bold text-gray-800">Welcome Back</h2>
                <p className="text-gray-400 text-sm">Please sign in with your enterprise account</p>
              </div>

              <button 
                onClick={handleLogin}
                className="flex items-center justify-center gap-3 w-full bg-white border border-gray-300 hover:border-gray-400 hover:bg-gray-50 text-gray-700 font-semibold py-4 px-6 rounded-xl transition-all duration-200 active:scale-[0.98] shadow-sm"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                <span>Continue with Google</span>
              </button>

              <div className="relative flex items-center py-4">
                <div className="flex-grow border-t border-gray-100"></div>
                <span className="flex-shrink-0 mx-4 text-gray-300 text-[10px] font-bold uppercase tracking-[0.2em]">Partner Access</span>
                <div className="flex-grow border-t border-gray-100"></div>
              </div>

              <div className="pt-2">
                <p className="text-center text-xs text-gray-400 leading-relaxed px-4">
                  By signing in, you agree to our <span className="text-gray-600 font-medium hover:underline cursor-pointer">Internal Operations Policy</span> and <span className="text-gray-600 font-medium hover:underline cursor-pointer">Privacy Protocol</span>.
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-12 text-center">
            <span className="text-gray-400 text-sm font-medium">Powered by System Core v2.4</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
