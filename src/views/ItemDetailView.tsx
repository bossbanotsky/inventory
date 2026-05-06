import React, { useState } from 'react';
import { useInventoryStore, getStockLevel, formatPieces } from '../lib/store';
import { ChevronLeft, Package, History, Layers, Calendar, User, AlertTriangle, Search } from 'lucide-react';
import { cn, formatDateTimePHT, formatDatePHT } from '../lib/utils';

export function ItemDetailView() {
  const { items, transactions, selectedItemId } = useInventoryStore();
  const [searchQuery, setSearchQuery] = useState('');
  const item = items.find(i => i.id === selectedItemId);

  if (!item) return null;

  const stockPieces = getStockLevel(item.id, transactions, items);
  const isLowStock = item.lowStockThreshold !== undefined && item.lowStockThreshold > 0 && stockPieces <= item.lowStockThreshold;

  const itemTxs = transactions
    .filter(tx => tx.itemId === item.id)
    .filter(tx => {
      const searchLower = searchQuery.toLowerCase();
      return !searchQuery || 
        tx.notes?.toLowerCase().includes(searchLower) ||
        tx.receivedBy?.toLowerCase().includes(searchLower) ||
        tx.batchNumber?.toLowerCase().includes(searchLower);
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Group by batch for display
  const batches = transactions
    .filter(tx => tx.itemId === item.id && tx.type === 'RECEIVE')
    .map(tx => {
      const disbursementsForThisBatch = transactions
        .filter(t => t.itemId === item.id && t.type === 'DISBURSE' && t.batchNumber === tx.batchNumber)
        .reduce((sum, t) => sum + t.pieceQuantity, 0);
      
      return {
        ...tx,
        remainingQty: tx.pieceQuantity - disbursementsForThisBatch,
        originalQty: tx.pieceQuantity
      };
    })
    .filter(b => b.remainingQty > 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-500 pb-24">
      <div className="flex items-center gap-3 px-2">
        <button 
          onClick={() => useInventoryStore.getState().setActiveTab('inventory')}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 shadow-sm hover:bg-slate-50 transition-all"
        >
          <ChevronLeft className="w-5 h-5 text-slate-400" />
        </button>
        <div className="flex flex-col text-slate-900">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none">{item.name}</h1>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Product Profile & Batch Analytics</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/50 shadow-sm ring-1 ring-slate-900/5 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-2xl bg-slate-900 flex items-center justify-center mb-3 shadow-lg shadow-slate-200">
            <Package className="text-white w-5 h-5" strokeWidth={2.5} />
          </div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Available Assets</span>
          <span className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{formatPieces(stockPieces, item.itemType, item.baseUnit, item.piecesPerUnit)}</span>
          <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1.5">{stockPieces.toFixed(2)} Total {item.baseUnit}s</span>
        </div>
        <div className="bg-white p-5 rounded-3xl border border-slate-200/50 shadow-sm ring-1 ring-slate-900/5 flex flex-col items-center text-center">
          <div className={cn(
             "w-10 h-10 rounded-2xl flex items-center justify-center mb-3 shadow-lg",
             isLowStock ? "bg-red-500 shadow-red-100" : "bg-blue-600 shadow-blue-100"
          )}>
            <AlertTriangle className="text-white w-5 h-5" strokeWidth={2.5} />
          </div>
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Alert threshold</span>
          <span className="text-2xl font-black text-slate-900 tracking-tighter leading-none">{item.lowStockThreshold || 0}</span>
          <span className={cn(
             "text-[9px] font-black uppercase tracking-widest mt-1",
             isLowStock ? "text-red-500 animate-pulse" : "text-blue-600/60"
          )}>
            {isLowStock ? "Critical Alert" : "Stable Status"}
          </span>
        </div>
      </div>

      {(item.width || item.height || item.density || (item.itemType === 'LENGTH' && item.lengthPerUnit)) && (
        <div className="bg-slate-50 p-4 rounded-3xl border border-slate-200/50 flex flex-col gap-3 mx-2">
           <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Physical Specifications</h3>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-1">
              {item.itemType === 'LENGTH' && item.lengthPerUnit && (
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Unit Length</span>
                  <span className="font-black text-xs text-slate-900">{item.lengthPerUnit} m</span>
                </div>
              )}
              {item.width && (
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Width</span>
                  <span className="font-black text-xs text-slate-900">{item.width}</span>
                </div>
              )}
              {item.height && (
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Height</span>
                  <span className="font-black text-xs text-slate-900">{item.height}</span>
                </div>
              )}
              {item.density && (
                <div className="flex flex-col">
                  <span className="text-[8px] font-bold text-slate-400 uppercase">Density</span>
                  <span className="font-black text-xs text-slate-900">{item.density}</span>
                </div>
              )}
           </div>
        </div>
      )}


      <div className="space-y-3">
        <div className="flex items-center justify-between px-2">
            <h2 className="font-black text-slate-900 text-[10px] uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-slate-400" /> Traceable Batches
            </h2>
            <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">FIFO Active</span>
        </div>

        {batches.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm opacity-60">
             <Layers className="w-9 h-9 text-slate-200 mx-auto mb-2" />
             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No active batches detected</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
             {batches.map((batch, idx) => (
               <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm ring-1 ring-slate-900/5 flex justify-between items-center group hover:border-slate-300 transition-all">
                  <div className="flex flex-col gap-0.5 pr-4">
                     <span className="font-black text-slate-900 text-base tracking-tight uppercase">{batch.batchNumber || 'N/A'}</span>
                     <div className="flex items-center gap-1.5">
                        <Calendar className="w-2.5 h-2.5 text-slate-300" />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">In: {formatDatePHT(batch.date)}</span>
                     </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                     <div className="font-black text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 shadow-sm text-sm">
                       {formatPieces(batch.remainingQty, item.itemType, item.baseUnit, item.piecesPerUnit)}
                     </div>
                     <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-60">
                        Batch {idx + 1}
                     </span>
                  </div>
               </div>
             ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between px-2">
              <h2 className="font-black text-slate-900 text-[10px] uppercase tracking-widest flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-slate-400" /> Operational Record
              </h2>
          </div>

          <div className="px-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input 
                type="text"
                placeholder="Search notes, recipients, or batches..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-9 pr-4 text-[10px] font-medium focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all shadow-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          {itemTxs.length === 0 ? (
            <div className="text-center py-10 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm opacity-60">
               <History className="w-9 h-9 text-slate-200 mx-auto mb-2" />
               <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Journal is empty</p>
            </div>
          ) : (
            itemTxs.map(tx => (
              <div key={tx.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group hover:bg-slate-50 transition-all border-l-4 border-l-slate-900">
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className={cn(
                       "w-1.5 h-1.5 rounded-full",
                       tx.type === 'RECEIVE' ? "bg-blue-600" : "bg-slate-900"
                    )} />
                    <span className="font-bold text-slate-900 text-xs tracking-tight">{tx.type} Log</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{formatDateTimePHT(tx.date)}</span>
                    <div className="flex items-center gap-1.5 overflow-hidden">
                       {tx.receivedBy && (
                         <span className="text-[8px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md border border-blue-100 flex items-center gap-1 shrink-0">
                            {tx.receivedBy}
                         </span>
                       )}
                       {tx.notes && <span className="text-[9px] text-slate-500 italic truncate max-w-[120px]">“{tx.notes}”</span>}
                    </div>
                  </div>
                </div>
                <div className="text-right ml-3 shrink-0">
                  <div className={cn(
                    "font-black text-sm tracking-tight leading-none px-2.5 py-1.5 rounded-lg border",
                    tx.type === 'RECEIVE' ? "text-blue-700 bg-blue-50 border-blue-100" : "text-slate-900 bg-white border-slate-200"
                  )}>
                    {tx.type === 'RECEIVE' ? '+' : '-'} {formatPieces(tx.pieceQuantity, item.itemType, item.baseUnit, item.piecesPerUnit)}
                  </div>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5 block px-1">{tx.pieceQuantity.toFixed(2)} {item.baseUnit}s</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
