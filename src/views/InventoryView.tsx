import React, { useState } from 'react';
import { useInventoryStore, getStockLevel, formatPieces, getItemBatches } from '../lib/store';
import { Button, Input } from '../components/ui/Forms';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PackagePlus, Plus, X, Search, Edit2, Trash2, Calculator, AlertTriangle } from 'lucide-react';
import { cn } from '../lib/utils';

export function InventoryView() {
  const { items, transactions, addItem, addTransaction, updateItem, deleteItem } = useInventoryStore();
  const [showAddForm, setShowAddForm] = useState(false);
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
            const stockPieces = getStockLevel(item.id, transactions);
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
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 leading-tight">{item.name}</h3>
                            {isLowStock && (
                              <span className="flex items-center gap-1 bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider">
                                <AlertTriangle className="w-3 h-3" />
                                Low Stock
                              </span>
                            )}
                            <div className="flex text-gray-400">
                              <button onClick={() => setEditingItem(item.id)} className="p-1 hover:text-blue-600 rounded">
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setDeleteDialog({ isOpen: true, id: item.id, name: item.name })} className="p-1 hover:text-red-600 rounded">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-500">1 {item.unitMeasurement} = {item.piecesPerUnit} pcs</p>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded-md text-sm">
                            {formatPieces(stockPieces, item.piecesPerUnit, item.unitMeasurement)}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider">{stockPieces} Total Pcs</div>
                        </div>
                      </div>
                      
                      {!isReceiving && (
                        <Button 
                          variant="secondary" 
                          className="w-full mt-2" 
                          onClick={() => {
                            setReceiveUnits('');
                            setReceivePieces('');
                            setShowReceiveForm(item.id);
                          }}
                        >
                          Receive Stock
                        </Button>
                      )}
                      
                      {isReceiving && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            const fd = new FormData(e.currentTarget);
                            const u = Number(receiveUnits) || 0;
                            const p = Number(receivePieces) || 0;
                            const notes = fd.get('notes') as string;
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
                            
                            addTransaction({
                              type: 'RECEIVE',
                              itemId: item.id,
                              receiverId: null,
                              pieceQuantity: totalPieces,
                              displayString: `Received ${u ? u + ' ' + item.unitMeasurement : ''} ${p ? p + ' pcs' : ''}`.trim() || `${totalPieces} pcs`,
                              notes,
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
                              <Input name="receiveDate" type="date" label="Receive Date" defaultValue={new Date().toLocaleDateString('en-CA')} />
                            </div>
                            <div className="flex-1">
                              <Input name="batchNumber" label="Batch / Lot Number" placeholder={`e.g. ${item.name.substring(0, 2).toUpperCase()}-0001`} />
                            </div>
                          </div>
                          <span className="text-[10px] text-gray-500 -mt-2">Leave batch empty to auto-generate (e.g. {item.name.substring(0, 2).toUpperCase()}-0001)</span>

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
                                  <div key={batch.id} className="flex justify-between items-center text-xs">
                                    <div className="flex flex-col">
                                      <span className="font-semibold text-gray-700">{batch.batchNumber}</span>
                                      <span className="text-[10px] text-gray-400">Rcvd: {new Date(batch.date).toLocaleDateString()}</span>
                                    </div>
                                    <span className="font-bold text-blue-700 bg-blue-100/50 px-2 py-0.5 rounded">
                                      {formatPieces(batch.remainingQty, item.piecesPerUnit, item.unitMeasurement)}
                                    </span>
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
