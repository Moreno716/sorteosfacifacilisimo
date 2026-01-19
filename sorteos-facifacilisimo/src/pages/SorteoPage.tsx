import { useEffect, useRef, useState } from 'react';
import CommentsTable from '../components/CommentsTable';
import Filters from '../components/Filters';
import FiltersFacebook from '../components/FiltersFacebook';
import WinnerDialog from '../components/WinnerDialog';
import Countdown from '../components/Countdown';
import { parseComments, parseCommentsFacebook, type CommentBlock } from '../utils/commentParser';
import { Toast } from 'primereact/toast';
import { useNavigate } from 'react-router-dom';

function getPermutations(str: string): string[] {
  if (str.length <= 1) return [str];
  const perms: string[] = [];
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const rest = str.slice(0, i) + str.slice(i + 1);
    for (const perm of getPermutations(rest)) {
      perms.push(char + perm);
    }
  }
  return Array.from(new Set(perms));
}

// Función para formatear números con separadores de miles
const formatNumber = (num: number): string => {
  return num.toLocaleString('es-ES');
};

const SorteoPage = () => {
  const [comments, setComments] = useState<CommentBlock[]>([]);
  const [winners, setWinners] = useState<CommentBlock[]>([]);
  const [dialogVisible, setDialogVisible] = useState(false);
  const [showCountdown, setShowCountdown] = useState(false);
  const [sorteoTitulo, setSorteoTitulo] = useState('');
  const toast = useRef<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [platform, setPlatform] = useState<'instagram' | 'facebook' | 'ambos' | 'nombres'>('instagram');
  const [activeFilter, setActiveFilter] = useState<'instagram' | 'facebook' | 'ambos' | 'nombres'>('ambos');
  const [commentsInstagram, setCommentsInstagram] = useState<CommentBlock[]>([]);
  const [commentsFacebook, setCommentsFacebook] = useState<CommentBlock[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const img = localStorage.getItem('imagenPublicacion');
    const plat = localStorage.getItem('plataforma') as 'instagram' | 'facebook' | 'ambos' | 'nombres';
    if (img && img.trim() !== "") {
      setImageUrl(img);
    } else {
      setImageUrl(null);
    }
  
    setPlatform(plat || 'instagram');
    if (plat === 'ambos') {
      const contentIG = localStorage.getItem('comentarios_instagram') || '';
      const contentFB = localStorage.getItem('comentarios_facebook') || '';
      const parsedIG = parseComments(contentIG).map(c => ({ ...c, platform: 'instagram' }));
      const parsedFB = parseCommentsFacebook(contentFB).map(c => ({ ...c, platform: 'facebook' }));
      setCommentsInstagram(parsedIG);
      setCommentsFacebook(parsedFB);
      setComments([...parsedIG, ...parsedFB]);
      setActiveFilter('ambos');
    } else if (plat === 'nombres') {
      const nombresContent = localStorage.getItem('lista_nombres') || '';
      if (nombresContent) {
        // Procesar cada línea y separar por comas también
        const nombresList = nombresContent
          .split('\n')
          .flatMap(line => line.split(','))
          .map(name => name.trim())
          .filter(name => name.length > 0);
        
        // Crear objetos CommentBlock para cada nombre individual
        const nombresComments: CommentBlock[] = nombresList.map((nombre) => ({
          username: nombre,
          comment: `Nombre en lista: ${nombre}`,
          date: new Date().toLocaleDateString('es-ES'),
          rawBlock: `${nombre}\n${new Date().toLocaleDateString('es-ES')}\nNombre en lista: ${nombre}`
        }));
        
        setComments(nombresComments);
      }
    } else {
      const content = localStorage.getItem('comentarios');
      if (plat === 'facebook') {
        const parsed = parseCommentsFacebook(content || '').map(c => ({ ...c, platform: 'facebook' }));
        setComments(parsed);
      } else {
        const parsed = parseComments(content || '').map(c => ({ ...c, platform: 'instagram' }));
        setComments(parsed);
      }
      setActiveFilter(plat || 'instagram');
    }
  }, []);

  // Permite filtrar por solo IG, solo FB o ambos (opcional, puedes quitar el selector si no lo quieres)
  useEffect(() => {
    if (platform === 'ambos') {
      if (activeFilter === 'instagram') {
        setComments(commentsInstagram);
      } else if (activeFilter === 'facebook') {
        setComments(commentsFacebook);
      } else {
        setComments([...commentsInstagram, ...commentsFacebook]);
      }
    }
  }, [activeFilter, platform, commentsInstagram, commentsFacebook]);

  const handleSearch = (query: string, type: string, orden: boolean, maxWinners: number) => {
    setSearchTerm(query);
    
    if (type !== 'aleatorio' && !query) {
      toast.current?.show({ severity: 'warn', summary: 'Búsqueda vacía', detail: 'Ingresa un criterio de búsqueda.', life: 2500 });
      return;
    }

    let found: CommentBlock[] = [];
    if (type === 'aleatorio') {
      // Selección aleatoria sin repetir
      const shuffled = [...comments].sort(() => 0.5 - Math.random());
      found = shuffled.slice(0, maxWinners);
    } else if (type === 'numero') {
      if (orden) {
        found = comments.filter(c => c.comment.replace(/\s/g, '').includes(query));
      } else {
        const perms = getPermutations(query);
        found = comments.filter(c =>
          perms.some(perm => c.comment.replace(/\s/g, '').includes(perm))
        );
      }
    } else if (type === 'palabra') {
      found = comments.filter(c => c.comment.toLowerCase().includes(query.toLowerCase()));
    } else if (type === 'marcador') {
      found = comments.filter(c => c.comment.includes(query));
    }

    if (found.length > 0) {
      setWinners(found.slice(0, maxWinners));
      localStorage.setItem('ganadores', JSON.stringify(found.slice(0, maxWinners)));
      localStorage.setItem('criterioBusqueda', JSON.stringify({
        tipo: type,
        valor: query
      }));
      localStorage.setItem('sorteoTitulo', sorteoTitulo);
      setShowCountdown(true);
    } else {
      setWinners([]);
      setDialogVisible(false); // No mostrar el modal si no hay ganadores
      toast.current?.show({ severity: 'warn', summary: 'Sin coincidencias', detail: 'No se encontró ningún comentario que coincida.', life: 2500 });
    }
  };

  const handleCountdownComplete = () => {
    setShowCountdown(false);
    navigate('/ganadores');
    toast.current?.show({ severity: 'success', summary: '¡Ganadores encontrados!', detail: `Se encontraron ${winners.length} comentarios que coinciden.`, life: 2500 });
  };

  const handleFilterTypeChange = () => {
    // Filter type change handled by the filter components
  };

  const totalComentarios = comments.length;
  const usuariosUnicos = new Set(comments.map(c => c.username)).size;

  return (
  <div className="w-full min-h-screen bg-gradient-to-br from-blue-900 via-gray-900 to-yellow-100 py-4 sm:py-6 px-2 overflow-x-hidden">
    <Toast ref={toast} position="top-center" />

    {showCountdown && <Countdown onComplete={handleCountdownComplete} />}

    {/* Header */}
    <div className="max-w-7xl mx-auto mb-6 sm:mb-8">
      <div className="text-center mb-4 sm:mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
          🎯 Sorteo Facilísimo
        </h1>
        <p className="text-gray-300 text-base sm:text-lg">
          Encuentra ganadores de forma rápida y transparente
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {[ 
          { label: 'Comentarios', value: formatNumber(totalComentarios), color: 'blue' },
          { label: 'Usuarios', value: formatNumber(usuariosUnicos), color: 'green' },
          { label: 'Ganadores', value: formatNumber(winners.length), color: 'yellow' },
          { label: 'Buscado', value: searchTerm || '-', color: 'purple' },
        ].map((stat, i) => (
          <div
            key={i}
            className={`bg-${stat.color}-600/80 text-white text-center rounded-xl p-3 sm:p-4 border-2`}
          >
            <div className="text-xl sm:text-2xl font-bold">{stat.value}</div>
            <div className="text-xs sm:text-sm">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>

    {/* Layout principal */}
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-6 sm:mb-8">

      {/* FILTROS */}
      <div className="bg-gray-900/90 rounded-2xl border-2 border-yellow-400 shadow-xl p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 sm:mb-6 text-center">
          🎯 Buscar Ganadores
        </h2>

        {/* Título */}
        <div className="mb-4 sm:mb-6">
          <label className="block text-white font-semibold mb-2 text-center">
            📝 Título del Sorteo
          </label>
          <input
            type="text"
            value={sorteoTitulo}
            onChange={(e) => setSorteoTitulo(e.target.value)}
            className="w-full px-4 py-2 sm:py-3 rounded-xl bg-gray-800 border-2 border-gray-700 focus:border-yellow-400 text-white text-sm sm:text-base text-center"
          />
        </div>

        {/* Imagen */}
        {imageUrl && (
          <div className="mb-4 sm:mb-6 flex justify-center">
            <img
              src={imageUrl}
              alt="Publicación"
              className="max-w-[200px] sm:max-w-xs rounded-xl border-2 border-blue-400"
            />
          </div>
        )}

        {/* Botones plataforma */}
        {platform === 'ambos' && (
          <div className="mb-4 flex gap-2 justify-center flex-wrap">
            {['ambos', 'instagram', 'facebook'].map((p) => (
              <button
                key={p}
                onClick={() => setActiveFilter(p as any)}
                className={`px-3 py-2 rounded-lg text-sm font-bold border-2 transition
                  ${activeFilter === p
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-800 text-white border-gray-600'}`}
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Filtros */}
        <div className="bg-gray-800/50 rounded-xl p-3 sm:p-4">
          {platform === 'facebook' ? (
            <FiltersFacebook onSearch={handleSearch} onFilterTypeChange={handleFilterTypeChange} />
          ) : (
            <Filters onSearch={handleSearch} onFilterTypeChange={handleFilterTypeChange} />
          )}
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-gray-900/90 rounded-2xl border-2 border-blue-400 shadow-xl p-4 sm:p-6 flex flex-col h-[70vh] sm:h-[80vh]">
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-4 text-center">
            📝 Comentarios ({formatNumber(totalComentarios)})
          </h2>

          {/* CONTENEDOR SCROLL REAL */}
          <div className="flex-1 overflow-y-auto">
            <div className="overflow-x-auto sm:overflow-x-visible">
              <CommentsTable comments={comments} />
            </div>
          </div>
        </div>
    </div>

    {/* Footer */}
    <footer className="text-gray-400 text-xs sm:text-sm text-center pb-4">
      &copy; {new Date().getFullYear()} Sorteos Facilísimo
    </footer>
  </div>
);
}
export default SorteoPage;