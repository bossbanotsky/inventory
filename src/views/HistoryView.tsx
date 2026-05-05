import React, { useState } from 'react';
import { useInventoryStore, formatPieces } from '../lib/store';
import { format } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight, Trash2, Filter } from 'lucide-react';
import { Button, Select } from '../components/ui/Forms';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export function HistoryView() {
  const { transactions, items, receivers, deleteTransaction } = useInventoryStore();
  const [deleteDialog, setDeleteDialog] = useState<{isOpen: boolean, id: string}>({ isOpen: false, id: '' });
  
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterItemId, setFilterItemId] = useState<string>('ALL');
  const [filterReceiverId, setFilterReceiverId] = useState<string>('ALL');
  const [showFilters, setShowFilters] = useState(false);

  const getItem = (id: string) => items.find(i => i.id === id);
  const getReceiverName = (id: string | null) => receivers.find(r => r.id === id)?.name || 'Unknown';

  const filteredTransactions = transactions.filter(tx => {
    if (filterType !== 'ALL' && tx.type !== filterType) return false;
    if (filterItemId !== 'ALL' && tx.itemId !== filterItemId) return false;
    if (filterReceiverId !== 'ALL' && tx.receiverId !== filterReceiverId) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-4 pb-20 pt-4 px-4 max-w-md mx-auto w-full">
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction? This will automatically recalculate total stock items."
        confirmText="Delete"
        onConfirm={() => {
          deleteTransaction(deleteDialog.id);
          setDeleteDialog({ isOpen: false, id: '' });
        }}
        onCancel={() => setDeleteDialog({ isOpen: false, id: '' })}
      />

      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Audit History</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setShowFilters(!showFilters)} className="h-8 px-2 text-blue-700 bg-blue-50 hover:bg-blue-100">
            <Filter className="w-4 h-4 mr-1" /> Filters
          </Button>
          <span className="text-xs font-semibold text-gray-500 bg-gray-200 px-2 py-1 rounded-full">{filteredTransactions.length} records</span>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3 mb-2 animate-in fade-in slide-in-from-top-2">
          <Select 
            value={filterType} 
            onChange={e => setFilterType(e.target.value)} 
            label="Transaction Type"
          >
            <option value="ALL">All Types</option>
            <option value="RECEIVE">Receive</option>
            <option value="DISBURSE">Disburse</option>
            <option value="ADJUSTMENT">Adjustment</option>
          </Select>
          <Select 
            value={filterItemId} 
            onChange={e => setFilterItemId(e.target.value)} 
            label="Item"
          >
            <option value="ALL">All Items</option>
            {items.map(item => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </Select>
          <Select 
            value={filterReceiverId} 
            onChange={e => setFilterReceiverId(e.target.value)} 
            label="Receiver"
          >
            <option value="ALL">All Receivers</option>
            {[...receivers].sort((a, b) => a.name.localeCompare(b.name)).map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </Select>
          
          {(filterType !== 'ALL' || filterItemId !== 'ALL' || filterReceiverId !== 'ALL') && (
             <Button variant="secondary" onClick={() => { setFilterType('ALL'); setFilterItemId('ALL'); setFilterReceiverId('ALL'); }} className="h-9 w-full mt-1">
               Clear Filters
             </Button>
          )}
        </div>
      )}

      {filteredTransactions.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          {transactions.length === 0 ? "No transactions recorded yet." : "No transactions match the selected filters."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredTransactions.map(tx => {
            const item = getItem(tx.itemId);
            const isReceive = tx.type === 'RECEIVE';
            const isDisburse = tx.type === 'DISBURSE';
            const isAdjust = tx.type === 'ADJUSTMENT';
            
            if (!item) return null; // Defensive check

            return (
              <div key={tx.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${isReceive ? 'bg-green-100 text-green-700' : isDisburse ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                      {isReceive ? <ArrowDownLeft className="w-4 h-4"/> : isDisburse ? <ArrowUpRight className="w-4 h-4" /> : <Filter className="w-4 h-4"/>}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900">
                        {isReceive ? 'Stock Incoming' : isDisburse ? 'Issued to ' + getReceiverName(tx.receiverId) : 'Inventory Adjustment'}
                      </h3>
                      <p className="text-xs text-gray-500">{format(new Date(tx.date), 'MMM d, yyyy - h:mm a')}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => setDeleteDialog({ isOpen: true, id: tx.id })}
                    className="text-gray-400 hover:text-red-600 p-1 rounded-md transition-colors"
                    title="Delete transaction"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-3 text-sm flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Item:</span>
                    <span className="font-semibold text-gray-900">{item.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Quantity:</span>
                    <span className={`font-bold ${isReceive ? 'text-green-700' : isDisburse ? 'text-blue-700' : 'text-orange-700'}`}>
                      {isReceive ? '+' : isDisburse ? '-' : ''} {formatPieces(tx.pieceQuantity, item.piecesPerUnit, item.unitMeasurement)}
                    </span>
                  </div>
                  {tx.batchNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Batch:</span>
                      <span className="font-semibold text-gray-700">{tx.batchNumber}</span>
                    </div>
                  )}
                  {tx.notes && (
                    <div className="flex justify-between border-t border-gray-200 pt-1 mt-1">
                      <span className="text-gray-500 text-xs mt-0.5">Notes: {tx.notes}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
