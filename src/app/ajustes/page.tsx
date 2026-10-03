"use client";

import { useState, useMemo, useEffect } from 'react';
import { AdjustmentType } from '@/types';
import { 
  fetchProducts, fetchStock, fetchWarehouses, fetchBatches, 
  fetchAdjustments, createAdjustment
} from '@/api';
import { 
  Settings2, 
  Search,
  Upload,
  Check,
  X,
  AlertCircle,
  Clock,
  TrendingDown,
  HelpCircle,
  TrendingUp,
  FileBadge,
  Loader2
} from 'lucide-react';

export default function Ajustes() {
  // Data states
  const [products, setProducts] = useState<any[]>([]);
  const [stockData, setStockData] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [adjType, setAdjType] = useState<AdjustmentType>('SHORTAGE');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [reason, setReason] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        const [prodRes, stockRes, wareRes, batRes, adjRes] = await Promise.all([
          fetchProducts(), fetchStock(), fetchWarehouses(), fetchBatches(), fetchAdjustments()
        ]);
        setProducts(prodRes);
        setStockData(stockRes);
        setWarehouses(wareRes);
        setBatches(batRes);
        setAdjustments(adjRes);
      } catch (err) {
        console.error("Error loading data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const searchResults = useMemo(() => {
    if (productSearch.length < 2 || selectedProduct?.code === productSearch || selectedProduct?.name === productSearch) return [];
    return products.filter(p => 
      p.isActive && (
        p.code.toLowerCase().includes(productSearch.toLowerCase()) || 
        p.name.toLowerCase().includes(productSearch.toLowerCase())
      )
    );
  }, [productSearch, selectedProduct, products]);

  const productBatches = useMemo(() => {
    if (!selectedProduct) return [];
    return batches.filter(b => b.productId === selectedProduct.id);
  }, [selectedProduct, batches]);

  const currentStock = useMemo(() => {
    if (!selectedProduct || !selectedWarehouse) return 0;
    const stockItems = stockData.filter(s => 
      s.productId === selectedProduct.id && 
      s.warehouseId === selectedWarehouse &&
      (selectedBatch ? s.batchId === selectedBatch : true)
    );
    return stockItems.reduce((sum, s) => sum + Number(s.quantity), 0);
  }, [selectedProduct, selectedWarehouse, selectedBatch, stockData]);

  const proposedStock = useMemo(() => {
    if (quantity === '') return currentStock;
    const q = Number(quantity);
    if (adjType === 'SURPLUS') return currentStock + q;
    return currentStock - q;
  }, [currentStock, quantity, adjType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!selectedProduct) return setFormError('Seleccione un producto.');
    if (!selectedWarehouse) return setFormError('Seleccione un almacén.');
    if (!quantity || quantity <= 0) return setFormError('Ingrese una cantidad válida mayor a 0.');
    if (!reason.trim()) return setFormError('El motivo es obligatorio.');
    if ((adjType === 'SHRINKAGE' || adjType === 'SHORTAGE') && quantity > currentStock) {
      return setFormError('La cantidad a descontar no puede superar el stock actual.');
    }

    try {
      const newAdj = await createAdjustment({
        type: adjType,
        productId: selectedProduct.id,
        batchId: selectedBatch || undefined,
        warehouseId: selectedWarehouse,
        quantity: Number(quantity),
        reason,
      });
      setAdjustments([newAdj, ...adjustments]);
      setFormSuccess('Ajuste enviado a aprobación exitosamente.');
      
      // Reset form
      setSelectedProduct(null);
      setProductSearch('');
      setSelectedBatch('');
      setSelectedWarehouse('');
      setQuantity('');
      setReason('');
    } catch (err) {
      setFormError('Error al enviar el ajuste. Intente nuevamente.');
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'APPROVED' | 'REJECTED') => {
    try {
      const endpoint = newStatus === 'APPROVED' ? 'approve' : 'reject';
      const res = await fetch(`http://localhost:3001/adjustments/${id}/${endpoint}`, { method: 'PATCH' });
      if (!res.ok) throw new Error();
      setAdjustments(adjustments.map(a => a.id === id ? { ...a, status: newStatus } : a));
    } catch {
      alert('Error al actualizar el estado del ajuste.');
    }
  };

  const getAdjTypeConfig = (t: AdjustmentType) => {
    switch(t) {
      case 'SHRINKAGE': return { label: 'Merma', icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' };
      case 'SHORTAGE': return { label: 'Faltante (Inv.)', icon: HelpCircle, color: 'text-amber-600', bg: 'bg-amber-50' };
      case 'SURPLUS': return { label: 'Sobrante', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' };
    }
  };

  if (loading) {
    return <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <span className="ml-2 text-slate-500">Cargando ajustes...</span>
    </div>;
  }

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Ajustes de Inventario</h1>
        <p className="text-slate-500 text-sm">Registro y aprobación de mermas, faltantes y sobrantes</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Columna Izquierda: Formulario */}
        <div className="w-full lg:w-1/2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-20">
            <div className="p-5 border-b border-slate-200 flex items-center gap-2 bg-slate-50">
              <Settings2 className="text-blue-600" size={20} />
              <h2 className="font-semibold text-slate-800">Solicitar Ajuste</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm font-medium flex items-center gap-2 border border-red-200">
                  <AlertCircle size={16} />
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="bg-emerald-50 text-emerald-700 p-3 rounded-lg text-sm font-medium flex items-center gap-2 border border-emerald-200">
                  <Check size={16} />
                  {formSuccess}
                </div>
              )}

              {/* Tipo */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de Ajuste</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['SHORTAGE', 'SHRINKAGE', 'SURPLUS'] as AdjustmentType[]).map(t => {
                    const cfg = getAdjTypeConfig(t);
                    const Icon = cfg.icon;
                    return (
                      <button key={t} type="button" onClick={() => setAdjType(t)}
                        className={`flex flex-col items-center p-2 rounded-lg border text-xs font-medium transition-colors ${
                          adjType === t ? `${cfg.bg} ${cfg.color} border-current` : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}>
                        <Icon size={18} className="mb-1" />
                        {cfg.label}
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  {adjType === 'SHORTAGE' && 'Un faltante indica una diferencia sin causa verificada aún (por investigar).'}
                  {adjType === 'SHRINKAGE' && 'Una merma implica pérdida verificada por daño, caducidad, etc.'}
                  {adjType === 'SURPLUS' && 'Un sobrante indica más stock del registrado en el sistema.'}
                </p>
              </div>

              {/* Producto */}
              <div className="relative">
                <label className="block text-sm font-semibold text-slate-700 mb-1">Producto</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" value={productSearch}
                    onChange={(e) => { setProductSearch(e.target.value); if (selectedProduct) setSelectedProduct(null); }}
                    placeholder="Buscar producto..."
                    className="pl-9 pr-3 py-2 w-full border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                {searchResults.length > 0 && !selectedProduct && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                    {searchResults.map(p => (
                      <div key={p.id} onClick={() => { setSelectedProduct(p); setProductSearch(`${p.code} - ${p.name}`); }}
                        className="p-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0 text-sm">
                        <span className="font-medium">{p.name}</span> <span className="text-slate-400 text-xs ml-2">{p.code}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Almacén y Lote */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Almacén</label>
                  <select value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">Seleccione...</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                {productBatches.length > 0 ? (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Lote</label>
                    <select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="">Cualquier lote</option>
                      {productBatches.map(b => <option key={b.id} value={b.id}>{b.batchNumber}</option>)}
                    </select>
                  </div>
                ) : <div />}
              </div>

              {/* Simulación Stock */}
              {selectedProduct && selectedWarehouse && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 flex justify-between items-center text-sm">
                  <div className="text-center">
                    <p className="text-slate-500 mb-1">Stock Actual</p>
                    <p className="font-bold text-lg text-slate-700">{currentStock}</p>
                  </div>
                  <div className="text-slate-300">
                    {adjType === 'SURPLUS' ? <TrendingUp /> : <TrendingDown />}
                  </div>
                  <div className="text-center">
                    <p className="text-slate-500 mb-1">Stock Propuesto</p>
                    <p className={`font-bold text-lg ${proposedStock < 0 ? 'text-red-500' : 'text-blue-600'}`}>{proposedStock}</p>
                  </div>
                </div>
              )}

              {/* Cantidad */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Cantidad a Ajustar <span className="text-red-500">*</span>
                </label>
                <div className="flex">
                  <input type="number" min="0" step="0.01" value={quantity}
                    onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')}
                    className="w-full border border-slate-300 rounded-l-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="0" />
                  <span className="inline-flex items-center px-4 rounded-r-lg border border-l-0 border-slate-300 bg-slate-50 text-slate-500 sm:text-sm font-medium">
                    {selectedProduct?.unit || 'Und'}
                  </span>
                </div>
              </div>

              {/* Motivo */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Motivo Obligatorio <span className="text-red-500">*</span></label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                  placeholder="Explique el motivo del ajuste..." />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Evidencia (Opcional)</label>
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 flex flex-col items-center justify-center text-slate-500 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                  <Upload size={20} className="mb-2" />
                  <span className="text-xs">Adjuntar foto o documento</span>
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition-colors">
                  Enviar a Aprobación
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Columna Derecha: Lista */}
        <div className="w-full lg:w-1/2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
            <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="font-semibold text-slate-800 flex items-center gap-2">
                <FileBadge className="text-slate-500" size={20} />
                Solicitudes de Ajuste
              </h2>
            </div>
            
            <div className="p-5 flex-1 overflow-y-auto space-y-4">
              {adjustments.map(adj => {
                const prod = products.find(p => p.id === adj.productId) || adj.product;
                const wh = warehouses.find(w => w.id === adj.warehouseId) || adj.warehouse;
                const typeCfg = getAdjTypeConfig(adj.type);
                
                return (
                  <div key={adj.id} className="border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${
                      adj.status === 'PENDING' ? 'bg-amber-400' : 
                      adj.status === 'APPROVED' ? 'bg-emerald-500' : 'bg-red-500'
                    }`}></div>
                    
                    <div className="flex justify-between items-start mb-3 pl-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${typeCfg.bg} ${typeCfg.color}`}>{typeCfg.label}</span>
                        <span className="text-xs text-slate-500">{new Date(adj.createdAt || adj.date).toLocaleDateString('es-PE')}</span>
                      </div>
                      <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                        adj.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 
                        adj.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {adj.status === 'PENDING' && <Clock size={12} />}
                        {adj.status === 'APPROVED' && <Check size={12} />}
                        {adj.status === 'REJECTED' && <X size={12} />}
                        {adj.status === 'PENDING' ? 'Pendiente' : adj.status === 'APPROVED' ? 'Aprobado' : 'Rechazado'}
                      </span>
                    </div>

                    <div className="pl-2 mb-3">
                      <p className="font-bold text-slate-800">{prod?.name || 'Desconocido'}</p>
                      <p className="text-sm text-slate-500">{wh?.name || adj.warehouseId}</p>
                    </div>

                    <div className="pl-2 bg-slate-50 p-3 rounded-lg mb-3 flex items-center justify-between border border-slate-100">
                      <div>
                        <p className="text-xs text-slate-500 mb-0.5">Cantidad</p>
                        <p className={`font-bold ${adj.type === 'SURPLUS' ? 'text-emerald-600' : 'text-red-600'}`}>
                          {adj.type === 'SURPLUS' ? '+' : '-'}{adj.quantity} {prod?.unit}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-500 mb-0.5">Solicitante</p>
                        <p className="text-sm font-medium text-slate-700">{adj.requestedBy || 'Sistema'}</p>
                      </div>
                    </div>

                    <div className="pl-2 mb-4">
                      <p className="text-xs text-slate-500 mb-1">Motivo:</p>
                      <p className="text-sm text-slate-700 bg-white border border-slate-200 p-2 rounded-md">"{adj.reason}"</p>
                    </div>

                    {adj.status === 'PENDING' && (
                      <div className="pl-2 flex gap-2 border-t border-slate-100 pt-3">
                        <button onClick={() => handleStatusChange(adj.id, 'APPROVED')}
                          className="flex-1 flex justify-center items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 py-1.5 rounded-lg text-sm font-medium transition-colors border border-emerald-200">
                          <Check size={16} /> Aprobar
                        </button>
                        <button onClick={() => handleStatusChange(adj.id, 'REJECTED')}
                          className="flex-1 flex justify-center items-center gap-1 bg-red-50 hover:bg-red-100 text-red-700 py-1.5 rounded-lg text-sm font-medium transition-colors border border-red-200">
                          <X size={16} /> Rechazar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              
              {adjustments.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  No hay ajustes registrados.
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
