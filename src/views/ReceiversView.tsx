import React, { useState } from 'react';
import { useInventoryStore, formatPieces, Transaction, getStockLevel } from '../lib/store';
import { Users, ChevronDown, ChevronUp, PackageOpen, Calendar, Plus, X, Edit2, Trash2, Send, History } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { Button, Input, Select } from '../components/ui/Forms';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export function ReceiversView() {
  const { receivers, transactions, items, addReceiver, updateReceiver, deleteReceiver } = useInventoryStore();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDisburseForm, setShowDisburseForm] = useState(false);
  const [editingReceiver, setEditingReceiver] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{isOpen: boolean, id: string, name: string}>({ isOpen: false, id: '', name: '' });

  const getItemMeasurement = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return null;
    return item;
  };

  const groupTransactionsByDay = (txs: Transaction[]) => {
    const grouped = txs.reduce((acc, tx) => {
      const dateStr = format(new Date(tx.date), 'MMM d, yyyy');
      if (!acc[dateStr]) acc[dateStr] = [];
      acc[dateStr].push(tx);
      return acc;
    }, {} as Record<string, Transaction[]>);
    
    return Object.entries(grouped).map(([date, txs]) => ({
      date,
      transactions: txs
    }));
  };

  return (
    <div className="flex flex-col gap-4 pb-20 pt-4 px-4 max-w-md mx-auto w-full">
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Receiver"
        message={`Are you sure you want to delete receiver "${deleteDialog.name}"? Transactions to this receiver will show as 'Unknown'.`}
        confirmText="Delete Receiver"
        onConfirm={() => {
          deleteReceiver(deleteDialog.id);
          setDeleteDialog({ isOpen: false, id: '', name: '' });
        }}
        onCancel={() => setDeleteDialog({ isOpen: false, id: '', name: '' })}
      />

      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Receivers</h1>
        <Button onClick={() => setShowAddForm(true)} variant="secondary" className="h-9 px-3 gap-1">
          <Plus className="w-4 h-4" />
          <span className="text-xs">New</span>
        </Button>
      </div>

      {showAddForm && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-lg">Add New Receiver</h2>
            <button onClick={() => setShowAddForm(false)} className="text-gray-500 hover:bg-gray-100 p-1 rounded-md">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              addReceiver({
                name: fd.get('name') as string,
              });
              setShowAddForm(false);
            }}
            className="flex flex-col gap-3"
          >
            <Input name="name" label="Receiver Name" placeholder="e.g. PAKYAW 1" required />
            <Button type="submit" className="mt-2 w-full">Save</Button>
          </form>
        </div>
      )}

      {receivers.length === 0 && !showAddForm ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500 space-y-3 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <Users className="w-12 h-12 text-gray-400" />
          <p>No receivers yet.<br/>Add a new receiver to start issuing items.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {[...receivers].sort((a, b) => a.name.localeCompare(b.name)).map(receiver => {
            const receiverTxs = transactions.filter(tx => tx.receiverId === receiver.id && tx.type === 'DISBURSE');
            const isExpanded = expanded === receiver.id;
            const groupedTxs = groupTransactionsByDay(receiverTxs);
            const isEditing = editingReceiver === receiver.id;
            
            return (
              <div key={receiver.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm transition-all">
                {isEditing ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget);
                      updateReceiver(receiver.id, {
                        name: fd.get('name') as string,
                      });
                      setEditingReceiver(null);
                    }}
                    className="p-4 flex flex-col gap-3"
                  >
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-gray-900">Edit Receiver</span>
                      <button type="button" onClick={() => setEditingReceiver(null)} className="text-gray-400 hover:text-gray-700 p-1">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <Input name="name" defaultValue={receiver.name} required />
                    <Button type="submit" className="w-full">Save Changes</Button>
                  </form>
                ) : (
                  <div className="w-full text-left px-4 py-3 flex flex-col gap-3 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start">
                      <button 
                        onClick={() => {
                           if (expanded === receiver.id) {
                             setExpanded(null);
                           } else {
                             setExpanded(receiver.id);
                             setShowDisburseForm(false);
                           }
                        }}
                        className="flex-1 flex flex-col text-left focus:outline-none"
                        aria-expanded={isExpanded}
                      >
                        <span className="font-bold text-gray-900 text-lg leading-tight">{receiver.name}</span>
                        <span className="text-xs text-gray-500 font-medium mt-0.5">{receiverTxs.length} Transactions</span>
                      </button>
                      
                      <div className="flex items-center gap-1 -mt-1 -mr-1">
                        <button onClick={() => setEditingReceiver(receiver.id)} className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteDialog({ isOpen: true, id: receiver.id, name: receiver.name })} className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (expanded === receiver.id && showDisburseForm) {
                            setShowDisburseForm(false);
                            setExpanded(null);
                          } else {
                            setExpanded(receiver.id);
                            setShowDisburseForm(true);
                          }
                        }}
                        className="flex-1 h-9 rounded-lg gap-1.5 font-semibold text-sm shadow-sm bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Send className="w-4 h-4" />
                        Disburse
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => {
                          useInventoryStore.getState().setHistoryFilters({ receiverId: receiver.id, type: 'ALL', itemId: 'ALL' });
                          useInventoryStore.getState().setActiveTab('history');
                        }}
                        className="h-9 rounded-lg gap-1.5 font-semibold px-4 text-sm shadow-sm border-gray-300"
                      >
                        <History className="w-4 h-4" />
                        Full History
                      </Button>
                    </div>
                  </div>
                )}

                {isExpanded && !isEditing && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-4">
                    {showDisburseForm && (
                      <div className="bg-white border border-blue-200 rounded-lg p-3 mb-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                        <h4 className="text-sm font-bold text-blue-800 mb-2">Disburse to {receiver.name}</h4>
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          const itemId = fd.get('itemId') as string;
                          const u = Number(fd.get('units')) || 0;
                          const p = Number(fd.get('pieces')) || 0;
                          const notes = fd.get('notes') as string;
                          const batchNumber = fd.get('batchNumber') as string;
                          
                          const item = items.find(i => i.id === itemId);
                          if (!item) return;
                          
                          const totalPieces = (u * item.piecesPerUnit) + p;
                          if (totalPieces <= 0) return;
                          
                          const stock = getStockLevel(item.id, transactions);
                          if (totalPieces > stock) {
                            alert(`Insufficient stock. You only have ${stock} pieces available.`);
                            return;
                          }
                          
                          useInventoryStore.getState().addTransaction({
                            type: 'DISBURSE',
                            itemId: item.id,
                            receiverId: receiver.id,
                            pieceQuantity: totalPieces,
                            displayString: `${u ? u + ' ' + item.unitMeasurement : ''} ${p ? p + ' pcs' : ''}`.trim() || `${totalPieces} pcs`,
                            notes,
                            batchNumber: batchNumber || undefined
                          });
                          setShowDisburseForm(false);
                        }} className="flex flex-col gap-3">
                          <Select name="itemId" label="Select Item" required>
                            <option value="">-- Choose Item --</option>
                            {items.map(i => {
                               const stock = getStockLevel(i.id, transactions);
                               return (
                                 <option key={i.id} value={i.id} disabled={stock === 0}>
                                   {i.name} ({stock > 0 ? formatPieces(stock, i.piecesPerUnit, i.unitMeasurement) : 'Out of stock'})
                                 </option>
                               );
                            })}
                          </Select>
                          <div className="flex gap-2">
                            <Input name="units" type="number" min="0" label="Qty (Units)" placeholder="0" className="flex-1" />
                            <Input name="pieces" type="number" min="0" label="Pieces" placeholder="0" className="flex-1" />
                          </div>
                          <Input name="batchNumber" label="Batch / Lot Number" placeholder="Optional" />
                          <Input name="notes" label="Notes" placeholder="Optional" />
                          <div className="flex gap-2 mt-1">
                            <Button type="button" variant="secondary" onClick={() => setShowDisburseForm(false)} className="flex-1">Cancel</Button>
                            <Button type="submit" className="flex-1">Complete Disburse</Button>
                          </div>
                        </form>
                      </div>
                    )}
                    {receiverTxs.length === 0 ? (
                      <div className="text-center py-6 text-gray-500 text-sm flex flex-col items-center gap-2">
                        <PackageOpen className="w-8 h-8 text-gray-300"/>
                        No items received yet.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-5">
                        {groupedTxs.map((group) => (
                          <div key={group.date} className="flex flex-col gap-2">
                            <div className="flex items-center gap-1.5 text-gray-500 mb-1">
                              <Calendar className="w-4 h-4" />
                              <span className="text-sm font-semibold">{group.date}</span>
                            </div>
                            {group.transactions.map(tx => {
                              const item = getItemMeasurement(tx.itemId);
                              if (!item) return null;
                              
                              return (
                                <div key={tx.id} className="bg-white p-3 rounded-lg border border-gray-100 shadow-sm ml-2 relative before:absolute before:left-[-9px] before:top-1/2 before:w-2 before:h-[1px] before:bg-gray-200 border-l-2 border-l-gray-300">
                                  <div className="flex justify-between items-start mb-1">
                                    <span className="font-semibold text-gray-900">{item.name}</span>
                                    <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-medium">
                                      {format(new Date(tx.date), 'h:mm a')}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-end">
                                    <span className="text-sm font-bold text-blue-600">
                                      {formatPieces(tx.pieceQuantity, item.piecesPerUnit, item.unitMeasurement)}
                                    </span>
                                    {tx.notes && <span className="text-xs text-gray-500 italic">Note: {tx.notes}</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
