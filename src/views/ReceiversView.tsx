import React, { useState } from 'react';
import { useInventoryStore, getStockLevel, formatPieces, convertToBaseUnit, UOM_SYSTEM } from '../lib/store';
import { Button, Input, Select } from '../components/ui/Forms';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Users, Plus, X, Trash2, User as UserIcon, PackageSearch, History as HistoryIcon, Search } from 'lucide-react';
import { cn, formatDateTimePHT } from '../lib/utils';

export function ReceiversView() {
  const { receivers, items, transactions, addReceiver, deleteReceiver, addTransaction } = useInventoryStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDisburseForm, setShowDisburseForm] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState<string | null>(null);
  const [deleteDialog, setDeleteDialog] = useState<{isOpen: boolean, id: string, name: string}>({ isOpen: false, id: '', name: '' });
  const [searchQuery, setSearchQuery] = useState('');
  
  const [disburseQuantity, setDisburseQuantity] = useState<number | ''>('');
  const [disburseLoose, setDisburseLoose] = useState<number | ''>('');
  const [disburseUom, setDisburseUom] = useState('');
  const [selectedItemId, setSelectedItemId] = useState('');
  const [cart, setCart] = useState<Array<{
    itemId: string;
    qty: number;
    loose: number;
    uom: string;
    standardizedPieces: number;
  }>>([]);

  const selectedItem = items.find(i => i.id === selectedItemId);
  const uomOptions = selectedItem ? (UOM_SYSTEM[selectedItem.itemType]?.options || []).map(o => 
    (o.name === 'box' && selectedItem.itemType === 'COUNTABLE') 
      ? { name: 'box', factor: selectedItem.piecesPerUnit }
      : o
  ) : [];

  const addToCart = () => {
    if (!selectedItemId || !selectedItem) return;
    const qty = Number(disburseQuantity) || 0;
    const loose = Number(disburseLoose) || 0;
    const uom = disburseUom;

    const pieceFactor = uomOptions.find(o => o.name === 'piece')?.factor || 1;
    const unitFactor = uom === 'box' ? selectedItem.piecesPerUnit : (uomOptions.find(o => o.name === uom)?.factor || 1);
    const standardizedPieces = (qty * unitFactor) + (loose * pieceFactor);

    if (standardizedPieces <= 0) return;

    const existingInCart = cart
      .filter(c => c.itemId === selectedItemId)
      .reduce((sum, c) => sum + c.standardizedPieces, 0);
    
    const stock = getStockLevel(selectedItem.id, transactions, items);
    if (standardizedPieces + existingInCart > stock) {
      alert(`Insufficient stock. Available: ${formatPieces(stock - existingInCart, selectedItem.itemType, selectedItem.baseUnit, selectedItem.piecesPerUnit)}`);
      return;
    }

    setCart(prev => [...prev, {
      itemId: selectedItemId,
      qty,
      loose,
      uom,
      standardizedPieces
    }]);

    setSelectedItemId('');
    setDisburseQuantity('');
    setDisburseLoose('');
    setDisburseUom('');
  };

  const removeFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

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

      <div className="px-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search partners or departments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs font-medium focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all shadow-sm"
          />
        </div>
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
          {receivers
            .filter(r => 
              r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
              r.department?.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map(receiver => {
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
                    <Button 
                      variant="outline" 
                      className="flex-1 h-10 rounded-xl text-[9px] uppercase font-black tracking-widest hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all duration-300"
                      onClick={() => {
                        setShowDisburseForm(receiver.id);
                        setCart([]);
                        setShowHistory(null);
                        setSelectedItemId('');
                        setDisburseQuantity('');
                        setDisburseLoose('');
                      }}
                    >
                      <PackageSearch className="w-3.5 h-3.5 mr-2" />
                      Allocate Assets
                    </Button>
                    <button 
                       onClick={() => setDeleteDialog({ isOpen: true, id: receiver.id, name: receiver.name })}
                       className="w-12 h-12 flex items-center justify-center rounded-2xl bg-red-50 text-red-400 hover:text-red-600 hover:bg-red-100 transition-all border border-red-100"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {isDisbursing && (
                    <div className="mt-8 pt-8 border-t-2 border-dashed border-slate-100 animate-in slide-in-from-top-6 duration-500">
                      <div className="flex flex-col gap-6">
                         <div className="flex justify-between items-center bg-slate-900 p-4 rounded-[1.25rem] shadow-xl shadow-slate-200">
                            <span className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-3">
                              <PackageSearch className="w-5 h-5 text-blue-400"/> Release Management
                            </span>
                            <button type="button" onClick={() => { setShowDisburseForm(null); setCart([]); }} className="text-slate-400 hover:text-white p-2">
                              <X className="w-5 h-5"/>
                            </button>
                        </div>

                        <div className="bg-slate-50 p-5 rounded-3xl border border-slate-200">
                          <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4 px-1">Stage Item for Release</h3>
                          <div className="flex flex-col gap-4">
                            <Select 
                              label="Product Type" 
                              value={selectedItemId} 
                              onChange={(e) => {
                                setSelectedItemId(e.target.value);
                                const item = items.find(i => i.id === e.target.value);
                                setDisburseUom(item?.baseUnit || '');
                                setDisburseQuantity('');
                                setDisburseLoose('');
                              }}
                            >
                              <option value="">-- Choose Product --</option>
                              {items.map(item => {
                                const stock = getStockLevel(item.id, transactions, items);
                                return (
                                  <option key={item.id} value={item.id} disabled={stock <= 0}>
                                    {item.name} ({formatPieces(stock, item.itemType, item.baseUnit, item.piecesPerUnit)})
                                  </option>
                                );
                              })}
                            </Select>

                            {selectedItem && (
                              <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                <div className="grid grid-cols-2 gap-4">
                                  <Input 
                                    type="number" 
                                    step="any"
                                    min="0" 
                                    label={`Qty (${disburseUom || selectedItem?.baseUnit})`}
                                    value={disburseQuantity}
                                    onChange={(e) => setDisburseQuantity(e.target.value ? Number(e.target.value) : '')}
                                    placeholder="0.00"
                                  />
                                  <Select label="UoM" value={disburseUom} onChange={(e) => {
                                    setDisburseUom(e.target.value);
                                    if (selectedItem && e.target.value === selectedItem.baseUnit) setDisburseLoose('');
                                  }}>
                                    {uomOptions.map(u => (
                                      <option key={u.name} value={u.name}>{u.name}</option>
                                    ))}
                                  </Select>
                                </div>

                                {disburseUom !== selectedItem.baseUnit && (
                                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                                    <Input 
                                      type="number" 
                                      step="any"
                                      min="0" 
                                      label={`Additional Loose ${selectedItem.itemType === 'COUNTABLE' ? selectedItem.baseUnit : 'Pieces (Gallons/Cans)'}`}
                                      value={disburseLoose}
                                      onChange={(e) => setDisburseLoose(e.target.value ? Number(e.target.value) : '')}
                                      placeholder={`Extra units`}
                                    />
                                  </div>
                                )}

                                <Button 
                                  onClick={addToCart}
                                  variant="secondary"
                                  className="w-full h-11 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100"
                                >
                                  Add to Transfer List
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>

                        {cart.length > 0 && (
                          <div className="space-y-4 pt-2">
                            <div className="flex items-center justify-between px-1">
                              <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                                <HistoryIcon className="w-3.5 h-3.5 text-blue-600" /> Pending Items ({cart.length})
                              </h3>
                            </div>
                            <div className="flex flex-col gap-2">
                              {cart.map((cartItem, idx) => {
                                const item = items.find(i => i.id === cartItem.itemId);
                                return (
                                  <div key={idx} className="bg-white p-3 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm animate-in slide-in-from-left-2">
                                    <div className="flex flex-col">
                                      <span className="font-black text-slate-900 text-xs tracking-tight">{item?.name}</span>
                                      <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">
                                        {cartItem.qty} {cartItem.uom} {cartItem.loose > 0 ? `+ ${cartItem.loose} ${item?.baseUnit}` : ''}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      <span className="font-black text-slate-900 text-[10px]">-{formatPieces(cartItem.standardizedPieces, item?.itemType || 'COUNTABLE', item?.baseUnit || '', item?.piecesPerUnit || 1)}</span>
                                      <button onClick={() => removeFromCart(idx)} className="text-red-400 hover:text-red-600 p-1">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            <form 
                              onSubmit={async (e) => {
                                e.preventDefault();
                                const fd = new FormData(e.currentTarget);
                                const receivedBy = fd.get('receivedBy') as string;
                                const notes = fd.get('notes') as string;
                                const dateStr = fd.get('disburseDate') as string;
                                
                                let finalDate = new Date().toISOString();
                                if (dateStr) {
                                    const d = new Date();
                                    const [year, month, day] = dateStr.split('-').map(Number);
                                    d.setFullYear(year, month - 1, day);
                                    finalDate = d.toISOString();
                                }

                                for (const cartItem of cart) {
                                  const item = items.find(i => i.id === cartItem.itemId);
                                  if (!item) continue;

                                  await addTransaction({
                                    type: 'DISBURSE',
                                    itemId: cartItem.itemId,
                                    receiverId: receiver.id,
                                    pieceQuantity: cartItem.standardizedPieces,
                                    inputQuantity: cartItem.qty,
                                    inputUom: cartItem.uom,
                                    displayString: cartItem.loose > 0 
                                      ? `Distributed ${cartItem.qty} ${cartItem.uom} & ${cartItem.loose} ${item.itemType === 'COUNTABLE' ? item.baseUnit : 'piece'}${cartItem.loose !== 1 ? 's' : ''}`
                                      : `Distributed ${cartItem.qty} ${cartItem.uom}`,
                                    receivedBy,
                                    notes,
                                    date: finalDate
                                  });
                                }

                                setCart([]);
                                setShowDisburseForm(null);
                              }}
                              className="flex flex-col gap-5 pt-4 border-t border-slate-100"
                            >
                              <div className="grid grid-cols-2 gap-3">
                                <Input name="receivedBy" label="Released To" placeholder="Receiver Name" required />
                                <Input name="disburseDate" type="date" label="Trans. Date" defaultValue={new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(new Date())} />
                              </div>
                              <Input name="notes" label="Audit Remarks" placeholder="Project ID or specific reason..." />
                              <div className="flex gap-3">
                                <Button type="button" variant="ghost" onClick={() => { setShowDisburseForm(null); setCart([]); }} className="flex-1 rounded-xl h-11 uppercase font-black text-[9px] tracking-widest text-slate-400">Abort</Button>
                                <Button type="submit" variant="primary" className="flex-[2] rounded-xl h-11 text-xs font-black shadow-lg bg-slate-900 shadow-slate-200">Commit Multi-Release</Button>
                              </div>
                            </form>
                          </div>
                        )}
                      </div>
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
                              <div key={tx.id} className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex justify-between items-center group transition-all hover:border-slate-300 hover:shadow-xl hover:shadow-slate-200/40">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                                    <span className="font-black text-slate-900 text-base tracking-tight truncate leading-tight">{item?.name || 'Unknown Item'}</span>
                                    {tx.batchNumber && (
                                       <span className="text-[8px] font-black bg-slate-900 text-white px-1.5 py-0.5 rounded-md uppercase tracking-[0.1em]">#{tx.batchNumber}</span>
                                    )}
                                  </div>
                                  <div className="flex flex-col gap-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest whitespace-nowrap">{formatDateTimePHT(tx.date)}</span>
                                      {tx.receivedBy && (
                                        <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md uppercase tracking-widest whitespace-nowrap">To: {tx.receivedBy}</span>
                                      )}
                                    </div>
                                    {tx.notes && <span className="text-[10px] text-slate-500 font-medium italic mt-0.5 leading-tight line-clamp-1">“{tx.notes}”</span>}
                                  </div>
                                </div>
                                <div className="text-right flex flex-col items-end shrink-0 ml-3">
                                  <div className="font-black text-slate-900 text-base tracking-tight leading-none px-2.5 py-1.5 bg-slate-100 rounded-lg border border-slate-200 shadow-sm">
                                    {item ? formatPieces(tx.pieceQuantity, item.itemType, item.baseUnit, item.piecesPerUnit) : tx.displayString}
                                  </div>
                                  {item && (
                                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest mt-1">
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
