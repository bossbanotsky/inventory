import { create } from 'zustand';
import { db, handleFirestoreError, OperationType } from './firebase';
import { collection, doc, setDoc, updateDoc, deleteDoc, increment } from 'firebase/firestore';

export type ItemType = 'COUNTABLE' | 'LENGTH' | 'WEIGHT' | 'VOLUME';

export interface UOMDefinition {
  name: string;
  factor: number; // Factor to multiply by to get base unit
  type: ItemType;
}

export const UOM_SYSTEM: Record<ItemType, { base: string; options: UOMDefinition[] }> = {
  COUNTABLE: {
    base: 'piece',
    options: [
      { name: 'piece', factor: 1, type: 'COUNTABLE' },
      { name: 'box', factor: 12, type: 'COUNTABLE' },
      { name: 'pack', factor: 6, type: 'COUNTABLE' },
      { name: 'case', factor: 24, type: 'COUNTABLE' },
    ]
  },
  LENGTH: {
    base: 'meter',
    options: [
      { name: 'meter', factor: 1, type: 'LENGTH' },
      { name: 'centimeter', factor: 0.01, type: 'LENGTH' },
      { name: 'millimeter', factor: 0.001, type: 'LENGTH' },
      { name: 'inch', factor: 0.0254, type: 'LENGTH' },
      { name: 'foot', factor: 0.3048, type: 'LENGTH' },
    ]
  },
  WEIGHT: {
    base: 'kilogram',
    options: [
      { name: 'kilogram', factor: 1, type: 'WEIGHT' },
      { name: 'gram', factor: 0.001, type: 'WEIGHT' },
      { name: 'milligram', factor: 0.000001, type: 'WEIGHT' },
      { name: 'pound', factor: 0.453592, type: 'WEIGHT' },
      { name: 'ounce', factor: 0.0283495, type: 'WEIGHT' },
    ]
  },
  VOLUME: {
    base: 'liter',
    options: [
      { name: 'liter', factor: 1, type: 'VOLUME' },
      { name: 'milliliter', factor: 0.001, type: 'VOLUME' },
      { name: 'cubic meter', factor: 1000, type: 'VOLUME' },
      { name: 'gallon', factor: 4, type: 'VOLUME' },
      { name: 'piece', factor: 4, type: 'VOLUME' },
    ]
  }
};

export type Item = {
  id: string;
  name: string;
  itemType: ItemType;
  baseUnit: string;
  piecesPerUnit: number; // Multiplier for custom 'box' size in countable
  lengthPerUnit?: number;
  width?: number;
  height?: number;
  density?: number;
  lowStockThreshold?: number;
  createdAt: number;
  totalPieces: number; // Stored in base units
};

export type Receiver = {
  id: string;
  name: string;
  department?: string;
};

export type TransactionType = 'RECEIVE' | 'DISBURSE' | 'ADJUSTMENT';

export type Transaction = {
  id: string;
  date: string;
  type: TransactionType;
  itemId: string;
  receiverId: string | null;
  pieceQuantity: number; // Standardized (Base Unit)
  inputQuantity: number; // User input value
  inputUom: string;      // User input unit
  displayString: string;
  notes: string;
  batchNumber?: string;
  receivedBy?: string;
};

