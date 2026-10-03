"use client";

import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { fetchProducts, fetchMovements, fetchWarehouses, fetchStock } from '@/api';
import { 
  BarChart3, 
  FileText, 
  Download, 
  Printer,
  Loader2,
  PackageSearch,
  ListOrdered,
  PieChart as PieChartIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';

type ReportTab = 'KARDEX' | 'RESUMEN' | 'AUDITORIA' | 'GRAFICOS';

export default function ReportesYKardex() {
  const searchParams = useSearchParams();
  const initialProductId = searchParams?.get('product') || '';

  const [activeTab, setActiveTab] = useState<ReportTab>('KARDEX');
  
  // Data states
  const [products, setProducts] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [stockData, setStockData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Kardex & Auditoria Filters
  const [kardexProduct, setKardexProduct] = useState(initialProductId);
  const [kardexWarehouse, setKardexWarehouse] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [operationFilter, setOperationFilter] = useState(''); 

  useEffect(() => {
    const loadData = async () => {
      try {
        const [prodRes, movRes, wareRes, stockRes] = await Promise.all([
          fetchProducts(), fetchMovements(), fetchWarehouses(), fetchStock()
        ]);
        setProducts(prodRes);
        setMovements(movRes);
        setWarehouses(wareRes);
        setStockData(stockRes);
        if (!initialProductId && prodRes.length > 0) {
          setKardexProduct(prodRes[0].id);
        }
      } catch (err) {
        console.error("Error loading data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [initialProductId]);

  const selectedProduct = useMemo(() => products.find(p => p.id === kardexProduct), [kardexProduct, products]);

  // --- 1. KARDEX LOGIC ---
  const kardexRows = useMemo(() => {
    if (!selectedProduct) return [];
    
    let currentBalance = 0;
    
    const sorted = [...movements]
      .filter(m => m.productId === selectedProduct.id || m.product?.id === selectedProduct.id)
      .filter(m => {
        if (!kardexWarehouse) return true;
        return m.fromWarehouseId === kardexWarehouse || m.toWarehouseId === kardexWarehouse;
      })
      .sort((a, b) => new Date(a.createdAt || a.date).getTime() - new Date(b.createdAt || b.date).getTime());

    return sorted.map((m) => {
      const dateStr = new Date(m.createdAt || m.date).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      let qtyInput = 0;
      let qtyOutput = 0;
      let operation = '';
      
      if (m.type === 'IN' || m.type === 'RETURN_IN') {
        if (!kardexWarehouse || m.toWarehouseId === kardexWarehouse) qtyInput = Number(m.quantity);
        operation = m.type === 'IN' ? 'Ingreso por Compra' : 'Devolución de Cliente';
      } else if (m.type === 'OUT' || m.type === 'RETURN_OUT') {
        if (!kardexWarehouse || m.fromWarehouseId === kardexWarehouse) qtyOutput = Number(m.quantity);
        operation = m.type === 'OUT' ? 'Salida / Venta' : 'Devolución a Proveedor';
      } else if (m.type === 'TRANSFER') {
        if (kardexWarehouse === m.fromWarehouseId) {
          qtyOutput = Number(m.quantity);
          operation = 'Transferencia (Salida)';
        } else if (kardexWarehouse === m.toWarehouseId) {
          qtyInput = Number(m.quantity);
          operation = 'Transferencia (Ingreso)';
        } else {
          operation = 'Transferencia Interna';
        }
      }

      currentBalance += qtyInput - qtyOutput;

      const mDate = new Date(m.createdAt || m.date);
      let show = true;
      if (dateFrom && mDate < new Date(dateFrom)) show = false;
      if (dateTo && mDate > new Date(dateTo + 'T23:59:59')) show = false;
      
      if (operationFilter) {
        if (operationFilter === 'IN' && !(m.type === 'IN' || m.type === 'RETURN_IN')) show = false;
        if (operationFilter === 'OUT' && !(m.type === 'OUT' || m.type === 'RETURN_OUT')) show = false;
        if (operationFilter === 'TRANSFER' && m.type !== 'TRANSFER') show = false;
      }

      const fromWh = warehouses.find(w => w.id === m.fromWarehouseId) || m.fromWarehouse;
      const toWh = warehouses.find(w => w.id === m.toWarehouseId) || m.toWarehouse;
      let whLabel = '';
      if (fromWh && toWh) whLabel = `${fromWh.name} → ${toWh.name}`;
      else if (toWh) whLabel = toWh.name;
      else if (fromWh) whLabel = fromWh.name;

      return {
        id: m.id,
        date: dateStr,
        document: m.documentNumber || m.observations || '-',
        operation,
        warehouse: whLabel,
        qtyInput: qtyInput > 0 ? qtyInput : '-',
        qtyOutput: qtyOutput > 0 ? qtyOutput : '-',
        balance: currentBalance,
        show
      };
    });
  }, [selectedProduct, kardexWarehouse, dateFrom, dateTo, operationFilter, movements, warehouses]);

  const visibleKardex = kardexRows.filter(r => r.show);

  // --- 2. RESUMEN LOGIC ---
  const stockSummary = useMemo(() => {
    return products.map(p => {
      const totalStock = stockData
        .filter(s => s.productId === p.id)
        .reduce((sum, s) => sum + Number(s.quantity), 0);
      return { ...p, totalStock };
    }).sort((a, b) => b.totalStock - a.totalStock);
  }, [products, stockData]);

  // --- 3. AUDITORIA LOGIC ---
  const auditoriaRows = useMemo(() => {
    const sorted = [...movements].sort((a, b) => new Date(b.createdAt || b.date).getTime() - new Date(a.createdAt || a.date).getTime());
    
    return sorted.filter(m => {
      const mDate = new Date(m.createdAt || m.date);
      if (dateFrom && mDate < new Date(dateFrom)) return false;
      if (dateTo && mDate > new Date(dateTo + 'T23:59:59')) return false;
      
      if (operationFilter) {
        if (operationFilter === 'IN' && !(m.type === 'IN' || m.type === 'RETURN_IN')) return false;
        if (operationFilter === 'OUT' && !(m.type === 'OUT' || m.type === 'RETURN_OUT')) return false;
        if (operationFilter === 'TRANSFER' && m.type !== 'TRANSFER') return false;
      }
      return true;
    });
  }, [movements, dateFrom, dateTo, operationFilter]);

  // --- 4. CHART LOGIC ---
  const stockByCatChart = useMemo(() => {
    const map: Record<string, number> = {};
    stockSummary.forEach(p => {
      const cat = p.category?.name || 'Varios';
      map[cat] = (map[cat] || 0) + p.totalStock;
    });
    return Object.keys(map).map(k => ({ name: k, value: map[k] })).sort((a,b) => b.value - a.value);
  }, [stockSummary]);

  const valByCatChart = useMemo(() => {
    const map: Record<string, number> = {};
    stockSummary.forEach(p => {
      const cat = p.category?.name || 'Varios';
      map[cat] = (map[cat] || 0) + (p.totalStock * Number(p.price));
    });
    return Object.keys(map).map(k => ({ name: k, value: map[k] })).sort((a,b) => b.value - a.value);
  }, [stockSummary]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#64748b'];

  // --- ACTIONS ---
  const handleExportExcel = () => {
    let ws;
    let title = '';
    
    if (activeTab === 'KARDEX') {
      const data = visibleKardex.map(r => ({
        'Fecha': r.date,
        'Documento': r.document,
        'Operación': r.operation,
        'Almacén': r.warehouse,
        'Entradas': r.qtyInput,
        'Salidas': r.qtyOutput,
        'Saldo': r.balance
      }));
      ws = XLSX.utils.json_to_sheet(data);
      title = `Kardex_${selectedProduct?.code || 'Producto'}`;
    } 
    else if (activeTab === 'RESUMEN') {
      const data = stockSummary.map(p => ({
        'Código': p.code,
        'Producto': p.name,
        'Unidad': p.unit,
        'Stock': p.totalStock,
        'Precio U.': p.price,
        'Valorización': p.totalStock * p.price,
      }));
      ws = XLSX.utils.json_to_sheet(data);
      title = 'Valorizacion_Stock';
    } 
    else if (activeTab === 'AUDITORIA') {
      const data = auditoriaRows.map(m => {
        const prod = products.find(p => p.id === m.productId) || m.product;
        return {
          'Fecha': new Date(m.createdAt || m.date).toLocaleString('es-PE'),
          'Producto': prod?.name || '-',
          'Operación': m.type,
          'Cantidad': m.quantity,
          'Doc/Obs': m.documentNumber || m.observations || '',
        };
      });
      ws = XLSX.utils.json_to_sheet(data);
      title = 'Auditoria_Global';
    } else {
      return; // No excel for Graficos tab yet
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    XLSX.writeFile(wb, `${title}.xlsx`);
  };

  const handlePrint = (printWithCharts: boolean = false) => {
    if (printWithCharts) {
      setActiveTab('GRAFICOS'); 
      setTimeout(() => window.print(), 500);
    } else {
      window.print();
    }
  };

  const totalEntradasKardex = visibleKardex.reduce((sum, r) => sum + (typeof r.qtyInput === 'number' ? r.qtyInput : 0), 0);
  const totalSalidasKardex = visibleKardex.reduce((sum, r) => sum + (typeof r.qtyOutput === 'number' ? r.qtyOutput : 0), 0);
  const saldoFinalKardex = visibleKardex.length > 0 ? visibleKardex[visibleKardex.length - 1].balance : 0;

  if (loading) {
    return <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <span className="ml-2 text-slate-500">Cargando reportes...</span>
    </div>;
  }

  return (
    <div className="space-y-6 pb-20 flex flex-col h-[calc(100vh-8rem)] print:h-auto print:block">
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reportes del Sistema</h1>
          <p className="text-slate-500 text-sm">Historial, auditoría y análisis visual</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportExcel} className="flex items-center gap-2 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-sm font-semibold transition-colors shadow-sm">
            <Download size={16} /> Excel
          </button>
          <button onClick={() => handlePrint(false)} className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-lg text-sm font-semibold transition-colors shadow-sm">
            <Printer size={16} /> Imprimir (Solo Tablas)
          </button>
          <button onClick={() => handlePrint(true)} className="flex items-center gap-2 px-3 py-2 bg-blue-600 border border-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-semibold transition-colors shadow-sm">
            <PieChartIcon size={16} /> Imprimir Reporte + Gráficos
          </button>
        </div>
      </div>

      {/* Tabs (Hidden on print) */}
      <div className="flex gap-1 bg-slate-200/50 p-1 rounded-lg w-full shrink-0 overflow-x-auto print:hidden">
        <button onClick={() => setActiveTab('KARDEX')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'KARDEX' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <FileText size={16} /> Kardex Físico
        </button>
        <button onClick={() => setActiveTab('RESUMEN')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'RESUMEN' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <BarChart3 size={16} /> Valorización de Stock
        </button>
        <button onClick={() => setActiveTab('AUDITORIA')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'AUDITORIA' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <ListOrdered size={16} /> Auditoría
        </button>
        <button onClick={() => setActiveTab('GRAFICOS')}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2 whitespace-nowrap ${activeTab === 'GRAFICOS' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
          <PieChartIcon size={16} /> Gráficos de Reporte
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden print:shadow-none print:border-none print:overflow-visible">
        
        {/* Print Header (Only visible on print for non-Kardex tabs) */}
        {activeTab !== 'KARDEX' && (
          <div className="hidden print:block mb-8 text-center border-b pb-4">
            <h2 className="text-3xl font-bold">Reporte de Inventario</h2>
            <p className="text-gray-500 mt-1">Generado el: {new Date().toLocaleString('es-PE')}</p>
          </div>
        )}

        {/* --- FILTROS --- (Hidden on print) */}
        {(activeTab === 'KARDEX' || activeTab === 'AUDITORIA') && (
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex flex-wrap gap-4 items-end shrink-0 print:hidden">
            {activeTab === 'KARDEX' && (
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Producto</label>
                <select value={kardexProduct} onChange={(e) => setKardexProduct(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="" disabled>Seleccione un producto</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.code} - {p.name}</option>)}
                </select>
              </div>
            )}
            
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Operación</label>
              <select value={operationFilter} onChange={(e) => setOperationFilter(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">Todas las operaciones</option>
                <option value="IN">Solo Ingresos (Entradas)</option>
                <option value="OUT">Solo Salidas (Ventas/Mermas)</option>
                <option value="TRANSFER">Solo Transferencias</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Desde</label>
              <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white text-slate-700" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wider">Hasta</label>
              <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white text-slate-700" />
            </div>
          </div>
        )}

        {/* === TAB 1: KARDEX === */}
        {(activeTab === 'KARDEX' || activeTab === 'GRAFICOS') && activeTab !== 'GRAFICOS' && (
          <div className="flex-1 flex flex-col">
            
            {/* --- WEB VIEW --- */}
            <div className="print:hidden flex-1 flex flex-col overflow-auto">
              {selectedProduct && (
                <div className="p-4 border-b border-slate-200 flex justify-between items-center shrink-0">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">KARDEX: {selectedProduct.name}</h3>
                    <div className="text-sm text-slate-500 flex gap-4 mt-0.5">
                      <span>Cód: <strong className="text-slate-700">{selectedProduct.code}</strong></span>
                      <span>Unid: <strong className="text-slate-700">{selectedProduct.unit}</strong></span>
                      <span>P. Unit: <strong className="text-slate-700">S/ {Number(selectedProduct.price).toFixed(2)}</strong></span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-auto bg-white">
                <table className="w-full text-left text-sm min-w-[800px]">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="py-3 px-5 font-semibold text-slate-700">Fecha</th>
                      <th className="py-3 px-5 font-semibold text-slate-700">Comprobante</th>
                      <th className="py-3 px-5 font-semibold text-slate-700">Operación</th>
                      <th className="py-3 px-5 font-semibold text-slate-700">Almacén</th>
                      <th className="py-3 px-5 font-semibold text-emerald-700 text-right">Entradas</th>
                      <th className="py-3 px-5 font-semibold text-red-700 text-right">Salidas</th>
                      <th className="py-3 px-5 font-semibold text-blue-700 text-right">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {visibleKardex.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50">
                        <td className="py-3 px-5 text-slate-600">{r.date}</td>
                        <td className="py-3 px-5 text-slate-600 font-medium">{r.document}</td>
                        <td className="py-3 px-5 text-slate-700">{r.operation}</td>
                        <td className="py-3 px-5 text-slate-500 text-xs">{r.warehouse}</td>
                        <td className="py-3 px-5 text-right font-medium text-emerald-600">{r.qtyInput}</td>
                        <td className="py-3 px-5 text-right font-medium text-red-600">{r.qtyOutput}</td>
                        <td className="py-3 px-5 text-right font-bold text-blue-800">{r.balance}</td>
                      </tr>
                    ))}
                    {visibleKardex.length === 0 && (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          Seleccione un producto para ver su Kardex o cambie los filtros.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* --- PRINT VIEW (Kardex de Almacén exact format) --- */}
            {selectedProduct && (
              <div className="hidden print:block print:w-full print:bg-white text-slate-800 text-[11px] leading-tight font-sans">
                {/* Header */}
                <div className="flex justify-between items-start mb-6">
                  <div className="flex items-center gap-3">
                    <svg viewBox="0 0 24 24" className="w-12 h-12 text-[#0f3057]" fill="currentColor">
                      <path d="M17,8C8,10 5.9,16.17 3.82,21.34L5.71,22L6.66,19.7C7.14,19.87 7.64,20 8,20C19,20 22,3 22,3C21,5 14,5.25 9,6.25C4,7.25 2,11.5 2,13.5C2,15.5 3.75,17.25 3.75,17.25C7,8 17,8 17,8Z" />
                    </svg>
                    <div>
                      <h1 className="text-xl font-bold text-[#0f3057] uppercase tracking-wide">COOPERATIVA EN CAJARURO</h1>
                      <p className="text-slate-600 text-sm">Control de inventarios y gestión de almacén</p>
                    </div>
                  </div>
                  <div className="text-right text-xs">
                    <p className="font-bold text-[#0f3057] text-sm">Reporte: KDX-{new Date().getTime().toString().slice(-4)}</p>
                    <p>Página 1 de 1</p>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-black text-[#0f3057] uppercase tracking-wider mb-1">KARDEX DE ALMACÉN</h2>
                  <p className="text-[#0f3057] text-base">Control físico de existencias</p>
                  <div className="w-full h-[2px] bg-[#0f3057] mt-3"></div>
                </div>

                {/* Meta Data Table */}
                <table className="w-full border-collapse border border-slate-300 mb-6 text-[11px]">
                  <tbody>
                    <tr>
                      <td className="border border-slate-300 bg-slate-100/80 font-bold px-2 py-1.5 w-[10%] text-[#0f3057]">Producto:</td>
                      <td className="border border-slate-300 px-2 py-1.5 w-[20%]">{selectedProduct.name}</td>
                      <td className="border border-slate-300 bg-slate-100/80 font-bold px-2 py-1.5 w-[10%] text-[#0f3057]">Código:</td>
                      <td className="border border-slate-300 px-2 py-1.5 w-[15%]">{selectedProduct.code}</td>
                      <td className="border border-slate-300 bg-slate-100/80 font-bold px-2 py-1.5 w-[10%] text-[#0f3057]">Unidad:</td>
                      <td className="border border-slate-300 px-2 py-1.5 w-[10%]">{selectedProduct.unit}</td>
                      <td className="border border-slate-300 bg-slate-100/80 font-bold px-2 py-1.5 w-[10%] text-[#0f3057]">Almacén:</td>
                      <td className="border border-slate-300 px-2 py-1.5 w-[15%]">{kardexWarehouse ? warehouses.find(w => w.id === kardexWarehouse)?.name : 'General (Todos)'}</td>
                    </tr>
                    <tr>
                      <td className="border border-slate-300 bg-slate-100/80 font-bold px-2 py-1.5 text-[#0f3057]">Lote:</td>
                      <td className="border border-slate-300 px-2 py-1.5">-</td>
                      <td className="border border-slate-300 bg-slate-100/80 font-bold px-2 py-1.5 text-[#0f3057]">Periodo:</td>
                      <td className="border border-slate-300 px-2 py-1.5">{dateFrom ? new Date(dateFrom).toLocaleDateString('es-PE') : 'Inicio'} al {dateTo ? new Date(dateTo).toLocaleDateString('es-PE') : new Date().toLocaleDateString('es-PE')}</td>
                      <td className="border border-slate-300 bg-slate-100/80 font-bold px-2 py-1.5 text-[#0f3057]">Stock mínimo:</td>
                      <td className="border border-slate-300 px-2 py-1.5">{selectedProduct.minStock || 0} {selectedProduct.unit}</td>
                      <td className="border border-slate-300 bg-slate-100/80 font-bold px-2 py-1.5 text-[#0f3057]">Fecha de emisión:</td>
                      <td className="border border-slate-300 px-2 py-1.5">{new Date().toLocaleDateString('es-PE')}</td>
                    </tr>
                    <tr>
                      <td colSpan={8} className="border border-slate-300 bg-slate-100/80 font-bold px-2 py-2 text-[#0f3057]">
                        Saldo inicial al {dateFrom ? new Date(dateFrom).toLocaleDateString('es-PE') : 'inicio'}: <span className="font-normal text-slate-800">0 {selectedProduct.unit}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* Main Table */}
                <table className="w-full border-collapse border border-slate-300 mb-6 text-[11px] text-center">
                  <thead>
                    <tr className="bg-slate-100/80 text-[#0f3057]">
                      <th className="border border-slate-300 px-2 py-2">Fecha</th>
                      <th className="border border-slate-300 px-2 py-2">Documento</th>
                      <th className="border border-slate-300 px-2 py-2">Movimiento</th>
                      <th className="border border-slate-300 px-2 py-2">Origen / Destino</th>
                      <th className="border border-slate-300 px-2 py-2">Entrada ({selectedProduct.unit})</th>
                      <th className="border border-slate-300 px-2 py-2">Salida ({selectedProduct.unit})</th>
                      <th className="border border-slate-300 px-2 py-2">Saldo ({selectedProduct.unit})</th>
                      <th className="border border-slate-300 px-2 py-2">Responsable</th>
                      <th className="border border-slate-300 px-2 py-2">Observaciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleKardex.map(r => (
                      <tr key={r.id}>
                        <td className="border border-slate-300 px-2 py-2">{r.date}</td>
                        <td className="border border-slate-300 px-2 py-2">{r.document}</td>
                        <td className="border border-slate-300 px-2 py-2 text-left">{r.operation}</td>
                        <td className="border border-slate-300 px-2 py-2 text-left">{r.warehouse || '-'}</td>
                        <td className="border border-slate-300 px-2 py-2">{r.qtyInput === '-' ? '—' : Number(r.qtyInput).toFixed(2)}</td>
                        <td className="border border-slate-300 px-2 py-2">{r.qtyOutput === '-' ? '—' : Number(r.qtyOutput).toFixed(2)}</td>
                        <td className="border border-slate-300 px-2 py-2 font-bold">{Number(r.balance).toFixed(2)}</td>
                        <td className="border border-slate-300 px-2 py-2">Sistema</td>
                        <td className="border border-slate-300 px-2 py-2">-</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-100/80 font-bold text-[#0f3057]">
                      <td colSpan={4} className="border border-slate-300 px-3 py-2 text-right">TOTALES DEL PERIODO</td>
                      <td className="border border-slate-300 px-2 py-2">{totalEntradasKardex.toFixed(2)}</td>
                      <td className="border border-slate-300 px-2 py-2">{totalSalidasKardex.toFixed(2)}</td>
                      <td className="border border-slate-300 px-2 py-2">{saldoFinalKardex.toFixed(2)}</td>
                      <td colSpan={2} className="border border-slate-300 px-2 py-2"></td>
                    </tr>
                  </tbody>
                </table>

                {/* Totals Boxes */}
                <div className="flex gap-4 mb-6">
                  <div className="flex-1 border border-slate-300 rounded text-center p-3">
                    <p className="font-bold text-[#0f3057] mb-1 text-[11px]">TOTAL ENTRADAS:</p>
                    <p className="text-xl font-bold text-[#0e7452]">{totalEntradasKardex.toFixed(2)} {selectedProduct.unit}</p>
                  </div>
                  <div className="flex-1 border border-slate-300 rounded text-center p-3">
                    <p className="font-bold text-[#0f3057] mb-1 text-[11px]">TOTAL SALIDAS:</p>
                    <p className="text-xl font-bold text-[#0e7452]">{totalSalidasKardex.toFixed(2)} {selectedProduct.unit}</p>
                  </div>
                  <div className="flex-1 border border-slate-300 rounded text-center p-3">
                    <p className="font-bold text-[#0f3057] mb-1 text-[11px]">SALDO FINAL:</p>
                    <p className="text-xl font-bold text-[#0e7452]">{saldoFinalKardex.toFixed(2)} {selectedProduct.unit}</p>
                  </div>
                </div>

                <p className="text-[10px] text-slate-600 mb-20">Las entradas y salidas incluyen ajustes aprobados. Las solicitudes pendientes no afectan el saldo.</p>

                {/* Signatures */}
                <div className="flex justify-between items-end px-16 mb-6">
                  <div className="text-center w-40">
                    <div className="border-t border-slate-800 mb-1"></div>
                    <p>Elaborado por</p>
                  </div>
                  <div className="text-center w-40">
                    <div className="border-t border-slate-800 mb-1"></div>
                    <p>Revisado por</p>
                  </div>
                  <div className="text-center w-40">
                    <div className="border-t border-slate-800 mb-1"></div>
                    <p>Autorizado por</p>
                  </div>
                </div>
                
                <div className="border-t border-slate-300 pt-2 flex justify-between text-[9px] text-slate-500">
                  <p>Diseño de referencia · Datos del sistema</p>
                  <p>Sistema de control de inventarios · Cajaruro · {new Date().getFullYear()}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* === TAB 2: RESUMEN === */}
        {activeTab === 'RESUMEN' && (
          <div className="flex-1 overflow-auto print:overflow-visible print:block">
            <h3 className="hidden print:block text-xl font-bold mb-4">Valorización de Stock</h3>
            <table className="w-full text-left text-sm min-w-[800px] print:min-w-full print:text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm print:static print:shadow-none">
                <tr>
                  <th className="py-3 px-5 font-semibold text-slate-700">Código</th>
                  <th className="py-3 px-5 font-semibold text-slate-700">Producto</th>
                  <th className="py-3 px-5 font-semibold text-slate-700">Unidad</th>
                  <th className="py-3 px-5 font-semibold text-slate-700 text-right">Stock</th>
                  <th className="py-3 px-5 font-semibold text-slate-700 text-right">Precio Unit.</th>
                  <th className="py-3 px-5 font-semibold text-slate-700 text-right">Valorización</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-gray-300">
                {stockSummary.map(p => {
                  const valorizacion = p.totalStock * Number(p.price);
                  return (
                    <tr key={p.id} className="hover:bg-slate-50 print:break-inside-avoid">
                      <td className="py-3 px-5 text-slate-500 font-medium">{p.code}</td>
                      <td className="py-3 px-5 font-semibold text-slate-800">{p.name}</td>
                      <td className="py-3 px-5 text-slate-600">{p.unit}</td>
                      <td className="py-3 px-5 text-right font-bold text-slate-700">{p.totalStock}</td>
                      <td className="py-3 px-5 text-right text-slate-600">S/ {Number(p.price).toFixed(2)}</td>
                      <td className="py-3 px-5 text-right font-bold text-slate-800">S/ {valorizacion.toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 bg-slate-100 sticky bottom-0 print:static">
                <tr>
                  <td colSpan={5} className="py-4 px-5 font-bold text-slate-700 text-right">TOTAL VALORIZACIÓN:</td>
                  <td className="py-4 px-5 font-black text-blue-700 text-right text-lg print:text-base">
                    S/ {stockSummary.reduce((sum, p) => sum + p.totalStock * Number(p.price), 0).toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* === TAB 3: AUDITORIA === */}
        {activeTab === 'AUDITORIA' && (
          <div className="flex-1 overflow-auto bg-white print:overflow-visible print:block">
            <h3 className="hidden print:block text-xl font-bold mb-4">Auditoría Global de Movimientos</h3>
            <table className="w-full text-left text-sm min-w-[1000px] print:min-w-full print:text-[10px]">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm print:static print:shadow-none">
                <tr>
                  <th className="py-3 px-5 font-semibold text-slate-700">Fecha/Hora</th>
                  <th className="py-3 px-5 font-semibold text-slate-700">Producto</th>
                  <th className="py-3 px-5 font-semibold text-slate-700">Operación</th>
                  <th className="py-3 px-5 font-semibold text-slate-700 text-right">Cantidad</th>
                  <th className="py-3 px-5 font-semibold text-slate-700">Doc/Obs.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 print:divide-gray-300">
                {auditoriaRows.map(m => {
                  const product = products.find(p => p.id === m.productId) || m.product;
                  const dateStr = new Date(m.createdAt || m.date).toLocaleString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                  const isPositive = m.type === 'IN' || m.type === 'RETURN_IN';

                  return (
                    <tr key={m.id} className="hover:bg-slate-50 print:break-inside-avoid">
                      <td className="py-3 px-5 text-slate-500 whitespace-nowrap">{dateStr}</td>
                      <td className="py-3 px-5 font-bold text-slate-800">{product?.name || '-'}</td>
                      <td className="py-3 px-5 font-medium text-slate-600">{m.type}</td>
                      <td className={`py-3 px-5 text-right font-bold ${isPositive ? 'text-blue-600' : 'text-red-600'}`}>
                        {isPositive ? '+' : m.type === 'OUT' ? '-' : ''}{m.quantity}
                      </td>
                      <td className="py-3 px-5 text-slate-700 max-w-[200px] truncate">{m.documentNumber || m.observations || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* === TAB 4: GRAFICOS (Visible on screen when tab is active, AND always visible on print when "Imprimir con gráficos" triggers it) === */}
        {(activeTab === 'GRAFICOS') && (
          <div className="flex-1 overflow-auto p-6 bg-slate-50 print:bg-white print:overflow-visible print:block">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-800">Reporte Visual Analítico</h2>
              <p className="text-sm text-slate-500">Resumen gráfico del inventario</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:block print:space-y-8">
              
              {/* Grafico 1: Cantidad por Categoria */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:break-inside-avoid print:shadow-none print:border-gray-300">
                <h3 className="font-bold text-slate-700 text-center mb-4">Stock Físico por Categoría (Unidades)</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stockByCatChart} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Unidades" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Grafico 2: Valorizacion por Categoria */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:break-inside-avoid print:shadow-none print:border-gray-300">
                <h3 className="font-bold text-slate-700 text-center mb-4">Valorización Monetaria por Categoría (S/)</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={valByCatChart} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} label>
                        {valByCatChart.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `S/ ${Number(value).toFixed(2)}`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}
