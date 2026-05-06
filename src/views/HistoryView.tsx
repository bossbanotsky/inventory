import React from 'react';
import { useInventoryStore, formatPieces } from '../lib/store';
import { Select } from '../components/ui/Forms';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { History, ArrowDownLeft, ArrowUpRight, RefreshCcw, Users } from 'lucide-react';
import { cn, formatDateTimePHT } from '../lib/utils';

export function HistoryView() {
  const { transactions, items, receivers, deleteTransaction, historyFilters: filters, setHistoryFilters: setFilters } = useInventoryStore();
  const [deleteDialog, setDeleteDialog] = React.useState<{isOpen: boolean, id: string}>({ isOpen: false, id: '' });

  const filteredTransactions = transactions
    .filter(tx => {
      const matchItem = filters.itemId === 'ALL' || tx.itemId === filters.itemId;
      const matchReceiver = filters.receiverId === 'ALL' || tx.receiverId === filters.receiverId;
      const matchType = filters.type === 'ALL' || tx.type === filters.type;
      return matchItem && matchReceiver && matchType;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Transaction"
        message="Are you sure you want to delete this transaction record? This will revert the stock levels for the associated item. This action cannot be undone."
        confirmText="Permanently Delete"
        onConfirm={() => {
          deleteTransaction(deleteDialog.id);
          setDeleteDialog({ isOpen: false, id: '' });
        }}
        onCancel={() => setDeleteDialog({ isOpen: false, id: '' })}
      />
      
      <div className="flex flex-col gap-1 px-2">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-none">Journal</h1>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Audit Trail & Activity Log</p>
      </div>

      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200/50 shadow-[0_15px_40px_-5px_rgba(0,0,0,0.04)] ring-1 ring-slate-900/5 space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <Select 
            label="Product Filter"
            value={filters.itemId}
            onChange={(e) => setFilters({ ...filters, itemId: e.target.value })}
            className="rounded-xl h-12 text-sm font-bold"
          >
            <option value="ALL">All Products</option>
            {items.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </Select>

          <Select 
            label="Partner Filter"
            value={filters.receiverId}
            onChange={(e) => setFilters({ ...filters, receiverId: e.target.value })}
            className="rounded-xl h-12 text-sm font-bold"
          >
            <option value="ALL">All Partners</option>
            {receivers.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </Select>
        </div>

        <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
          {(['ALL', 'RECEIVE', 'DISBURSE', 'ADJUSTMENT'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setFilters({ ...filters, type })}
              className={cn(
                "flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all duration-300",
                filters.type === type ? "bg-slate-900 text-white shadow-lg" : "text-slate-400 hover:text-slate-600"
              )}
            >
              {type === 'ALL' ? 'Total' : type === 'RECEIVE' ? 'In' : type === 'DISBURSE' ? 'Out' : 'Adj'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {filteredTransactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center space-y-4 bg-white rounded-[3rem] border border-dashed border-slate-200 shadow-sm opacity-60">
             <div className="w-16 h-16 rounded-3xl bg-slate-50 flex items-center justify-center">
               <History className="w-8 h-8 text-slate-300" />
             </div>
             <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No activities found</p>
          </div>
        ) : (
          filteredTransactions.map(tx => {
            const item = items.find(i => i.id === tx.itemId);
            const receiver = receivers.find(r => r.id === tx.receiverId);
            const isReceive = tx.type === 'RECEIVE';
            const isDisburse = tx.type === 'DISBURSE';
            
            return (
              <div key={tx.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center justify-between group transition-all hover:shadow-2xl hover:shadow-slate-200/50 hover:border-slate-300 ring-1 ring-slate-900/5">
                <div className="flex items-center gap-5 flex-1 min-w-0">
                  <div className={cn(
                    "w-14 h-14 rounded-3xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 shrink-0",
                    isReceive ? "bg-blue-600 shadow-blue-100" : isDisburse ? "bg-slate-900 shadow-slate-200" : "bg-orange-500 shadow-orange-100"
                  )}>
                    {isReceive ? <ArrowDownLeft className="text-white w-7 h-7" /> : isDisburse ? <ArrowUpRight className="text-white w-7 h-7" /> : <RefreshCcw className="text-white w-7 h-7" />}
                  </div>
                  
                  <div className="flex flex-col min-w-0 text-slate-900">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-black text-slate-900 text-xl tracking-tight truncate leading-none">{item?.name || 'Deleted Product'}</span>
                      {tx.batchNumber && (
                        <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-lg uppercase tracking-widest">#{tx.batchNumber}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-bold uppercase tracking-widest">
                       <span className="text-slate-900">{formatDateTimePHT(tx.date)}</span>
                       <span className="opacity-30">•</span>
                       <span className={cn(
                         "px-1.5 py-0.5 rounded font-black",
                         isReceive ? "text-blue-600 bg-blue-50" : isDisburse ? "text-slate-900 bg-slate-100" : "text-orange-600 bg-orange-50"
                       )}>
                         {tx.type}
                       </span>
                    </div>
                    {receiver && (
                      <span className="text-[11px] font-black text-slate-700 mt-2.5 flex items-center gap-1.5 bg-slate-100 self-start px-3 py-1 rounded-xl border border-slate-200/50">
                        <Users className="w-3.5 h-3.5 text-slate-400" /> {receiver.name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right flex flex-col items-end shrink-0 ml-4">
                  <div className={cn(
                    "font-black text-2xl tracking-tighter leading-none px-4 py-2.5 rounded-2xl border transition-all shadow-sm",
                    isReceive ? "text-blue-700 bg-blue-50 border-blue-200" : isDisburse ? "text-slate-900 bg-slate-100 border-slate-300" : "text-orange-700 bg-orange-50 border-orange-200"
                  )}>
                    {isReceive ? '+' : isDisburse ? '-' : ''}
                    {item ? formatPieces(tx.pieceQuantity, item.itemType, item.baseUnit, item.piecesPerUnit) : tx.displayString}
                  </div>
                  {item && (
                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-widest mt-2 block px-1">
                      {tx.pieceQuantity.toFixed(2)} Total {item.baseUnit}s
                    </span>
                  )}
                  <button 
                    onClick={() => setDeleteDialog({ isOpen: true, id: tx.id })}
                    className="p-1 px-2 text-[9px] font-black text-red-500/50 hover:text-red-600 hover:bg-red-50 rounded-lg mt-3 transition-all uppercase tracking-widest"
                  >
                    Remove Log
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
