"use client";

import { useState, useMemo, useEffect } from 'react';
import { fetchProducts, fetchStock, fetchWarehouses, fetchCategories, createAdjustment } from '@/api';
import { 
  ClipboardCheck, 
  Search, 
  Save, 
  Send,
  AlertTriangle,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';

export default function ConteoFisico() {
  // Data states
  const [products, setProducts] = useState<any[]>([]);
  const [stockData, setStockData] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // UI states
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [drafts, setDrafts] = useState<Record<string, Record<string, number | ''>>>({});
  const [isSaved, setIsSaved] = useState(false);
  const [isSent, setIsSent] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [prodRes, stockRes, wareRes, catRes] = await Promise.all([
          fetchProducts(), fetchStock(), fetchWarehouses(), fetchCategories()
        ]);
        setProducts(prodRes);
        setStockData(stockRes);
        setWarehouses(wareRes);
        setCategories(catRes);
      } catch (err) {
        console.error("Error loading data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const warehouseProducts = useMemo(() => {
    if (!selectedWarehouse) return [];
    
    const activeProducts = products.filter(p => p.isActive);
    
    return activeProducts.filter(p => {
      const matchCategory = selectedCategory ? p.categoryId === selectedCategory : true;
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.code.toLowerCase().includes(searchTerm.toLowerCase());
      return matchCategory && matchSearch;
    }).map(p => {
      const stock = stockData
        .filter(s => s.productId === p.id && s.warehouseId === selectedWarehouse)
        .reduce((acc, curr) => acc + Number(curr.quantity), 0);
      return { product: p, expectedStock: stock };
    });
  }, [selectedWarehouse, selectedCategory, searchTerm, products, stockData]);

  const handlePhysicalStockChange = (productId: string, val: string) => {
    if (!selectedWarehouse) return;
    setIsSaved(false);
    setIsSent(false);
    const parsed = val === '' ? '' : Math.floor(Number(val));
    setDrafts(prev => ({
      ...prev,
      [selectedWarehouse]: { ...(prev[selectedWarehouse] || {}), [productId]: parsed }
    }));
  };

  const getPhysicalStock = (productId: string) => {
    if (!selectedWarehouse || !drafts[selectedWarehouse]) return '';
    const val = drafts[selectedWarehouse][productId];
    return val === undefined ? '' : val;
  };

  const handleSaveDraft = () => {
    if (!selectedWarehouse) return;
    setIsSaved(true);
    setIsSent(false);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleSendToReview = async () => {
    if (!selectedWarehouse) return;
    
    // Find differences to send
    const differences = warehouseProducts.map(wp => {
      const phys = getPhysicalStock(wp.product.id);
      return { 
        product: wp.product, 
        expected: wp.expectedStock, 
        physical: phys 
      };
    }).filter(item => item.physical !== '' && item.physical !== item.expected);

    if (differences.length === 0) {
      alert("No hay diferencias para enviar a revisión.");
      return;
    }

    try {
      // Create adjustments for each difference
      for (const diff of differences) {
        const diffAmount = (diff.physical as number) - diff.expected;
        await createAdjustment({
          type: diffAmount > 0 ? 'SURPLUS' : 'SHORTAGE',
          productId: diff.product.id,
          warehouseId: selectedWarehouse,
          quantity: Math.abs(diffAmount),
          reason: 'Conteo Físico: Diferencia encontrada durante auditoría',
        });
      }

      setIsSent(true);
      setIsSaved(false);
      
      setTimeout(() => {
        setIsSent(false);
        setDrafts(prev => {
          const newDrafts = { ...prev };
          delete newDrafts[selectedWarehouse];
          return newDrafts;
        });
      }, 4000);
    } catch (err) {
      console.error("Error al enviar a revisión:", err);
      alert("Hubo un error al enviar las diferencias a revisión.");
    }
  };

  const countItemsWithDifference = warehouseProducts.filter(wp => {
    const phys = getPhysicalStock(wp.product.id);
    return phys !== '' && phys !== wp.expectedStock;
  }).length;

  if (loading) {
    return <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <span className="ml-2 text-slate-500">Cargando conteo físico...</span>
    </div>;
  }

  return (
    <div className="space-y-6 pb-20 h-[calc(100vh-8rem)] flex flex-col">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Conteo Físico</h1>
        <p className="text-slate-500 text-sm">Registro de existencias reales para auditoría</p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-semibold text-slate-700 mb-1">Almacén a Contar</label>
          <select value={selectedWarehouse} onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white">
            <option value="">Seleccione un almacén...</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-semibold text-slate-700 mb-1">Filtrar Categoría</label>
          <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
            disabled={!selectedWarehouse}>
            <option value="">Todas</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div className="flex-2 min-w-[250px]">
          <label className="block text-sm font-semibold text-slate-700 mb-1">Buscar Producto</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Código o nombre..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 w-full border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              disabled={!selectedWarehouse} />
          </div>
        </div>
      </div>

      {selectedWarehouse ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
          
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <ClipboardCheck size={18} className="text-blue-500" />
              <span>{warehouseProducts.length} productos listados</span>
              {countItemsWithDifference > 0 && (
                <span className="ml-3 px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold flex items-center gap-1">
                  <AlertTriangle size={12} /> {countItemsWithDifference} diferencias
                </span>
              )}
            </div>
            
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={handleSaveDraft}
                className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-2 rounded-lg font-medium text-sm transition-colors">
                <Save size={16} /> Guardar Borrador
              </button>
              <button onClick={handleSendToReview}
                className="flex-1 sm:flex-none flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors">
                <Send size={16} /> Enviar a Revisión
              </button>
            </div>
          </div>

          {isSaved && (
            <div className="bg-emerald-50 text-emerald-700 px-4 py-2 text-sm font-medium border-b border-emerald-100 text-center">
              Borrador guardado localmente. Puedes continuar luego.
            </div>
          )}
          {isSent && (
            <div className="bg-blue-50 text-blue-700 px-4 py-2 text-sm font-medium border-b border-blue-100 text-center">
              Diferencias enviadas a revisión. Se crearán solicitudes de ajuste pendientes para validación.
            </div>
          )}

          <div className="overflow-auto flex-1">
            <table className="w-full text-left text-sm min-w-[800px]">
              <thead className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="py-3 px-5 font-semibold text-slate-700">Código</th>
                  <th className="py-3 px-5 font-semibold text-slate-700">Producto</th>
                  <th className="py-3 px-5 font-semibold text-slate-700">Categoría</th>
                  <th className="py-3 px-5 font-semibold text-slate-700 text-center">Stock Sistema</th>
                  <th className="py-3 px-5 font-semibold text-slate-700 text-center bg-blue-50/50">Stock Físico</th>
                  <th className="py-3 px-5 font-semibold text-slate-700 text-center">Diferencia</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {warehouseProducts.map(wp => {
                  const pStock = getPhysicalStock(wp.product.id);
                  const hasInput = pStock !== '';
                  const diff = hasInput ? (pStock as number) - wp.expectedStock : 0;
                  const isDiff = diff !== 0;
                  const cat = categories.find(c => c.id === wp.product.categoryId) || wp.product.category;

                  return (
                    <tr key={wp.product.id} className={`hover:bg-slate-50 ${isDiff && hasInput ? 'bg-orange-50/30' : ''}`}>
                      <td className="py-3 px-5 text-slate-500 font-medium">{wp.product.code}</td>
                      <td className="py-3 px-5">
                        <div className="font-semibold text-slate-800">{wp.product.name}</div>
                        <div className="text-xs text-slate-500">{wp.product.unit}</div>
                      </td>
                      <td className="py-3 px-5 text-slate-600 text-sm">{cat?.name || '-'}</td>
                      <td className="py-3 px-5 text-center">
                        <span className="font-medium text-slate-700">{wp.expectedStock}</span> <span className="text-xs text-slate-500">{wp.product.unit}</span>
                      </td>
                      <td className="py-2 px-5 text-center bg-blue-50/10">
                        <div className="flex justify-center items-center gap-2">
                          <input type="number" min="0" step="1" value={pStock}
                            onChange={(e) => handlePhysicalStockChange(wp.product.id, e.target.value)}
                            className={`w-24 border rounded-md px-3 py-1.5 text-center text-sm font-bold focus:ring-2 focus:ring-blue-500 focus:outline-none ${
                              hasInput 
                                ? isDiff ? 'border-orange-300 text-orange-700 bg-orange-50' : 'border-emerald-300 text-emerald-700 bg-emerald-50'
                                : 'border-slate-300 text-slate-800'
                            }`}
                            placeholder="-" />
                        </div>
                      </td>
                      <td className="py-3 px-5 text-center">
                        {hasInput ? (
                          <span className={`font-bold inline-flex items-center justify-center px-2 py-1 rounded-md min-w-[3rem] ${
                            diff > 0 ? 'bg-emerald-100 text-emerald-700' : 
                            diff < 0 ? 'bg-red-100 text-red-700' : 'text-slate-400'
                          }`}>
                            {diff > 0 ? '+' : ''}{diff}
                          </span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {warehouseProducts.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-500">
                      No se encontraron productos para los criterios seleccionados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex-1 flex flex-col items-center justify-center text-center p-8">
          <FileSpreadsheet className="text-slate-300 w-16 h-16 mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Seleccione un Almacén</h3>
          <p className="text-slate-500 max-w-sm">Para iniciar un conteo físico, debe seleccionar primero el almacén en el que va a trabajar.</p>
        </div>
      )}
    </div>
  );
}
