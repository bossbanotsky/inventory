import React, { useState } from 'react';
import { useInventoryStore, formatPieces, Transaction } from '../lib/store';
import { Users, ChevronDown, ChevronUp, PackageOpen, Calendar, Plus, X, Edit2, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { Button, Input } from '../components/ui/Forms';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export function ReceiversView() {
  const { receivers, transactions, items, addReceiver, updateReceiver, deleteReceiver } = useInventoryStore();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
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
                  <div className="w-full text-left px-5 py-4 flex justify-between items-center hover:bg-gray-50 transition-colors">
                    <button 
                      onClick={() => setExpanded(isExpanded ? null : receiver.id)}
                      className="flex-1 flex flex-col text-left"
                      aria-expanded={isExpanded}
                    >
                      <span className="font-bold text-gray-900 text-lg">{receiver.name}</span>
                      <span className="text-xs text-gray-500 font-medium">{receiverTxs.length} Transactions</span>
                    </button>
                    
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditingReceiver(receiver.id)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteDialog({ isOpen: true, id: receiver.id, name: receiver.name })} className="p-1.5 text-gray-400 hover:text-red-600 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setExpanded(isExpanded ? null : receiver.id)} className="p-1.5 text-gray-400">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}

                {isExpanded && !isEditing && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-4">
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
