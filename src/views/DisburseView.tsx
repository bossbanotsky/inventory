import React, { useState, useEffect } from 'react';
import { useInventoryStore, formatPieces, getStockLevel, Item } from '../lib/store';
import { Button, Input, Select } from '../components/ui/Forms';
import { Send, CheckCircle2, Calculator } from 'lucide-react';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

export function DisburseView() {
  const { items, receivers, transactions, addTransaction } = useInventoryStore();
  
  const [selectedItem, setSelectedItem] = useState<string>('');
  const [selectedReceiver, setSelectedReceiver] = useState<string>('');
  const [units, setUnits] = useState<number | ''>('');
  const [pieces, setPieces] = useState<number | ''>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  
  const item = items.find(i => i.id === selectedItem);
  const receiver = receivers.find(r => r.id === selectedReceiver);
  const currentStock = item ? getStockLevel(item.id, transactions) : 0;
  
  const u = Number(units) || 0;
  const p = Number(pieces) || 0;
  const totalPieces = item ? (u * item.piecesPerUnit) + p : 0;

  useEffect(() => {
    setUnits('');
    setPieces('');
  }, [selectedItem]);

  useEffect(() => {
    if (successMsg || errorMsg) {
      const timer = setTimeout(() => {
        setSuccessMsg('');
        setErrorMsg('');
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [successMsg, errorMsg]);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!item || !selectedReceiver) return;
    
    if (totalPieces <= 0) {
      setErrorMsg("Please enter a valid quantity.");
      return;
    }
    
    if (totalPieces > currentStock) {
      setErrorMsg(`Insufficient stock! You only have ${formatPieces(currentStock, item.piecesPerUnit, item.unitMeasurement)} available.`);
      return;
    }
    
    setShowConfirm(true);
  };
  
  const handleConfirm = () => {
    if (!item || !selectedReceiver) return;

    addTransaction({
      type: 'DISBURSE',
      itemId: item.id,
      receiverId: selectedReceiver,
      pieceQuantity: totalPieces,
      displayString: `${u ? u + ' ' + item.unitMeasurement : ''} ${p ? p + ' pcs' : ''}`.trim() || `${totalPieces} pcs`,
      notes
    });
    
    setSuccessMsg(`Successfully disbursed ${formatPieces(totalPieces, item.piecesPerUnit, item.unitMeasurement)}!`);
    setSelectedItem('');
    setSelectedReceiver('');
    setUnits('');
    setPieces('');
    setNotes('');
    setShowConfirm(false);
  };

  return (
    <div className="flex flex-col gap-4 pb-20 pt-4 px-4 max-w-md mx-auto w-full">
      <ConfirmDialog
        isOpen={showConfirm}
        title="Confirm Disbursement"
        message={`Are you sure you want to issue ${totalPieces} pieces (${formatPieces(totalPieces, item?.piecesPerUnit || 1, item?.unitMeasurement || '')}) of ${item?.name} to ${receiver?.name}?`}
        confirmText="Confirm Issue"
        onConfirm={handleConfirm}
        onCancel={() => setShowConfirm(false)}
      />

      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Disburse Items</h1>
      </div>

      {errorMsg && (
        <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm font-medium border border-red-200">
          {errorMsg}
        </div>
      )}
      {successMsg && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm font-medium border border-green-200 flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3 mb-2 text-blue-600">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Send className="w-5 h-5" />
          </div>
          <h2 className="font-semibold text-lg text-gray-900">Issue to Receiver</h2>
        </div>

        <Select 
          label="Select Receiver" 
          value={selectedReceiver} 
          onChange={e => setSelectedReceiver(e.target.value)}
          required
        >
          <option value="">-- Choose Receiver --</option>
          {[...receivers].sort((a, b) => a.name.localeCompare(b.name)).map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </Select>

        <Select 
          label="Select Item" 
          value={selectedItem} 
          onChange={e => setSelectedItem(e.target.value)}
          required
        >
          <option value="">-- Choose Item --</option>
          {items.map(i => {
            const stock = getStockLevel(i.id, transactions);
            return (
              <option key={i.id} value={i.id} disabled={stock === 0}>
                {i.name} ({stock > 0 ? formatPieces(stock, i.piecesPerUnit, i.unitMeasurement) : 'Out of stock'})
              </option>
            );
          })}
        </Select>

        {item && (
          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg flex justify-between items-center">
            <span className="text-sm font-medium text-gray-600">Available Stock:</span>
            <span className="text-sm font-bold text-gray-900">{formatPieces(currentStock, item.piecesPerUnit, item.unitMeasurement)}</span>
          </div>
        )}

        {item && (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <div className="flex-1 flex flex-col">
                <Input 
                  name="units" 
                  type="number" 
                  min="0" 
                  label={`Qty (${item.unitMeasurement}s)`} 
                  value={units}
                  onChange={e => setUnits(e.target.value ? Number(e.target.value) : '')}
                  placeholder="0" 
                />
                {u > 0 && <span className="text-[10px] text-gray-500 font-medium px-1 mt-1">≈ {u * item.piecesPerUnit} pieces</span>}
              </div>
              <div className="flex-1 flex flex-col">
                <Input 
                  name="pieces" 
                  type="number" 
                  min="0" 
                  label="Pieces" 
                  value={pieces}
                  onChange={e => setPieces(e.target.value ? Number(e.target.value) : '')}
                  placeholder="0" 
                />
                {p > 0 && <span className="text-[10px] text-gray-500 font-medium px-1 mt-1">≈ {(p / item.piecesPerUnit).toFixed(1).replace(/\.0$/, '')} {item.unitMeasurement}s</span>}
              </div>
            </div>
            
            {totalPieces > 0 && (
              <div className="bg-blue-50/50 rounded-lg p-3 flex items-center justify-between border border-blue-100">
                <div className="flex items-center gap-2 text-blue-700 font-medium text-sm">
                  <Calculator className="w-4 h-4" />
                  <span>Total to disburse:</span>
                </div>
                <span className="font-bold text-blue-700">
                  {totalPieces} pieces total
                </span>
              </div>
            )}
          </div>
        )}

        <Input 
          name="notes" 
          label="Notes / Reference" 
          placeholder="Optional notes" 
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />

        <Button type="submit" className="w-full mt-2" disabled={!item || !selectedReceiver}>
          Complete Disbursement
        </Button>
      </form>
    </div>
  );
}