interface InventoryState {
  items: Item[];
  receivers: Receiver[];
  transactions: Transaction[];
  setItems: (items: Item[]) => void;
  setReceivers: (receivers: Receiver[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  
  addItem: (item: Omit<Item, 'id' | 'createdAt' | 'totalPieces'>) => Promise<void>;
  updateItem: (id: string, updated: Partial<Item>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  
  addTransaction: (tx: Omit<Transaction, 'id' | 'date'> & { date?: string }) => Promise<void>;
  updateTransaction: (id: string, tx: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;

  addReceiver: (receiver: Omit<Receiver, 'id'>) => Promise<void>;
  updateReceiver: (id: string, updated: Partial<Receiver>) => Promise<void>;
  deleteReceiver: (id: string) => Promise<void>;

  // UI state
  activeTab: 'inventory' | 'receivers' | 'history' | 'reports' | 'itemDetail';
  setActiveTab: (tab: 'inventory' | 'receivers' | 'history' | 'reports' | 'itemDetail') => void;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
  historyFilters: {
    type: string;
    itemId: string;
    receiverId: string;
  };
  setHistoryFilters: (filters: Partial<{ type: string; itemId: string; receiverId: string }>) => void;
  disbursementOrder: 'FIFO' | 'LIFO';
  setDisbursementOrder: (order: 'FIFO' | 'LIFO') => void;
}

export const useInventoryStore = create<InventoryState>()((set) => ({
  items: [],
  receivers: [],
  transactions: [],
  activeTab: 'inventory',
  selectedItemId: null,
  historyFilters: { type: 'ALL', itemId: 'ALL', receiverId: 'ALL' },
  disbursementOrder: 'FIFO',

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedItemId: (id) => set({ selectedItemId: id }),
  setHistoryFilters: (filters) => set((state) => ({ historyFilters: { ...state.historyFilters, ...filters } })),
  setDisbursementOrder: (order) => set({ disbursementOrder: order }),

  setItems: (items) => set({ items }),
  setReceivers: (receivers) => set({ receivers }),
  setTransactions: (transactions) => set({ transactions }),

  addItem: async (item) => {
    try {
      const ref = doc(collection(db, 'items'));
      await setDoc(ref, { 
        ...item, 
        totalPieces: 0, // Initialize with 0
        createdAt: Date.now() 
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'items');
    }
  },

  updateItem: async (id, updated) => {
    try {
      await updateDoc(doc(db, 'items', id), updated);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `items/${id}`);
    }
  },

  deleteItem: async (id) => {
    try {
      await deleteDoc(doc(db, 'items', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `items/${id}`);
    }
  },

  addTransaction: async (tx) => {
    try {
      const ref = doc(collection(db, 'transactions'));
      const date = tx.date || new Date().toISOString();
      await setDoc(ref, { ...tx, date });

      // Atomic Update Item Stock
      const itemRef = doc(db, 'items', tx.itemId);
      let diff = tx.pieceQuantity;
      if (tx.type === 'DISBURSE') diff = -Math.abs(tx.pieceQuantity);
      if (tx.type === 'RECEIVE') diff = Math.abs(tx.pieceQuantity);
      // Adjustment already signed appropriately usually, but let's be safe if needed
      
      await updateDoc(itemRef, {
        totalPieces: increment(diff)
      });
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'transactions');
    }
  },

  updateTransaction: async (id, updatedTx) => {
    try {
      await updateDoc(doc(db, 'transactions', id), updatedTx);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `transactions/${id}`);
    }
  },

  deleteTransaction: async (id) => {
    try {
      const state = useInventoryStore.getState();
      const tx = state.transactions.find(t => t.id === id);
      
      await deleteDoc(doc(db, 'transactions', id));

      // Revert Stock if transaction existed
      if (tx) {
        const itemRef = doc(db, 'items', tx.itemId);
        let diff = -tx.pieceQuantity;
        if (tx.type === 'DISBURSE') diff = Math.abs(tx.pieceQuantity);
        if (tx.type === 'RECEIVE') diff = -Math.abs(tx.pieceQuantity);
        
        await updateDoc(itemRef, {
          totalPieces: increment(diff)
        });
      }
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `transactions/${id}`);
    }
  },

  addReceiver: async (receiver) => {
    try {
      const ref = doc(collection(db, 'receivers'));
      await setDoc(ref, receiver);
    } catch (e) {
      handleFirestoreError(e, OperationType.CREATE, 'receivers');
    }
  },

  updateReceiver: async (id, updated) => {
    try {
      await updateDoc(doc(db, 'receivers', id), updated);
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, `receivers/${id}`);
    }
  },

  deleteReceiver: async (id) => {
    try {
      await deleteDoc(doc(db, 'receivers', id));
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, `receivers/${id}`);
    }
  }
}));

// Helpers to get derived data
export const getStockLevel = (itemId: string, transactions: Transaction[], items?: Item[]) => {
  // If we have items passed in, use the stored totalPieces for speed and accuracy (handling limited transactions sync)
  if (items) {
    const item = items.find(i => i.id === itemId);
    if (item && item.totalPieces !== undefined) return item.totalPieces;
  }

  // Fallback to calculation if totalPieces not available or items not passed
  return transactions
    .filter((tx) => tx.itemId === itemId)
    .reduce((acc, tx) => {
      if (tx.type === 'RECEIVE') return acc + tx.pieceQuantity;
      if (tx.type === 'DISBURSE') return acc - tx.pieceQuantity;
      if (tx.type === 'ADJUSTMENT') return acc + tx.pieceQuantity;
      return acc;
    }, 0);
};

