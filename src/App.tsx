/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, Palette, Copy, Check, Snowflake, Search, Cat, Sun, Moon, ExternalLink, Heart, History, X, Trash2 } from 'lucide-react';

const ALT_IMAGES = [
  `${import.meta.env.BASE_URL}assets/catblimp.gif`,
  `${import.meta.env.BASE_URL}assets/mion.avif`,
  `${import.meta.env.BASE_URL}assets/mion2.avif`,
  `${import.meta.env.BASE_URL}assets/nasral.avif`,
  `${import.meta.env.BASE_URL}assets/taa.avif`
];

type ThemePalette = {
  primary: string;
  primaryText: string;
  bg: string;
  surface: string;
  border: string;
  text: string;
  accent: string;
};

type Theme = {
  name: string;
  id: string;
  light: ThemePalette;
  dark: ThemePalette;
};

const getLuminance = (hex: string) => {
  const rgb = parseInt(hex.replace('#', ''), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >>  8) & 0xff;
  const b = (rgb >>  0) & 0xff;
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
};

const hexToHSL = (hex: string) => {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
};

const generatePalette = (color: string, isDark: boolean): ThemePalette => {
  const { h, s, l } = hexToHSL(color);
  const lum = getLuminance(color);
  const primaryText = lum > 0.5 ? '#000000' : '#ffffff';
  
  const accentL = isDark ? Math.max(l, 65) : Math.min(l, 35);
  const accent = `hsl(${h}, ${s}%, ${accentL}%)`;

  if (isDark) {
    return {
      primary: color,
      primaryText,
      bg: `hsl(${h}, ${s * 0.3}%, 8%)`,
      surface: `hsl(${h}, ${s * 0.3}%, 14%)`,
      border: `hsl(${h}, ${s * 0.3}%, 22%)`,
      text: `hsl(${h}, ${s * 0.3}%, 95%)`,
      accent
    };
  } else {
    return {
      primary: color,
      primaryText,
      bg: `hsl(${h}, ${s * 0.3}%, 96%)`,
      surface: `hsl(${h}, ${s * 0.3}%, 90%)`,
      border: `hsl(${h}, ${s * 0.3}%, 80%)`,
      text: `hsl(${h}, ${s * 0.3}%, 10%)`,
      accent
    };
  }
};

const THEMES_BASE = [
  { name: 'Classic', id: 'classic', color: '#606230' },
  { name: 'Soft Kitty', id: 'soft-kitty', color: '#e57373' },
  { name: 'Lavender Purr', id: 'lavender', color: '#9c27b0' },
  { name: 'Minty Paws', id: 'mint', color: '#059669' },
  { name: 'Warm Latte', id: 'latte', color: '#8b5a2b' },
  { name: 'Ocean', id: 'ocean', color: '#0284c7' },
  { name: 'Monochrome', id: 'mono', color: '#888888' }
];

const THEMES: Theme[] = THEMES_BASE.map(base => ({
  name: base.name,
  id: base.id,
  light: generatePalette(base.color, false),
  dark: generatePalette(base.color, true)
}));

const generateCustomTheme = (color: string): Theme => ({
  name: 'Custom',
  id: 'custom',
  light: generatePalette(color, false),
  dark: generatePalette(color, true)
});

