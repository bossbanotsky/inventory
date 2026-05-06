import React from 'react';
import { useInventoryStore, getStockLevel, formatPieces, getItemBatches } from '../lib/store';
import { Button } from '../components/ui/Forms';
import { ArrowLeft, Package, History, Layers, Info, Calendar, User, FileText, ChevronRight } from 'lucide-react';
import { cn, formatDatePHT, formatDateTimePHT } from '../lib/utils';

export function ItemDetailView() {
  const { items, transactions, receivers, selectedItemId, setSelectedItemId, setActiveTab, setHistoryFilters } = useInventoryStore();
  
  const item = items.find(i => i.id === selectedItemId);
  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500 space-y-4">
        <Package className="w-12 h-12 text-gray-300" />
        <p>Item not found.</p>
        <Button onClick={() => setActiveTab('inventory')}>Back to Inventory</Button>
      </div>
    );
  }

  const stockPieces = getStockLevel(item.id, transactions, items);
  const batches = getItemBatches(item.id, transactions).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const itemTxs = [...transactions]
    .filter(t => t.itemId === item.id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getReceiverName = (id: string | null) => {
    if (!id) return 'Unknown';
    return receivers.find(r => r.id === id)?.name || id;
  };

  return (
    <div className="flex flex-col gap-6 pb-24 pt-4 px-4 max-w-md mx-auto w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-center gap-3">
        <button 
          onClick={() => {
            setSelectedItemId(null);
            setActiveTab('inventory');
          }}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-xl font-bold text-gray-900 truncate">{item.name}</h1>
      </div>

      {/* Summary Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden shrink-0">
        <div className="bg-blue-600 p-5 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-blue-100 text-xs font-bold uppercase tracking-wider mb-1">Current Stock</p>
              <h2 className="text-3xl font-black">{formatPieces(stockPieces, item.piecesPerUnit, item.unitMeasurement)}</h2>
              <p className="text-blue-100 text-sm font-medium mt-1">{stockPieces} Total Pieces</p>
            </div>
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <Package className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
        <div className="p-4 grid grid-cols-2 gap-4 bg-white">
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Base Unit</p>
            <p className="font-bold text-gray-900">{item.unitMeasurement}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pieces per Unit</p>
            <p className="font-bold text-gray-900">{item.piecesPerUnit}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Threshold</p>
            <p className={cn("font-bold", stockPieces <= (item.lowStockThreshold || 0) ? "text-red-600" : "text-gray-900")}>
              {item.lowStockThreshold || 0} pcs
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Created</p>
            <p className="font-bold text-gray-900 text-sm">{formatDatePHT(item.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Batches Section */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Layers className="w-4 h-4 text-blue-600" />
          <h3 className="font-bold text-gray-900 uppercase text-xs tracking-widest">Active Batches</h3>
          <span className="ml-auto text-[10px] font-bold text-gray-400">{batches.length} active</span>
        </div>
        
        <div className="flex flex-col gap-2">
          {batches.length === 0 ? (
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-sm">
              No active batches in stock
            </div>
          ) : (
            batches.map(batch => (
              <div key={batch.id} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex justify-between items-center group">
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-gray-900 truncate">{batch.batchNumber}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium mt-0.5">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDatePHT(batch.date)}</span>
                    <span className="mx-1">•</span>
                    <span>Orig: {formatPieces(batch.originalQty, item.piecesPerUnit, item.unitMeasurement)}</span>
                  </div>
                </div>
                <div className="text-right ml-3 shrink-0">
                  <div className="text-sm font-black text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                    {formatPieces(batch.remainingQty, item.piecesPerUnit, item.unitMeasurement)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Recent Activity Section */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-orange-500" />
            <h3 className="font-bold text-gray-900 uppercase text-xs tracking-widest">Transaction History</h3>
          </div>
          <button 
            onClick={() => {
              setHistoryFilters({ itemId: item.id, type: 'ALL', receiverId: 'ALL' });
              setActiveTab('history');
            }}
            className="text-blue-600 text-[10px] font-bold uppercase tracking-wider flex items-center hover:underline"
          >
            See All <ChevronRight className="w-3 h-3" />
          </button>
        </div>

        <div className="flex flex-col gap-2.5">
          {itemTxs.length === 0 ? (
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-6 text-center text-gray-400 text-sm">
              No transactions yet
            </div>
          ) : (
            itemTxs.slice(0, 10).map(tx => (
              <div key={tx.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:border-gray-300 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col">
                    <span className={cn(
                      "text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-widest w-fit mb-1",
                      tx.type === 'RECEIVE' ? "bg-green-100 text-green-700" : 
                      tx.type === 'DISBURSE' ? "bg-blue-100 text-blue-700" : 
                      "bg-yellow-100 text-yellow-700"
                    )}>
                      {tx.type}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                      {formatDateTimePHT(tx.date)}
                    </span>
                  </div>
                  <span className={cn("font-black text-sm", tx.type === 'RECEIVE' ? "text-green-600" : "text-blue-600")}>
                    {tx.type === 'RECEIVE' ? '+' : '-'}{tx.pieceQuantity} pcs
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2 text-xs text-gray-700">
                    <Info className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="font-semibold break-words">{tx.displayString}</span>
                  </div>

                  {tx.type === 'DISBURSE' && tx.receiverId && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">To: <span className="font-bold text-gray-800">{getReceiverName(tx.receiverId)}</span></span>
                    </div>
                  )}

                  {tx.receivedBy && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      <span className="truncate">Rcvd by: <span className="font-bold text-blue-700">{tx.receivedBy}</span></span>
                    </div>
                  )}

                  {tx.batchNumber && (
                    <div className="flex items-center gap-2 text-xs text-gray-600">
                      <Layers className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <span className="truncate">Batch: <span className="font-mono font-bold text-gray-800">{tx.batchNumber}</span></span>
                    </div>
                  )}

                  {tx.notes && (
                    <div className="flex items-start gap-2 text-[11px] text-gray-500 bg-gray-50 p-2 rounded-lg mt-1">
                      <FileText className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                      <span className="italic break-words">"{tx.notes}"</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {itemTxs.length > 10 && (
            <button 
              onClick={() => {
                setHistoryFilters({ itemId: item.id, type: 'ALL', receiverId: 'ALL' });
                setActiveTab('history');
              }}
              className="py-3 text-center text-xs font-bold text-gray-500 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors uppercase tracking-widest border border-dashed border-gray-200 mt-1"
            >
              View {itemTxs.length - 10} more transactions in history
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
