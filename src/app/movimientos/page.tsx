"use client";

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { MovementType } from '@/types';
import { 
  fetchProducts, 
  fetchStock, 
  fetchWarehouses, 
  fetchBatches,
  createMovement 
} from '@/api';
import { 
  ArrowDownToLine, 
  ArrowUpFromLine, 
  ArrowLeftRight, 
  Undo2, 
  Save, 
  CheckCircle2,
  AlertCircle,
  Search,
  ScanBarcode,
  Loader2,
  Plus,
  Trash2,
  ListPlus,
  Printer,
  FilePlus2,
  FileSpreadsheet
} from 'lucide-react';
import Image from 'next/image';
import * as XLSX from 'xlsx';

export default function Movimientos() {
  const searchParams = useSearchParams();
  const initialType = searchParams?.get('type') || 'in';

  // Data states
  const [products, setProducts] = useState<any[]>([]);
  const [stockData, setStockData] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tipos de Movimiento UI
  const MOVEMENT_TYPES = [
    { id: 'IN', label: 'Ingreso', icon: ArrowDownToLine, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
    { id: 'OUT', label: 'Salida', icon: ArrowUpFromLine, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    { id: 'TRANSFER', label: 'Transferencia', icon: ArrowLeftRight, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
    { id: 'RETURN_IN', label: 'Dev. Cliente (Entra)', icon: Undo2, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
    { id: 'RETURN_OUT', label: 'Dev. Proveedor (Sale)', icon: Undo2, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
  ];

  const mapTypeFromUrl = (t: string) => {
    switch(t) {
      case 'in': return 'IN';
      case 'out': return 'OUT';
      case 'transfer': return 'TRANSFER';
      default: return 'IN';
    }
  };

  const [type, setType] = useState<MovementType>(mapTypeFromUrl(initialType) as MovementType);
  
  // Document level state
  const [fromWarehouse, setFromWarehouse] = useState<string>('');
  const [toWarehouse, setToWarehouse] = useState<string>('');
  const [document, setDocument] = useState('');
  const [observations, setObservations] = useState('');

  // Item entry state
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [quantity, setQuantity] = useState<number | ''>('');

  // Cart / Items List
  const [itemsList, setItemsList] = useState<any[]>([]);

  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedData, setSavedData] = useState<any>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [prodRes, stockRes, wareRes, batRes] = await Promise.all([
          fetchProducts(), fetchStock(), fetchWarehouses(), fetchBatches()
        ]);
        setProducts(prodRes);
        setStockData(stockRes);
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

  // Derived state
  const isOutput = type === 'OUT' || type === 'TRANSFER' || type === 'RETURN_OUT';
  const isInput = type === 'IN' || type === 'TRANSFER' || type === 'RETURN_IN';

  const productBatches = useMemo(() => {
    if (!selectedProduct) return [];
    return batches.filter(b => b.productId === selectedProduct.id);
  }, [selectedProduct, batches]);

  const currentStock = useMemo(() => {
    if (!selectedProduct) return 0;
    if (isOutput && !fromWarehouse) return 0;
    
    const stockItems = stockData.filter(s => 
      s.productId === selectedProduct.id && 
      (fromWarehouse ? s.warehouseId === fromWarehouse : true) &&
      (selectedBatch ? s.batchId === selectedBatch : true)
    );
    
    return stockItems.reduce((sum, s) => sum + Number(s.quantity), 0);
  }, [selectedProduct, fromWarehouse, selectedBatch, isOutput, stockData]);

  const searchResults = useMemo(() => {
    if (productSearch.length < 2 || selectedProduct?.code === productSearch || selectedProduct?.name === productSearch) return [];
    return products.filter(p => 
      p.isActive && (
        p.code.toLowerCase().includes(productSearch.toLowerCase()) || 
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.barcode?.includes(productSearch)
      )
    );
  }, [productSearch, selectedProduct, products]);

  const handleSelectProduct = (p: any) => {
    setSelectedProduct(p);
    setProductSearch(p.code + ' - ' + p.name);
    setSelectedBatch('');
    setQuantity('');
    setErrorMsg('');
  };

  const handleAddItem = () => {
    if (!selectedProduct) return setErrorMsg('Selecciona un producto para agregar.');
    if (!quantity || quantity <= 0) return setErrorMsg('La cantidad debe ser mayor a 0.');
    
    if (isOutput && !fromWarehouse) return setErrorMsg('Selecciona el almacén de origen antes de agregar productos.');
    
    if (isOutput && quantity > currentStock) {
      return setErrorMsg(`Stock insuficiente de ${selectedProduct.name}. Stock actual: ${currentStock} ${selectedProduct.unit}`);
    }

    // Check if already in list
    const existingIndex = itemsList.findIndex(item => 
      item.product.id === selectedProduct.id && item.batchId === selectedBatch
    );

    if (existingIndex >= 0) {
      const newList = [...itemsList];
      const newQty = newList[existingIndex].quantity + quantity;
      
      if (isOutput && newQty > currentStock) {
        return setErrorMsg(`Stock insuficiente si sumas esta cantidad. Stock actual: ${currentStock}`);
      }
      
      newList[existingIndex].quantity = newQty;
      setItemsList(newList);
    } else {
      setItemsList([...itemsList, {
        product: selectedProduct,
        batchId: selectedBatch,
        quantity: Number(quantity)
      }]);
    }

    // Reset entry fields
    setSelectedProduct(null);
    setProductSearch('');
    setSelectedBatch('');
    setQuantity('');
    setErrorMsg('');
  };

  const handleRemoveItem = (index: number) => {
    const newList = [...itemsList];
    newList.splice(index, 1);
    setItemsList(newList);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (isOutput && !fromWarehouse) {
      setErrorMsg('Selecciona el almacén de origen antes de cargar el archivo.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          setErrorMsg('El archivo Excel está vacío.');
          return;
        }

        const newItems: any[] = [];
        const errorList: string[] = [];

        // Current stock map to avoid adding more than we have for outputs
        // Keep a running tally of requested quantities per product to check against total stock
        const requestedQuantities: Record<string, number> = {};

        data.forEach((row: any, i: number) => {
          const rowNum = i + 2; // +1 for 0-index, +1 for header
          const code = String(row['Codigo Producto'] || row['Código'] || row['codigo'] || '').trim();
          const qty = Number(row['Cantidad'] || row['cantidad'] || 0);
          const batchNumber = String(row['Lote'] || row['lote'] || '').trim();

          if (!code || qty <= 0) {
            errorList.push(`Fila ${rowNum}: Faltan datos (Código vacío o Cantidad inválida).`);
            return;
          }

          const product = products.find(p => p.code.toLowerCase() === code.toLowerCase() && p.isActive);
          if (!product) {
            errorList.push(`Fila ${rowNum}: Producto '${code}' no encontrado o inactivo.`);
            return;
          }

          let batchId = '';
          if (batchNumber) {
            const batch = batches.find(b => b.productId === product.id && b.batchNumber.toLowerCase() === batchNumber.toLowerCase());
            if (batch) {
              batchId = batch.id;
            }
          }

          if (isOutput) {
             const key = product.id + (batchId ? `-${batchId}` : '');
             requestedQuantities[key] = (requestedQuantities[key] || 0) + qty;
             
             // Check stock
             const stockItems = stockData.filter(s => 
               s.productId === product.id && 
               (fromWarehouse ? s.warehouseId === fromWarehouse : true) &&
               (batchId ? s.batchId === batchId : true)
             );
             const prodStock = stockItems.reduce((sum, s) => sum + Number(s.quantity), 0);

             if (requestedQuantities[key] > prodStock) {
               errorList.push(`Fila ${rowNum}: Stock insuficiente para '${code}'. Solicitado: ${requestedQuantities[key]}, Disponible: ${prodStock}.`);
               // Revert requested qty to valid state since we skip this row
               requestedQuantities[key] -= qty;
               return;
             }
          }

          newItems.push({
            product,
            batchId,
            quantity: qty
          });
        });

        if (newItems.length > 0) {
           // Merge with existing itemsList (group by product+batch)
           const mergedList = [...itemsList];
           newItems.forEach(newItem => {
             const existingIndex = mergedList.findIndex(item => 
               item.product.id === newItem.product.id && item.batchId === newItem.batchId
             );
             if (existingIndex >= 0) {
               mergedList[existingIndex].quantity += newItem.quantity;
             } else {
               mergedList.push(newItem);
             }
           });
           setItemsList(mergedList);
           
           if (errorList.length > 0) {
             setErrorMsg(`Se agregaron ${newItems.length} productos.\nHubo errores que fueron omitidos:\n- ` + errorList.join('\n- '));
           } else {
             setErrorMsg('');
           }
        } else {
           if (errorList.length > 0) {
             setErrorMsg(`No se pudo agregar ningún producto.\nErrores:\n- ` + errorList.join('\n- '));
           } else {
             setErrorMsg('No se encontraron datos para procesar.');
           }
        }

      } catch (err) {
        console.error("Error reading Excel", err);
        setErrorMsg('Error al leer el archivo Excel.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset input
  };

  const downloadExcelTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 
        'Codigo Producto': 'PROD-001', 
        'Nombre Producto (Opcional)': 'Ejemplo de Producto',
        'Cantidad': 10, 
        'Lote': 'LOTE-123' 
      },
      { 
        'Codigo Producto': 'PROD-002', 
        'Nombre Producto (Opcional)': 'Otro Producto',
        'Cantidad': 5, 
        'Lote': '' 
      }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Plantilla");
    XLSX.writeFile(wb, "Plantilla_Movimientos.xlsx");
  };

  const handleSaveAll = async () => {
    setErrorMsg('');
    setIsSuccess(false);

    if (itemsList.length === 0) return setErrorMsg('Agrega al menos un producto a la lista.');
    if (isOutput && !fromWarehouse) return setErrorMsg('Selecciona el almacén de origen.');
    if (isInput && !toWarehouse) return setErrorMsg('Selecciona el almacén de destino.');
    if (type === 'TRANSFER' && fromWarehouse === toWarehouse) return setErrorMsg('Los almacenes de origen y destino deben ser diferentes.');

    setIsSaving(true);
    try {
      // Create all movements in parallel
      await Promise.all(itemsList.map(item => 
        createMovement({
          type,
          productId: item.product.id,
          quantity: item.quantity,
          fromWarehouseId: isOutput ? fromWarehouse : undefined,
          toWarehouseId: isInput ? toWarehouse : undefined,
          batchId: item.batchId || undefined,
          documentNumber: document,
          observations
        })
      ));

      setSavedData({
        type: MOVEMENT_TYPES.find(t => t.id === type)?.label,
        typeId: type,
        document: document || 'Sin Documento',
        observations: observations || '-',
        items: itemsList.map(item => ({...item, batchName: batches.find(b => b.id === item.batchId)?.batchNumber})),
        fromWarehouseName: warehouses.find(w => w.id === fromWarehouse)?.name || '-',
        toWarehouseName: warehouses.find(w => w.id === toWarehouse)?.name || '-',
        date: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
      });
      
      // Refresh stock data
      const newStock = await fetchStock();
      setStockData(newStock);

    } catch (err) {
      setErrorMsg('Error al registrar los movimientos. Es posible que algunos no se hayan guardado.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewDocument = () => {
    setSavedData(null);
    setItemsList([]);
    setDocument('');
    setObservations('');
    setProductSearch('');
    setSelectedProduct(null);
    setQuantity('');
    setIsSuccess(false);
  };

  if (loading) {
    return <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      <span className="ml-2 text-slate-500">Cargando...</span>
    </div>;
  }

  const typeConfig = MOVEMENT_TYPES.find(t => t.id === type);

  if (savedData) {
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-20">
        
        {/* --- Pantalla de Éxito --- */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden print:hidden text-center p-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-6">
            <CheckCircle2 size={40} className="text-emerald-600" />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 mb-2">¡Movimiento Registrado!</h2>
          <p className="text-slate-500 mb-8 max-w-md mx-auto">
            El documento <strong>{savedData.document}</strong> ha sido guardado exitosamente y el stock fue actualizado en el sistema.
          </p>
          
          <div className="flex items-center justify-center gap-4">
            <button 
              onClick={() => window.print()}
              className="flex items-center gap-2 px-6 py-3 bg-[#15803d] hover:bg-[#166534] text-white rounded-xl font-bold shadow-lg shadow-[#15803d]/30 transition-all"
            >
              <Printer size={20} />
              Imprimir Documento
            </button>
            <button 
              onClick={handleNewDocument}
              className="flex items-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl font-bold transition-all shadow-sm"
            >
              <FilePlus2 size={20} />
              Nuevo Registro
            </button>
          </div>
        </div>

        {/* --- Formato de Impresión Elegante (Solo visible al imprimir) --- */}
        <div className="hidden print:block print:w-full print:bg-white text-slate-800 text-[11px] leading-tight font-sans">
          
          {/* Header con Logo CEPROAA */}
          <div className="flex justify-between items-start mb-6 border-b-2 border-[#15803d] pb-4">
            <div className="flex items-center gap-4">
              <div className="relative w-32 h-16">
                <Image src="/logo.png" alt="CEPROAA Logo" fill className="object-contain" />
              </div>
              <div>
                <h1 className="text-xl font-black text-[#15803d] tracking-tight">COOPERATIVA CEPROAA</h1>
                <p className="text-slate-600 text-sm font-medium">Control de Inventarios y Almacén</p>
                <p className="text-slate-500 text-xs">"La calidad es nuestra pasión"</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-wider mb-1">GUÍA DE {savedData.type}</h2>
              <p className="font-bold text-slate-600 text-sm bg-slate-100 inline-block px-3 py-1 rounded">Nº {savedData.document}</p>
            </div>
          </div>

          {/* Datos del Documento */}
          <table className="w-full border-collapse border border-slate-300 mb-6 text-[11px]">
            <tbody>
              <tr>
                <td className="border border-slate-300 bg-slate-100/80 font-bold px-3 py-2 w-[15%] text-[#15803d]">Operación:</td>
                <td className="border border-slate-300 px-3 py-2 w-[35%] font-medium">{savedData.type}</td>
                <td className="border border-slate-300 bg-slate-100/80 font-bold px-3 py-2 w-[15%] text-[#15803d]">Fecha y Hora:</td>
                <td className="border border-slate-300 px-3 py-2 w-[35%]">{savedData.date}</td>
              </tr>
              <tr>
                <td className="border border-slate-300 bg-slate-100/80 font-bold px-3 py-2 text-[#15803d]">Almacén Origen:</td>
                <td className="border border-slate-300 px-3 py-2">{savedData.typeId === 'IN' || savedData.typeId === 'RETURN_IN' ? '-' : savedData.fromWarehouseName}</td>
                <td className="border border-slate-300 bg-slate-100/80 font-bold px-3 py-2 text-[#15803d]">Almacén Destino:</td>
                <td className="border border-slate-300 px-3 py-2">{savedData.typeId === 'OUT' || savedData.typeId === 'RETURN_OUT' ? '-' : savedData.toWarehouseName}</td>
              </tr>
              <tr>
                <td className="border border-slate-300 bg-slate-100/80 font-bold px-3 py-2 text-[#15803d]">Observaciones:</td>
                <td colSpan={3} className="border border-slate-300 px-3 py-2">{savedData.observations}</td>
              </tr>
            </tbody>
          </table>

          {/* Tabla de Productos */}
          <h3 className="font-bold text-[#15803d] text-sm mb-2 uppercase">Detalle de Productos</h3>
          <table className="w-full border-collapse border border-slate-300 mb-8 text-[11px] text-center">
            <thead>
              <tr className="bg-slate-100/80 text-[#15803d]">
                <th className="border border-slate-300 px-2 py-2 w-10">Item</th>
                <th className="border border-slate-300 px-2 py-2 w-32">Código</th>
                <th className="border border-slate-300 px-2 py-2 text-left">Descripción del Producto</th>
                <th className="border border-slate-300 px-2 py-2 w-24">Lote</th>
                <th className="border border-slate-300 px-2 py-2 w-20">Cantidad</th>
                <th className="border border-slate-300 px-2 py-2 w-20">Und. Med.</th>
              </tr>
            </thead>
            <tbody>
              {savedData.items.map((item: any, i: number) => (
                <tr key={i}>
                  <td className="border border-slate-300 px-2 py-2">{i + 1}</td>
                  <td className="border border-slate-300 px-2 py-2">{item.product.code}</td>
                  <td className="border border-slate-300 px-2 py-2 text-left font-bold">{item.product.name}</td>
                  <td className="border border-slate-300 px-2 py-2">{item.batchName || '-'}</td>
                  <td className="border border-slate-300 px-2 py-2 font-bold text-sm">{item.quantity}</td>
                  <td className="border border-slate-300 px-2 py-2">{item.product.unit}</td>
                </tr>
              ))}
              <tr className="bg-slate-50 font-bold">
                <td colSpan={4} className="border border-slate-300 px-3 py-2 text-right">TOTAL UNIDADES:</td>
                <td className="border border-slate-300 px-2 py-2 text-sm">{savedData.items.reduce((sum: number, i: any) => sum + i.quantity, 0)}</td>
                <td className="border border-slate-300 px-2 py-2"></td>
              </tr>
            </tbody>
          </table>

          {/* Firmas */}
          <div className="flex justify-between items-end px-12 mt-24 mb-6">
            <div className="text-center w-48">
              <div className="border-t border-slate-800 mb-2"></div>
              <p className="font-bold">Despachado / Entregado por</p>
              <p className="text-[10px] text-slate-500 mt-1">Firma y Sello</p>
            </div>
            <div className="text-center w-48">
              <div className="border-t border-slate-800 mb-2"></div>
              <p className="font-bold">Recibido por (Almacén)</p>
              <p className="text-[10px] text-slate-500 mt-1">Firma y Sello</p>
            </div>
          </div>
          
          <div className="border-t border-slate-300 pt-2 text-center text-[9px] text-slate-500">
            <p>Documento generado por el Sistema de Control de Inventarios de CEPROAA</p>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Registrar Movimientos</h1>
        <p className="text-slate-500 text-sm">Registra múltiples productos en una sola guía o documento de forma rápida</p>
      </div>

      {/* Selector de Tipo */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {MOVEMENT_TYPES.map(t => {
          const Icon = t.icon;
          const isActive = type === t.id;
          return (
            <button
              key={t.id}
              onClick={() => { 
                setType(t.id as MovementType); 
                setErrorMsg(''); 
                setIsSuccess(false);
                setItemsList([]); // Clear list on type change
              }}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${
                isActive 
                  ? `${t.bg} ${t.border} shadow-sm ring-1 ring-${t.color.split('-')[1]}-500/50` 
                  : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-600'
              }`}
            >
              <Icon size={20} className={`mb-1 ${isActive ? t.color : 'text-slate-400'}`} />
              <span className={`text-xs text-center font-medium ${isActive ? t.color : ''}`}>
                {t.label}
              </span>
            </button>
          )
        })}
      </div>

      {isSuccess && (
        <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 p-4 rounded-lg flex items-start gap-3 shadow-sm">
          <CheckCircle2 className="text-emerald-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold">¡Movimientos registrados con éxito!</h4>
            <p className="text-sm text-emerald-700">El stock se ha actualizado y el formulario está listo para un nuevo registro.</p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-50 text-red-800 border border-red-200 p-4 rounded-lg flex items-start gap-3 text-sm font-medium shadow-sm whitespace-pre-line">
          <AlertCircle size={20} className="text-red-500 shrink-0 mt-0.5" />
          <div>{errorMsg}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LADO IZQUIERDO: Cabecera y Agregar Productos */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          
          {/* Cabecera del Documento */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className={`h-1.5 ${typeConfig?.bg}`}></div>
            <div className="p-5 space-y-4">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-2">
                Datos Generales
              </h3>
              
              {/* Origen / Destino */}
              {isOutput && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Almacén Origen <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={fromWarehouse}
                    onChange={(e) => setFromWarehouse(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  >
                    <option value="">Seleccione origen...</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id} disabled={type === 'TRANSFER' && w.id === toWarehouse}>{w.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {isInput && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    Almacén Destino <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={toWarehouse}
                    onChange={(e) => setToWarehouse(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-slate-50"
                  >
                    <option value="">Seleccione destino...</option>
                    {warehouses.map(w => (
                      <option key={w.id} value={w.id} disabled={type === 'TRANSFER' && w.id === fromWarehouse}>{w.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nº Guía / Documento</label>
                <input 
                  type="text" value={document} onChange={(e) => setDocument(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Ej. FAC-00123 (Aplicará a todos)"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Observaciones</label>
                <input 
                  type="text" value={observations} onChange={(e) => setObservations(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="Motivo o detalle general..."
                />
              </div>
            </div>
          </div>

          {/* Formulario Agregar Producto */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
             <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-2">
                Buscador de Productos
              </h3>
            
            <div className="relative">
              <label className="block text-sm font-medium text-slate-700 mb-1">Producto</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" value={productSearch}
                  onChange={(e) => {
                    setProductSearch(e.target.value);
                    if (selectedProduct && e.target.value !== selectedProduct.code + ' - ' + selectedProduct.name) {
                      setSelectedProduct(null);
                    }
                  }}
                  placeholder="Código o nombre..."
                  className="pl-9 pr-9 py-2 w-full border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
                <ScanBarcode className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
              </div>
              
              {searchResults.length > 0 && !selectedProduct && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-auto">
                  {searchResults.map(p => (
                    <div 
                      key={p.id} onClick={() => handleSelectProduct(p)}
                      className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                    >
                      <div className="font-medium text-slate-800 text-sm">{p.name}</div>
                      <div className="text-xs text-slate-500 mt-1 flex justify-between">
                        <span>Cód: {p.code}</span>
                        <span>{p.unit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {productBatches.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Lote</label>
                <select 
                  value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">Cualquiera</option>
                  {productBatches.map(b => (
                    <option key={b.id} value={b.id}>{b.batchNumber}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cantidad</label>
              <div className="flex">
                <input 
                  type="number" min="1" step="1"
                  value={quantity} onChange={(e) => setQuantity(e.target.value ? Math.floor(Number(e.target.value)) : '')}
                  className="w-full border border-slate-300 rounded-l-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                  placeholder="0"
                  onKeyDown={(e) => { if(e.key === 'Enter') handleAddItem(); }}
                />
                <span className="inline-flex items-center px-3 rounded-r-lg border border-l-0 border-slate-300 bg-slate-50 text-slate-500 text-xs font-medium">
                  {selectedProduct?.unit || 'Und'}
                </span>
              </div>
              {selectedProduct && isOutput && (
                <p className={`text-xs mt-1 ${quantity && quantity > currentStock ? 'text-red-600 font-bold' : 'text-slate-500'}`}>
                  Stock disponible: {currentStock}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 w-full mt-4">
              <button 
                onClick={handleAddItem}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
              >
                <Plus size={16} />
                Agregar a la lista
              </button>

              <div className="relative border-t border-slate-200 mt-2 pt-4">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-slate-400 font-medium">O carga masiva</div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => window.document.getElementById('excel-upload')?.click()}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#107c41] hover:bg-[#0c5e31] text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
                    title="Cargar archivo Excel (.xlsx)"
                  >
                    <FileSpreadsheet size={16} />
                    Importar Excel
                  </button>
                  <button 
                    onClick={downloadExcelTemplate}
                    className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-medium text-sm transition-colors"
                    title="Descargar plantilla"
                  >
                    Plantilla
                  </button>
                </div>
                <input 
                  id="excel-upload" 
                  type="file" 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* LADO DERECHO: Lista de Productos y Guardar */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col h-full">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden min-h-[450px]">
            
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                <ListPlus size={18} className={typeConfig?.color} />
                Lista de Productos ({itemsList.length})
              </h3>
            </div>

            <div className="flex-1 overflow-auto bg-slate-50/30">
              {itemsList.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400 p-8 text-center min-h-[300px]">
                  <ListPlus size={48} className="mb-3 opacity-20" />
                  <p className="font-medium text-slate-500 text-lg">La lista está vacía</p>
                  <p className="text-sm mt-1">Busca un producto a la izquierda y agrégalo para armar tu guía.</p>
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="bg-white border-b border-slate-200 sticky top-0 shadow-sm">
                    <tr>
                      <th className="py-3 px-4 font-semibold text-slate-700 w-12 text-center">#</th>
                      <th className="py-3 px-4 font-semibold text-slate-700">Producto</th>
                      <th className="py-3 px-4 font-semibold text-slate-700 text-right">Cantidad</th>
                      <th className="py-3 px-4 font-semibold text-slate-700 w-16 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {itemsList.map((item, index) => {
                      const batchName = batches.find(b => b.id === item.batchId)?.batchNumber;
                      return (
                        <tr key={index} className="hover:bg-slate-50/80 bg-white group">
                          <td className="py-3 px-4 text-slate-400 font-medium text-center">{index + 1}</td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800 text-base">{item.product.name}</div>
                            <div className="text-xs text-slate-500 flex gap-2 mt-0.5">
                              <span>Cód: {item.product.code}</span>
                              {batchName && <span className="bg-slate-100 px-1.5 rounded border border-slate-200">Lote: {batchName}</span>}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-bold text-slate-700 text-lg bg-slate-50 px-2 py-1 rounded">{item.quantity}</span>
                            <span className="text-slate-400 ml-1 text-xs">{item.product.unit}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button 
                              onClick={() => handleRemoveItem(index)}
                              className="text-slate-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                              title="Quitar de la lista"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>
            
            {/* Action Bar */}
            <div className="p-4 border-t border-slate-200 bg-white flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <div className="text-sm text-slate-500">
                Total ítems a guardar: <strong className="text-slate-800 text-lg ml-1">{itemsList.length}</strong>
              </div>
              <button 
                onClick={handleSaveAll}
                disabled={itemsList.length === 0 || isSaving}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all shadow-sm ${
                  itemsList.length > 0 && !isSaving
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                {isSaving ? 'Procesando...' : 'Guardar Documento Completo'}
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
