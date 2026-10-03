"use client";

import { useState, useRef } from 'react';
import { createCategory, createWarehouse, resetSystem, exportSystemData } from '@/api';
import { Save, Tags, Building2, AlertTriangle, Download, Loader2, FileSpreadsheet } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function Admin() {
  const [catName, setCatName] = useState('');
  const [wareName, setWareName] = useState('');
  const [wareLocation, setWareLocation] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [hiddenData, setHiddenData] = useState<any>(null);
  
  const chartRef = useRef<HTMLDivElement>(null);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCategory({ name: catName });
      alert('Categoría creada exitosamente');
      setCatName('');
    } catch (err) {
      alert('Error al crear categoría');
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createWarehouse({ name: wareName, location: wareLocation });
      alert('Almacén creado exitosamente');
      setWareName('');
      setWareLocation('');
    } catch (err) {
      alert('Error al crear almacén');
    }
  };

  const handleFileUploadCategories = (e: React.ChangeEvent<HTMLInputElement>) => {
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

        for (let i = 0; i < data.length; i++) {
          const row = data[i] as any;
          const rowNum = i + 2;
          try {
            const name = String(row['Nombre de Categoría'] || row['Nombre'] || '').trim();
            if (!name) {
              errorList.push(`Fila ${rowNum}: Falta el nombre de la categoría.`);
              continue;
            }
            await createCategory({ name });
            successCount++;
          } catch (e: any) {
             errorList.push(`Fila ${rowNum}: Error del servidor (probablemente duplicado o inválido).`);
          }
        }
        
        if (errorList.length > 0) {
          alert(`Proceso finalizado.\nSe importaron ${successCount} categorías.\nErrores:\n- ` + errorList.join('\n- '));
        } else {
          alert(`Proceso finalizado exitosamente. Se importaron ${successCount} categorías.`);
        }
      } catch (err) {
        alert('Error al leer el archivo Excel.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleFileUploadWarehouses = (e: React.ChangeEvent<HTMLInputElement>) => {
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

        for (let i = 0; i < data.length; i++) {
          const row = data[i] as any;
          const rowNum = i + 2;
          try {
            const name = String(row['Nombre del Almacén'] || row['Nombre'] || '').trim();
            const location = String(row['Ubicación'] || row['Dirección'] || '').trim();
            if (!name) {
              errorList.push(`Fila ${rowNum}: Falta el nombre del almacén.`);
              continue;
            }
            await createWarehouse({ name, location });
            successCount++;
          } catch (e: any) {
             errorList.push(`Fila ${rowNum}: Error del servidor (probablemente duplicado o inválido).`);
          }
        }
        
        if (errorList.length > 0) {
          alert(`Proceso finalizado.\nSe importaron ${successCount} almacenes.\nErrores:\n- ` + errorList.join('\n- '));
        } else {
          alert(`Proceso finalizado exitosamente. Se importaron ${successCount} almacenes.`);
        }
      } catch (err) {
        alert('Error al leer el archivo Excel.');
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const downloadExcelTemplateCategories = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'Nombre de Categoría': 'Lácteos' },
      { 'Nombre de Categoría': 'Cereales' }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Categorías");
    XLSX.writeFile(wb, "Plantilla_Categorias.xlsx");
  };

  const downloadExcelTemplateWarehouses = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'Nombre del Almacén': 'Almacén Norte', 'Ubicación': 'Calle Lima 123' },
      { 'Nombre del Almacén': 'Depósito Central', 'Ubicación': 'Av. Principal 456' }
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Almacenes");
    XLSX.writeFile(wb, "Plantilla_Almacenes.xlsx");
  };

  const handleResetSystem = async () => {
    if (confirm('¿Estás seguro de que quieres limpiar TODO el sistema? Esta acción no se puede deshacer y borrará todos los registros.')) {
      try {
        const res = await resetSystem();
        alert(res.message || 'Sistema reseteado exitosamente');
      } catch (err) {
        alert('Error al resetear el sistema');
      }
    }
  };

  const generateMassivePDF = async () => {
    setIsGeneratingPdf(true);
    try {
      const response = await exportSystemData();
      const data = response.data || response;
      
      if (!data || !data.products) {
        alert('No se pudieron obtener los datos del sistema.');
        return;
      }

      // Diccionarios para traducir IDs a nombres legibles
      const productMap: Record<string, any> = {};
      (data.products || []).forEach((p: any) => { productMap[p.id] = p; });
      const warehouseMap: Record<string, string> = {};
      (data.warehouses || []).forEach((w: any) => { warehouseMap[w.id] = w.name; });
      const categoryMap: Record<string, string> = {};
      (data.categories || []).forEach((c: any) => { categoryMap[c.id] = c.name; });

      const nombre = (id: string, map: Record<string, string>) => map[id] || '-';
      const nombreProducto = (id: string) => productMap[id]?.name || '-';
      const formatFecha = (d: any) => {
        if (!d) return '-';
        try { return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
        catch { return '-'; }
      };
      const tipoMovimiento: Record<string, string> = {
        'IN': 'Entrada', 'OUT': 'Salida', 'TRANSFER': 'Transferencia',
        'RETURN_IN': 'Devolución (entrada)', 'RETURN_OUT': 'Devolución (salida)', 'ADJUSTMENT': 'Ajuste',
      };
      const tipoAjuste: Record<string, string> = {
        'SHORTAGE': 'Faltante', 'SHRINKAGE': 'Merma', 'SURPLUS': 'Sobrante',
      };
      const estadoAjuste: Record<string, string> = {
        'PENDING': 'Pendiente', 'APPROVED': 'Aprobado', 'REJECTED': 'Rechazado',
      };

      setHiddenData(data);
      await new Promise(resolve => setTimeout(resolve, 1000));

      const pdf = new jsPDF('p', 'mm', 'a4');
      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();
      const blue: [number, number, number] = [41, 98, 168];
      const estiloTabla = {
        theme: 'striped' as const,
        headStyles: { fillColor: blue, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold' as const, fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [235, 242, 255] as [number, number, number] },
        margin: { left: 14, right: 14 },
      };

      // Función auxiliar para agregar título de sección
      const tituloSeccion = (texto: string, y: number) => {
        pdf.setFontSize(15);
        pdf.setTextColor(41, 98, 168);
        pdf.text(texto, 14, y);
        pdf.setDrawColor(41, 98, 168);
        pdf.setLineWidth(0.5);
        pdf.line(14, y + 2, W - 14, y + 2);
        pdf.setTextColor(0, 0, 0);
      };

      // ═══════════════ PORTADA ═══════════════
      pdf.setFillColor(41, 98, 168);
      pdf.rect(0, 0, W, 60, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.text("Reporte Global de Inventario", W / 2, 28, { align: 'center' });
      pdf.setFontSize(13);
      pdf.text("Cooperativa - Auditoría y Respaldo", W / 2, 38, { align: 'center' });
      pdf.setFontSize(10);
      const fechaLarga = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
      pdf.text(`Generado el ${fechaLarga} a las ${new Date().toLocaleTimeString('es-ES')}`, W / 2, 50, { align: 'center' });

      // Resumen general
      pdf.setTextColor(0, 0, 0);
      tituloSeccion("Resumen General", 78);

      autoTable(pdf, {
        startY: 84,
        body: [
          ['Productos registrados', `${(data.products || []).length}`],
          ['Almacenes', `${(data.warehouses || []).length}`],
          ['Categorías', `${(data.categories || []).length}`],
          ['Registros de existencias', `${(data.stock || []).length}`],
          ['Movimientos (entradas y salidas)', `${(data.movements || []).length}`],
          ['Ajustes de inventario', `${(data.adjustments || []).length}`],
          ['Lotes', `${(data.batches || []).length}`],
        ],
        theme: 'plain',
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 100 }, 1: { halign: 'right' } },
        bodyStyles: { fontSize: 11 },
        margin: { left: 20, right: 20 },
      });

      // Gráfico de existencias
      if (chartRef.current) {
        try {
          const canvas = await html2canvas(chartRef.current, { scale: 2, useCORS: true });
          const imgData = canvas.toDataURL('image/png');
          const imgProps = pdf.getImageProperties(imgData);
          const imgH = (imgProps.height * (W - 40)) / imgProps.width;
          const curY = (pdf as any).lastAutoTable?.finalY || 150;
          if (curY + imgH + 20 > H) pdf.addPage();
          const startY = curY + 10;
          pdf.setFontSize(12);
          pdf.setTextColor(80, 80, 80);
          pdf.text("Existencias totales por producto:", 14, startY);
          pdf.addImage(imgData, 'PNG', 20, startY + 5, W - 40, imgH);
        } catch { /* Si falla el gráfico, continuar */ }
      }

      // ═══════════════ PRODUCTOS ═══════════════
      pdf.addPage();
      tituloSeccion("Catálogo de Productos", 15);
      autoTable(pdf, {
        startY: 22,
        head: [['Código', 'Nombre', 'Categoría', 'Precio', 'Unidad']],
        body: (data.products || []).map((p: any) => [
          p.code || '-',
          p.name,
          nombre(p.categoryId || p.category_id, categoryMap),
          `$${Number(p.price || 0).toFixed(2)}`,
          p.unit || 'Unidad',
        ]),
        ...estiloTabla,
      });

      // ═══════════════ EXISTENCIAS ═══════════════
      pdf.addPage();
      tituloSeccion("Existencias Actuales (Inventario)", 15);
      autoTable(pdf, {
        startY: 22,
        head: [['Producto', 'Almacén', 'Cantidad']],
        body: (data.stock || []).map((s: any) => [
          nombreProducto(s.productId || s.product_id),
          nombre(s.warehouseId || s.warehouse_id, warehouseMap),
          Number(s.quantity || 0).toString(),
        ]),
        ...estiloTabla,
      });

      // ═══════════════ KARDEX ═══════════════
      pdf.addPage();
      tituloSeccion("Kardex - Historial de Movimientos", 15);
      autoTable(pdf, {
        startY: 22,
        head: [['Fecha', 'Tipo', 'Producto', 'Origen', 'Destino', 'Cantidad', 'Observaciones']],
        body: (data.movements || []).map((m: any) => [
          formatFecha(m.createdAt || m.created_at),
          tipoMovimiento[m.type] || m.type,
          nombreProducto(m.productId || m.product_id),
          nombre(m.fromWarehouseId || m.from_warehouse_id, warehouseMap),
          nombre(m.toWarehouseId || m.to_warehouse_id, warehouseMap),
          Number(m.quantity || 0).toString(),
          m.observations || '-',
        ]),
        ...estiloTabla,
        columnStyles: { 6: { cellWidth: 35 } },
      });

      // ═══════════════ AJUSTES ═══════════════
      pdf.addPage();
      tituloSeccion("Ajustes de Inventario", 15);
      autoTable(pdf, {
        startY: 22,
        head: [['Fecha', 'Tipo', 'Estado', 'Producto', 'Almacén', 'Cantidad', 'Razón']],
        body: (data.adjustments || []).map((a: any) => [
          formatFecha(a.createdAt || a.created_at),
          tipoAjuste[a.type] || a.type,
          estadoAjuste[a.status] || a.status || '-',
          nombreProducto(a.productId || a.product_id),
          nombre(a.warehouseId || a.warehouse_id, warehouseMap),
          Number(a.quantity || 0).toString(),
          a.reason || '-',
        ]),
        ...estiloTabla,
        columnStyles: { 6: { cellWidth: 35 } },
      });

      // ═══════════════ ALMACENES Y CATEGORÍAS ═══════════════
      pdf.addPage();
      tituloSeccion("Almacenes Registrados", 15);
      autoTable(pdf, {
        startY: 22,
        head: [['Nombre', 'Ubicación']],
        body: (data.warehouses || []).map((w: any) => [w.name, w.location || '-']),
        ...estiloTabla,
      });

      const endY = (pdf as any).lastAutoTable?.finalY || 40;
      tituloSeccion("Categorías", endY + 15);
      autoTable(pdf, {
        startY: endY + 22,
        head: [['Nombre']],
        body: (data.categories || []).map((c: any) => [c.name]),
        ...estiloTabla,
      });

      // ═══════════════ LOTES ═══════════════
      if (data.batches && data.batches.length > 0) {
        pdf.addPage();
        tituloSeccion("Control de Lotes", 15);
        autoTable(pdf, {
          startY: 22,
          head: [['Producto', 'Número de Lote', 'Fecha de Vencimiento']],
          body: data.batches.map((b: any) => [
            nombreProducto(b.productId || b.product_id),
            b.batchNumber || b.batch_number || '-',
            formatFecha(b.expirationDate || b.expiration_date),
          ]),
          ...estiloTabla,
        });
      }

      // ═══════════════ PIE DE PÁGINA ═══════════════
      const totalPaginas = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPaginas; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150, 150, 150);
        pdf.text(`Página ${i} de ${totalPaginas}  —  Reporte de Auditoría - Cooperativa`, W / 2, H - 7, { align: 'center' });
      }

      pdf.save(`Auditoria_Completa_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (err) {
      console.error('Error generando PDF:', err);
      alert('Error al exportar los datos. Revisa la consola para más detalles.');
    } finally {
      setIsGeneratingPdf(false);
      setHiddenData(null);
    }
  };

  // Datos para el gráfico oculto
  const stockByProduct = hiddenData?.products ? hiddenData.products.map((p: any) => {
    const totalStock = (hiddenData.stock || [])
      .filter((s: any) => (s.productId || s.product_id) === p.id)
      .reduce((sum: number, s: any) => sum + Number(s.quantity || 0), 0);
    return { name: p.name, stock: totalStock };
  }) : [];

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 relative">
      
      {/* Gráfico oculto para captura en PDF */}
      {hiddenData && (
        <div className="absolute top-0 left-[-9999px] w-[800px] h-[400px] bg-white p-4" ref={chartRef}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stockByProduct}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="stock" fill="#2962A8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div>
        <h1 className="text-2xl font-bold text-slate-800">Administración</h1>
        <p className="text-slate-500 text-sm">Gestiona la configuración básica de tu sistema</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Nueva Categoría */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-4">
            <div className="bg-blue-50 p-2 rounded-lg">
              <Tags className="text-blue-600" size={24} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Crear Categoría</h2>
          </div>
          
          <form onSubmit={handleCreateCategory} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre de la Categoría</label>
              <input 
                required
                type="text" 
                value={catName}
                onChange={e => setCatName(e.target.value)}
                placeholder="Ej. Abarrotes, Limpieza..."
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <button 
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
              >
                <Save size={18} /> Guardar Categoría
              </button>

              <div className="relative border-t border-slate-200 mt-2 pt-4">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-slate-400 font-medium">O carga masiva</div>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => window.document.getElementById('excel-upload-categories')?.click()}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#107c41] hover:bg-[#0c5e31] text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
                  >
                    <FileSpreadsheet size={16} /> Importar Excel
                  </button>
                  <button 
                    type="button"
                    onClick={downloadExcelTemplateCategories}
                    className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-medium text-sm transition-colors"
                  >
                    Plantilla
                  </button>
                </div>
                <input 
                  id="excel-upload-categories" 
                  type="file" 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                  onChange={handleFileUploadCategories} 
                />
              </div>
            </div>
          </form>
        </div>

        {/* Nuevo Almacén */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4 border-b border-slate-100 pb-4">
            <div className="bg-emerald-50 p-2 rounded-lg">
              <Building2 className="text-emerald-600" size={24} />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Crear Almacén</h2>
          </div>
          
          <form onSubmit={handleCreateWarehouse} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre del Almacén</label>
              <input 
                required
                type="text" 
                value={wareName}
                onChange={e => setWareName(e.target.value)}
                placeholder="Ej. Almacén Principal"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Ubicación / Dirección</label>
              <input 
                required
                type="text" 
                value={wareLocation}
                onChange={e => setWareLocation(e.target.value)}
                placeholder="Ej. Calle Principal 123"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <button 
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
              >
                <Save size={18} /> Guardar Almacén
              </button>

              <div className="relative border-t border-slate-200 mt-2 pt-4">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-2 text-xs text-slate-400 font-medium">O carga masiva</div>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => window.document.getElementById('excel-upload-warehouses')?.click()}
                    className="flex-1 flex items-center justify-center gap-2 bg-[#107c41] hover:bg-[#0c5e31] text-white px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
                  >
                    <FileSpreadsheet size={16} /> Importar Excel
                  </button>
                  <button 
                    type="button"
                    onClick={downloadExcelTemplateWarehouses}
                    className="px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-medium text-sm transition-colors"
                  >
                    Plantilla
                  </button>
                </div>
                <input 
                  id="excel-upload-warehouses" 
                  type="file" 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                  onChange={handleFileUploadWarehouses} 
                />
              </div>
            </div>
          </form>
        </div>

      </div>

      <div className="mt-8 border-t border-slate-200 pt-8">
        <h2 className="text-xl font-bold text-slate-800 mb-6">Opciones Avanzadas del Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="bg-red-50 rounded-xl border border-red-200 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-red-100 p-2 rounded-lg">
                  <AlertTriangle className="text-red-600" size={24} />
                </div>
                <h3 className="text-lg font-bold text-red-900">Resetear Sistema</h3>
              </div>
              <p className="text-sm text-red-700 mb-6">
                Peligro: Elimina permanentemente todos los datos de inventario. Los usuarios se mantendrán intactos.
              </p>
            </div>
            <button 
              onClick={handleResetSystem}
              className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors"
            >
              <AlertTriangle size={18} /> Resetear Todo
            </button>
          </div>

          <div className="bg-blue-50 rounded-xl border border-blue-200 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <Download className="text-blue-600" size={24} />
                </div>
                <h3 className="text-lg font-bold text-blue-900">Auditoría Global (PDF)</h3>
              </div>
              <p className="text-sm text-blue-700 mb-6">
                Descarga una copia completa en PDF con toda la información del sistema para respaldo y auditoría.
              </p>
            </div>
            <button 
              onClick={generateMassivePDF}
              disabled={isGeneratingPdf}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isGeneratingPdf ? <Loader2 className="animate-spin" size={18} /> : <Download size={18} />}
              {isGeneratingPdf ? 'Generando PDF...' : 'Descargar Auditoría PDF'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
