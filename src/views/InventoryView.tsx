import React, { useState } from 'react';
import { useInventoryStore, getStockLevel, formatPieces, UOM_SYSTEM, ItemType, convertToBaseUnit } from '../lib/store';
import { Button, Input, Select } from '../components/ui/Forms';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PackagePlus, Plus, X, Search, Edit2, Trash2, AlertTriangle, ChevronRight, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';

export function InventoryView() {
  const { items, transactions, addItem, addTransaction, updateItem, deleteItem, disbursementOrder, setDisbursementOrder } = useInventoryStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [showReceiveForm, setShowReceiveForm] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteDialog, setDeleteDialog] = useState<{isOpen: boolean, id: string, name: string}>({ isOpen: false, id: '', name: '' });
  
  const [receiveQuantity, setReceiveQuantity] = useState<number | ''>('');
  const [receiveUom, setReceiveUom] = useState('');
  const [newItemType, setNewItemType] = useState<ItemType>('COUNTABLE');

  const filteredItems = items.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRecalculateStock = async () => {
    if (!confirm('This will scan all transactions to update stock levels. Continue?')) return;
    setIsRecalculating(true);
    try {
      const txSnap = await getDocs(collection(db, 'transactions'));
      const allTx: any[] = [];
      txSnap.forEach(d => allTx.push({ id: d.id, ...d.data() }));

      const batch = writeBatch(db);
      
      items.forEach(item => {
        const stock = allTx
          .filter(t => t.itemId === item.id)
          .reduce((acc, tx) => {
            if (tx.type === 'RECEIVE') return acc + (tx.pieceQuantity || 0);
            if (tx.type === 'DISBURSE') return acc - (tx.pieceQuantity || 0);
            if (tx.type === 'ADJUSTMENT') return acc + (tx.pieceQuantity || 0);
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
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Item"
        message={`This action will permanently remove "${deleteDialog.name}" and all associated transaction records. Proceed with caution.`}
        confirmText="Yes, Delete Item"
        onConfirm={() => {
          deleteItem(deleteDialog.id);
          setDeleteDialog({ isOpen: false, id: '', name: '' });
        }}
        onCancel={() => setDeleteDialog({ isOpen: false, id: '', name: '' })}
      />

      <div className="flex items-end justify-between px-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-none">Inventory</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Universal Asset Control</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} variant="secondary" className="px-4 gap-2 h-10 rounded-xl">
          <Plus className="w-4 h-4" strokeWidth={3} />
          <span className="text-[10px] uppercase tracking-widest font-black">New Product</span>
        </Button>
      </div>

      <div className="bg-white p-1.5 rounded-2xl border border-slate-200/60 shadow-sm flex items-center gap-1.5 ring-1 ring-slate-900/5">
        <button 
          onClick={() => setDisbursementOrder('FIFO')}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300",
            disbursementOrder === 'FIFO' ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
          )}
        >
          FIFO
        </button>
        <button 
          onClick={() => setDisbursementOrder('LIFO')}
          className={cn(
            "flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300",
            disbursementOrder === 'LIFO' ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
          )}
        >
          LIFO
        </button>
      </div>

      {showAddForm && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.1)] border border-slate-200/50 animate-in fade-in zoom-in-95 duration-500 ring-1 ring-slate-900/5">
          <div className="flex justify-between items-center mb-8">
            <div className="space-y-1">
              <h2 className="font-black text-2xl tracking-tighter text-slate-900">New Product</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Universal Registration</p>
            </div>
            <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:bg-slate-50 p-3 rounded-2xl transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              addItem({
                name: fd.get('name') as string,
                itemType: fd.get('itemType') as ItemType,
                baseUnit: fd.get('baseUnit') as string,
                piecesPerUnit: Number(fd.get('piecesPerUnit')) || 1,
                lowStockThreshold: Number(fd.get('lowStockThreshold')) || 0,
                lengthPerUnit: fd.get('lengthPerUnit') ? Number(fd.get('lengthPerUnit')) : undefined,
                width: fd.get('width') ? Number(fd.get('width')) : undefined,
                height: fd.get('height') ? Number(fd.get('height')) : undefined,
                density: fd.get('density') ? Number(fd.get('density')) : undefined,
              });
              setShowAddForm(false);
            }}
            className="flex flex-col gap-5"
          >
            <Input name="name" label="Item Name" placeholder="e.g. Industrial Primer" required />
            <div className="grid grid-cols-2 gap-4">
              <Select name="itemType" label="Classification" value={newItemType} onChange={(e) => setNewItemType(e.target.value as ItemType)}>
                <option value="COUNTABLE">Countable (Pcs)</option>
                <option value="LENGTH">Length (Meters)</option>
                <option value="WEIGHT">Weight (Kilograms)</option>
                <option value="VOLUME">Volume (Liters)</option>
              </Select>
              <Input name="baseUnit" label="Stored Base Unit" defaultValue={UOM_SYSTEM[newItemType].base} readOnly />
            </div>
            {newItemType === 'COUNTABLE' && (
              <Input name="piecesPerUnit" type="number" min="1" label="Custom Box Multiplier" placeholder="1 box = how many pieces?" defaultValue={12} />
            )}
            <div className="grid grid-cols-2 gap-4">
              <Input name="lowStockThreshold" type="number" min="0" label="Alert Threshold (Base Units)" placeholder="0" />
              {newItemType === 'LENGTH' && (
                <Input name="lengthPerUnit" type="number" step="any" min="0" label="Length per Unit" placeholder="e.g. 6 (meters)" />
              )}
            </div>

            <div className="grid grid-cols-3 gap-4 border-t pt-5 border-slate-100">
               <Input name="width" type="number" step="any" min="0" label="Width" placeholder="0.0" />
               <Input name="height" type="number" step="any" min="0" label="Height" placeholder="0.0" />
               <Input name="density" type="number" step="any" min="0" label="Density" placeholder="0.0" />
            </div>

            <Button type="submit" className="mt-4 w-full h-14 rounded-2xl text-md shadow-xl bg-slate-900">Register Product</Button>
          </form>
        </div>
      )}

      {items.length === 0 && !showAddForm ? (
        <div className="flex flex-col items-center justify-center p-16 text-center space-y-6 bg-white rounded-[3rem] border border-dashed border-slate-200 shadow-sm ring-1 ring-slate-900/5">
          <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center shadow-inner">
            <PackagePlus className="w-10 h-10 text-slate-300" />
          </div>
          <div className="space-y-2">
            <p className="font-extrabold text-xl text-slate-900 tracking-tight">Empty Inventory</p>
            <p className="text-sm font-medium text-slate-400 max-w-[200px]">Begin by registering your first warehouse product.</p>
          </div>
          <Button onClick={() => setShowAddForm(true)} variant="primary" className="h-11 px-8 rounded-xl text-[10px] uppercase font-black tracking-[0.2em] shadow-lg">New Product</Button>
        </div>
      ) : filteredItems.length === 0 && !showAddForm ? (
        <div className="flex flex-col items-center justify-center p-16 text-center text-slate-500 bg-white rounded-[3rem] border border-dashed border-slate-200 shadow-sm ring-1 ring-slate-900/5">
          <Search className="w-12 h-12 text-slate-200 mb-4" />
          <p className="font-bold text-slate-400 text-sm italic tracking-tight">No entities found matching "{searchQuery}"</p>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          {filteredItems.map(item => {
            const stockPieces = getStockLevel(item.id, transactions, items);
            const isReceiving = showReceiveForm === item.id;
            const isLowStock = item.lowStockThreshold !== undefined && item.lowStockThreshold > 0 && stockPieces <= item.lowStockThreshold;
            const uomOptions = UOM_SYSTEM[item.itemType]?.options || [];

            return (
              <div key={item.id} className={cn(
                "group bg-white rounded-[2.5rem] border transition-all duration-500",
                isLowStock ? "border-red-100 shadow-[0_20px_40px_-5px_rgba(239,68,68,0.06)]" : "border-slate-200/50 shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_25px_60px_-12px_rgba(0,0,0,0.06)] hover:border-slate-300 ring-1 ring-slate-900/5"
              )}>
                <div className="p-7 flex flex-col gap-5">
                  {editingItem === item.id ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        updateItem(item.id, {
                          name: fd.get('name') as string,
                          piecesPerUnit: Number(fd.get('piecesPerUnit')) || 1,
                          lowStockThreshold: Number(fd.get('lowStockThreshold')) || 0,
                          lengthPerUnit: fd.get('lengthPerUnit') ? Number(fd.get('lengthPerUnit')) : undefined,
                          width: fd.get('width') ? Number(fd.get('width')) : undefined,
                          height: fd.get('height') ? Number(fd.get('height')) : undefined,
                          density: fd.get('density') ? Number(fd.get('density')) : undefined,
                        });
                        setEditingItem(null);
                      }}
                      className="flex flex-col gap-5 animate-in fade-in slide-in-from-top-2 duration-300"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-black text-slate-900 uppercase tracking-widest text-[10px]">Edit Settings</span>
                        <button type="button" onClick={() => setEditingItem(null)} className="text-slate-400 hover:text-slate-700 p-2 hover:bg-slate-50 rounded-xl">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <Input name="name" label="Item Name" defaultValue={item.name} required />
                      {item.itemType === 'COUNTABLE' && (
                        <Input name="piecesPerUnit" type="number" min="1" label="Box Multiplier" defaultValue={item.piecesPerUnit} required />
                      )}
                      <Input name="lowStockThreshold" type="number" min="0" label="Critical Level" defaultValue={item.lowStockThreshold || 0} />
                      
                      <div className="grid grid-cols-2 gap-4">
                        {item.itemType === 'LENGTH' && (
                          <Input name="lengthPerUnit" type="number" step="any" min="0" label="Length/Unit" defaultValue={item.lengthPerUnit} />
                        )}
                        <Input name="width" type="number" step="any" min="0" label="Width" defaultValue={item.width} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Input name="height" type="number" step="any" min="0" label="Height" defaultValue={item.height} />
                        <Input name="density" type="number" step="any" min="0" label="Density" defaultValue={item.density} />
                      </div>

                      <Button type="submit" className="mt-2 w-full h-14 bg-slate-900 shadow-xl shadow-slate-200">Commit Changes</Button>
                    </form>
                  ) : (
                    <>
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 mb-2 flex-wrap">
                            <h3 
                              className="font-black text-2xl text-slate-900 leading-[1.1] break-words cursor-pointer hover:text-blue-600 transition-colors tracking-tighter"
                              onClick={() => {
                                useInventoryStore.getState().setSelectedItemId(item.id);
                                useInventoryStore.getState().setActiveTab('itemDetail');
                              }}
                            >
                              {item.name}
                            </h3>
                            {isLowStock && (
                              <div className="inline-flex items-center gap-1 bg-red-500 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse shadow-lg shadow-red-200">
                                <AlertTriangle className="w-2.5 h-2.5" strokeWidth={3} />
                                Low stock alert
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                <span className="text-slate-900">{item.itemType} Asset</span> 
                                <span>•</span>
                                <span className="text-slate-600">Base Unit: {item.baseUnit}</span>
                             </p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <div className={cn(
                            "font-black px-5 py-3 rounded-[1.25rem] text-3xl shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1)] transition-all duration-500 tracking-tighter",
                            isLowStock ? "bg-red-500 text-white shadow-red-100" : "bg-slate-900 text-white shadow-slate-200"
                          )}>
                            {formatPieces(stockPieces, item.itemType, item.baseUnit, item.piecesPerUnit)}
                          </div>
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.25em]">{stockPieces.toFixed(2)} Total {item.baseUnit}s</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between pt-6 border-t border-slate-100/50 gap-4">
                         <div className="flex gap-1.5">
                            <button onClick={() => setEditingItem(item.id)} className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 hover:border-blue-100 border border-transparent rounded-xl transition-all" title="Edit">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeleteDialog({ isOpen: true, id: item.id, name: item.name })} className="w-10 h-10 flex items-center justify-center text-red-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100 border border-transparent rounded-xl transition-all" title="Delete">
                              <Trash2 className="w-4 h-4" />
                            </button>
                         </div>
                         <div className="flex items-center gap-3">
                           {!isReceiving && (
                            <>
                              <Button 
                                variant="outline" 
                                className="h-10 px-5 rounded-xl text-[10px] uppercase font-black tracking-widest hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all duration-300" 
                                onClick={() => {
                                  setReceiveQuantity('');
                                  setReceiveUom(item.baseUnit);
                                  setShowReceiveForm(item.id);
                                }}
                              >
                                <Plus className="w-3.5 h-3.5 mr-2" strokeWidth={3}/>
                                Receive
                              </Button>
                              <button 
                                onClick={() => {
                                  useInventoryStore.getState().setSelectedItemId(item.id);
                                  useInventoryStore.getState().setActiveTab('itemDetail');
                                }}
                                className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm border border-slate-200/50"
                              >
                                <ChevronRight className="w-5 h-5" />
                              </button>
                            </>
                           )}
                         </div>
                      </div>
                      
                      {isReceiving && (
                        <div className="mt-2 pt-8 border-t-2 border-dashed border-slate-100 animate-in slide-in-from-top-6 duration-500">
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              const fd = new FormData(e.currentTarget);
                              const qty = Number(receiveQuantity) || 0;
                              const uom = receiveUom;
                              const notes = fd.get('notes') as string;
                              const supplierName = fd.get('supplierName') as string;
                              let batchNumber = fd.get('batchNumber') as string;
                              const receiveDateStr = fd.get('receiveDate') as string;
                              
                              const standardizedPieces = convertToBaseUnit(qty, uom, item.itemType, item.piecesPerUnit);
                              if (standardizedPieces <= 0) return;

                              if (!batchNumber) {
                                 const prefix = item.name.substring(0, 2).toUpperCase();
                                 batchNumber = `${prefix}-${Date.now().toString().slice(-4)}`;
                              }
                              
                              let finalDate = new Date().toISOString();
                              if (receiveDateStr) {
                                  const d = new Date();
                                  const [year, month, day] = receiveDateStr.split('-').map(Number);
                                  d.setFullYear(year, month - 1, day);
                                  finalDate = d.toISOString();
                              }
                              
                              addTransaction({
                                type: 'RECEIVE',
                                itemId: item.id,
                                receiverId: null,
                                pieceQuantity: standardizedPieces,
                                inputQuantity: qty,
                                inputUom: uom,
                                displayString: `Received ${qty} ${uom}`,
                                notes: supplierName ? `From ${supplierName} | ${notes}` : notes,
                                batchNumber,
                                date: finalDate
                              });
                              setShowReceiveForm(null);
                            }}
                            className="flex flex-col gap-6"
                          >
                            <div className="flex justify-between items-center bg-blue-600 p-4 rounded-[1.25rem] shadow-xl shadow-blue-100">
                              <span className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                                <PackagePlus className="w-5 h-5"/> Incoming Manifest
                              </span>
                              <button type="button" onClick={() => setShowReceiveForm(null)} className="text-blue-100 hover:text-white p-2">
                                <X className="w-5 h-5"/>
                              </button>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <Input 
                                  name="quantity" 
                                  type="number" 
                                  step="any"
                                  min="0" 
                                  label="Quantity" 
                                  value={receiveQuantity}
                                  onChange={(e) => setReceiveQuantity(e.target.value ? Number(e.target.value) : '')}
                                  placeholder="0.00"
                                  required
                                />
                                <Select label="Unit of Measure" value={receiveUom} onChange={(e) => setReceiveUom(e.target.value)}>
                                  {uomOptions.map(u => (
                                    <option key={u.name} value={u.name}>{u.name}</option>
                                  ))}
                                  {item.itemType === 'COUNTABLE' && (
                                    <option value="box">box ({item.piecesPerUnit} pcs)</option>
                                  )}
                                </Select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <Input name="receiveDate" type="date" label="Arrival Date" defaultValue={new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date())} />
                                <Input name="batchNumber" label="Traceability ID" placeholder="AUTO-GENERATE" />
                            </div>
                            
                            <Input name="supplierName" label="Entity Source" placeholder="Internal or External Partner ID" />
                            <Input name="notes" label="Audit Remarks" placeholder="Specific handling or PO references..." />

                            <div className="flex gap-4 pt-2">
                              <Button type="button" variant="ghost" onClick={() => setShowReceiveForm(null)} className="flex-1 rounded-2xl h-14 font-extrabold text-slate-400">Abort</Button>
                              <Button type="submit" variant="secondary" className="flex-[2] rounded-2xl h-14 text-md shadow-2xl shadow-blue-200">Commit to Warehouse</Button>
                            </div>
                          </form>
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
