import React, { useState, useMemo, useEffect, useRef, useCallback, createElement } from 'react';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calculator, TrendingUp, PieChart as PieIcon, BookOpen, BrainCircuit, BarChartHorizontal, Award, RefreshCw, Check, X, Menu, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { gsap } from 'gsap';
import { InertiaPlugin } from 'gsap/InertiaPlugin';

gsap.registerPlugin(InertiaPlugin);

// Utility functions untuk DotGrid
const throttle = (func, limit) => {
  let lastCall = 0;
  return function (...args) {
    const now = performance.now();
    if (now - lastCall >= limit) {
      lastCall = now;
      func.apply(this, args);
    }
  };
};

function hexToRgb(hex) {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(m[1], 16),
    g: parseInt(m[2], 16),
    b: parseInt(m[3], 16)
  };
}

// Komponen DotGrid Background
// Komponen DotGrid Background
const DotGrid = ({
  dotSize = 16,
  gap = 32,
  baseColor = '#5227FF',
  activeColor = '#5227FF',
  proximity = 150,
  speedTrigger = 100,
  shockRadius = 250,
  shockStrength = 5,
  maxSpeed = 5000,
  resistance = 750,
  returnDuration = 1.5,
  className = '',
  style
}) => {
  const wrapperRef = useRef(null);
  const canvasRef = useRef(null);
  const dotsRef = useRef([]);
  const pointerRef = useRef({
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    speed: 0,
    lastTime: 0,
    lastX: 0,
    lastY: 0
  });

  const baseRgb = useMemo(() => hexToRgb(baseColor), [baseColor]);
  const activeRgb = useMemo(() => hexToRgb(activeColor), [activeColor]);

  const circlePath = useMemo(() => {
    if (typeof window === 'undefined' || !window.Path2D) return null;
    const p = new Path2D();
    p.arc(0, 0, dotSize / 2, 0, Math.PI * 2);
    return p;
  }, [dotSize]);

  const buildGrid = useCallback(() => {
    const wrap = wrapperRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;

    const { width, height } = wrap.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.scale(dpr, dpr);

    const cols = Math.floor((width + gap) / (dotSize + gap));
    const rows = Math.floor((height + gap) / (dotSize + gap));
    const cell = dotSize + gap;

    const gridW = cell * cols - gap;
    const gridH = cell * rows - gap;

    const extraX = width - gridW;
    const extraY = height - gridH;

    const startX = extraX / 2 + dotSize / 2;
    const startY = extraY / 2 + dotSize / 2;

    const dots = [];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const cx = startX + x * cell;
        const cy = startY + y * cell;
        dots.push({ cx, cy, xOffset: 0, yOffset: 0, _inertiaApplied: false });
      }
    }
    dotsRef.current = dots;
  }, [dotSize, gap]);

  useEffect(() => {
    if (!circlePath) return;

    let rafId;
    const proxSq = proximity * proximity;

    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const { x: px, y: py } = pointerRef.current;

      for (const dot of dotsRef.current) {
        const ox = dot.cx + dot.xOffset;
        const oy = dot.cy + dot.yOffset;
        const dx = dot.cx - px;
        const dy = dot.cy - py;
        const dsq = dx * dx + dy * dy;

        let style = baseColor;
        if (dsq <= proxSq) {
          const dist = Math.sqrt(dsq);
          const t = 1 - dist / proximity;
          const r = Math.round(baseRgb.r + (activeRgb.r - baseRgb.r) * t);
          const g = Math.round(baseRgb.g + (activeRgb.g - baseRgb.g) * t);
          const b = Math.round(baseRgb.b + (activeRgb.b - baseRgb.b) * t);
          style = `rgb(${r},${g},${b})`;
        }

        ctx.save();
        ctx.translate(ox, oy);
        ctx.fillStyle = style;
        ctx.fill(circlePath);
        ctx.restore();
      }

      rafId = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafId);
  }, [proximity, baseColor, activeRgb, baseRgb, circlePath]);

  useEffect(() => {
    buildGrid();
    let ro = null;
    if ('ResizeObserver' in window) {
      ro = new ResizeObserver(buildGrid);
      wrapperRef.current && ro.observe(wrapperRef.current);
    } else {
      window.addEventListener('resize', buildGrid);
    }
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener('resize', buildGrid);
    };
  }, [buildGrid]);

  useEffect(() => {
    const onMove = e => {
      const now = performance.now();
      const pr = pointerRef.current;
      const dt = pr.lastTime ? now - pr.lastTime : 16;
      const dx = e.clientX - pr.lastX;
      const dy = e.clientY - pr.lastY;
      let vx = (dx / dt) * 1000;
      let vy = (dy / dt) * 1000;
      let speed = Math.hypot(vx, vy);
      if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        vx *= scale;
        vy *= scale;
        speed = maxSpeed;
      }
      pr.lastTime = now;
      pr.lastX = e.clientX;
      pr.lastY = e.clientY;
      pr.vx = vx;
      pr.vy = vy;
      pr.speed = speed;

      const rect = canvasRef.current.getBoundingClientRect();
      pr.x = e.clientX - rect.left;
      pr.y = e.clientY - rect.top;

      for (const dot of dotsRef.current) {
        const dist = Math.hypot(dot.cx - pr.x, dot.cy - pr.y);
        if (speed > speedTrigger && dist < proximity && !dot._inertiaApplied) {
          dot._inertiaApplied = true;
          gsap.killTweensOf(dot);
          const pushX = dot.cx - pr.x + vx * 0.005;
          const pushY = dot.cy - pr.y + vy * 0.005;
          gsap.to(dot, {
            inertia: { xOffset: pushX, yOffset: pushY, resistance },
            onComplete: () => {
              gsap.to(dot, {
                xOffset: 0,
                yOffset: 0,
                duration: returnDuration,
                ease: 'elastic.out(1,0.75)'
              });
              dot._inertiaApplied = false;
            }
          });
        }
      }
    };

    const onClick = e => {
      const rect = canvasRef.current.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      for (const dot of dotsRef.current) {
        const dist = Math.hypot(dot.cx - cx, dot.cy - cy);
        if (dist < shockRadius && !dot._inertiaApplied) {
          dot._inertiaApplied = true;
          gsap.killTweensOf(dot);
          const falloff = Math.max(0, 1 - dist / shockRadius);
          const pushX = (dot.cx - cx) * shockStrength * falloff;
          const pushY = (dot.cy - cy) * shockStrength * falloff;
          gsap.to(dot, {
            inertia: { xOffset: pushX, yOffset: pushY, resistance },
            onComplete: () => {
              gsap.to(dot, {
                xOffset: 0,
                yOffset: 0,
                duration: returnDuration,
                ease: 'elastic.out(1,0.75)'
              });
              dot._inertiaApplied = false;
            }
          });
        }
      }
    };

    const throttledMove = throttle(onMove, 50);
    window.addEventListener('mousemove', throttledMove, { passive: true });
    window.addEventListener('click', onClick);

    return () => {
      window.removeEventListener('mousemove', throttledMove);
      window.removeEventListener('click', onClick);
    };
  }, [maxSpeed, speedTrigger, proximity, resistance, returnDuration, shockRadius, shockStrength]);

  return (
    <div ref={wrapperRef} className={`absolute inset-0 ${className}`} style={style}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
    </div>
  );
};

