"use client";

import { useState, useEffect, useMemo } from 'react';
import { Product } from '@/types';
import { 
  fetchProducts, 
  fetchStock, 
  fetchCategories, 
  fetchWarehouses, 
  fetchBatches,
  createProduct 
} from '@/api';
import { 
  Search, 
  Filter, 
  Plus, 
  Barcode, 
  X, 
  Edit, 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  FileText,
  AlertTriangle,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';
import Link from 'next/link';
import * as XLSX from 'xlsx';

export default function Inventario() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Data states
  const [products, setProducts] = useState<any[]>([]);
  const [stockData, setStockData] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [formData, setFormData] = useState({
    code: '', name: '', categoryId: '', unit: '', minStock: 5, price: 0, barcode: ''
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [prodRes, stockRes, catRes, wareRes, batRes] = await Promise.all([
          fetchProducts(), fetchStock(), fetchCategories(), fetchWarehouses(), fetchBatches()
        ]);
        setProducts(prodRes);
        setStockData(stockRes);
        setCategories(catRes);
        setWarehouses(wareRes);
        setBatches(batRes);
      } catch (err) {
        console.error("Error loading data", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newProduct = await createProduct({
        ...formData,
        price: Number(formData.price),
      });
      setProducts([...products, newProduct]);
      setIsCreating(false);
      setFormData({ code: '', name: '', categoryId: '', unit: '', minStock: 5, price: 0, barcode: '' });
      alert("Producto creado exitosamente");
    } catch (err) {
      alert("Error al crear producto");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          alert('El archivo Excel está vacío.');
          return;
        }

        let successCount = 0;
        const errorList: string[] = [];
        setLoading(true);

        for (let i = 0; i < data.length; i++) {
          const row = data[i] as any;
          const rowNum = i + 2; // +1 for 0-index, +1 for header
          try {
            const code = String(row['Código'] || row['codigo'] || '').trim();
            const name = String(row['Nombre'] || row['nombre'] || '').trim();
            const categoryName = String(row['Categoría'] || row['categoria'] || '').trim();
            const unit = String(row['Unidad'] || row['unidad'] || 'Und').trim();
            const minStock = Number(row['Stock Mínimo'] || row['stock minimo'] || 5);
            const price = Number(row['Precio'] || row['precio'] || 0);
            const barcode = String(row['Código de Barras'] || row['codigo de barras'] || '').trim();

            if (!code || !name || !categoryName) {
              errorList.push(`Fila ${rowNum}: Faltan datos obligatorios (Código, Nombre o Categoría).`);
              continue;
            }
            
            // Avoid duplicates in the existing products
            if (products.some(p => p.code.toLowerCase() === code.toLowerCase())) {
              errorList.push(`Fila ${rowNum}: El código '${code}' ya existe en el sistema.`);
              continue;
            }

            // Find category ID
            const category = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
            if (!category) {
              errorList.push(`Fila ${rowNum}: La categoría '${categoryName}' no existe en el sistema.`);
              continue; 
            }

            await createProduct({
              code,
              name,
              categoryId: category.id,
              unit,
              minStock,
              price,
              barcode
            });
            
            // Update local products array immediately to catch duplicates within the same excel
            products.push({ code, name, categoryId: category.id, unit, minStock, price, barcode, isActive: true } as any);
            
            successCount++;
          } catch (e: any) {
             errorList.push(`Fila ${rowNum}: Error del servidor - ${e.message || 'Desconocido'}.`);
          }
        }
        
        // Reload products after import to get real IDs
        const prodRes = await fetchProducts();
        setProducts(prodRes);

        if (errorList.length > 0) {
          alert(`Proceso finalizado.\nSe importaron ${successCount} productos.\nErrores encontrados:\n- ` + errorList.join('\n- '));
        } else {
          alert(`Proceso finalizado exitosamente. Se importaron ${successCount} productos.`);
        }

      } catch (err) {
        console.error("Error reading Excel", err);
        alert('Error al leer el archivo Excel.');
      } finally {
        setLoading(false);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input
  };

  const downloadExcelTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 
        'Código': 'PROD-001', 
        'Nombre': 'Arroz Costeño Extra',
        'Categoría': categories.length > 0 ? categories[0].name : 'Cereales', 
        'Unidad': 'Saco 50kg',
        'Stock Mínimo': 10,
        'Precio': 120.50,
        'Código de Barras': '123456789012'
      }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Productos");
    XLSX.writeFile(wb, "Plantilla_Productos.xlsx");
  };

  // Computed data
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.code.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCategory = selectedCategory ? p.categoryId === selectedCategory : true;
      const matchStatus = selectedStatus === 'active' ? p.isActive : selectedStatus === 'inactive' ? !p.isActive : true;
      
      let matchWarehouse = true;
      if (selectedWarehouse) {
        const hasStock = stockData.some(s => s.productId === p.id && s.warehouseId === selectedWarehouse && Number(s.quantity) > 0);
        matchWarehouse = hasStock;
      }
      
      return matchSearch && matchCategory && matchStatus && matchWarehouse;
    });
  }, [searchTerm, selectedCategory, selectedWarehouse, selectedStatus, products, stockData]);

  const getProductStock = (productId: string) => {
    return stockData.filter(s => s.productId === productId).reduce((sum, s) => sum + Number(s.quantity), 0);
  };

  const getProductDetails = (product: any) => {
    const category = categories.find(c => c.id === product.categoryId) || product.category;
    const stockItems = stockData.filter(s => s.productId === product.id && Number(s.quantity) > 0);
    
    return {
      categoryName: category?.name || 'Sin categoría',
      totalStock: getProductStock(product.id),
      stockItems: stockItems.map(s => {
        const warehouse = warehouses.find(w => w.id === s.warehouseId) || s.warehouse;
        const batch = batches.find(b => b.id === s.batchId) || s.batch;
        return {
          ...s,
          warehouseName: warehouse?.name,
          batchNumber: batch?.batchNumber,
          expirationDate: batch?.expirationDate
        };
      })
    };
  };

  if (loading) {
    return <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <span className="ml-2 text-slate-500">Cargando inventario...</span>
    </div>;
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-6">
      {/* Lista Principal */}
      <div className={`flex-1 flex flex-col transition-all ${selectedProduct || isCreating ? 'hidden lg:flex lg:w-2/3' : 'w-full'}`}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Inventario</h1>
            <p className="text-slate-500 text-sm">Gestiona productos y existencias</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button 
              onClick={() => window.document.getElementById('excel-upload-products')?.click()}
              className="flex items-center gap-2 bg-[#107c41] hover:bg-[#0c5e31] text-white px-4 py-2 rounded-lg font-medium transition-colors"
              title="Importar productos desde Excel"
            >
              <FileSpreadsheet size={18} />
              <span className="hidden sm:inline">Importar</span>
            </button>
            <button 
              onClick={downloadExcelTemplate}
              className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-2 rounded-lg font-medium transition-colors"
              title="Descargar plantilla Excel"
            >
              Plantilla
            </button>
            <input 
              id="excel-upload-products" 
              type="file" 
              accept=".xlsx, .xls" 
              className="hidden" 
              onChange={handleFileUpload} 
            />
            <button 
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors ml-2"
            >
              <Plus size={18} />
              <span className="hidden sm:inline">Nuevo Producto</span>
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-wrap gap-4 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Buscar por código o nombre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 w-full border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 min-w-[140px]"
          >
            <option value="">Todas las categorías</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          
          <select 
            value={selectedWarehouse} 
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 min-w-[140px]"
          >
            <option value="">Todos los almacenes</option>
            {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          
          <select 
            value={selectedStatus} 
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-blue-500 min-w-[120px]"
          >
            <option value="">Cualquier estado</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm min-w-[700px]">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="py-3 px-5 font-medium text-slate-500">Código</th>
                  <th className="py-3 px-5 font-medium text-slate-500">Producto</th>
                  <th className="py-3 px-5 font-medium text-slate-500">Categoría</th>
                  <th className="py-3 px-5 font-medium text-slate-500 text-right">Stock Total</th>
                  <th className="py-3 px-5 font-medium text-slate-500">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map(p => {
                  const stock = getProductStock(p.id);
                  const cat = categories.find(c => c.id === p.categoryId);
                  const isSelected = selectedProduct?.id === p.id;
                  const isLow = stock < p.minStock;

                  return (
                    <tr 
                      key={p.id} 
                      onClick={() => { setSelectedProduct(p); setIsCreating(false); }}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                    >
                      <td className="py-3 px-5 text-slate-500 font-medium">{p.code}</td>
                      <td className="py-3 px-5">
                        <div className="font-semibold text-slate-800 flex items-center gap-2">
                          {p.name}
                          {isLow && p.isActive && <AlertTriangle size={14} className="text-amber-500" />}
                        </div>
                        <div className="text-xs text-slate-500">{p.unit}</div>
                      </td>
                      <td className="py-3 px-5 text-slate-600">{cat?.name}</td>
                      <td className="py-3 px-5 text-right">
                        <span className={`font-bold ${isLow ? 'text-red-600' : 'text-slate-700'}`}>
                          {stock}
                        </span>
                      </td>
                      <td className="py-3 px-5">
                        <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                          p.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {p.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-500">
                      No se encontraron productos con los filtros actuales.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Detalle Lateral */}
      {(selectedProduct || isCreating) && (
        <div className={`fixed inset-0 z-40 bg-white lg:static lg:block lg:w-1/3 lg:min-w-[400px] border-l border-slate-200 shadow-xl lg:shadow-none overflow-y-auto ${
          selectedProduct || isCreating ? 'block' : 'hidden'
        }`}>
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                {isCreating ? 'Nuevo Producto' : 'Detalle del Producto'}
              </h2>
              <button 
                onClick={() => { setSelectedProduct(null); setIsCreating(false); }}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            {isCreating ? (
              <form className="space-y-4" onSubmit={handleCreateSubmit}>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Código</label>
                  <input required type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="PROD-XXX" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Ej. Arroz Extra" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                    <select required value={formData.categoryId} onChange={e => setFormData({...formData, categoryId: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500">
                      <option value="">Seleccione...</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Unidad</label>
                    <input required type="text" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Ej. Saco, Kg" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Stock Mínimo</label>
                    <input required type="number" min="0" value={formData.minStock} onChange={e => setFormData({...formData, minStock: Number(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Precio Unitario (S/)</label>
                    <input required type="number" step="0.01" min="0" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Código de Barras</label>
                  <div className="relative">
                    <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" placeholder="Opcional" />
                  </div>
                </div>
                <div className="pt-4 flex gap-3">
                  <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors">Guardar</button>
                  <button type="button" onClick={() => setIsCreating(false)} className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 py-2 rounded-lg font-medium transition-colors">Cancelar</button>
                </div>
              </form>
            ) : selectedProduct ? (
              <div className="space-y-6">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold px-2 py-0.5 bg-slate-200 text-slate-600 rounded">
                        {selectedProduct.code}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded ${selectedProduct.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {selectedProduct.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-800">{selectedProduct.name}</h3>
                    <p className="text-sm text-slate-500">{getProductDetails(selectedProduct).categoryName}</p>
                  </div>
                  <button className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors">
                    <Edit size={18} />
                  </button>
                </div>

                {selectedProduct.barcode && (
                  <div className="flex flex-col items-center bg-white border border-slate-200 p-4 rounded-xl">
                    <Barcode size={48} className="text-slate-800 mb-2" />
                    <span className="text-xs tracking-widest text-slate-500">{selectedProduct.barcode}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Stock Total</p>
                    <p className="text-xl font-bold text-slate-800">
                      {getProductDetails(selectedProduct).totalStock} <span className="text-sm font-normal text-slate-500">{selectedProduct.unit}</span>
                    </p>
                  </div>
                  <div className="bg-white border border-slate-200 p-3 rounded-lg">
                    <p className="text-xs text-slate-500 mb-1">Precio / Valor</p>
                    <p className="text-xl font-bold text-slate-800">
                      S/ {Number(selectedProduct.price).toFixed(2)}
                    </p>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-800 mb-3 flex items-center justify-between">
                    <span>Desglose de Existencias</span>
                    <span className="text-xs font-normal text-slate-500">Mínimo: {selectedProduct.minStock}</span>
                  </h4>
                  {getProductDetails(selectedProduct).stockItems.length > 0 ? (
                    <div className="space-y-3">
                      {getProductDetails(selectedProduct).stockItems.map(item => (
                        <div key={item.id} className="bg-white border border-slate-200 p-3 rounded-lg text-sm">
                          <div className="flex justify-between font-medium text-slate-800 mb-1">
                            <span>{item.warehouseName}</span>
                            <span>{item.quantity} {selectedProduct.unit}</span>
                          </div>
                          {item.batchNumber && (
                            <div className="flex justify-between text-xs text-slate-500">
                              <span>Lote: {item.batchNumber}</span>
                              {item.expirationDate && <span>Vence: {item.expirationDate}</span>}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500 italic bg-slate-50 p-4 rounded-lg text-center">Sin stock disponible.</p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <h4 className="font-semibold text-slate-800 mb-3">Acciones Rápidas</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <Link href={`/movimientos?type=in&product=${selectedProduct.id}`} className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 hover:border-blue-300 rounded-lg text-blue-600 transition-colors group">
                      <ArrowDownToLine size={20} className="mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-medium">Ingreso</span>
                    </Link>
                    <Link href={`/movimientos?type=out&product=${selectedProduct.id}`} className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 hover:border-emerald-300 rounded-lg text-emerald-600 transition-colors group">
                      <ArrowUpFromLine size={20} className="mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-medium">Salida</span>
                    </Link>
                    <Link href={`/reportes?product=${selectedProduct.id}`} className="flex flex-col items-center justify-center p-3 bg-white border border-slate-200 hover:border-purple-300 rounded-lg text-purple-600 transition-colors group">
                      <FileText size={20} className="mb-1 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-medium">Kardex</span>
                    </Link>
                  </div>
                </div>

              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