type CatRecord = { id: string; url: string; addedAt: number };

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme-mode') !== 'light');
  const [customColor, setCustomColor] = useState(() => localStorage.getItem('custom-color') || '#a855f7');
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[0]);
  const [isSnowEnabled, setIsSnowEnabled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [catText, setCatText] = useState('');
  const [catUrl, setCatUrl] = useState<string | null>(null);
  const [pendingCatUrl, setPendingCatUrl] = useState<string | null>(null);
  const [isCatLoading, setIsCatLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Ловим кота...');
  const [leftImgIndex, setLeftImgIndex] = useState(0);
  const [rightImgIndex, setRightImgIndex] = useState(0);
  const [snowflakes, setSnowflakes] = useState<{ id: number; left: string; delay: string; duration: string }[]>([]);
  const [favorites, setFavorites] = useState<CatRecord[]>(() => JSON.parse(localStorage.getItem('cat-favorites') || '[]'));
  const [history, setHistory] = useState<CatRecord[]>(() => JSON.parse(localStorage.getItem('cat-history') || '[]'));
  const [showFavorites, setShowFavorites] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showBlimpHint, setShowBlimpHint] = useState(() => localStorage.getItem('hide-blimp-hint') !== 'true');

  const catOutputRef = useRef<HTMLDivElement>(null);

  // Initialize theme and snowflakes
  useEffect(() => {
    const savedThemeId = localStorage.getItem('theme-id');
    if (savedThemeId === 'custom') {
      setCurrentTheme(generateCustomTheme(localStorage.getItem('custom-color') || '#a855f7'));
    } else if (savedThemeId) {
      const theme = THEMES.find(t => t.id === savedThemeId);
      if (theme) setCurrentTheme(theme);
    }

    const initialSnowflakes = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 10}s`,
      duration: `${10 + Math.random() * 10}s`
    }));
    setSnowflakes(initialSnowflakes);
  }, []);

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value;
    setCustomColor(color);
    localStorage.setItem('custom-color', color);
    setCurrentTheme(generateCustomTheme(color));
  };

  useEffect(() => {
    localStorage.setItem('theme-id', currentTheme.id);
    localStorage.setItem('theme-mode', isDarkMode ? 'dark' : 'light');
    
    const palette = isDarkMode ? currentTheme.dark : currentTheme.light;
    const root = document.documentElement;
    root.style.setProperty('--primary', palette.primary);
    root.style.setProperty('--primary-text', palette.primaryText);
    root.style.setProperty('--bg', palette.bg);
    root.style.setProperty('--surface', palette.surface);
    root.style.setProperty('--border', palette.border);
    root.style.setProperty('--text', palette.text);
    root.style.setProperty('--accent', palette.accent);
  }, [currentTheme, isDarkMode]);

  useEffect(() => { localStorage.setItem('cat-favorites', JSON.stringify(favorites)); }, [favorites]);
  useEffect(() => { localStorage.setItem('cat-history', JSON.stringify(history)); }, [history]);

  useEffect(() => {
    if (catUrl) {
      setHistory(prev => {
        if (prev.length > 0 && prev[0].url === catUrl) return prev;
        return [{ id: catUrl, url: catUrl, addedAt: Date.now() }, ...prev].slice(0, 15);
      });
    }
  }, [catUrl]);

  const toggleFavorite = () => {
    if (!catUrl) return;
    setFavorites(prev => {
      if (prev.some(f => f.url === catUrl)) return prev.filter(f => f.url !== catUrl);
      return [{ id: catUrl, url: catUrl, addedAt: Date.now() }, ...prev];
    });
  };
  const isCurrentFavorite = favorites.some(f => f.url === catUrl);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      alert('Черкани сначала чё-нить');
      return;
    }
    window.location.href = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}&btnI`;
  };

  const LOADING_MESSAGES = [
    'Ловим кота...', 'Кормим кота...', 'Ищем коробку...', 'Точим когти...', 'Мурчим...', 'Спим 18 часов...', 'Уронили вазу...', 'Тыгыдык в 3 ночи...',
    'Гладим пузико...', 'Открываем банку с тунцом...', 'Прячемся в пакет...', 'Смотрим в стену...', 'Охотимся на муху...', 'Кусаем за пятку...',
    'Требуем еду...', 'Скидываем ручку со стола...', 'Закапываем лоток...', 'Сидим на клавиатуре...', 'Мешаем работать...', 'Ловим лазерную указку...',
    'Вылизываемся...', 'Спим на чистом белье...', 'Орем под дверью...', 'Игнорируем хозяина...', 'Застреваем в шторе...', 'Нюхаем валерьянку...',
    'Делаем кусь...', 'Смотрим с презрением...', 'Спим в раковине...', 'Грызем провода...', 'Охотимся на ноги...', 'Спим на батарее...',
    'Просим открыть дверь и не выходим...', 'Смотрим в окно на птичек...', 'Шуршим пакетом в 4 утра...', 'Воруем сосиску...', 'Спим в странной позе...',
    'Делаем массаж лапками...', 'Захватываем мир...', 'Ждем весну...'
  ];

  const generateCat = async (withText: boolean) => {
    if (withText && !catText.trim()) {
      alert('Черкани сначала чё-нить');
      return;
    }

    setIsCatLoading(true);
    setLoadingMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
    
    try {
      // Fetch JSON to get a unique ID for the cat
      const response = await fetch(`https://cataas.com/cat${withText ? `/says/${encodeURIComponent(catText)}` : ''}?json=true&t=${Date.now()}`);
      const data = await response.json();
      
      // The API returns 'id', not '_id'
      if (data && (data.id || data._id)) {
        const catId = data.id || data._id;
        const finalUrl = `https://cataas.com/cat/${catId}${withText ? `/says/${encodeURIComponent(catText)}` : ''}`;
        setPendingCatUrl(finalUrl);
      } else {
        // Fallback to random if JSON fails
        const fallbackUrl = withText
          ? `https://cataas.com/cat/says/${encodeURIComponent(catText)}?size=50&style=original&t=${Date.now()}`
          : `https://cataas.com/cat?random=${Math.random()}`;
        setPendingCatUrl(fallbackUrl);
      }
    } catch (error) {
      console.error('Error fetching cat JSON:', error);
      const fallbackUrl = withText
        ? `https://cataas.com/cat/says/${encodeURIComponent(catText)}?size=50&style=original&t=${Date.now()}`
        : `https://cataas.com/cat?random=${Math.random()}`;
      setPendingCatUrl(fallbackUrl);
    }
  };

  const handleDownload = async () => {
    if (!catUrl) return;
    try {
      const response = await fetch(catUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cat-${Date.now()}.jpg`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
      window.open(catUrl, '_blank');
    }
  };

  const handleCopyLink = async () => {
    if (!catUrl) return;
    try {
      await navigator.clipboard.writeText(catUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const handlePendingLoad = () => {
    setCatUrl(pendingCatUrl);
    setIsCatLoading(false);
    setPendingCatUrl(null);
  };

  const hideHint = () => {
    if (showBlimpHint) {
      setShowBlimpHint(false);
      localStorage.setItem('hide-blimp-hint', 'true');
    }
  };

  const cycleLeftImg = () => {
    setLeftImgIndex((prev) => (prev + 1) % ALT_IMAGES.length);
    hideHint();
  };
  const cycleRightImg = () => {
    setRightImgIndex((prev) => (prev + 1) % ALT_IMAGES.length);
    hideHint();
  };

  return (
    <div 
      className={`min-h-screen relative overflow-x-hidden pb-20 transition-colors duration-500`}
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text)' }}
    >
      {/* Snowflakes */}
      {isSnowEnabled && snowflakes.map((sf) => (
        <div
          key={sf.id}
          className="snowflake"
          style={{
            left: sf.left,
            animationDelay: sf.delay,
            animationDuration: sf.duration
          }}
        >
          ❄
        </div>
      ))}

      {/* Header */}
      <header className={`py-12 px-5 text-center transition-colors duration-500`} style={{ backgroundColor: 'var(--surface)' }}>
        <div className="flex items-center justify-center gap-5 mb-8 relative">
          <motion.img
            whileHover={{ scale: 1.1, rotate: -5 }}
            whileTap={{ scale: 0.9 }}
            src={ALT_IMAGES[leftImgIndex]}
            alt="Cat Blimp Left"
            className="w-20 h-20 cursor-pointer object-contain relative z-10"
            onClick={cycleLeftImg}
            referrerPolicy="no-referrer"
          />
          <div className="relative">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight drop-shadow-lg relative z-10" style={{ color: 'var(--accent)' }}>
              Клан Насрано
            </h1>
            
            <AnimatePresence>
              {showBlimpHint && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs px-3 py-1.5 rounded-full shadow-lg z-20 pointer-events-none"
                  style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-text)' }}
                >
                  Попробуй нажать на картинки по бокам! ✨
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rotate-45" style={{ backgroundColor: 'var(--primary)' }}></div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <motion.img
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
            src={ALT_IMAGES[rightImgIndex]}
            alt="Cat Blimp Right"
            className="w-20 h-20 cursor-pointer object-contain relative z-10"
            onClick={cycleRightImg}
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 mx-auto max-w-2xl">
          {/* Theme Selector */}
          <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-full backdrop-blur-md">
            <Palette size={18} className="ml-2 opacity-70 text-white" />
            {THEMES.map(theme => {
              const palette = isDarkMode ? theme.dark : theme.light;
              return (
                <button
                  key={theme.id}
                  onClick={() => setCurrentTheme(theme)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${currentTheme.id === theme.id ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'}`}
                  style={{ backgroundColor: palette.primary }}
                  title={theme.name}
                />
              );
            })}
            <div className="w-[1px] h-6 bg-white/20 mx-1"></div>
            <label 
              className={`relative w-8 h-8 rounded-full border-2 transition-all cursor-pointer overflow-hidden ${currentTheme.id === 'custom' ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-50 hover:opacity-100'}`}
              title="Своя тема"
            >
              <div className="absolute inset-0" style={{ background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' }}></div>
              <input 
                type="color" 
                value={customColor}
                onChange={handleCustomColorChange}
                className="absolute opacity-0 w-full h-full cursor-pointer"
              />
            </label>
          </div>

          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:opacity-80`}
            style={{ backgroundColor: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
            title={isDarkMode ? 'Включить светлую тему' : 'Включить темную тему'}
          >
            {isDarkMode ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-indigo-400" />}
          </button>

          <button
            onClick={() => setIsSnowEnabled(!isSnowEnabled)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all hover:opacity-80`}
            style={{ backgroundColor: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
            title={isSnowEnabled ? 'Выключить снег' : 'Включить снег'}
          >
            <Snowflake size={18} className={isSnowEnabled ? 'text-blue-400' : 'opacity-50'} />
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-10 text-center">
        {/* Search Section */}
        <section className="mb-16">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Поиск..."
              className={`w-full max-w-xl p-4 text-lg border rounded-xl outline-none transition-all duration-300 focus:ring-2 focus:ring-opacity-50`}
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
            <button
              onClick={handleSearch}
              className="w-full md:w-auto px-8 py-4 rounded-xl text-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl active:scale-95"
              style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-text)' }}
            >
              <Search size={20} />
              Поиск
            </button>
          </div>
        </section>

        {/* Cat Section */}
        <section className="cat-section">
          <h2 className="text-3xl md:text-4xl font-semibold mb-6 flex items-center justify-center gap-3" style={{ color: 'var(--accent)' }}>
            <Cat size={32} />
            Котики
          </h2>
          <div className="flex flex-col items-center gap-4">
            <input
              type="text"
              value={catText}
              onChange={(e) => setCatText(e.target.value)}
              placeholder="Текст пиши"
              className={`w-full max-w-xl p-4 text-lg border rounded-xl outline-none transition-all duration-300 focus:ring-2 focus:ring-opacity-50`}
              style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--text)' }}
            />
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap justify-center gap-4">
                <button
                  onClick={() => generateCat(true)}
                  className="px-6 py-3 rounded-xl font-medium transition-all shadow-md hover:shadow-lg active:scale-95"
                  style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-text)' }}
                >
                  Котик с текстом
                </button>
                <button
                  onClick={() => generateCat(false)}
                  className="px-6 py-3 rounded-xl font-medium transition-all shadow-md hover:shadow-lg active:scale-95"
                  style={{ backgroundColor: 'var(--primary)', color: 'var(--primary-text)' }}
                >
                  Рандом котик
                </button>
              </div>
              
              <div className="flex flex-wrap justify-center gap-4 mt-2">
                <button
                  onClick={() => setShowFavorites(true)}
                  className="px-4 py-2 rounded-xl font-medium transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2"
                  style={{ backgroundColor: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
                >
                  <Heart size={18} className="text-red-500" /> Избранное ({favorites.length})
                </button>
                <button
                  onClick={() => setShowHistory(true)}
                  className="px-4 py-2 rounded-xl font-medium transition-all shadow-sm hover:shadow-md active:scale-95 flex items-center gap-2"
                  style={{ backgroundColor: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
                >
                  <History size={18} /> История
                </button>
              </div>
            </div>
          </div>

          <div 
            ref={catOutputRef} 
            className="relative mt-10 min-h-[200px] flex items-center justify-center overflow-hidden"
          >
            <div className="grid place-items-center w-full">
              <AnimatePresence>
                {catUrl && (
                  <motion.div
                    key={catUrl}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className="col-start-1 row-start-1 place-self-center relative group rounded-xl overflow-hidden"
                  >
                    <img
                      src={catUrl}
                      alt="Generated Cat"
                      className="max-w-full max-h-[80vh] rounded-xl shadow-2xl block"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                      <button
                        onClick={toggleFavorite}
                        className="p-3 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm shadow-xl"
                        title={isCurrentFavorite ? "Убрать из избранного" : "В избранное"}
                      >
                        <Heart size={20} className={isCurrentFavorite ? "fill-red-500 text-red-500" : ""} />
                      </button>
                      <button
                        onClick={handleCopyLink}
                        className="p-3 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm shadow-xl"
                        title="Копировать ссылку"
                      >
                        {isCopied ? <Check size={20} /> : <Copy size={20} />}
                      </button>
                      <button
                        onClick={handleDownload}
                        className="p-3 bg-black/60 hover:bg-black/80 text-white rounded-full backdrop-blur-sm shadow-xl"
                        title="Скачать котика"
                      >
                        <Download size={20} />
                      </button>
                    </div>

                    {/* Overlay specifically over the image */}
                    {isCatLoading && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/50 backdrop-blur-[4px] rounded-xl"
                      >
                        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4"></div>
                        <p className="text-white font-medium animate-pulse text-center px-4">{loadingMessage}</p>
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Initial Loading State (when no catUrl exists yet) */}
              {!catUrl && isCatLoading && (
                <div className="col-start-1 row-start-1 flex flex-col items-center justify-center min-h-[200px]">
                  <div className="w-12 h-12 border-4 border-gray-400/20 border-t-gray-400 rounded-full animate-spin mb-4"></div>
                  <p className="font-medium animate-pulse" style={{ color: 'var(--text)' }}>{loadingMessage}</p>
                </div>
              )}
            </div>

            {/* Hidden preloader */}
            {pendingCatUrl && (
              <img
                src={pendingCatUrl}
                onLoad={handlePendingLoad}
                className="hidden"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
        </section>

        {/* Modals */}
        <AnimatePresence>
          {(showFavorites || showHistory) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
              onClick={() => { setShowFavorites(false); setShowHistory(false); }}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="w-full max-w-4xl max-h-[80vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
                style={{ backgroundColor: 'var(--bg)', border: '1px solid var(--border)' }}
              >
                <div className="p-5 border-b flex justify-between items-center" style={{ borderColor: 'var(--border)' }}>
                  <h3 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text)' }}>
                    {showFavorites ? <><Heart className="text-red-500 fill-red-500" /> Избранное</> : <><History /> История просмотров</>}
                  </h3>
                  <button onClick={() => { setShowFavorites(false); setShowHistory(false); }} className="p-2 rounded-full hover:bg-white/10 transition-colors" style={{ color: 'var(--text)' }}>
                    <X size={24} />
                  </button>
                </div>
                <div className="p-5 overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {(showFavorites ? favorites : history).map(item => (
                    <div key={item.addedAt} className="relative group aspect-square rounded-xl overflow-hidden bg-black/10 cursor-pointer" onClick={() => { setCatUrl(item.url); setShowFavorites(false); setShowHistory(false); }}>
                      <img src={item.url} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" referrerPolicy="no-referrer" />
                      {showFavorites && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setFavorites(prev => prev.filter(f => f.url !== item.url));
                          }}
                          className="absolute top-2 right-2 p-2 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                  {(showFavorites ? favorites : history).length === 0 && (
                    <div className="col-span-full py-20 text-center opacity-50" style={{ color: 'var(--text)' }}>
                      Тут пока пусто :(
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className={`absolute bottom-0 w-full p-8 text-center text-sm transition-colors duration-500`} style={{ backgroundColor: 'var(--surface)' }}>
        <div className="opacity-70 flex flex-col items-center gap-2">
          <p>
            © {new Date().getFullYear()} Сделано с любовью к котикам 🐾{' '}
            <a
              href="http://www.constitution.ru/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold hover:underline inline-flex items-center gap-1"
              style={{ color: 'var(--accent)' }}
            >
              Политика конфиденциальности <ExternalLink size={12} />
            </a>
          </p>
          <p className="text-xs opacity-80">
            Котики любезно предоставлены бесплатным API <a href="https://cataas.com/" target="_blank" rel="noopener noreferrer" className="hover:underline font-medium" style={{ color: 'var(--accent)' }}>CATAAS</a> 🐈
          </p>
        </div>
      </footer>
    </div>
  );
}