// Komponen Confetti
const Confetti = () => {
  const confettiCount = 150;
  const confetti = useMemo(() => {
    return Array.from({ length: confettiCount }).map((_, i) => {
      const style = {
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 5}s`,
        animationDuration: `${Math.random() * 3 + 2}s`,
        backgroundColor: `hsl(${Math.random() * 360}, 70%, 50%)`,
        transform: `rotate(${Math.random() * 360}deg)`
      };
      return <div key={i} className="confetti" style={style}></div>;
    });
  }, []);
  return <div className="confetti-container">{confetti}</div>;
};

// Kalkulator Statistik (Versi lengkap dari file pertama)
const KalkulatorStatistik = () => {
  const [inputValue, setInputValue] = useState('85, 92, 78, 90, 88, 76, 95, 88, 79');
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const hitungStatistik = () => {
    setError('');
    setStats(null);
    const numbers = inputValue
      .split(/[\s,]+/)
      .filter(n => n.trim() !== '')
      .map(Number)
      .filter(n => !isNaN(n));
    if (numbers.length === 0) {
      setError('Input tidak valid. Harap masukkan angka yang valid.');
      return;
    }
    const n = numbers.length;
    const sum = numbers.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    numbers.sort((a, b) => a - b);
    const mid = Math.floor(n / 2);
    const median = n % 2 !== 0 ? numbers[mid] : (numbers[mid - 1] + numbers[mid]) / 2;
    const freqMap = numbers.reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {});
    let maxFreq = 0;
    let modus = [];
    for (const key in freqMap) {
      if (freqMap[key] > maxFreq) {
        maxFreq = freqMap[key];
        modus = [Number(key)];
      } else if (freqMap[key] === maxFreq) {
        modus.push(Number(key));
      }
    }
    const allUnique = Object.values(freqMap).every(freq => freq === 1);
    const modusStr = allUnique && n > 1 ? 'Tidak ada' : modus.join(', ');
    const min = numbers[0];
    const max = numbers[n - 1];

    // === FUNGSI UKURAN LETAK ===
    const calculateQuantile = (position) => {
      if (n === 0) return 'N/A';
      const intPart = Math.floor(position);
      const fracPart = position - intPart;
      if (position < 1) return numbers[0];
      if (intPart >= n) return numbers[n - 1];
      if (fracPart === 0) return numbers[intPart - 1];
      const lower = numbers[intPart - 1];
      const upper = numbers[intPart];
      if (upper === undefined) return lower;
      return lower + fracPart * (upper - lower);
    };

    const q1 = calculateQuantile(1 * (n + 1) / 4);
    const q2 = median;
    const q3 = calculateQuantile(3 * (n + 1) / 4);
    const d7 = calculateQuantile(7 * (n + 1) / 10);
    const p40 = calculateQuantile(40 * (n + 1) / 100);

    setStats({
      count: n,
      sum: sum.toLocaleString('id-ID'),
      mean: mean.toFixed(2),
      median: median.toFixed(2),
      modus: modusStr,
      min: min.toLocaleString('id-ID'),
      max: max.toLocaleString('id-ID'),
      q1: typeof q1 === 'number' ? q1.toFixed(2) : 'N/A',
      q2: typeof q2 === 'number' ? q2.toFixed(2) : 'N/A',
      q3: typeof q3 === 'number' ? q3.toFixed(2) : 'N/A',
      d7: typeof d7 === 'number' ? d7.toFixed(2) : 'N/A',
      p40: typeof p40 === 'number' ? p40.toFixed(2) : 'N/A'
    });
  };

  useEffect(() => {
    hitungStatistik();
  }, []);

  const StatCard = ({ title, value, color }) => {
    const colorClasses = {
      gray: { border: 'border-gray-600', text: 'text-gray-300' },
      blue: { border: 'border-blue-500', text: 'text-blue-400' },
      green: { border: 'border-green-500', text: 'text-green-400' },
      purple: { border: 'border-purple-500', text: 'text-purple-400' }
    };
    const selectedColor = colorClasses[color] || colorClasses.gray;
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={`bg-gray-800/50 p-4 rounded-lg shadow-md border-l-4 ${selectedColor.border}`}
      >
        <h4 className="text-sm font-semibold text-gray-400">{title}</h4>
        <p className={`text-2xl font-bold ${selectedColor.text}`}>{value}</p>
      </motion.div>
    );
  };

  return (
    <div>
      <h2 className="text-2xl sm:text-3xl font-bold mb-4">Kalkulator Statistik Deskriptif</h2>
      <p className="mb-6 text-gray-300">
        Masukkan sekumpulan angka di bawah ini, dipisahkan dengan koma (,), spasi, atau baris baru. Klik "Hitung" untuk melihat hasil analisis statistik dasar.
      </p>
      <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
        <textarea
          className="w-full p-3 border-2 border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition font-mono text-lg bg-gray-800 text-white"
          rows="4"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Contoh: 85, 92, 78, 90, 88, 76, 95, 88, 79"
        />
        <button
          onClick={hitungStatistik}
          className="mt-4 w-full px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition shadow-lg flex items-center justify-center gap-2"
        >
          <Calculator className="w-5 h-5" />
          Hitung Statistik
        </button>
      </div>
      {error && <div className="mt-4 p-4 bg-red-900/50 text-red-200 border border-red-700 rounded-lg">{error}</div>}
      {stats && (
        <div className="mt-8">
          <h3 className="text-2xl font-bold mb-4 text-center">Hasil Analisis</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
            <StatCard title="Jumlah Data (n)" value={stats.count} color="gray" />
            <StatCard title="Total (Σx)" value={stats.sum} color="gray" />
            <StatCard title="Nilai Minimum" value={stats.min} color="blue" />
            <StatCard title="Nilai Maksimum" value={stats.max} color="blue" />
            <StatCard title="Mean (Rata-rata)" value={stats.mean} color="green" />
            <StatCard title="Median" value={stats.median} color="green" />
            <StatCard title="Modus" value={stats.modus} color="green" />
            <StatCard title="Kuartil 1 (Q1)" value={stats.q1} color="purple" />
            <StatCard title="Kuartil 2 (Q2)" value={stats.q2} color="purple" />
            <StatCard title="Kuartil 3 (Q3)" value={stats.q3} color="purple" />
            <StatCard title="Desil 7 (D7)" value={stats.d7} color="blue" />
            <StatCard title="Persentil 40 (P40)" value={stats.p40} color="blue" />
          </div>
        </div>
      )}
    </div>
  );
};

// Komponen BentoCard dan TextType tetap sama seperti file asli
const BentoCard = ({ icon, title, description, onClick }) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
      className="relative bg-gray-900/70 border border-gray-700 rounded-2xl p-5 transition-all duration-300 hover:border-purple-500 hover:shadow-2xl hover:shadow-purple-700/20 cursor-pointer overflow-hidden aspect-[4/3] flex flex-col justify-between group"
      onClick={onClick}
    >
      <div 
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(132, 0, 255, 0.15) 0%, transparent 70%)'
        }} 
      />
      <div className="relative z-10 text-purple-400">
        {icon}
      </div>
      <div className="relative z-10 mt-auto">
        <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
        <p className="text-xs text-gray-400 line-clamp-2">{description}</p>
      </div>
    </motion.div>
  );
};

const TextType = ({
  text,
  as: Component = 'div',
  typingSpeed = 50,
  initialDelay = 0,
  pauseDuration = 2000,
  deletingSpeed = 30,
  loop = true,
  className = '',
  showCursor = true,
  hideCursorWhileTyping = false,
  cursorCharacter = '|',
  cursorClassName = '',
  cursorBlinkDuration = 0.5,
  textColors = [],
  variableSpeed,
  onSentenceComplete,
  startOnVisible = false,
  reverseMode = false,
  ...props
}) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [currentTextIndex, setCurrentTextIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(!startOnVisible);
  const cursorRef = useRef(null);
  const containerRef = useRef(null);
  const textArray = useMemo(() => (Array.isArray(text) ? text : [text]), [text]);
  const getRandomSpeed = useCallback(() => {
    if (!variableSpeed) return typingSpeed;
    const { min, max } = variableSpeed;
    return Math.random() * (max - min) + min;
  }, [variableSpeed, typingSpeed]);
  const getCurrentTextColor = () => {
    if (textColors.length === 0) return;
    return textColors[currentTextIndex % textColors.length];
  };
  useEffect(() => {
    if (!startOnVisible || !containerRef.current) return;
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [startOnVisible]);
  useEffect(() => {
    if (showCursor && cursorRef.current) {
      gsap.set(cursorRef.current, { opacity: 1 });
      gsap.to(cursorRef.current, {
        opacity: 0,
        duration: cursorBlinkDuration,
        repeat: -1,
        yoyo: true,
        ease: 'power2.inOut'
      });
    }
  }, [showCursor, cursorBlinkDuration]);
  useEffect(() => {
    if (!isVisible) return;
    let timeout;
    const currentText = textArray[currentTextIndex];
    const processedText = reverseMode ? currentText.split('').reverse().join('') : currentText;
    const executeTypingAnimation = () => {
      if (isDeleting) {
        if (displayedText === '') {
          setIsDeleting(false);
          if (currentTextIndex === textArray.length - 1 && !loop) {
            return;
          }
          if (onSentenceComplete) {
            onSentenceComplete(textArray[currentTextIndex], currentTextIndex);
          }
          setCurrentTextIndex(prev => (prev + 1) % textArray.length);
          setCurrentCharIndex(0);
          timeout = setTimeout(() => {}, pauseDuration);
        } else {
          timeout = setTimeout(() => {
            setDisplayedText(prev => prev.slice(0, -1));
          }, deletingSpeed);
        }
      } else {
        if (currentCharIndex < processedText.length) {
          timeout = setTimeout(
            () => {
              setDisplayedText(prev => prev + processedText[currentCharIndex]);
              setCurrentCharIndex(prev => prev + 1);
            },
            variableSpeed ? getRandomSpeed() : typingSpeed
          );
        } else if (textArray.length > 1) {
          timeout = setTimeout(() => {
            setIsDeleting(true);
          }, pauseDuration);
        }
      }
    };
    if (currentCharIndex === 0 && !isDeleting && displayedText === '') {
      timeout = setTimeout(executeTypingAnimation, initialDelay);
    } else {
      executeTypingAnimation();
    }
    return () => clearTimeout(timeout);
  }, [
    currentCharIndex,
    displayedText,
    isDeleting,
    typingSpeed,
    deletingSpeed,
    pauseDuration,
    textArray,
    currentTextIndex,
    loop,
    initialDelay,
    isVisible,
    reverseMode,
    variableSpeed,
    onSentenceComplete
  ]);
  const shouldHideCursor =
    hideCursorWhileTyping && (currentCharIndex < textArray[currentTextIndex].length || isDeleting);
  return createElement(
    Component,
    {
      ref: containerRef,
      className: `inline-block whitespace-pre-wrap tracking-tight ${className}`,
      ...props
    },
    <span className="inline" style={{ color: getCurrentTextColor() || 'inherit' }}>
      {displayedText}
    </span>,
    showCursor && (
      <span
        ref={cursorRef}
        className={`ml-1 inline-block opacity-100 ${shouldHideCursor ? 'hidden' : ''} ${cursorClassName}`}
      >
        {cursorCharacter}
      </span>
    )
  );
};

const App = () => {
  const [activeTab, setActiveTab] = useState('home'); 
  const [activeSubMenu, setActiveSubMenu] = useState(null); 
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0); 
  const [userAnswers, setUserAnswers] = useState({});
  const [showResults, setShowResults] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [interactiveData, setInteractiveData] = useState([
    { nilai: 60, frekuensi: 5 },
    { nilai: 70, frekuensi: 8 },
    { nilai: 80, frekuensi: 12 },
    { nilai: 90, frekuensi: 7 },
    { nilai: 100, frekuensi: 3 }
  ]);
  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  // === MATERI TETAP UTUH ===
  const materi = {
    pengenalan: {
      pengertian: {
        title: 'Pengertian Statistika',
        content: `
          <h3 class="text-2xl font-bold mb-4">Apa itu Statistika?</h3>
          <p class="mb-4 text-gray-300">Statistika adalah ilmu yang mempelajari cara mengumpulkan, mengorganisir, menganalisis, menginterpretasi, dan menyajikan data. Statistika membantu kita membuat keputusan berdasarkan data dan memahami pola dalam informasi yang kita miliki.</p>
          <div class="bg-blue-900/30 border border-blue-800 p-4 rounded-lg mb-4">
            <h4 class="font-bold mb-2 text-blue-300">Tujuan Statistika:</h4>
            <ul class="list-disc list-inside space-y-2 text-gray-300">
              <li>Menyajikan data secara ringkas dan informatif</li>
              <li>Membuat kesimpulan dari data sampel</li>
              <li>Membuat prediksi berdasarkan data historis</li>
              <li>Menguji hipotesis dan teori</li>
            </ul>
          </div>
          <h4 class="font-bold text-xl mb-3 mt-6">Jenis-Jenis Statistika</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="border-2 border-blue-700 p-4 rounded-lg bg-gray-800/30">
              <h5 class="font-bold text-lg mb-2 text-blue-300">1. Statistika Deskriptif</h5>
              <p class="text-gray-300">Mendeskripsikan dan meringkas data menggunakan tabel, grafik, dan ukuran-ukuran statistik seperti mean, median, dan modus.</p>
            </div>
            <div class="border-2 border-green-700 p-4 rounded-lg bg-gray-800/30">
              <h5 class="font-bold text-lg mb-2 text-green-300">2. Statistika Inferensial</h5>
              <p class="text-gray-300">Membuat kesimpulan tentang populasi berdasarkan sampel data, termasuk estimasi dan pengujian hipotesis.</p>
            </div>
          </div>
        `
      },
      jenisData: {
        title: 'Jenis-Jenis Data',
        content: `
          <h3 class="text-2xl font-bold mb-4">Klasifikasi Data</h3>
          <div class="mb-6">
            <h4 class="font-bold text-xl mb-3">1. Data Kualitatif (Kategorikal)</h4>
            <div class="bg-purple-900/30 border border-purple-800 p-4 rounded-lg mb-4">
              <p class="mb-3 text-gray-300">Data yang menggambarkan kategori atau karakteristik non-numerik.</p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="bg-gray-800 p-3 rounded shadow-sm">
                  <h5 class="font-bold text-purple-300 mb-2">Data Nominal</h5>
                  <p class="text-sm text-gray-300">Tidak ada urutan: Jenis kelamin, warna mata, agama</p>
                </div>
                <div class="bg-gray-800 p-3 rounded shadow-sm">
                  <h5 class="font-bold text-purple-300 mb-2">Data Ordinal</h5>
                  <p class="text-sm text-gray-300">Ada urutan: Tingkat pendidikan, kepuasan pelanggan</p>
                </div>
              </div>
            </div>
          </div>
          <div class="mb-6">
            <h4 class="font-bold text-xl mb-3">2. Data Kuantitatif (Numerik)</h4>
            <div class="bg-green-900/30 border border-green-800 p-4 rounded-lg mb-4">
              <p class="mb-3 text-gray-300">Data yang dinyatakan dalam bentuk angka.</p>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="bg-gray-800 p-3 rounded shadow-sm">
                  <h5 class="font-bold text-green-300 mb-2">Data Diskrit</h5>
                  <p class="text-sm text-gray-300">Nilai bulat: Jumlah siswa, jumlah mobil</p>
                </div>
                <div class="bg-gray-800 p-3 rounded shadow-sm">
                  <h5 class="font-bold text-green-300 mb-2">Data Kontinu</h5>
                  <p class="text-sm text-gray-300">Nilai pecahan: Tinggi badan, berat badan, suhu</p>
                </div>
              </div>
            </div>
          </div>
        `
      }
    },
    ukuranPemusatan: {
      mean: {
        title: 'Mean (Rata-rata)',
        content: `
          <h3 class="text-2xl font-bold mb-4">Mean (Rata-rata)</h3>
          <div class="bg-blue-900/30 border border-blue-800 p-4 rounded-lg mb-4">
            <p class="font-semibold mb-2 text-gray-300">Mean adalah jumlah semua nilai data dibagi dengan banyaknya data.</p>
            <div class="bg-gray-800 p-3 rounded mt-3 shadow-sm">
              <p class="text-center text-xl font-mono text-white">Mean (x̄) = Σx / n</p>
              <p class="text-center text-sm text-gray-400 mt-2">Σx = jumlah semua data, n = banyak data</p>
            </div>
          </div>
          <h4 class="font-bold text-xl mb-3">Contoh Perhitungan:</h4>
          <div class="bg-gray-800/60 p-4 rounded-lg mb-4 text-gray-300">
            <p class="mb-2">Data nilai ujian: 70, 80, 75, 85, 90</p>
            <p class="mb-2">Mean = (70 + 80 + 75 + 85 + 90) / 5</p>
            <p class="mb-2">Mean = 400 / 5</p>
            <p class="font-bold text-lg text-blue-300">Mean = 80</p>
          </div>
          <div class="border-l-4 border-yellow-600 bg-yellow-900/30 p-4 rounded text-gray-300">
            <h5 class="font-bold mb-2 text-yellow-300">Catatan Penting:</h5>
            <ul class="list-disc list-inside space-y-1 text-sm">
              <li>Mean sensitif terhadap nilai ekstrem (outlier)</li>
              <li>Digunakan untuk data kuantitatif</li>
              <li>Paling sering digunakan dalam analisis statistik</li>
            </ul>
          </div>
        `
      },
      median: {
        title: 'Median (Nilai Tengah)',
        content: `
          <h3 class="text-2xl font-bold mb-4">Median (Nilai Tengah)</h3>
          <div class="bg-green-900/30 border border-green-800 p-4 rounded-lg mb-4">
            <p class="font-semibold mb-2 text-gray-300">Median adalah nilai tengah dari data yang telah diurutkan.</p>
          </div>
          <h4 class="font-bold text-xl mb-3">Cara Menentukan Median:</h4>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div class="bg-blue-900/30 p-4 rounded-lg border border-blue-800">
              <h5 class="font-bold mb-2 text-blue-300">Data Ganjil</h5>
              <p class="text-sm mb-2 text-gray-300">Median = nilai tengah</p>
              <div class="bg-gray-800 p-3 rounded shadow-sm">
                <p class="text-xs text-gray-300">Data: 3, 5, 7, 9, 11</p>
                <p class="font-bold text-blue-300">Median = 7</p>
              </div>
            </div>
            <div class="bg-purple-900/30 p-4 rounded-lg border border-purple-800">
              <h5 class="font-bold mb-2 text-purple-300">Data Genap</h5>
              <p class="text-sm mb-2 text-gray-300">Median = rata-rata 2 nilai tengah</p>
              <div class="bg-gray-800 p-3 rounded shadow-sm">
                <p class="text-xs text-gray-300">Data: 3, 5, 7, 9</p>
                <p class="font-bold text-purple-300">Median = (5+7)/2 = 6</p>
              </div>
            </div>
          </div>
          <div class="border-l-4 border-green-600 bg-green-900/30 p-4 rounded text-gray-300">
            <h5 class="font-bold mb-2 text-green-300">Keunggulan Median:</h5>
            <ul class="list-disc list-inside space-y-1 text-sm">
              <li>Tidak terpengaruh oleh nilai ekstrem</li>
              <li>Cocok untuk data yang tidak simetris</li>
              <li>Mudah dipahami dan dihitung</li>
            </ul>
          </div>
        `
      },
      modus: {
        title: 'Modus (Nilai yang Sering Muncul)',
        content: `
            <h3 class="text-2xl font-bold mb-4">Modus (Nilai yang Sering Muncul)</h3>
            <div class="bg-orange-900/30 border border-orange-800 p-4 rounded-lg mb-4">
              <p class="font-semibold mb-2 text-gray-300">Modus adalah nilai yang paling sering muncul dalam suatu data.</p>
            </div>
            <h4 class="font-bold text-xl mb-3">Jenis Modus:</h4>
            <div class="space-y-4 mb-4">
                <div class="bg-gray-800/60 p-4 rounded-lg border border-gray-700">
                    <h5 class="font-bold mb-2 text-blue-300">Unimodal (Satu Modus)</h5>
                    <p class="text-xs font-mono bg-gray-900 p-2 rounded text-gray-300">Data: 2, 3, 3, 4, 5, 5, <span class="font-bold text-blue-300 p-1 bg-blue-900/50 rounded">5</span>, 6</p>
                    <p class="font-bold mt-2">Modus = 5</p>
                </div>
                <div class="bg-gray-800/60 p-4 rounded-lg border border-gray-700">
                    <h5 class="font-bold mb-2 text-purple-300">Bimodal (Dua Modus)</h5>
                    <p class="text-xs font-mono bg-gray-900 p-2 rounded text-gray-300">Data: 2, <span class="font-bold text-purple-300 p-1 bg-purple-900/50 rounded">3, 3, 3</span>, 4, <span class="font-bold text-purple-300 p-1 bg-purple-900/50 rounded">5, 5, 5</span>, 6</p>
                    <p class="font-bold mt-2">Modus = 3 dan 5</p>
                </div>
                <div class="bg-gray-800/60 p-4 rounded-lg border border-gray-700">
                    <h5 class="font-bold mb-2 text-gray-400">Tanpa Modus</h5>
                    <p class="text-xs font-mono bg-gray-900 p-2 rounded text-gray-300">Data: 1, 2, 3, 4, 5, 6</p>
                    <p class="font-bold mt-2">Tidak ada modus</p>
                </div>
            </div>
            <div class="border-l-4 border-orange-600 bg-orange-900/30 p-4 rounded text-gray-300">
              <h5 class="font-bold mb-2 text-orange-300">Penggunaan Modus:</h5>
              <ul class="list-disc list-inside space-y-1 text-sm">
                <li>Cocok untuk data kualitatif maupun kuantitatif</li>
                <li>Menunjukkan nilai yang paling populer atau umum</li>
                <li>Berguna dalam bisnis untuk mengetahui produk terlaris</li>
              </ul>
            </div>
        `
      }
    },
    ukuranLetak: {
      kuartil: {
        title: 'Kuartil (Data Tunggal)',
        content: `

          <div class="bg-blue-900/30 border border-blue-800 p-4 rounded-lg mb-4">
            <p class="font-semibold mb-2 text-gray-300">Kuartil adalah nilai yang membagi sekumpulan data yang telah diurutkan menjadi empat bagian yang sama besar.</p>
            <ul class="list-disc list-inside mt-2 space-y-1 text-gray-300">
              <li><strong>Kuartil Bawah (Q1):</strong> Membatasi 25% data terbawah</li>
              <li><strong>Kuartil Tengah (Q2):</strong> Sama dengan Median, membagi data menjadi 50%</li>
              <li><strong>Kuartil Atas (Q3):</strong> Membatasi 75% data terbawah (atau 25% data teratas)</li>
            </ul>
          </div>
          <h4 class="font-bold text-xl mb-3">Langkah Menghitung Kuartil (Data Tunggal):</h4>
          <ol class="list-decimal list-inside space-y-2 mb-4 bg-gray-800/60 p-4 rounded-lg text-gray-300">
            <li>Urutkan data dari yang terkecil hingga terbesar.</li>
            <li>Tentukan letak kuartil (Q<sub>i</sub>) dengan rumus:</li>
          </ol>
          <div class="bg-gray-800 p-3 rounded shadow-sm mb-4 border border-blue-700">
            <p class="text-center text-xl font-mono text-white">Letak Q<sub>i</sub> = i * (n + 1) / 4</p>
            <p class="text-center text-sm text-gray-400 mt-2">i = 1, 2, atau 3 | n = jumlah data</p>
          </div>
          <div class="bg-gray-800 p-3 rounded shadow-sm mb-4 border border-blue-700">
            <p class="text-center text-xl font-mono text-white">Nilai Q<sub>i</sub> = Data ke-x + d * (Data ke-(x+1) - Data ke-x)</p>
            <p class="text-center text-sm text-gray-400 mt-2">x = Bagian bulat dari letak Q<sub>i</sub> | d = Bagian desimal</p>
          </div>
          <p class="mb-4 text-gray-300">Jika letak Q<sub>i</sub> adalah bilangan desimal (misal 2.25), nilainya dihitung menggunakan interpolasi:</p>
          <p class="font-mono bg-gray-900 p-2 rounded mb-4 text-sm text-gray-300">Nilai Q<sub>i</sub> = Data ke-X + D * (Data ke-(X+1) - Data ke-X)</p>
          <p class="mb-2 text-gray-300"><span class="font-mono text-purple-300">X</span> = Bagian bulat dari letak Q<sub>i</sub> (misal 2 dari 2.25)</p>
          <p class="mb-2 text-gray-300"><span class="font-mono text-purple-300">D</span> = Bagian desimal dari letak Q<sub>i</sub> (misal 0.25 dari 2.25)</p>
          <h4 class="font-bold text-xl mb-3 mt-6">Contoh:</h4>
          <div class="bg-gray-800/60 p-4 rounded-lg mb-4 text-gray-300">
            <p class="mb-2 font-semibold">Data terurut: 2, 5, 5, 6, 7, 8, 9, 12 (n=8)</p>
            <p class="mb-2 mt-4 font-bold text-blue-300">Mencari Q1 (i=1):</p>
            <p class="mb-2 font-mono">Letak Q1 = 1 * (8 + 1) / 4 = 9 / 4 = 2.25</p>
            <p class="mb-2">Data ke-2 (X=2) + 0.25 (D=0.25) * (Data ke-3 - Data ke-2)</p>
            <p class="mb-2">Nilai Q1 = 5 + 0.25 * (5 - 5) = 5 + 0 = <strong class="text-white">5</strong></p>
            <p class="mb-2 mt-4 font-bold text-blue-300">Mencari Q2 (i=2) / Median:</p>
            <p class="mb-2 font-mono">Letak Q2 = 2 * (8 + 1) / 4 = 18 / 4 = 4.5</p>
            <p class="mb-2">Data ke-4 (X=4) + 0.5 (D=0.5) * (Data ke-5 - Data ke-4)</p>
            <p class="mb-2">Nilai Q2 = 6 + 0.5 * (7 - 6) = 6 + 0.5 = <strong class="text-white">6.5</strong></p>
            <p class="mb-2 mt-4 font-bold text-blue-300">Mencari Q3 (i=3):</p>
            <p class="mb-2 font-mono">Letak Q3 = 3 * (8 + 1) / 4 = 27 / 4 = 6.75</p>
            <p class="mb-2">Data ke-6 (X=6) + 0.75 (D=0.75) * (Data ke-7 - Data ke-6)</p>
            <p class="mb-2">Nilai Q3 = 8 + 0.75 * (9 - 8) = 8 + 0.75 = <strong class="text-white">8.75</strong></p>
          </div>
        `
      },
      desil: {
        title: 'Desil (Data Tunggal)',
        content: `
          <div class="bg-green-900/30 border border-green-800 p-4 rounded-lg mb-4 text-gray-300">
            <p class="font-semibold mb-2">Desil adalah nilai yang membagi sekumpulan data yang telah diurutkan menjadi sepuluh bagian yang sama besar.</p>
            <p>Ada 9 nilai desil, yaitu D<sub>1</sub>, D<sub>2</sub>, ..., D<sub>9</sub>.</p>
          </div>
          <h4 class="font-bold text-xl mb-3">Langkah Menghitung Desil (Data Tunggal):</h4>
          <ol class="list-decimal list-inside space-y-2 mb-4 bg-gray-800/60 p-4 rounded-lg text-gray-300">
            <li>Urutkan data dari yang terkecil hingga terbesar.</li>
            <li>Tentukan letak desil (D<sub>i</sub>) dengan rumus:</li>
          </ol>
          <div class="bg-gray-800 p-3 rounded shadow-sm mb-4 border border-green-700">
            <p class="text-center text-xl font-mono text-white">Letak D<sub>i</sub> = i * (n + 1) / 10</p>
            <p class="text-center text-sm text-gray-400 mt-2">i = 1, 2, ..., 9 | n = jumlah data</p>
          </div>
          <div class="bg-gray-800 p-3 rounded shadow-sm mb-4 border border-green-700">
            <p class="text-center text-xl font-mono text-white">Nilai D<sub>i</sub> = Data ke-x + d * (Data ke-(x+1) - Data ke-x)</p>
            <p class="text-center text-sm text-gray-400 mt-2">x = Bagian bulat dari letak D<sub>i</sub> | d = Bagian desimal</p>
          </div>
          <p class="mb-4 text-gray-300">Sama seperti kuartil, jika letaknya desimal, gunakan interpolasi linear.</p>
          <h4 class="font-bold text-xl mb-3 mt-6">Contoh:</h4>
          <div class="bg-gray-800/60 p-4 rounded-lg mb-4 text-gray-300">
            <p class="mb-2 font-semibold">Data terurut: 2, 5, 5, 6, 7, 8, 9, 12, 13, 15 (n=10)</p>
            <p class="mb-2 mt-4 font-bold text-green-300">Mencari D<sub>7</sub> (i=7):</p>
            <p class="mb-2 font-mono">Letak D7 = 7 * (10 + 1) / 10 = 77 / 10 = 7.7</p>
            <p class="mb-2">Data ke-7 (X=7) + 0.7 (D=0.7) * (Data ke-8 - Data ke-7)</p>
            <p class="mb-2">Nilai D7 = 9 + 0.7 * (12 - 9)</p>
            <p class="mb-2">Nilai D7 = 9 + 0.7 * (3) = 9 + 2.1 = <strong class="text-white">11.1</strong></p>
          </div>
        `
      },
      persentil: {
        title: 'Persentil (Data Tunggal)',
        content: `
          <h3 class="text-2xl font-bold mb-4">Persentil (Data Tunggal)</h3>
          <div class="bg-purple-900/30 border border-purple-800 p-4 rounded-lg mb-4 text-gray-300">
            <p class="font-semibold mb-2">Persentil adalah nilai yang membagi sekumpulan data yang telah diurutkan menjadi seratus bagian yang sama besar.</p>
            <p>Ada 99 nilai persentil, yaitu P<sub>1</sub>, P<sub>2</sub>, ..., P<sub>99</sub>.</p>
          </div>
          <h4 class="font-bold text-xl mb-3">Langkah Menghitung Persentil (Data Tunggal):</h4>
          <ol class="list-decimal list-inside space-y-2 mb-4 bg-gray-800/60 p-4 rounded-lg text-gray-300">
            <li>Urutkan data dari yang terkecil hingga terbesar.</li>
            <li>Tentukan letak persentil (P<sub>i</sub>) dengan rumus:</li>
          </ol>
          <div class="bg-gray-800 p-3 rounded shadow-sm mb-4 border border-purple-700">
            <p class="text-center text-xl font-mono text-white">Letak P<sub>i</sub> = i * (n + 1) / 100</p>
            <p class="text-center text-sm text-gray-400 mt-2">i = 1, 2, ..., 99 | n = jumlah data</p>
          </div>
          <div class="bg-gray-800 p-3 rounded shadow-sm mb-4 border border-purple-700">
            <p class="text-center text-xl font-mono text-white">Nilai P<sub>i</sub> = Data ke-x + d * (Data ke-(x+1) - Data ke-x)</p>
            <p class="text-center text-sm text-gray-400 mt-2">x = Bagian bulat dari letak P<sub>i</sub> | d = Bagian desimal</p>
          </div>
          <p class="mb-4 text-gray-300">Interpolasi linear juga digunakan jika letaknya desimal.</p>
          <h4 class="font-bold text-xl mb-3 mt-6">Contoh:</h4>
          <div class="bg-gray-800/60 p-4 rounded-lg mb-4 text-gray-300">
            <p class="mb-2 font-semibold">Data terurut: 2, 5, 5, 6, 7, 8, 9, 12, 13, 15 (n=10)</p>
            <p class="mb-2 mt-4 font-bold text-purple-300">Mencari P<sub>40</sub> (i=40):</p>
            <p class="mb-2 font-mono">Letak P40 = 40 * (10 + 1) / 100 = 440 / 100 = 4.4</p>
            <p class="mb-2">Data ke-4 (X=4) + 0.4 (D=0.4) * (Data ke-5 - Data ke-4)</p>
            <p class="mb-2">Nilai P40 = 6 + 0.4 * (7 - 6)</p>
            <p class="mb-2">Nilai P40 = 6 + 0.4 = <strong class="text-white">6.4</strong></p>
          </div>
        `
      }
    },
    visualisasi: {
      grafik: {
        title: 'Visualisasi Data dengan Grafik',
        content: `
          <h3 class="text-2xl font-bold mb-4">Pentingnya Visualisasi Data</h3>
          <div class="bg-gradient-to-r from-blue-900/50 to-purple-900/50 p-4 rounded-lg mb-6 border border-gray-700">
            <p class="font-semibold mb-2 text-gray-300">Otak manusia memproses informasi visual 60.000 kali lebih cepat daripada teks. Visualisasi data membantu memahami pola, tren, dan outlier dengan lebih mudah.</p>
          </div>
          <h4 class="font-bold text-xl mb-3">Memilih Grafik yang Tepat:</h4>
          <div class="space-y-4">
              <div class="bg-gray-800 border border-gray-700 p-4 rounded-lg">
                  <h5 class="font-bold text-lg text-blue-300 mb-2">Diagram Batang (Bar Chart)</h5>
                  <p class="text-sm mb-2 text-gray-300"><strong>Kapan?</strong> Untuk membandingkan jumlah antar kategori yang berbeda.</p>
                  <p class="text-xs text-gray-400"><strong>Contoh:</strong> Perbandingan penjualan produk A, B, dan C.</p>
              </div>
              <div class="bg-gray-800 border border-gray-700 p-4 rounded-lg">
                  <h5 class="font-bold text-lg text-green-300 mb-2">Diagram Garis (Line Chart)</h5>
                  <p class="text-sm mb-2 text-gray-300"><strong>Kapan?</strong> Untuk melihat tren atau perubahan data dari waktu ke waktu.</p>
                  <p class="text-xs text-gray-400"><strong>Contoh:</strong> Pertumbuhan suhu harian selama sebulan.</p>
              </div>
              <div class="bg-gray-800 border border-gray-700 p-4 rounded-lg">
                  <h5 class="font-bold text-lg text-purple-300 mb-2">Diagram Lingkaran (Pie Chart)</h5>
                  <p class="text-sm mb-2 text-gray-300"><strong>Kapan?</strong> Untuk menunjukkan proporsi atau persentase dari keseluruhan (bagian-ke-keseluruhan).</p>
                  <p class="text-xs text-gray-400"><strong>Contoh:</strong> Komposisi pangsa pasar.</p>
              </div>
               <div class="bg-gray-800 border border-gray-700 p-4 rounded-lg">
                  <h5 class="font-bold text-lg text-orange-300 mb-2">Histogram</h5>
                  <p class="text-sm mb-2 text-gray-300"><strong>Kapan?</strong> Untuk memahami distribusi frekuensi dari data numerik kontinu.</p>
                  <p class="text-xs text-gray-400"><strong>Contoh:</strong> Distribusi nilai ujian dari 100 siswa.</p>
              </div>
          </div>
        `
      }
    }
  };

  const quizSets = {
    pemahaman: {
      title: "Kuis Pemahaman Dasar",
      questions: [
        { question: 'Apa yang dimaksud dengan mean dalam statistika?', options: ['Nilai tengah dari data', 'Nilai yang paling sering muncul', 'Rata-rata dari semua nilai data', 'Selisih nilai maksimum dan minimum'], correct: 2 },
        { question: 'Data berikut: 3, 5, 7, 9, 11. Berapakah median dari data tersebut?', options: ['5', '7', '9', '6'], correct: 1 },
        { question: 'Jenis data yang menunjukkan kategori tanpa urutan tertentu adalah?', options: ['Data Ordinal', 'Data Nominal', 'Data Diskrit', 'Data Kontinu'], correct: 1 },
        { question: 'Nilai yang membagi data terurut menjadi empat bagian sama besar disebut?', options: ['Persentil', 'Desil', 'Kuartil', 'Median'], correct: 2 },
        { question: 'Jika data: 2, 4, 4, 4, 5, 5, 7, 9, maka modusnya adalah?', options: ['2', '4', '5', '7'], correct: 1 },
      ]
    },
    latihan1: {
      title: "Latihan 1 (Lanjutan)",
      questions: [
        { question: 'Manakah dari ukuran pemusatan berikut yang paling baik digunakan jika data memiliki outlier ekstrem?', options: ['Mean', 'Median', 'Modus', 'Range'], correct: 1 },
        { question: 'Kuartil kedua (Q2) selalu sama dengan...', options: ['Mean', 'Modus', 'Median', 'Desil ke-2'], correct: 2 },
        { question: 'Anda ingin memvisualisasikan komposisi anggaran sebuah perusahaan ke dalam beberapa departemen. Grafik apa yang paling sesuai?', options: ['Line Chart', 'Histogram', 'Bar Chart', 'Pie Chart'], correct: 3 },
        { question: 'Data: 10, 20, 30, 40, 150. Manakah pernyataan yang paling tepat?', options: ['Mean lebih besar dari median', 'Median lebih besar dari mean', 'Mean dan median sama', 'Modus adalah 150'], correct: 0 },
      ]
    },
     latihan2: {
      title: "Latihan 2 (Studi Kasus 1)",
      questions: [
        { question: 'Seorang peneliti mencatat waktu lari 100m (detik): 13, 9, 12, 10, 14. Berapakah median dari data tersebut setelah diurutkan?', options: ['9', '10', '12', '13'], correct: 2 },
        { question: 'Mean dari 5 angka adalah 10. Jika empat angkanya adalah 5, 7, 13, dan 15, berapakah angka kelima?', options: ['8', '10', '9', '11'], correct: 1 },
        { question: 'Seorang pemilik toko kue sedang meneliti jumlah pelanggan yang datang setiap hari selama satu minggu. Data yang diperoleh adalah sebagai berikut: 8, 5, 11, 9, 9, 10, 12. Berapa jumlah pelanggan yang paling sering datang pada satu hari dalam minggu tersebut?', options: ['10', '12', '5', '9'], correct: 3 },
        { question: 'Untuk data: 1, 2, 3, 4, 5, 6, 7. Berapakah nilai Kuartil Bawah (Q1)?', options: ['1', '2', '3', '2.5'], correct: 1 },
        { question: 'Diberikan data tunggal yang terdiri dari 7 angka satuan sebagai berikut: 9, 2, 7, 5, 3, 8, 4. Tentukan nilai Desil ke-5 (D₅) dari kumpulan data tersebut.', options: ['9', '2', '3', '5'], correct: 3 },
        { question: 'Diberikan data tunggal hasil survei kepuasan pelanggan (dalam skala 1-10) terhadap layanan sebuah toko: 5, 7, 3, 8, 4, 9, 6. Tentukan nilai Persentil ke-50 (P₅₀) dari kumpulan data tersebut.', options: ['6', '8', '7', '5.5'], correct: 0 },
      ]
    },
    latihan3: {
      title: "Latihan 3 (Studi Kasus 2)",
      questions: [
        { question: 'Data {1, 2, 5, 5, 5, 5, 5}memiliki 7 data dengan nilai tertinggi 5. Berapakah nilai Mean (Rata-rata) dari data tersebut?', options: ['5', '3', '4', '5'], correct: 2 },
        { question: 'Tentukan nilai Median dari kumpulan data yang telah diurutkan berikut: {1, 2, 2, 3, 4, 5, 6} ', options: ['3', '2', '4', '5'], correct: 0 },
        { question: 'Data {2, 3, 4, 5, 6, 6, 2}. Tentukan semua nilai Modus dari data tersebut.', options: ['2', '2 dan 6', '5', '6'], correct: 1 },
        { question: '	Dari data {1, 1, 3, 4, 5, 6, 6}, berapakah nilai Kuartil Atas (Q_3)?', options: ['5', '6', '4', '1'], correct: 1 },
        { question: '	Untuk data {2, 3, 3, 4, 5, 5, 6}, berapakah nilai Desil ke-1 (D_8)?', options: ['3', '1', '2', '5'], correct: 2 },
        { question: '	Hitung nilai Persentil ke-75 (P_{75}) dari data {2, 3, 3, 4, 5, 5, 6}', options: ['4', '6', '5', '1'], correct: 2 },
      ]
    }
  };

  const activeQuizData = currentQuiz ? quizSets[currentQuiz].questions : [];
  const handleAnswer = (questionIndex, answerIndex) => {
    setUserAnswers(prev => ({ ...prev, [questionIndex]: answerIndex }));
  };
  const calculateScore = () => {
    return activeQuizData.reduce((acc, quiz, index) => {
      return userAnswers[index] === quiz.correct ? acc + 1 : acc;
    }, 0);
  };
  const handleSubmitQuiz = () => {
    setShowResults(true);
    const score = calculateScore();
    const scorePercentage = (score / activeQuizData.length) * 100;
    if (scorePercentage >= 75) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 5000);
    }
  };
  const resetQuiz = () => {
    setUserAnswers({});
    setShowResults(false);
    setCurrentQuizIndex(0);
    setShowConfetti(false);
  };
  const startQuiz = (quizId) => {
    setActiveTab('kuis');
    setCurrentQuiz(quizId);
    resetQuiz();
  };

  const menuItems = [
    { id: 'pengenalan', label: 'Pengenalan Statistika', icon: <BookOpen className="w-5 h-5" />, subMenus: [{ id: 'pengertian', label: 'Pengertian' }, { id: 'jenisData', label: 'Jenis Data' }] },
    { id: 'ukuranPemusatan', label: 'Ukuran Pemusatan', icon: <Calculator className="w-5 h-5" />, subMenus: [{ id: 'mean', label: 'Mean' }, { id: 'median', label: 'Median' }, { id: 'modus', label: 'Modus' }] },
    { id: 'ukuranLetak', label: 'Ukuran Letak Data', icon: <BarChartHorizontal className="w-5 h-5" />, subMenus: [{ id: 'kuartil', label: 'Kuartil' }, { id: 'desil', label: 'Desil' }, { id: 'persentil', label: 'Persentil' }] },
    { id: 'visualisasi', label: 'Visualisasi Data', icon: <PieIcon className="w-5 h-5" />, subMenus: [{ id: 'grafik', label: 'Jenis Grafik' }, { id: 'kalkulator', label: 'Kalkulator Statistik' }] },
    { id: 'interaktif', label: 'Simulasi Interaktif', icon: <TrendingUp className="w-5 h-5" /> },
    { id: 'kuis', label: 'Uji Pemahaman', icon: <BrainCircuit className="w-5 h-5" />, subMenus: [{ id: 'pemahaman', label: 'Kuis Pemahaman' }, { id: 'latihan1', label: 'Latihan 1' }, { id: 'latihan2', label: 'Latihan 2' }, { id: 'latihan3', label: 'Latihan 3' }] }
  ];

  const bentoCards = menuItems.map(item => ({
    id: item.id,
    icon: item.icon,
    title: item.label,
    description: item.subMenus ? item.subMenus.map(s => s.label).join(', ') : (item.id === 'interaktif' ? 'Simulasi data dengan grafik' : 'Klik untuk membuka'),
    label: item.id.charAt(0).toUpperCase() + item.id.slice(1)
  }));

  const handleCardClick = (card) => {
    handleMenuClick(card.id);
  };

  const handleMenuClick = (itemId, subMenuId = null) => {
    setActiveTab(itemId);
    if(itemId === 'kuis') {
        const targetQuizId = subMenuId || menuItems.find(m => m.id === 'kuis').subMenus[0].id;
        startQuiz(targetQuizId);
    } else if (menuItems.find(m => m.id === itemId)?.subMenus) {
        const targetSubMenuId = subMenuId || menuItems.find(m => m.id === itemId).subMenus[0].id;
        setActiveSubMenu(targetSubMenuId);
        setCurrentQuiz(null);
    } else {
        setCurrentQuiz(null);
        setActiveSubMenu(null);
    }
  };

  const calculatedStats = useMemo(() => {
    const flatData = interactiveData.reduce((acc, item) => {
      return acc.concat(Array(item.frekuensi).fill(item.nilai));
    }, []);
    if (flatData.length === 0) return { mean: 'N/A', median: 'N/A', modus: 'N/A' };
    const sum = flatData.reduce((acc, val) => acc + val, 0);
    const mean = (sum / flatData.length).toFixed(2);
    flatData.sort((a, b) => a - b);
    const mid = Math.floor(flatData.length / 2);
    const median = flatData.length % 2 !== 0 ? flatData[mid] : ((flatData[mid - 1] + flatData[mid]) / 2).toFixed(2);
    const frequencyMap = flatData.reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {});
    let maxFreq = 0;
    let modus = [];
    for (const key in frequencyMap) {
      if (frequencyMap[key] > maxFreq) {
        maxFreq = frequencyMap[key];
        modus = [key];
      } else if (frequencyMap[key] === maxFreq) {
        modus.push(key);
      }
    }
    const allUnique = Object.values(frequencyMap).every(f => f === 1);
    const modusStr = allUnique && flatData.length > 1 ? 'N/A' : modus.join(', ');
    return { mean, median, modus: modusStr };
  }, [interactiveData]);

  const handleSliderChange = (index, newValue) => {
    const updatedData = interactiveData.map((item, i) => {
      if (i === index) {
        return { ...item, frekuensi: parseInt(newValue, 10) };
      }
      return item;
    });
    setInteractiveData(updatedData);
  };

  const handleInputChange = (index, newValue) => {
    const value = parseInt(newValue, 10) || 0;
    const clampedValue = Math.min(Math.max(value, 0), 50);
    const updatedData = interactiveData.map((item, i) => {
      if (i === index) {
        return { ...item, frekuensi: clampedValue };
      }
      return item;
    });
    setInteractiveData(updatedData);
  };

  // === EDITABLE LABEL NILAI ===
  const handleNilaiChange = (index, newNilai) => {
    const updatedData = interactiveData.map((item, i) => {
      if (i === index) {
        return { ...item, nilai: newNilai === '' ? 0 : Number(newNilai) };
      }
      return item;
    });
    setInteractiveData(updatedData);
  };

  const renderContent = () => {
    if (activeTab === 'home') {
      return (
        <div className="relative z-10 flex flex-col items-center justify-center">
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="text-3xl sm:text-5xl font-bold text-center mb-4"
            >
              Selamat Datang di
            </motion.h2>
            <TextType
              as="h1"
              text={[
                "Platform Statistika Dasar",
                "Mulai Belajar Mean, Median, Modus",
                "Uji Pemahaman Anda!"
              ]}
              typingSpeed={75}
              pauseDuration={2000}
              deletingSpeed={50}
              loop={true}
              className="text-4xl sm:text-6xl font-bold text-center mb-10 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400 min-h-[70px] sm:min-h-[90px]"
              cursorClassName="text-purple-400 text-4xl sm:text-6xl"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {bentoCards.map(card => (
                <BentoCard
                  key={card.id}
                  icon={card.icon}
                  title={card.title}
                  description={card.description}
                  onClick={() => handleCardClick(card)}
                />
              ))}
            </div>
        </div>
      );
    }
    if (activeTab === 'visualisasi' && activeSubMenu === 'kalkulator') {
      return <KalkulatorStatistik />;
    }
    if (activeTab === 'interaktif') {
      return (
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2">Simulasi Data Interaktif</h2>
          <p className="mb-6 text-gray-300">Ubah nilai frekuensi pada input di bawah untuk mengamati perubahan pada grafik serta hasil perhitungannya secara langsung.</p>
          <div className="grid lg:grid-cols-5 gap-8">
            <div className="lg:col-span-2">
              <h3 className="font-bold text-xl mb-3">Editor Data Frekuensi</h3>
              <div className="space-y-4">
                {interactiveData.map((item, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-gray-800/60 rounded-lg p-4 border border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-md font-semibold text-gray-200">Nilai</span>
                        <input
                          type="number"
                          value={item.nilai}
                          onChange={(e) => handleNilaiChange(index, e.target.value)}
                          className="w-16 px-2 py-1 border border-purple-500 rounded-md text-center font-semibold text-purple-300 bg-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <span className="text-md font-semibold text-gray-200">:</span>
                      </div>
                      <input
                        type="number"
                        value={item.frekuensi}
                        onChange={(e) => handleInputChange(index, e.target.value)}
                        min="0"
                        max="50"
                        className="w-20 px-3 py-1 border border-blue-500 rounded-md text-center font-semibold text-blue-300 bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={item.frekuensi}
                      onChange={(e) => handleSliderChange(index, e.target.value)}
                      className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      style={{
                          background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(item.frekuensi / 50) * 100}%, #6b7280 ${(item.frekuensi / 50) * 100}%, #6b7280 100%)`
                      }}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-3 bg-gray-900/70 p-4 rounded-lg shadow-lg border border-gray-700">
              <h3 className="font-bold text-center mb-4">Grafik Distribusi Frekuensi</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={interactiveData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                  <XAxis dataKey="nilai" stroke="#9ca3af" />
                  <YAxis allowDecimals={false} stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563', color: '#e5e7eb' }} 
                    cursor={{ fill: 'rgba(59, 130, 246, 0.2)' }} 
                  />
                  <Bar dataKey="frekuensi" fill="#3b82f6" animationDuration={300} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div className="bg-blue-900/50 p-3 rounded-lg border border-blue-800">
                  <p className="text-sm text-gray-400">Mean</p>
                  <p className="font-bold text-xl text-blue-300">{calculatedStats.mean}</p>
                </div>
                <div className="bg-green-900/50 p-3 rounded-lg border border-green-800">
                  <p className="text-sm text-gray-400">Median</p>
                  <p className="font-bold text-xl text-green-300">{calculatedStats.median}</p>
                </div>
                <div className="bg-purple-900/50 p-3 rounded-lg border border-purple-800">
                  <p className="text-sm text-gray-400">Modus</p>
                  <p className="font-bold text-xl text-purple-300">{calculatedStats.modus}</p>
                </div>
              </div>
            </div>
          </div>
          <hr className="my-10 border-t-2 border-gray-700" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
            <div className="bg-gray-900/70 p-4 rounded-lg shadow-lg border border-gray-700">
              <h3 className="font-bold text-center mb-4">Proporsi Frekuensi (Pie Chart)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={interactiveData.filter(d => d.frekuensi > 0)}
                    dataKey="frekuensi"
                    nameKey="nilai"
                    cx="50%"
                    cy="50%"
                    outerRadius={110}
                    label
                  >
                    {interactiveData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563', color: '#e5e7eb' }} 
                  />
                  <Legend wrapperStyle={{ color: '#e5e7eb' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-gray-900/70 p-4 rounded-lg shadow-lg border border-gray-700">
              <h3 className="font-bold text-center mb-4">Tren Frekuensi (Line Chart)</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={interactiveData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                  <XAxis dataKey="nilai" stroke="#9ca3af" />
                  <YAxis allowDecimals={false} stroke="#9ca3af" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #4b5563', color: '#e5e7eb' }} 
                  />
                  <Legend wrapperStyle={{ color: '#e5e7eb' }} />
                  <Line type="monotone" dataKey="frekuensi" stroke="#10b981" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      );
    }
    if (activeTab === 'kuis' && currentQuiz) {
      const score = calculateScore();
      const scorePercentage = (score / activeQuizData.length) * 100;
      return (
        <div className="relative">
          {showConfetti && <Confetti />}
          <h2 className="text-2xl sm:text-3xl font-bold mb-4">{quizSets[currentQuiz].title}</h2>
          {!showResults ? (
            <div className="bg-gray-900/70 p-4 sm:p-6 rounded-lg shadow-xl border border-gray-700">
              <div className="mb-4 text-gray-300 flex justify-between items-center">
                <span>Soal {currentQuizIndex + 1} dari {activeQuizData.length}</span>
                <div className="w-full bg-gray-700 rounded-full h-2.5 ml-4">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full"
                    style={{ width: `${((currentQuizIndex + 1) / activeQuizData.length) * 100}%` }}
                  ></div>
                </div>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold mb-6 min-h-[60px]">{activeQuizData[currentQuizIndex].question}</h3>
              <div className="space-y-3">
                {activeQuizData[currentQuizIndex].options.map((option, index) => (
                  <motion.button
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAnswer(currentQuizIndex, index)}
                    className={`block w-full text-left p-4 rounded-lg border-2 transition-all duration-200 text-md sm:text-lg ${
                      userAnswers[currentQuizIndex] === index
                        ? 'bg-blue-500 text-white border-blue-600 shadow-md'
                        : 'bg-gray-800 border-gray-700 hover:bg-gray-700/70 hover:border-blue-700'
                    }`}
                  >
                    {option}
                  </motion.button>
                ))}
              </div>
              <div className="flex flex-col sm:flex-row justify-between mt-8 gap-4">
                <button
                  onClick={() => setCurrentQuizIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQuizIndex === 0}
                  className="px-6 py-2 bg-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-700 transition w-full sm:w-auto"
                >
                  Sebelumnya
                </button>
                {currentQuizIndex < activeQuizData.length - 1 ? (
                  <button
                    onClick={() => setCurrentQuizIndex(prev => Math.min(activeQuizData.length - 1, prev + 1))}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow w-full sm:w-auto"
                  >
                    Selanjutnya
                  </button>
                ) : (
                  <button
                    onClick={handleSubmitQuiz}
                    disabled={userAnswers[currentQuizIndex] === undefined}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg disabled:bg-gray-600 hover:bg-green-700 transition shadow-lg w-full sm:w-auto"
                  >
                    Selesai & Lihat Hasil
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-900/70 p-6 rounded-lg shadow-xl text-center border border-gray-700">
              <h3 className="text-2xl font-bold mb-4">Hasil Kuis Anda</h3>
              <div
                className={`w-36 h-36 mx-auto rounded-full flex items-center justify-center text-4xl font-bold text-white mb-4 shadow-2xl ${
                  scorePercentage >= 75 ? 'bg-green-500' : scorePercentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
              >
                {score}/{activeQuizData.length}
              </div>
              <p className="text-lg mb-6">Anda menjawab benar {scorePercentage.toFixed(0)}% soal.</p>
              <button
                onClick={resetQuiz}
                className="flex items-center gap-2 mx-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition shadow-lg"
              >
                <RefreshCw className="w-5 h-5" /> Ulangi Kuis
              </button>
              <div className="text-left mt-8 max-h-80 overflow-y-auto pr-2">
                <h4 className="font-bold text-xl mb-4">Rincian Jawaban:</h4>
                <ul className="space-y-4">
                  {activeQuizData.map((quiz, index) => (
                    <li
                      key={index}
                      className={`p-3 rounded-lg ${userAnswers[index] === quiz.correct ? 'bg-green-900/30' : 'bg-red-900/30'}`}
                    >
                      <p className="font-semibold">{index + 1}. {quiz.question}</p>
                      <div className="flex items-start gap-3 mt-2 text-sm">
                        {userAnswers[index] === quiz.correct ? (
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <X className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p>
                            Jawaban Anda:{' '}
                            <span className={userAnswers[index] === quiz.correct ? 'text-green-300' : 'text-red-300'}>
                              {quiz.options[userAnswers[index]] ?? 'Tidak dijawab'}
                            </span>
                          </p>
                          {userAnswers[index] !== quiz.correct && (
                            <p className="text-green-300 font-bold">Jawaban Benar: {quiz.options[quiz.correct]}</p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      );
    }
    const currentMateri = materi[activeTab]?.[activeSubMenu];
    if (currentMateri) {
      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <h2 className="text-2xl sm:text-3xl font-bold mb-6">{currentMateri.title}</h2>
          <div className="prose max-w-none prose-lg prose-invert" dangerouslySetInnerHTML={{ __html: currentMateri.content }} />
        </motion.div>
      );
    }
    return null;
  };

  return (
    <div 
      className="min-h-screen font-sans" 
      style={{ 
        background: 'linear-gradient(180deg, rgba(6,0,16,1) 0%, rgba(42,0,64,1) 100%)',
        color: 'white' 
      }}
    >
    <DotGrid 
      dotSize={7}
      gap={20}
      baseColor="#8b5cf6"
      activeColor="#a78bfa"
      proximity={150}
      shockRadius={300}
      shockStrength={4}
      resistance={500}
      returnDuration={1.5}
      className="opacity-15"
    />
      <style>{`
        .confetti-container { position: fixed; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden; z-index: 10000; pointer-events: none; }
        .confetti { position: absolute; width: 8px; height: 16px; top: -20px; animation: fall linear infinite; }
        @keyframes fall { 0% { transform: translateY(0vh) rotate(0deg); } 100% { transform: translateY(100vh) rotate(720deg); } }
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
        input[type=number] { -moz-appearance: textfield; }
        .prose-invert {
          --tw-prose-body: #d1d5db;
          --tw-prose-headings: #ffffff;
          --tw-prose-lead: #e5e7eb;
          --tw-prose-links: #93c5fd;
          --tw-prose-bold: #ffffff;
          --tw-prose-counters: #9ca3af;
          --tw-prose-bullets: #8b5cf6;
          --tw-prose-hr: #4b5563;
          --tw-prose-quotes: #f3f4f6;
          --tw-prose-quote-borders: #4b5563;
          --tw-prose-captions: #9ca3af;
          --tw-prose-code: #e5e7eb;
          --tw-prose-pre-code: #d1d5db;
          --tw-prose-pre-bg: #1f2937;
          --tw-prose-th-borders: #4b5563;
          --tw-prose-td-borders: #374151;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
          overflow: hidden;
          text-overflow: ellipsis;
        }
      `}</style>
      <div className="flex-1 flex flex-col relative z-10">
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
            {activeTab !== 'home' && (
              <div className="mb-6">
                <button
                  onClick={() => {
                    setActiveTab('home');
                    setActiveSubMenu(null);
                    setCurrentQuiz(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-700/50 text-purple-200 hover:bg-purple-700 transition-all duration-200"
                >
                  <ArrowLeft className="w-5 h-5" />
                  Kembali ke Menu
                </button>
                {menuItems.find(m => m.id === activeTab)?.subMenus && (
                  <nav className="flex flex-wrap gap-2 mt-4 border-b-2 border-gray-800 pb-4">
                    {menuItems.find(m => m.id === activeTab).subMenus.map(sub => (
                      <button
                        key={sub.id}
                        onClick={() => handleMenuClick(activeTab, sub.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          (activeSubMenu === sub.id && !currentQuiz) || currentQuiz === sub.id
                            ? 'bg-purple-600 text-white shadow-lg'
                            : 'bg-gray-800 text-gray-300 hover:bg-gray-700/70'
                        }`}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </nav>
                )}
              </div>
            )}
            <div className="min-h-full">
              {renderContent()}
            </div>
        </main>
      </div>
    </div>
  );
};

export default App;
