import React, { useState } from 'react';
import { useInventoryStore, getStockLevel, formatPieces, convertToBaseUnit, UOM_SYSTEM } from '../lib/store';
import { Button, Input, Select } from '../components/ui/Forms';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Users, Plus, X, Trash2, User as UserIcon, PackageSearch, History as HistoryIcon } from 'lucide-react';
import { cn, formatDateTimePHT } from '../lib/utils';

export function ReceiversView() {
  const { receivers, items, transactions, addReceiver, deleteReceiver, addTransaction } = useInventoryStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDisburseForm, setShowDisburseForm] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{isOpen: boolean, id: string, name: string}>({ isOpen: false, id: '', name: '' });
  
  const [disburseQuantity, setDisburseQuantity] = useState<number | ''>('');
  const [disburseUom, setDisburseUom] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');

  const selectedItem = items.find(i => i.id === selectedItemId);
  const uomOptions = selectedItem ? (UOM_SYSTEM[selectedItem.itemType]?.options || []) : [];

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        title="Delete Partner"
        message={`This will permanently remove "${deleteDialog.name}" from the registry. Past transaction records involving this partner will remain but they will be unlinked.`}
        confirmText="Remove Partner"
        onConfirm={() => {
          deleteReceiver(deleteDialog.id);
          setDeleteDialog({ isOpen: false, id: '', name: '' });
        }}
        onCancel={() => setDeleteDialog({ isOpen: false, id: '', name: '' })}
      />
      
      <div className="flex items-end justify-between px-2">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 leading-none">Partners</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-1">Universal Allocation</p>
        </div>
        <Button onClick={() => setShowAddForm(true)} variant="secondary" className="px-4 gap-2 h-10 rounded-xl">
          <Plus className="w-4 h-4" strokeWidth={3} />
          <span className="text-[10px] uppercase tracking-widest font-black">Register Partner</span>
        </Button>
      </div>

      {showAddForm && (
        <div className="bg-white p-8 rounded-[2.5rem] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.1)] border border-slate-200/50 animate-in fade-in zoom-in-95 duration-500 ring-1 ring-slate-900/5">
          <div className="flex justify-between items-center mb-8">
            <div className="space-y-1">
              <h2 className="font-black text-2xl tracking-tighter text-slate-900">Add Receiver</h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Partner Identity</p>
            </div>
            <button onClick={() => setShowAddForm(false)} className="text-slate-400 hover:bg-slate-50 p-3 rounded-2xl transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              addReceiver({
                name: fd.get('name') as string,
                department: fd.get('department') as string,
              });
              setShowAddForm(false);
            }}
            className="flex flex-col gap-5"
          >
            <Input name="name" label="Legal Name / Business Unit" placeholder="e.g. John Smith or logistics HQ" required />
            <Input name="department" label="Division / Sector" placeholder="e.g. Operations" />
            <Button type="submit" className="mt-4 w-full h-14 rounded-2xl text-md shadow-xl bg-slate-900">Add to Directory</Button>
          </form>
        </div>
      )}

      {receivers.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 text-center space-y-6 bg-white rounded-[3rem] border border-dashed border-slate-200 shadow-sm ring-1 ring-slate-900/5">
          <div className="w-20 h-20 rounded-3xl bg-slate-50 flex items-center justify-center shadow-inner">
            <Users className="w-10 h-10 text-slate-300" />
          </div>
          <div className="space-y-2">
            <p className="font-extrabold text-xl text-slate-900 tracking-tight">Partner Registry Empty</p>
            <p className="text-sm font-medium text-slate-400 max-w-[200px]">Register your first receiving partner to manage allocations.</p>
          </div>
          <Button onClick={() => setShowAddForm(true)} variant="primary" className="h-11 px-8 rounded-xl text-[10px] uppercase font-black tracking-[0.2em] shadow-lg">New Partner</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-5 text-slate-900">
          {receivers.map(receiver => {
            const isDisbursing = showDisburseForm === receiver.id;
            const isViewingHistory = showHistory === receiver.id;
            const receiverTxs = transactions.filter(t => t.receiverId === receiver.id);
            
            return (
              <div key={receiver.id} className="bg-white rounded-[2.5rem] border border-slate-200/50 shadow-[0_8px_30px_rgba(0,0,0,0.02)] hover:shadow-[0_25px_60px_-12px_rgba(0,0,0,0.06)] hover:border-slate-300 transition-all duration-500 ring-1 ring-slate-900/5 overflow-hidden">
                <div className="p-7">
                  <div className="flex justify-between items-start gap-4 mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 shadow-inner">
                        <UserIcon className="w-6 h-6 text-slate-400" />
                      </div>
                      <div className="flex flex-col">
                        <h3 className="font-black text-xl text-slate-900 tracking-tight leading-tight">{receiver.name}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{receiver.department || 'Internal Partner'}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest leading-none">{receiverTxs.length} Activities</span>
                      <button 
                        onClick={() => setShowHistory(isViewingHistory ? null : receiver.id)}
                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-2 py-1 transition-colors uppercase tracking-widest mt-1"
                      >
                        {isViewingHistory ? 'Hide history' : 'View history'}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {!isDisbursing && (
                      <Button 
                        variant="outline" 
                        className="flex-1 h-12 rounded-2xl text-[10px] uppercase font-black tracking-[0.2em] hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all duration-300"
                        onClick={() => {
                          setDisburseQuantity('');
                          setSelectedItemId('');
                          setShowDisburseForm(receiver.id);
                          setShowHistory(null);
                        }}
                      >
                        <PackageSearch className="w-4 h-4 mr-2" />
                        Allocate Assets
                      </Button>
                    )}
                    <button 
                       onClick={() => setDeleteDialog({ isOpen: true, id: receiver.id, name: receiver.name })}
                       className="w-12 h-12 flex items-center justify-center rounded-2xl bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 transition-all border border-red-100"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {isDisbursing && (
                    <div className="mt-8 pt-8 border-t-2 border-dashed border-slate-100 animate-in slide-in-from-top-6 duration-500">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const fd = new FormData(e.currentTarget);
                          const itemId = selectedItemId;
                          const qty = Number(disburseQuantity) || 0;
                          const uom = disburseUom;
                          const receivedBy = fd.get('receivedBy') as string;
                          const notes = fd.get('notes') as string;
                          const dateStr = fd.get('disburseDate') as string;
                          
                          if (!itemId || !selectedItem) return;

                          const standardizedPieces = convertToBaseUnit(qty, uom, selectedItem.itemType, selectedItem.piecesPerUnit);
                          if (standardizedPieces <= 0) return;
                          
                          const stock = getStockLevel(selectedItem.id, transactions, items);
                          if (standardizedPieces > stock) {
                            alert(`Insufficient stock. Available: ${formatPieces(stock, selectedItem.itemType, selectedItem.baseUnit, selectedItem.piecesPerUnit)}`);
                            return;
                          }

                          let finalDate = new Date().toISOString();
                          if (dateStr) {
                              const d = new Date();
                              const [year, month, day] = dateStr.split('-').map(Number);
                              d.setFullYear(year, month - 1, day);
                              finalDate = d.toISOString();
                          }
                          
                          addTransaction({
                            type: 'DISBURSE',
                            itemId,
                            receiverId: receiver.id,
                            pieceQuantity: standardizedPieces,
                            inputQuantity: qty,
                            inputUom: uom,
                            displayString: `Distributed ${qty} ${uom}`,
                            receivedBy,
                            notes,
                            date: finalDate
                          });
                          setShowDisburseForm(null);
                        }}
                        className="flex flex-col gap-6"
                      >
                         <div className="flex justify-between items-center bg-slate-900 p-4 rounded-[1.25rem] shadow-xl shadow-slate-200">
                            <span className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                              <PackageSearch className="w-5 h-5 text-blue-400"/> New Disbursement
                            </span>
                            <button type="button" onClick={() => setShowDisburseForm(null)} className="text-slate-400 hover:text-white p-2">
                              <X className="w-5 h-5"/>
                            </button>
                        </div>

                        <div className="space-y-4">
                          <Select 
                            name="itemId" 
                            label="Asset Type" 
                            value={selectedItemId} 
                            onChange={(e) => {
                              setSelectedItemId(e.target.value);
                              const item = items.find(i => i.id === e.target.value);
                              setDisburseUom(item ? item.baseUnit : '');
                            }} 
                            required
                          >
                             <option value="">-- Choose Universal Resource --</option>
                             {items.map(i => {
                               const stock = getStockLevel(i.id, transactions, items);
                               return (
                                 <option key={i.id} value={i.id} disabled={stock === 0}>
                                   {i.name} ({stock > 0 ? formatPieces(stock, i.itemType, i.baseUnit, i.piecesPerUnit) : 'ZERO STOCK'})
                                 </option>
                               );
                             })}
                          </Select>

                          <div className="grid grid-cols-2 gap-4">
                            <Input 
                              name="quantity" 
                              type="number" 
                              step="any"
                              min="0" 
                              label="Quantity" 
                              value={disburseQuantity}
                              onChange={(e) => setDisburseQuantity(e.target.value ? Number(e.target.value) : '')}
                              placeholder="0.00"
                              required
                            />
                            <Select label="Unit of Measure" value={disburseUom} onChange={(e) => setDisburseUom(e.target.value)}>
                              {uomOptions.map(u => (
                                <option key={u.name} value={u.name}>{u.name}</option>
                              ))}
                              {selectedItem?.itemType === 'COUNTABLE' && (
                                <option value="box">box ({selectedItem.piecesPerUnit} pcs)</option>
                              )}
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <Input name="receivedBy" label="Recipient Name" placeholder="Point of Contact" required />
                            <Input name="disburseDate" type="date" label="Transaction Date" defaultValue={new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date())} />
                          </div>
                          
                          <Input name="notes" label="Audit Remarks" placeholder="Project code, work order, etc..." />
                        </div>

                        <div className="flex gap-4 pt-2">
                          <Button type="button" variant="ghost" onClick={() => setShowDisburseForm(null)} className="flex-1 rounded-2xl h-14 font-extrabold text-slate-400">Cancel</Button>
                          <Button type="submit" variant="secondary" className="flex-[2] rounded-2xl h-14 text-md shadow-2xl shadow-blue-200">Execute Disbursement</Button>
                        </div>
                      </form>
                    </div>
                  )}

                  {isViewingHistory && (
                    <div className="mt-8 space-y-4 animate-in fade-in duration-500">
                      <div className="flex items-center gap-2 mb-4">
                         <HistoryIcon className="w-4 h-4 text-slate-400" />
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Allocation Log</span>
                      </div>
                      
                      {receiverTxs.length === 0 ? (
                        <div className="text-center py-10 bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No transaction records</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {receiverTxs.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(tx => {
                            const item = items.find(i => i.id === tx.itemId);
                            return (
                              <div key={tx.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex justify-between items-center group transition-all hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/50">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                    <span className="font-black text-slate-900 text-lg tracking-tight truncate leading-none">{item?.name || 'Unknown Item'}</span>
                                    {tx.batchNumber && (
                                       <span className="text-[10px] font-black bg-slate-900 text-white px-2 py-0.5 rounded-lg uppercase tracking-widest leading-none">#{tx.batchNumber}</span>
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-black text-slate-900 uppercase tracking-widest">{formatDateTimePHT(tx.date)}</span>
                                      {tx.receivedBy && (
                                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg uppercase tracking-widest">To: {tx.receivedBy}</span>
                                      )}
                                    </div>
                                    {tx.notes && <span className="text-[11px] text-slate-500 font-medium italic mt-1 leading-tight">“{tx.notes}”</span>}
                                  </div>
                                </div>
                                <div className="text-right flex flex-col items-end shrink-0 ml-4">
                                  <div className="font-black text-slate-900 text-xl tracking-tighter leading-none px-3 py-1.5 bg-slate-100 rounded-xl border border-slate-200 shadow-sm">
                                    {item ? formatPieces(tx.pieceQuantity, item.itemType, item.baseUnit, item.piecesPerUnit) : tx.displayString}
                                  </div>
                                  {item && (
                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1.5">
                                      {tx.pieceQuantity.toFixed(2)} {item.baseUnit}s
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
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
