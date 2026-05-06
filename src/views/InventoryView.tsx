import React, { useState } from 'react';
import { useInventoryStore, getStockLevel, formatPieces, getItemBatches } from '../lib/store';
import { Button, Input } from '../components/ui/Forms';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PackagePlus, Plus, X, Search, Edit2, Trash2, Calculator, AlertTriangle, ChevronRight, RefreshCw } from 'lucide-react';
import { cn, formatDatePHT } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';

export function InventoryView() {
  const { items, transactions, addItem, addTransaction, updateItem, deleteItem, disbursementOrder, setDisbursementOrder } = useInventoryStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [showReceiveForm, setShowReceiveForm] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [expandedBatches, setExpandedBatches] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{isOpen: boolean, id: string, name: string}>({ isOpen: false, id: '', name: '' });
  
  const [receiveUnits, setReceiveUnits] = useState<number | ''>('');
  const [receivePieces, setReceivePieces] = useState<number | ''>('');

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRecalculateStock = async () => {
    if (!confirm('This will scan all transactions to update stock levels. Continue?')) return;
    setIsRecalculating(true);
    try {
      // 1. Fetch EVERYTHING (One-time intensive operation)
      const txSnap = await getDocs(collection(db, 'transactions'));
      const allTx: any[] = [];
      txSnap.forEach(d => allTx.push({ id: d.id, ...d.data() }));

      const batch = writeBatch(db);
      
      items.forEach(item => {
        const stock = allTx
          .filter(t => t.itemId === item.id)
          .reduce((acc, tx) => {
            if (tx.type === 'RECEIVE') return acc + tx.pieceQuantity;
            if (tx.type === 'DISBURSE') return acc - tx.pieceQuantity;
            if (tx.type === 'ADJUSTMENT') return acc + tx.pieceQuantity;
            return acc;
          }, 0);
        
        batch.update(doc(db, 'items', item.id), { totalPieces: stock });
      });

      await batch.commit();
      alert('Stock levels synchronized successfully!');
    } catch (e) {
      handleFirestoreError(e, OperationType.UPDATE, 'items_bulk');
    } finally {
      setIsRecalculating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-20 pt-4 px-4 max-w-md mx-auto w-full">
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Item"
        message={`Are you sure you want to delete "${deleteDialog.name}"? This action cannot be undone.`}
        confirmText="Delete"
        onConfirm={() => {
          deleteItem(deleteDialog.id);
          setDeleteDialog({ isOpen: false, id: '', name: '' });
        }}
        onCancel={() => setDeleteDialog({ isOpen: false, id: '', name: '' })}
      />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Inventory</h1>
        <Button onClick={() => setShowAddForm(true)} variant="secondary" className="h-9 px-3 gap-1">
          <Plus className="w-4 h-4" />
          <span className="text-xs">New Item</span>
        </Button>
      </div>

      <div className="flex items-center justify-between text-sm text-gray-600 bg-white p-2 rounded-lg border border-gray-200 shadow-sm mt-1 mb-2">
        <span className="font-medium px-2">Disbursement Order</span>
        <div className="flex bg-gray-100 rounded-md p-1">
          <button 
            onClick={() => setDisbursementOrder('FIFO')}
            className={cn("px-4 py-1 rounded text-xs font-medium transition-colors", disbursementOrder === 'FIFO' ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700")}
          >
            FIFO
          </button>
          <button 
            onClick={() => setDisbursementOrder('LIFO')}
            className={cn("px-4 py-1 rounded text-xs font-medium transition-colors", disbursementOrder === 'LIFO' ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700")}
          >
            LIFO
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 p-3 rounded-xl mb-2 flex items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 text-blue-800">
          <RefreshCw className={cn("w-4 h-4", isRecalculating && "animate-spin")} />
          <div className="flex flex-col">
             <span className="text-xs font-bold leading-tight">Optimization Enabled</span>
             <span className="text-[10px] opacity-70">Stock is now tracked atomically.</span>
          </div>
        </div>
        <Button 
          variant="secondary" 
          disabled={isRecalculating}
          onClick={handleRecalculateStock}
          className="h-8 py-0 px-2 text-[10px] bg-white border-blue-200 text-blue-700 hover:bg-blue-50 font-bold uppercase tracking-wider"
        >
          {isRecalculating ? 'Syncing...' : 'Force Sync Stock'}
        </Button>
      </div>

      {items.length > 0 && !showAddForm && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input 
            placeholder="Search items..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {showAddForm && (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-lg">Add New Item</h2>
            <button onClick={() => setShowAddForm(false)} className="text-gray-500 hover:bg-gray-100 p-1 rounded-md">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              addItem({
                name: fd.get('name') as string,
                unitMeasurement: fd.get('unitMeasurement') as string,
                piecesPerUnit: Number(fd.get('piecesPerUnit')),
                lowStockThreshold: Number(fd.get('lowStockThreshold')) || 0,
              });
              setShowAddForm(false);
            }}
            className="flex flex-col gap-3"
          >
            <Input name="name" label="Item Name" placeholder="e.g. Primer" required />
            <div className="flex gap-3">
              <Input name="unitMeasurement" label="Unit Name" placeholder="e.g. Box" required />
              <Input name="piecesPerUnit" type="number" min="1" label="Pieces per Unit" placeholder="e.g. 4" required />
            </div>
            <Input name="lowStockThreshold" type="number" min="0" label="Low Stock Threshold (Pieces)" placeholder="0" />
            <Button type="submit" className="mt-2 w-full">Save Item</Button>
          </form>
        </div>
      )}

      {items.length === 0 && !showAddForm ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500 space-y-3 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <PackagePlus className="w-12 h-12 text-gray-400" />
          <p>No items in inventory.<br/>Add a new item to get started.</p>
        </div>
      ) : filteredItems.length === 0 && !showAddForm ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500 space-y-3 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <Search className="w-12 h-12 text-gray-300" />
          <p>No matching items found for "{searchQuery}".</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredItems.map(item => {
            const stockPieces = getStockLevel(item.id, transactions, items);
            const isReceiving = showReceiveForm === item.id;
            const isLowStock = item.lowStockThreshold !== undefined && item.lowStockThreshold > 0 && stockPieces <= item.lowStockThreshold;
            
            return (
              <div key={item.id} className={cn("bg-white rounded-xl border overflow-hidden shadow-sm", isLowStock ? "border-red-300 shadow-red-100" : "border-gray-200")}>
                <div className="p-4 flex flex-col gap-2">
                  {editingItem === item.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        updateItem(item.id, {
                          name: fd.get('name') as string,
                          unitMeasurement: fd.get('unitMeasurement') as string,
                          piecesPerUnit: Number(fd.get('piecesPerUnit')),
                          lowStockThreshold: Number(fd.get('lowStockThreshold')) || 0,
                        });
                        setEditingItem(null);
                      }}
                      className="flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-gray-900">Edit Item</span>
                        <button type="button" onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-700 p-1">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <Input name="name" label="Item Name" defaultValue={item.name} required />
                      <div className="flex gap-3">
                        <Input name="unitMeasurement" label="Unit Name" defaultValue={item.unitMeasurement} required />
                        <Input name="piecesPerUnit" type="number" min="1" label="Pieces per Unit" defaultValue={item.piecesPerUnit} required />
                      </div>
                      <Input name="lowStockThreshold" type="number" min="0" label="Low Stock Threshold (Pieces)" defaultValue={item.lowStockThreshold || 0} />
                      <Button type="submit" className="mt-2 w-full">Save Changes</Button>
                    </form>
                  ) : (
                    <>
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 
                              className="font-extrabold text-xl sm:text-2xl text-gray-900 leading-tight break-words cursor-pointer hover:text-blue-600 transition-colors"
                              onClick={() => {
                                useInventoryStore.getState().setSelectedItemId(item.id);
                                useInventoryStore.getState().setActiveTab('itemDetail');
                              }}
                            >
                              {item.name}
                            </h3>
                            {isLowStock && (
                              <span className="flex items-center gap-1 bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                                <AlertTriangle className="w-3 h-3" />
                                Low Stock
                              </span>
                            )}
                            <div className="flex text-gray-400 flex-shrink-0 ml-auto">
                               <button 
                                onClick={() => {
                                  useInventoryStore.getState().setSelectedItemId(item.id);
                                  useInventoryStore.getState().setActiveTab('itemDetail');
                                }}
                                className="p-1 hover:text-blue-600 rounded"
                                title="View Details"
                              >
                                <ChevronRight className="w-5 h-5" />
                              </button>
                              <button onClick={() => setEditingItem(item.id)} className="p-1 hover:text-blue-600 rounded">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => setDeleteDialog({ isOpen: true, id: item.id, name: item.name })} className="p-1 hover:text-red-600 rounded">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500 truncate">1 {item.unitMeasurement} = {item.piecesPerUnit} pcs</p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                          <div className="font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg text-lg sm:text-xl shadow-sm border border-blue-100 whitespace-nowrap">
                            {formatPieces(stockPieces, item.piecesPerUnit, item.unitMeasurement)}
                          </div>
                          <div className="text-xs sm:text-sm font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded uppercase tracking-wider whitespace-nowrap">{stockPieces} Total Pcs</div>
                        </div>
                      </div>
                      
                      {!isReceiving && (
                        <div className="flex gap-2 w-full mt-2">
                          <Button 
                            variant="secondary" 
                            className="flex-1" 
                            onClick={() => {
                              setReceiveUnits('');
                              setReceivePieces('');
                              setShowReceiveForm(item.id);
                            }}
                          >
                            Receive Stock
                          </Button>
                          <Button
                            variant="secondary"
                            className="flex-1"
                            onClick={() => {
                              useInventoryStore.getState().setHistoryFilters({ itemId: item.id, type: 'ALL', receiverId: 'ALL' });
                              useInventoryStore.getState().setActiveTab('history');
                            }}
                          >
                            Item History
                          </Button>
                        </div>
                      )}
                      
                      {isReceiving && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            const u = Number(receiveUnits) || 0;
                            const p = Number(receivePieces) || 0;
                            const notes = fd.get('notes') as string;
                            const supplierName = fd.get('supplierName') as string;
                            let batchNumber = fd.get('batchNumber') as string;
                            const receiveDateStr = fd.get('receiveDate') as string;
                            
                            const totalPieces = (u * item.piecesPerUnit) + p;
                            if (totalPieces <= 0) return;

                            if (!batchNumber) {
                               const prefix = item.name.substring(0, 2).toUpperCase();
                               const receiveTxs = transactions.filter(t => t.itemId === item.id && t.type === 'RECEIVE' && t.batchNumber?.startsWith(`${prefix}-`));
                               let maxSeq = 0;
                               for (const tx of receiveTxs) {
                                 if (tx.batchNumber) {
                                   const seq = parseInt(tx.batchNumber.split('-')[1] || '0', 10);
                                   if (!isNaN(seq) && seq > maxSeq) {
                                     maxSeq = seq;
                                   }
                                 }
                               }
                               batchNumber = `${prefix}-${String(maxSeq + 1).padStart(4, '0')}`;
                            }
                            
                            let finalDate = new Date().toISOString();
                            if (receiveDateStr) {
                                // Keep current time, just change the date
                                const d = new Date();
                                const [year, month, day] = receiveDateStr.split('-').map(Number);
                                d.setFullYear(year, month - 1, day);
                                finalDate = d.toISOString();
                            }
                            
                            let finalNotes = notes;
                            if (supplierName) {
                              finalNotes = finalNotes ? `From ${supplierName} | ${finalNotes}` : `From ${supplierName}`;
                            }
                            
                            addTransaction({
                              type: 'RECEIVE',
                              itemId: item.id,
                              receiverId: null,
                              pieceQuantity: totalPieces,
                              displayString: `Received ${u ? u + ' ' + item.unitMeasurement : ''} ${p ? p + ' pcs' : ''}`.trim() || `${totalPieces} pcs`,
                              notes: finalNotes,
                              batchNumber,
                              date: finalDate
                            });
                            setShowReceiveForm(null);
                          }}
                          className="mt-3 pt-3 border-t border-gray-100 flex flex-col gap-3 animate-in slide-in-from-top-2"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold flex items-center gap-1 text-green-700">
                              <PackagePlus className="w-4 h-4"/> Incoming Stock
                            </span>
                            <button type="button" onClick={() => setShowReceiveForm(null)} className="text-gray-400 hover:text-gray-700 p-1">
                              <X className="w-4 h-4"/>
                            </button>
                          </div>
                          
                          <div className="flex gap-2">
                            <div className="flex-1 flex flex-col">
                              <Input 
                                name="units" 
                                type="number" 
                                min="0" 
                                label={`Qty (${item.unitMeasurement}s)`} 
                                value={receiveUnits}
                                onChange={(e) => setReceiveUnits(e.target.value ? Number(e.target.value) : '')}
                                placeholder="0"
                              />
                              {(Number(receiveUnits) || 0) > 0 && <span className="text-[10px] text-gray-500 font-medium px-1 mt-1">≈ {(Number(receiveUnits) || 0) * item.piecesPerUnit} pieces</span>}
                            </div>
                            <div className="flex-1 flex flex-col">
                              <Input 
                                name="pieces" 
                                type="number" 
                                min="0" 
                                label="Extra Pieces" 
                                value={receivePieces}
                                onChange={(e) => setReceivePieces(e.target.value ? Number(e.target.value) : '')}
                                placeholder="0"
                              />
                              {(Number(receivePieces) || 0) > 0 && <span className="text-[10px] text-gray-500 font-medium px-1 mt-1">≈ {((Number(receivePieces) || 0) / item.piecesPerUnit).toFixed(1).replace(/\.0$/, '')} {item.unitMeasurement}s</span>}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <div className="flex-1">
                              <Input name="receiveDate" type="date" label="Receive Date" defaultValue={new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date())} />
                            </div>
                            <div className="flex-1">
                              <Input name="batchNumber" label="Batch / Lot Number" placeholder={`e.g. ${item.name.substring(0, 2).toUpperCase()}-0001`} />
                            </div>
                          </div>
                          <span className="text-[10px] text-gray-500 -mt-2">Leave batch empty to auto-generate (e.g. {item.name.substring(0, 2).toUpperCase()}-0001)</span>

                          <Input name="supplierName" label="Supplier / Received From" placeholder="e.g. Acme Corp (Optional)" />
                          
                          {((Number(receiveUnits) || 0) * item.piecesPerUnit + (Number(receivePieces) || 0)) > 0 && (
                            <div className="bg-green-50/50 rounded-lg p-2.5 flex items-center justify-between border border-green-100">
                              <div className="flex items-center gap-2 text-green-700 font-medium text-xs">
                                <Calculator className="w-3.5 h-3.5" />
                                <span>Total incoming:</span>
                              </div>
                              <span className="font-bold text-green-700 text-sm">
                                {((Number(receiveUnits) || 0) * item.piecesPerUnit + (Number(receivePieces) || 0))} pcs
                              </span>
                            </div>
                          )}

                          <Input name="notes" label="Notes (Optional)" placeholder="e.g. PO #12345" />
                          <div className="flex gap-2">
                            <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 focus:ring-green-500">Confirm Receive</Button>
                          </div>
                        </form>
                      )}

                      {!isReceiving && stockPieces > 0 && (
                        <div className="mt-1 pt-2 border-t border-gray-100 flex flex-col">
                          <button 
                            type="button" 
                            className="text-xs text-blue-600 hover:text-blue-800 self-start font-medium px-1"
                            onClick={() => setExpandedBatches(expandedBatches === item.id ? null : item.id)}
                          >
                            {expandedBatches === item.id ? 'Hide Batch Details' : 'View Batch Details'}
                          </button>
                          
                          {expandedBatches === item.id && (
                            <div className="mt-2 flex flex-col gap-1.5 bg-gray-50 rounded-lg p-2.5 border border-gray-100 shadow-inner">
                              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Remaining Stock by Batch</span>
                              {getItemBatches(item.id, transactions).length === 0 ? (
                                <div className="text-xs text-gray-500 italic">No batches found</div>
                              ) : (
                                getItemBatches(item.id, transactions).map(batch => (
                                  <div key={batch.id} className="flex justify-between items-center bg-white p-2 border border-gray-200 rounded shadow-sm mb-1 gap-2">
                                    <div className="flex flex-col flex-1 min-w-0">
                                      <span className="font-bold text-gray-800 text-sm break-words">{batch.batchNumber}</span>
                                      <span className="text-xs text-gray-500 whitespace-nowrap">Rcvd: {formatDatePHT(batch.date)}</span>
                                      <span className="text-xs text-gray-500 truncate">Orig: {formatPieces(batch.originalQty, item.piecesPerUnit, item.unitMeasurement)}</span>
                                    </div>
                                    <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                                      <span className="font-black text-blue-700 text-sm bg-blue-50 px-2 py-1.5 rounded-md border border-blue-100 whitespace-nowrap">
                                        {formatPieces(batch.remainingQty, item.piecesPerUnit, item.unitMeasurement)}
                                      </span>
                                      <span className="text-[11px] font-bold text-gray-500 whitespace-nowrap">{batch.remainingQty} pcs rem.</span>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </>
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
