import React, { useState } from 'react';
import { useInventoryStore, formatPieces } from '../lib/store';
import { BarChart3, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { cn, formatDateTimePHT } from '../lib/utils';

type Period = 'DAY' | 'WEEK' | 'MONTH';

export function ReportsView() {
  const { transactions, items, receivers } = useInventoryStore();
  const [period, setPeriod] = useState<Period>('DAY');

  const getFilteredTransactions = () => {
    const now = new Date();
    const startOfPeriod = new Date(now);
    
    if (period === 'DAY') {
      startOfPeriod.setHours(0, 0, 0, 0);
    } else if (period === 'WEEK') {
      const day = startOfPeriod.getDay();
      const diff = startOfPeriod.getDate() - day + (day === 0 ? -6 : 1);
      startOfPeriod.setDate(diff);
      startOfPeriod.setHours(0, 0, 0, 0);
    } else if (period === 'MONTH') {
      startOfPeriod.setDate(1);
      startOfPeriod.setHours(0, 0, 0, 0);
    }

    return transactions.filter(tx => new Date(tx.date) >= startOfPeriod);
  };

  const filteredTxs = getFilteredTransactions();
  
  const summary = filteredTxs.reduce((acc, tx) => {
    if (tx.type === 'RECEIVE') acc.received += tx.pieceQuantity;
    if (tx.type === 'DISBURSE') acc.disbursed += tx.pieceQuantity;
    return acc;
  }, { received: 0, disbursed: 0 });

  const getReceiverName = (id: string | null) => {
    if (!id) return 'Unknown';
    return receivers.find(r => r.id === id)?.name || 'Deleted Receiver';
  };

  const periodItems = items.map(item => {
    const itemTxs = filteredTxs.filter(tx => tx.itemId === item.id);
    return { ...item, transactions: itemTxs };
  }).filter(item => item.transactions.length > 0);

  return (
    <div className="flex flex-col gap-8 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col gap-1 px-2">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-none">Intelligence</h1>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Analytics & Stock Reporting</p>
      </div>

      <div className="bg-white p-1.5 rounded-2xl border border-slate-200/50 shadow-sm flex items-center gap-1.5 ring-1 ring-slate-900/5 text-slate-900">
        {(['DAY', 'WEEK', 'MONTH'] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={cn(
              "flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300",
              period === p ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            )}
          >
            {p === 'DAY' ? 'Today' : p === 'WEEK' ? 'Weekly' : 'Monthly'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200/50 shadow-sm ring-1 ring-slate-900/5 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
            <ArrowDownLeft className="text-blue-600 w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Incoming Assets</span>
          <span className="text-3xl font-black text-slate-900 tracking-tighter">{summary.received}</span>
          <span className="text-[10px] font-bold text-blue-600/60 uppercase tracking-widest mt-1">Total Pieces</span>
        </div>
        <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200/50 shadow-sm ring-1 ring-slate-900/5 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-4">
            <ArrowUpRight className="text-slate-900 w-6 h-6" />
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Stock Released</span>
          <span className="text-3xl font-black text-slate-900 tracking-tighter">{summary.disbursed}</span>
          <span className="text-[10px] font-bold text-slate-900/40 uppercase tracking-widest mt-1">Total Pieces</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
            <h2 className="font-black text-slate-900 text-sm uppercase tracking-widest">Movement Log</h2>
            <div className="h-0.5 flex-1 mx-4 bg-slate-100 rounded-full" />
        </div>
        
        {periodItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-16 text-center space-y-4 bg-white rounded-[3rem] border border-dashed border-slate-200 shadow-sm opacity-60">
             <BarChart3 className="w-12 h-12 text-slate-200" />
             <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No activity in this period</p>
          </div>
        ) : (
          periodItems.map(item => (
            <div key={item.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-200/50 shadow-sm ring-1 ring-slate-900/5 transition-all hover:shadow-xl hover:border-slate-300/50">
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-1">
                  <h3 className="font-black text-xl text-slate-900 tracking-tight leading-tight">{item.name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.itemType} • {item.baseUnit}</p>
                </div>
                <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{item.transactions.length} Ops</span>
                </div>
              </div>

              <div className="space-y-3">
                {item.transactions.map(tx => (
                  <div key={tx.id} className="flex justify-between items-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 group hover:bg-white hover:border-slate-200 transition-all">
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                           "w-2 h-2 rounded-full shrink-0",
                           tx.type === 'RECEIVE' ? "bg-blue-600" : "bg-slate-900"
                        )} />
                        <span className="text-[10px] font-bold text-slate-400">{formatDateTimePHT(tx.date)}</span>
                      </div>
                      <span className="text-[10px] font-bold text-slate-600 mt-1 truncate">
                        {tx.receiverId ? `To: ${getReceiverName(tx.receiverId)}` : `Manifest: ${tx.batchNumber || 'N/A'}`}
                      </span>
                    </div>
                    <div className="flex flex-col items-end shrink-0 ml-4">
                      <span className={cn(
                         "font-black text-sm tracking-tight",
                         tx.type === 'RECEIVE' ? "text-blue-600" : "text-slate-900"
                      )}>
                        {tx.type === 'RECEIVE' ? '+' : '-'} {formatPieces(tx.pieceQuantity, item.itemType, item.baseUnit, item.piecesPerUnit)}
                      </span>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">{tx.pieceQuantity.toFixed(2)} {item.baseUnit}(s)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
