import React, { useState, useMemo } from 'react';
import { useInventoryStore, formatPieces, Transaction } from '../lib/store';
import { format, startOfDay, startOfWeek, startOfMonth, parseISO } from 'date-fns';
import { Select } from '../components/ui/Forms';
import { TrendingUp, ArrowDownLeft, ArrowUpRight, Users, Package } from 'lucide-react';
import { cn } from '../lib/utils';

type TimeFrame = 'DAILY' | 'WEEKLY' | 'MONTHLY';
type ReportType = 'ALL' | 'RECEIVING' | 'RECEIVER';

export function ReportsView() {
  const { transactions, items, receivers } = useInventoryStore();
  
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('DAILY');
  const [reportType, setReportType] = useState<ReportType>('ALL');
  const [selectedReceiverId, setSelectedReceiverId] = useState<string>('ALL');

  const groupedData = useMemo(() => {
    // 1. Filter Transactions based on ReportType
    let filteredTxs = transactions;
    
    if (reportType === 'RECEIVING') {
      filteredTxs = transactions.filter(tx => tx.type === 'RECEIVE');
    } else if (reportType === 'RECEIVER') {
      filteredTxs = transactions.filter(tx => tx.type === 'DISBURSE');
      if (selectedReceiverId !== 'ALL') {
        filteredTxs = filteredTxs.filter(tx => tx.receiverId === selectedReceiverId);
      }
    }

    // 2. Group by TimeFrame
    const groups: Record<string, {
      received: Record<string, { total: number, txs: Transaction[] }>;
      disbursed: Record<string, { total: number, txs: Transaction[] }>;
    }> = {};

    filteredTxs.forEach(tx => {
      const date = parseISO(tx.date);
      let groupKey = '';
      
      if (timeFrame === 'DAILY') {
        groupKey = format(startOfDay(date), 'MMM d, yyyy');
      } else if (timeFrame === 'WEEKLY') {
        groupKey = `Week of ${format(startOfWeek(date), 'MMM d, yyyy')}`;
      } else if (timeFrame === 'MONTHLY') {
        groupKey = format(startOfMonth(date), 'MMMM yyyy');
      }

      if (!groups[groupKey]) {
        groups[groupKey] = { received: {}, disbursed: {} };
      }

      if (tx.type === 'RECEIVE') {
        if (!groups[groupKey].received[tx.itemId]) groups[groupKey].received[tx.itemId] = { total: 0, txs: [] };
        groups[groupKey].received[tx.itemId].total += tx.pieceQuantity;
        groups[groupKey].received[tx.itemId].txs.push(tx);
      } else if (tx.type === 'DISBURSE') {
        if (!groups[groupKey].disbursed[tx.itemId]) groups[groupKey].disbursed[tx.itemId] = { total: 0, txs: [] };
        groups[groupKey].disbursed[tx.itemId].total += tx.pieceQuantity;
        groups[groupKey].disbursed[tx.itemId].txs.push(tx);
      }
    });

    return Object.entries(groups).map(([date, data]) => ({ date, ...data }));

  }, [transactions, timeFrame, reportType, selectedReceiverId]);

  const getItem = (id: string) => items.find(i => i.id === id);
  const getReceiverName = (id: string | null) => receivers.find(r => r.id === id)?.name || 'Unknown';

  return (
    <div className="flex flex-col gap-4 pb-20 pt-4 px-4 max-w-md mx-auto w-full">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Reports</h1>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
        <div className="flex bg-gray-100 p-1 rounded-lg">
          {(['DAILY', 'WEEKLY', 'MONTHLY'] as TimeFrame[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeFrame(tf)}
              className={cn(
                "flex-1 text-xs font-semibold py-2 rounded-md transition-all",
                timeFrame === tf ? "bg-white text-blue-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
              )}
            >
              {tf.charAt(0) + tf.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <Select 
          value={reportType} 
          onChange={e => setReportType(e.target.value as ReportType)} 
          label="Report Type"
        >
          <option value="ALL">All Transactions</option>
          <option value="RECEIVING">Receiving Only</option>
          <option value="RECEIVER">By Receiver</option>
        </Select>

        {reportType === 'RECEIVER' && (
          <Select 
            value={selectedReceiverId} 
            onChange={e => setSelectedReceiverId(e.target.value)} 
            label="Select Receiver"
          >
            <option value="ALL">All Receivers</option>
            {[...receivers].sort((a,b) => a.name.localeCompare(b.name)).map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </Select>
        )}
      </div>

      {groupedData.length === 0 ? (
        <div className="text-center py-10 text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <TrendingUp className="w-10 h-10 mx-auto text-gray-400 mb-2" />
          No data available for this report.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {groupedData.map(group => {
            const hasReceived = Object.keys(group.received).length > 0;
            const hasDisbursed = Object.keys(group.disbursed).length > 0;
            
            return (
              <div key={group.date} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 font-semibold text-sm text-gray-700">
                  {group.date}
                </div>
                
                <div className="p-4 flex flex-col gap-4">
                  {hasReceived && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 text-green-700 font-medium text-xs uppercase tracking-wider">
                        <ArrowDownLeft className="w-4 h-4" /> Received
                      </div>
                      <div className="grid gap-2">
                        {Object.entries(group.received).map(([itemId, val]) => {
                          const { total, txs } = val as { total: number, txs: Transaction[] };
                          const item = getItem(itemId);
                          if (!item) return null;
                          return (
                            <div key={itemId} className="flex flex-col border-b border-gray-100 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                              <div className="flex justify-between items-center text-sm mb-1 gap-2">
                                <span className="text-gray-900 font-bold break-words min-w-0">{item.name}</span>
                                <span className="text-green-700 font-bold bg-green-50 px-2 py-0.5 rounded flex-shrink-0 whitespace-nowrap">{formatPieces(total, item.piecesPerUnit, item.unitMeasurement)}</span>
                              </div>
                              <div className="flex flex-col gap-1 pl-2 border-l border-green-200 ml-1">
                                {txs.map(tx => (
                                  <div key={tx.id} className="text-xs flex flex-col gap-0.5 text-gray-500">
                                    <div className="flex justify-between gap-2">
                                      <span className="flex-shrink-0 whitespace-nowrap">{format(parseISO(tx.date), 'MMM d, h:mm a')}</span>
                                      <span className="font-semibold text-green-600 break-words min-w-0 text-right">+{formatPieces(tx.pieceQuantity, item.piecesPerUnit, item.unitMeasurement)}</span>
                                    </div>
                                    {tx.batchNumber && <span className="text-gray-400 break-words min-w-0">Batch: {tx.batchNumber}</span>}
                                    {tx.notes && <span className="italic break-words min-w-0">Note: {tx.notes}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {hasDisbursed && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-1.5 text-blue-700 font-medium text-xs uppercase tracking-wider">
                        <ArrowUpRight className="w-4 h-4" /> Disbursed
                      </div>
                      <div className="grid gap-2">
                        {Object.entries(group.disbursed).map(([itemId, val]) => {
                          const { total, txs } = val as { total: number, txs: Transaction[] };
                          const item = getItem(itemId);
                          if (!item) return null;
                          return (
                            <div key={itemId} className="flex flex-col border-b border-gray-100 pb-2 mb-2 last:border-0 last:pb-0 last:mb-0">
                              <div className="flex justify-between items-center text-sm mb-1 gap-2">
                                <span className="text-gray-900 font-bold break-words min-w-0">{item.name}</span>
                                <span className="text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded flex-shrink-0 whitespace-nowrap">{formatPieces(total, item.piecesPerUnit, item.unitMeasurement)}</span>
                              </div>
                              <div className="flex flex-col gap-1 pl-2 border-l border-blue-200 ml-1">
                                {txs.map(tx => (
                                  <div key={tx.id} className="text-xs flex flex-col gap-0.5 text-gray-500">
                                    <div className="flex justify-between gap-2">
                                      <span className="flex-shrink-0 whitespace-nowrap">{format(parseISO(tx.date), 'MMM d, h:mm a')}</span>
                                      <span className="font-semibold text-blue-600 break-words min-w-0 text-right">-{formatPieces(tx.pieceQuantity, item.piecesPerUnit, item.unitMeasurement)}</span>
                                    </div>
                                    <span className="text-gray-400 break-words min-w-0">To: {getReceiverName(tx.receiverId)}</span>
                                    {tx.receivedBy && <span className="text-gray-400 break-words min-w-0">Rcvd by: {tx.receivedBy}</span>}
                                    {tx.notes && <span className="italic break-words min-w-0">Note: {tx.notes}</span>}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
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
