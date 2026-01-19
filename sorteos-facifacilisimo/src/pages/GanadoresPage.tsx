import Confetti from 'react-confetti';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Toast } from 'primereact/toast';

// Utilidad para convertir una imagen pública a base64
async function getBase64FromUrl(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const GanadoresPage = () => {
  const [ganadores, setGanadores] = useState<any[]>([]);
  const navigate = useNavigate();
  const [criterio, setCriterio] = useState<{ tipo: string, valor: string } | null>(null);
  const [sorteoTitulo, setSorteoTitulo] = useState<string>('');
  const [logoBase64, setLogoBase64] = useState<string | null>(null);
  const [iconBase64, setIconBase64] = useState<string | null>(null);
  const [footerLogoBase64, setFooterLogoBase64] = useState<string | null>(null);
  const toast = useRef<Toast>(null);

  useEffect(() => {
    const data = localStorage.getItem('ganadores');
    if (data) {
      setGanadores(JSON.parse(data));
    } else {
      navigate('/sorteo');
    }
    const crit = localStorage.getItem('criterioBusqueda');
    if (crit) setCriterio(JSON.parse(crit));
    
    // Obtener el título del sorteo
    const titulo = localStorage.getItem('sorteoTitulo') || 'Ganadores del Sorteo';
    setSorteoTitulo(titulo);
    
    // Carga logo e icono para el PDF
    getBase64FromUrl('/images/LOGO-FACILÍSIMO-.png').then(setLogoBase64);
    getBase64FromUrl('/images/Logo_opacidad.png').then(setIconBase64); // Marca de agua de fondo
    getBase64FromUrl('/images/logoo.png').then(setFooterLogoBase64);   // Logo del footer
  }, [navigate]);

  const handleExportPDF = () => {
    if (ganadores.length && logoBase64 && iconBase64) {
      const doc = new jsPDF();
      // --- Marca de agua de fondo (aún más grande) ---
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const imgWidth = pageWidth * 1.5; 
      const imgHeight = pageHeight * 0.7; 
      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;
      // Opacidad tipo marca de agua
      // @ts-ignore
      if (typeof doc.setGState === 'function' && doc.context2d?.createGState) {
        // @ts-ignore
        const gState = doc.context2d.createGState();
        gState.opacity = 0.15;
        // @ts-ignore
        doc.setGState(gState);
        doc.addImage(iconBase64, 'PNG', x, y, imgWidth, imgHeight);
        gState.opacity = 1;
        // @ts-ignore
        doc.setGState(gState);
      } else {
        doc.addImage(iconBase64, 'PNG', x, y, imgWidth, imgHeight);
      }
      // --- Ahora el resto del contenido (header, tabla, footer) ---
      doc.setFillColor(255, 221, 51); // Amarillo Facilísimo
      doc.rect(0, 0, 210, 40, 'F');
      if (logoBase64) {
        doc.addImage(logoBase64, 'PNG', 5, 8, 60, 25);
      }
      doc.setFontSize(25);
      doc.setTextColor(33, 37, 41);
      doc.text(sorteoTitulo, 70, 20);
      
      // Agregar fecha del día
      const fechaActual = new Date().toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const horaActual = new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      doc.setFontSize(12);
      doc.setTextColor(33, 37, 41);
      doc.text(`Fecha: ${fechaActual} - ${horaActual}`, 70, 35);
      autoTable(doc, {
        startY: 50,
        head: [['#', 'Usuario', 'Comentario', 'Plataforma']],
        body: ganadores.map((w, i) => [
          i + 1,
          w.username,
          w.comment.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF]+|[\u2011-\u26FF]|\uD83D[\uDE00-\uDE4F])/g, ''),
          w.platform ? (w.platform === 'instagram' ? 'Instagram' : 'Facebook') : ''
        ]),
        styles: {
          fontSize: 10,
          cellPadding: 4,
          halign: 'left',
        },
        headStyles: {
          fillColor: [33, 37, 41], // Azul oscuro
          textColor: [255, 221, 51], // Amarillo
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245], // Gris claro
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 12 },
          1: { cellWidth: 40 },
          2: { cellWidth: 80 },
          3: { cellWidth: 30, halign: 'center' },
        },
        margin: { left: 10, right: 10 },
      });
      doc.setFillColor(33, 37, 41); // Azul oscuro
      doc.rect(0, pageHeight - 20, 210, 20, 'F');
      if (footerLogoBase64) {
        doc.addImage(footerLogoBase64, 'PNG', 10, pageHeight - 18, 12, 12);
      }
             doc.setFontSize(12);
       doc.setTextColor(255, 221, 51);
       doc.text('Sorteos FaciFacilísimo - ¡Tu sorteo, fácil y transparente!', 25, pageHeight - 8);
       
       // Generar nombre de archivo con fecha y hora
       const fecha = new Date();
       const yyyy = fecha.getFullYear();
       const mm = String(fecha.getMonth() + 1).padStart(2, '0');
       const dd = String(fecha.getDate()).padStart(2, '0');
       const hh = String(fecha.getHours()).padStart(2, '0');
       const min = String(fecha.getMinutes()).padStart(2, '0');

       const nombreArchivo = `Ganadores_Sorteo_${yyyy}-${mm}-${dd}_${hh}-${min}.pdf`;
       doc.save(nombreArchivo);
       toast.current?.show({ severity: 'success', summary: '¡Éxito!', detail: 'PDF guardado exitosamente', life: 2500 });
    }
  };

  return (
    <div className="w-full min-h-screen relative bg-gradient-to-br from-blue-900 via-gray-900 to-yellow-100 overflow-hidden">
      <Toast ref={toast} position="top-right" />
      <div className="flex justify-center px-1 py-1 bg-transparent relative overflow-x-hidden">
      {/* Confetti al frente */}
      <div className="fixed inset-0 pointer-events-none z-50">
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          numberOfPieces={200}
          recycle={true}
        />
      </div>
      <div className="max-w-2xl w-full bg-gray-900/90 rounded-3xl shadow-2xl p-4 flex flex-col items-center max-h-[80vh] overflow-hidden mt-4 md:mt-8 border-4 border-yellow-400 shadow-xl">
        {criterio && (
          <div className="flex flex-col items-center mb-4">
            <h2 className="text-xl font-bold mb-2 text-white tracking-wide uppercase text-center">
              🎉 {sorteoTitulo} 🎉
            </h2>
            <div className="flex gap-4">
              {criterio.valor.split('').map((char, idx) => (
                <div
                  key={idx}
                  className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-full bg-yellow-400 text-black text-2xl md:text-3xl font-extrabold shadow-xl border-4 border-blue-900"
                >
                  {char}
                </div>
              ))}
            </div>
          </div>
        )}
        
        <ul className="mb-4 w-full max-w-md overflow-y-auto" style={{ maxHeight: '32vh' }}>
          {ganadores.map((winner, idx) => (
            <li
              key={idx}
              className="mb-3 border-b border-gray-700 pb-3 flex flex-col items-center text-center"
            >
              {/* Nombre */}
              <span className="font-bold text-base text-blue-400">
                {idx + 1}. {winner.username}
              </span>

              {/* Plataforma */}
              {winner.platform && (
                <span className="mt-1 text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-800 font-semibold">
                  {winner.platform === 'instagram' ? 'Instagram' : 'Facebook'}
                </span>
              )}

              {/* Comentario */}
              <div className="mt-2 text-gray-200 text-sm">
                {winner.comment}
              </div>
            </li>
          ))}
        </ul>
        <button
          className="bg-yellow-400 text-blue-900 px-6 py-2 rounded-2xl font-bold text-base hover:bg-yellow-500 transition mb-4 w-full max-w-xs shadow-md border-2 border-yellow-300 "
          onClick={handleExportPDF}
          disabled={!logoBase64 || !iconBase64}
        >
          Guardar y compartir
        </button>
        <hr className="w-full border-gray-700 my-2" />
        <div className="flex flex-col sm:flex-row gap-3 mt-2 w-full max-w-xs mx-auto justify-center items-center">
        <button
            className="inline-flex items-center gap-2 bg-blue-800 text-white font-medium text-sm px-3 py-1.5 rounded-full border border-blue-900 hover:bg-blue-900 hover:shadow-md transition-all duration-200"
            onClick={() => navigate('/sorteo')}
          >
            <i className="pi pi-refresh text-sm" /> Volver al sorteo
          </button>
          <button
            className="inline-flex items-center gap-2 bg-white text-blue-800 font-medium text-sm px-3 py-1.5 rounded-full border border-blue-800 hover:bg-blue-50 hover:text-blue-900 transition-all duration-200 shadow-sm hover:shadow-md"
            onClick={() => navigate('/')}
          >
          <i className="pi pi-home text-sm" /> Volver al inicio
        </button>
        </div>
      </div>
    </div>
    </div>
  );
};

export default GanadoresPage;