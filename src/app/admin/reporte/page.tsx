"use client";

import { useEffect, useState, useRef } from 'react';
import { exportSystemData } from '@/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Download, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

export default function ReporteGlobal() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await exportSystemData();
        setData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const handleDownloadPDF = async () => {
    if (!reportRef.current || !data) return;
    
    // Capturar el contenedor principal con los gráficos
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    
    // Añadir páginas extra con tablas si es necesario usando autoTable
    // Tabla de Productos
    pdf.addPage();
    pdf.text("Listado de Productos", 14, 15);
    (pdf as any).autoTable({
      startY: 20,
      head: [['ID', 'Nombre', 'SKU', 'Precio', 'Categoría ID']],
      body: data.products.map((p: any) => [p.id, p.name, p.sku, p.price, p.categoryId]),
    });

    // Tabla de Almacenes
    pdf.text("Listado de Almacenes", 14, (pdf as any).lastAutoTable.finalY + 15);
    (pdf as any).autoTable({
      startY: (pdf as any).lastAutoTable.finalY + 20,
      head: [['ID', 'Nombre', 'Ubicación']],
      body: data.warehouses.map((w: any) => [w.id, w.name, w.location]),
    });

    pdf.save(`Reporte_Global_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  if (loading) return <div className="p-20 text-center"><Loader2 className="animate-spin inline" /> Cargando datos...</div>;
  if (!data) return <div className="p-20 text-center text-red-500">Error al cargar datos</div>;

  // Preparar datos para el gráfico de stock por producto
  const stockByProduct = data.products.map((p: any) => {
    const totalStock = data.stock
      .filter((s: any) => s.productId === p.id)
      .reduce((sum: number, s: any) => sum + Number(s.quantity), 0);
    return { name: p.name, stock: totalStock };
  });

  return (
    <div className="max-w-5xl mx-auto pb-20">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reporte Global del Sistema</h1>
          <p className="text-slate-500">Visualización de datos para impresión</p>
        </div>
        <button 
          onClick={handleDownloadPDF}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-medium"
        >
          <Download size={18} /> Descargar PDF Completo
        </button>
      </div>

      <div ref={reportRef} className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-800">Cooperativa - Reporte de Inventario</h2>
          <p className="text-slate-500">Generado el {new Date().toLocaleDateString()}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">
            <h3 className="text-sm font-semibold text-slate-500">Total Productos</h3>
            <p className="text-3xl font-bold text-blue-600">{data.products.length}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">
            <h3 className="text-sm font-semibold text-slate-500">Total Almacenes</h3>
            <p className="text-3xl font-bold text-emerald-600">{data.warehouses.length}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">
            <h3 className="text-sm font-semibold text-slate-500">Movimientos</h3>
            <p className="text-3xl font-bold text-amber-600">{data.movements.length}</p>
          </div>
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-100 text-center">
            <h3 className="text-sm font-semibold text-slate-500">Categorías</h3>
            <p className="text-3xl font-bold text-purple-600">{data.categories.length}</p>
          </div>
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-bold text-slate-800 mb-4">Stock Total por Producto</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockByProduct}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="stock" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
