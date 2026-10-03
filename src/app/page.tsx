"use client";

import { useState, useEffect, useMemo } from 'react';
import { fetchProducts, fetchStock, fetchAdjustments, fetchMovements, fetchCategories } from '@/api';
import { 
  Package, 
  AlertTriangle, 
  Settings2, 
  DollarSign, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  ClipboardCheck,
  Search,
  Loader2
} from 'lucide-react';
import Link from 'next/link';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';

export default function Inicio() {
  const [searchTerm, setSearchTerm] = useState('');

  // Data states
  const [products, setProducts] = useState<any[]>([]);
  const [stockData, setStockData] = useState<any[]>([]);
  const [adjustments, setAdjustments] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [prodRes, stockRes, adjRes, movRes, catRes] = await Promise.all([
          fetchProducts(), fetchStock(), fetchAdjustments(), fetchMovements(), fetchCategories()
        ]);
        setProducts(prodRes);
        setStockData(stockRes);
        setAdjustments(adjRes);
        setMovements(movRes);
        setCategories(catRes);
      } catch (err) {
        console.error("Error loading dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // --- Computed indicators ---
  const stockByProduct = useMemo(() => {
    return stockData.reduce((acc, curr) => {
      acc[curr.productId] = (acc[curr.productId] || 0) + Number(curr.quantity);
      return acc;
    }, {} as Record<string, number>);
  }, [stockData]);

  const activeProductsCount = products.filter(p => p.isActive).length;
  const lowStockCount = products.filter(p => p.isActive && (stockByProduct[p.id] || 0) < (p.minStock || 0)).length;
  const pendingAdjustmentsCount = adjustments.filter(a => a.status === 'PENDING').length;
  const inventoryValue = products.reduce((total, product) => {
    const qty = stockByProduct[product.id] || 0;
    return total + (qty * Number(product.price));
  }, 0);

  const recentMovements = useMemo(() => {
    return movements
      .filter(m => {
        const prod = products.find(p => p.id === m.productId) || m.product;
        const name = prod?.name?.toLowerCase() || '';
        const code = prod?.code?.toLowerCase() || '';
        return name.includes(searchTerm.toLowerCase()) || code.includes(searchTerm.toLowerCase());
      })
      .slice(0, 5);
  }, [movements, products, searchTerm]);

  const lowStockProducts = products.filter(p => p.isActive && (stockByProduct[p.id] || 0) < (p.minStock || 0));

  // --- Charts Data Prep ---

  // 1. Stock por Categoría (Pie Chart)
  const stockByCategoryData = useMemo(() => {
    const map: Record<string, number> = {};
    products.forEach(p => {
      const catId = p.categoryId;
      const qty = stockByProduct[p.id] || 0;
      if (qty > 0) {
        map[catId] = (map[catId] || 0) + qty;
      }
    });
    
    const data = Object.keys(map).map(catId => {
      const cat = categories.find(c => c.id === catId);
      return {
        name: cat?.name || 'Sin Categoría',
        value: map[catId]
      };
    });
    return data.sort((a,b) => b.value - a.value);
  }, [products, stockByProduct, categories]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#64748b'];

  // 2. Movimientos últimos 7 días (Bar/Line Chart)
  const last7DaysMovements = useMemo(() => {
    const days: Record<string, { in: number, out: number }> = {};
    // Generate last 7 days keys
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
      days[dateStr] = { in: 0, out: 0 };
    }

    movements.forEach(m => {
      const mDate = new Date(m.createdAt || m.date);
      const dateStr = mDate.toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit' });
      if (days[dateStr]) {
        if (m.type === 'IN' || m.type === 'RETURN_IN') {
          days[dateStr].in += Number(m.quantity);
        } else if (m.type === 'OUT' || m.type === 'RETURN_OUT') {
          days[dateStr].out += Number(m.quantity);
        }
      }
    });

    return Object.keys(days).map(date => ({
      name: date,
      'Entradas': days[date].in,
      'Salidas': days[date].out
    }));
  }, [movements]);


  if (loading) {
    return <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <span className="ml-2 text-slate-500">Cargando panel...</span>
    </div>;
  }

  return (
    <div className="space-y-6 pb-20 max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inicio</h1>
          <p className="text-slate-500 text-sm">Resumen y estado actual del inventario</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input 
            type="text" placeholder="Buscar movimientos..."
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-4 py-2 w-full border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
          />
        </div>
      </div>

      {/* Indicadores Principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-blue-50 p-3.5 rounded-xl text-blue-600">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Productos Activos</p>
            <p className="text-2xl font-bold text-slate-800">{activeProductsCount}</p>
          </div>
        </div>
        
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-amber-50 p-3.5 rounded-xl text-amber-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Stock Bajo</p>
            <p className="text-2xl font-bold text-slate-800">{lowStockCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-purple-50 p-3.5 rounded-xl text-purple-600">
            <Settings2 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Ajustes Pendientes</p>
            <p className="text-2xl font-bold text-slate-800">{pendingAdjustmentsCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="bg-emerald-50 p-3.5 rounded-xl text-emerald-600">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Valor Inventario</p>
            <p className="text-2xl font-bold text-slate-800">S/ {inventoryValue.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
        </div>
      </div>

      {/* DASHBOARD GRAFICOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Grafico 1: Actividad (Bar chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-[380px]">
          <div className="mb-6">
            <h3 className="font-bold text-slate-800 text-lg">Actividad de Inventario</h3>
            <p className="text-sm text-slate-500">Entradas vs Salidas de los últimos 7 días</p>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7DaysMovements} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }} 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }} />
                <Bar dataKey="Entradas" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="Salidas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grafico 2: Categorias (Pie chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-[380px]">
          <div className="mb-2">
            <h3 className="font-bold text-slate-800 text-lg">Distribución de Stock</h3>
            <p className="text-sm text-slate-500">Cantidad total de unidades por categoría</p>
          </div>
          <div className="flex-1 min-h-0 flex items-center justify-center relative">
            {stockByCategoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#1e293b', fontWeight: 600 }}
                  />
                  <Pie
                    data={stockByCategoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {stockByCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend 
                    layout="vertical" 
                    verticalAlign="middle" 
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '13px', right: 0 }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-sm flex flex-col items-center">
                <Package size={32} className="mb-2 opacity-30" />
                No hay stock registrado
              </div>
            )}
            
            {/* Inner text for donut */}
            {stockByCategoryData.length > 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none -ml-[120px]">
                <div className="text-center">
                  <div className="text-2xl font-bold text-slate-800">
                    {stockByCategoryData.reduce((a, b) => a + b.value, 0)}
                  </div>
                  <div className="text-xs text-slate-500">Unidades</div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Últimos Movimientos (Tabla original mejorada) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 rounded-t-2xl">
            <h3 className="font-semibold text-slate-800">Últimos Movimientos</h3>
            <Link href="/movimientos" className="text-sm text-blue-600 hover:text-blue-800 font-medium">Ver todos</Link>
          </div>
          <div className="overflow-x-auto flex-1 p-2">
            <table className="w-full text-left text-sm min-w-[500px]">
              <thead className="text-slate-500 font-medium">
                <tr>
                  <th className="py-3 px-4 w-28">Tipo</th>
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-4 text-right">Cant.</th>
                  <th className="py-3 px-4 text-right">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentMovements.length > 0 ? (
                  recentMovements.map(m => {
                    const product = products.find(p => p.id === m.productId) || m.product;
                    const isPositive = m.type === 'IN' || m.type === 'RETURN_IN';
                    return (
                      <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                            m.type === 'IN' ? 'bg-blue-50 text-blue-600' :
                            m.type === 'OUT' ? 'bg-emerald-50 text-emerald-600' : 
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {m.type === 'IN' ? 'Ingreso' : m.type === 'OUT' ? 'Salida' : m.type === 'TRANSFER' ? 'Transfer.' : m.type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-800">{product?.name || 'Desconocido'}</div>
                          <div className="text-xs text-slate-500 font-medium">{product?.code || '-'}</div>
                        </td>
                        <td className={`py-3 px-4 text-right font-bold text-base ${isPositive ? 'text-blue-600' : m.type === 'OUT' ? 'text-emerald-600' : 'text-slate-600'}`}>
                          {isPositive ? '+' : m.type === 'OUT' ? '-' : ''}{m.quantity} <span className="text-xs font-normal ml-0.5">{product?.unit}</span>
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500 text-sm">
                          {new Date(m.createdAt || m.date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-slate-500">
                      {movements.length === 0 ? 'No hay movimientos registrados aún.' : 'No se encontraron movimientos.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Alertas de Stock */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full">
          <div className="p-5 border-b border-slate-200 bg-slate-50/50 rounded-t-2xl">
            <h3 className="font-semibold text-slate-800">Alertas de Stock</h3>
          </div>
          <div className="p-5 flex-1 overflow-y-auto">
            <div className="space-y-3">
              {lowStockProducts.length > 0 ? (
                lowStockProducts.map(p => (
                  <div key={p.id} className="flex items-start gap-3 p-3.5 bg-red-50/50 rounded-xl border border-red-100 hover:bg-red-50 transition-colors cursor-default">
                    <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="text-sm font-bold text-slate-800">{p.name}</p>
                      <p className="text-xs text-red-600/90 mt-1">
                        Stock actual: <span className="font-bold text-red-700">{stockByProduct[p.id] || 0}</span> (Mínimo: {p.minStock})
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-slate-500 flex flex-col items-center justify-center h-full">
                  <div className="bg-green-50 p-4 rounded-full mb-4">
                    <ClipboardCheck className="h-8 w-8 text-green-500" />
                  </div>
                  <p className="text-sm font-semibold text-slate-700">Stock Saludable</p>
                  <p className="text-xs text-slate-400 mt-1">Todo el inventario está por encima del mínimo</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