export const formatPieces = (pieces: number, itemType: ItemType, baseUnit: string, piecesPerUnit: number = 1) => {
  if (itemType === 'COUNTABLE') {
    if (pieces === 0) return `0 ${baseUnit}s`;
    
    // For countable, we still support the Box concept
    if (piecesPerUnit > 1) {
      const units = Math.floor(pieces / piecesPerUnit);
      const remainder = pieces % piecesPerUnit;
      let res = [];
      if (units > 0) res.push(`${units} Box${units > 1 ? 'es' : ''}`);
      if (remainder > 0) res.push(`${remainder} pc${remainder !== 1 ? 's' : ''}`);
      return res.join(', ');
    }
    return `${pieces} ${pieces === 1 ? baseUnit : baseUnit + 's'}`;
  }

  // Purely physical units
  if (itemType === 'LENGTH') {
    if (pieces < 0.1) return `${(pieces * 100).toFixed(2)} cm`;
    return `${pieces.toFixed(2)} m`;
  }
  if (itemType === 'WEIGHT') {
    if (pieces < 0.1) return `${(pieces * 1000).toFixed(2)} g`;
    return `${pieces.toFixed(2)} kg`;
  }
  if (itemType === 'VOLUME') {
    if (pieces === 0) return '0 liters';
    if (pieces < 0.1) return `${(pieces * 1000).toFixed(2)} ml`;
    
    // Check for full gallons (4 liters per gallon)
    const gallons = Math.floor(pieces / 4);
    const remainingLiters = pieces % 4;
    
    if (gallons > 0) {
      if (remainingLiters === 0) {
        return `${gallons} gallon${gallons !== 1 ? 's' : ''}`;
      }
      return `${gallons} gal, ${remainingLiters.toFixed(2)} l`;
    }
    
    return `${pieces.toFixed(2)} l`;
  }

  return `${pieces} ${baseUnit}`;
};

export const convertToBaseUnit = (quantity: number, uomName: string, itemType: ItemType, itemPiecesPerUnit: number = 1): number => {
  const typeConfig = UOM_SYSTEM[itemType];
  if (!typeConfig) return quantity;

  // Handle Countable special case for 'box'
  if (itemType === 'COUNTABLE' && uomName.toLowerCase() === 'box') {
    return quantity * itemPiecesPerUnit;
  }

  const uom = typeConfig.options.find(o => o.name.toLowerCase() === uomName.toLowerCase());
  return uom ? quantity * uom.factor : quantity;
};

export const convertFromBaseUnit = (quantity: number, targetUomName: string, itemType: ItemType, itemPiecesPerUnit: number = 1): number => {
  const typeConfig = UOM_SYSTEM[itemType];
  if (!typeConfig) return quantity;

  if (itemType === 'COUNTABLE' && targetUomName.toLowerCase() === 'box') {
    return quantity / itemPiecesPerUnit;
  }

  const uom = typeConfig.options.find(o => o.name.toLowerCase() === targetUomName.toLowerCase());
  return uom ? quantity / uom.factor : quantity;
};

export interface BatchInfo {
  id: string;
  batchNumber: string;
  date: string;
  originalQty: number;
  remainingQty: number;
}

export const getItemBatches = (itemId: string, transactions: Transaction[]): BatchInfo[] => {
  const itemTxs = [...transactions].filter(t => t.itemId === itemId).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const batches: BatchInfo[] = [];

  for (const tx of itemTxs) {
    if (tx.type === 'RECEIVE' || (tx.type === 'ADJUSTMENT' && tx.pieceQuantity > 0)) {
      let bDate = new Date(tx.date);
      // Fallback formatting for date if not standard
      let defaultBatchName = bDate.toLocaleString('default', { month: 'short', day: 'numeric', year: 'numeric' });
      batches.push({
        id: tx.id,
        batchNumber: tx.batchNumber || `Batch ${defaultBatchName}`,
        date: tx.date,
        originalQty: tx.pieceQuantity,
        remainingQty: tx.pieceQuantity
      });
    } else if (tx.type === 'DISBURSE' || (tx.type === 'ADJUSTMENT' && tx.pieceQuantity < 0)) {
      let deduction = tx.type === 'DISBURSE' ? tx.pieceQuantity : Math.abs(tx.pieceQuantity);
      
      if (tx.batchNumber) {
        // Try to deduct from the specified batch first
        for (const batch of batches) {
          if (deduction <= 0) break;
          // Exact match on batch number and it has remaining qty
          if (batch.batchNumber === tx.batchNumber && batch.remainingQty > 0) {
            if (batch.remainingQty >= deduction) {
              batch.remainingQty -= deduction;
              deduction = 0;
            } else {
              deduction -= batch.remainingQty;
              batch.remainingQty = 0;
            }
          }
        }
      }
      
      // If no batch specified or specified batch didn't have enough, apply standard FIFO
      if (deduction > 0) {
        for (const batch of batches) {
          if (deduction <= 0) break;
          if (batch.remainingQty > 0) {
            if (batch.remainingQty >= deduction) {
              batch.remainingQty -= deduction;
              deduction = 0;
            } else {
              deduction -= batch.remainingQty;
              batch.remainingQty = 0;
            }
          }
        }
      }
    }
  }

  return batches.filter(b => b.remainingQty > 0);
};

