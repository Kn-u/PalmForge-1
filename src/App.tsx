import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Dna, 
  FlaskConical, 
  Map as MapIcon, 
  Microscope, 
  Plus, 
  Zap, 
  Shield, 
  Wind,
  Info,
  RotateCcw,
  TreePine,
  Activity,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Heart,
  Award,
  Search,
  Hammer,
  ShoppingBag,
  CloudLightning,
  TrendingUp,
  Boxes
} from 'lucide-react';

// --- Constants & Data ---
const GENES = {
  SUN: { id: 'sun', color: '#f59e0b', label: 'Photogene', icon: <Zap className="w-4 h-4" /> },
  WATER: { id: 'water', color: '#3b82f6', label: 'Hydrogene', icon: <Wind className="w-4 h-4" /> },
  EARTH: { id: 'earth', color: '#8b4513', label: 'Geogene', icon: <Shield className="w-4 h-4" /> },
  WIND: { id: 'wind', color: '#10b981', label: 'Aerogene', icon: <Wind className="w-4 h-4" /> },
};

// INITIAL SPECIMENS
// H = Dominant Tall, h = Recessive Dwarf (Low Resistance)
// Y = Dominant Rich Yield, y = Recessive Low Yield (Low Production)
const INITIAL_PALMS = [
  { id: 1, name: 'Sabal Sapling', genes: ['EARTH'], level: 1, maxResistance: 25, resistance: 25, stats: { resistance: 25, production: 5 }, sprite: '🌴', alleles: { resistance: ['H', 'h'], production: ['Y', 'y'] } },
  { id: 2, name: 'Areca Cane', genes: ['WIND'], level: 1, maxResistance: 20, resistance: 20, stats: { resistance: 20, production: 6 }, sprite: '🎋', alleles: { resistance: ['H', 'h'], production: ['y', 'y'] } },
];

const WILD_PALMS = [
  { name: 'Sago Palm', genes: ['EARTH'], sprite: '🌱', rarity: 'Common', resistance: 18, maxResistance: 18, production: 4, alleles: { resistance: ['H', 'H'], production: ['Y', 'y'] } },
  { name: 'Windmill Palm', genes: ['WIND'], sprite: '🌴', rarity: 'Uncommon', resistance: 22, maxResistance: 22, production: 5, alleles: { resistance: ['H', 'h'], production: ['Y', 'Y'] } },
  { name: 'Fan Palm', genes: ['SUN', 'WIND'], sprite: '🌿', rarity: 'Rare', resistance: 28, maxResistance: 28, production: 4, alleles: { resistance: ['h', 'h'], production: ['Y', 'y'] } },
  { name: 'King Coconut Palm', genes: ['WATER', 'SUN'], sprite: '🥥', rarity: 'Legendary', resistance: 35, maxResistance: 35, production: 8, alleles: { resistance: ['H', 'H'], production: ['Y', 'Y'] } }
];

// Complementary Base Pairs for DNA Sequencer
const BASE_PAIRS = {
  'A': { complement: 'T', color: 'bg-red-500/25 border-red-500 text-red-400' },
  'T': { complement: 'A', color: 'bg-emerald-500/25 border-emerald-500 text-emerald-400' },
  'C': { complement: 'G', color: 'bg-blue-500/25 border-blue-500 text-blue-400' },
  'G': { complement: 'C', color: 'bg-yellow-500/25 border-yellow-500 text-yellow-400' }
};
const RANDOM_BASES = ['A', 'T', 'C', 'G'];

// Map Settings
const MAP_SIZE = 12; // 12x12 grid world

export default function App() {
  const [view, setView] = useState('map'); // 'map', 'sequencer', 'lab', 'soil', 'market', 'collection'
  const [dnaPoints, setDnaPoints] = useState(150);
  const [fruits, setFruits] = useState(15); // Collected raw crops
  const [money, setMoney] = useState(45); // Cash currency generated from selling fruit
  const [weatherShields, setWeatherShields] = useState(1); // Shield count against disasters
  const [inventory, setInventory] = useState(INITIAL_PALMS);
  const [discoveredGenes, setDiscoveredGenes] = useState(['EARTH', 'WIND']);
  const [logs, setLogs] = useState(["Walk onto the beach or brush wild grass to harvest fruit to sell for money!"]);

  // Global Genome Piece Storage (Persists across different encounters/excavations)
  const [storedLeafPieces, setStoredLeafPieces] = useState(1);
  const [storedBarkPieces, setStoredBarkPieces] = useState(0);
  const [storedSeedPieces, setStoredSeedPieces] = useState(0);

  // Audio Context for Retro Synth Sound Effects
  const audioCtxRef = useRef(null);

  const playBeep = (freq, duration = 0.1, type = "sine") => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      osc.connect(gainNode);
      gainNode.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch (e) {
      // Audio fallback
    }
  };

  const playSuccessSound = () => {
    playBeep(261.63, 0.1, "triangle"); // C4
    setTimeout(() => playBeep(329.63, 0.1, "triangle"), 80); // E4
    setTimeout(() => playBeep(392.00, 0.1, "triangle"), 160); // G4
    setTimeout(() => playBeep(523.25, 0.3, "sine"), 240); // C5
  };

  const playErrorSound = () => {
    playBeep(180, 0.25, "sawtooth");
  };

  const playWeatherAlertSound = () => {
    playBeep(150, 0.4, "sawtooth");
    setTimeout(() => playBeep(110, 0.5, "sawtooth"), 300);
  };

  // Top-Down Player State
  const [playerPos, setPlayerPos] = useState({ x: 5, y: 5 });
  const [activeEncounter, setActiveEncounter] = useState(null); 
  
  // Excavation Mini-Game State
  const [excavationMode, setExcavationMode] = useState(false);
  const [excavationGrid, setExcavationGrid] = useState([]); 
  const [scansLeft, setScansLeft] = useState(5);
  const [collectedPieces, setCollectedPieces] = useState([]); 
  const [excavationLog, setExcavationLog] = useState([]);

  // Soil Calibrator Quadratic Puzzle State
  const [soilQuadratic, setSoilQuadratic] = useState({ a: 1, b: -6, c: 8, r1: 2, r2: 4, discriminant: 4 });
  const [soilDiscInput, setSoilDiscInput] = useState('');
  const [soilRoot1Input, setSoilRoot1Input] = useState('');
  const [soilRoot2Input, setSoilRoot2Input] = useState('');
  const [soilSuccess, setSoilSuccess] = useState(false);

  // Natural Disaster Overlay State
  const [disasterActive, setDisasterActive] = useState(null); // e.g. "El Niño Stormfront"
  const [disasterReport, setDisasterReport] = useState([]);

  // Fusion State
  const [fusionParentA, setFusionParentA] = useState(null);
  const [fusionParentB, setFusionParentB] = useState(null);
  const [isFusing, setIsFusing] = useState(false);
  const [fusionCountdown, setFusionCountdown] = useState(0);

  // Sequencer Game State
  const [sequenceDifficulty, setSequenceDifficulty] = useState('medium'); 
  const [targetSequence, setTargetSequence] = useState([]);
  const [playerSequence, setPlayerSequence] = useState([]);
  const [sequencerScore, setSequencerScore] = useState(0);

  const addLog = (msg) => setLogs(prev => [msg, ...prev].slice(0, 5));
  const addExcavationLog = (msg) => setExcavationLog(prev => [msg, ...prev]);

  // Sandy Island Map Grid
  const mapGrid = useRef([
    ['T', 'T', 'T', 'T', 'T', 'T', 'T', 'T', 'T', 'T', 'T', 'T'],
    ['T', '.', '.', '.', '.', 'T', '.', 'G', 'G', 'G', 'G', 'T'],
    ['T', '.', 'L', 'L', '.', 'T', '.', 'G', 'G', 'G', 'G', 'T'],
    ['T', '.', 'L', 'L', '.', '.', '.', '.', '.', 'T', '.', 'T'],
    ['T', '.', '.', '.', '.', 'G', 'G', 'G', '.', 'T', '.', 'T'],
    ['T', 'T', 'T', '.', '.', 'G', 'G', 'G', '.', 'T', '.', 'T'],
    ['T', '.', '.', '.', '.', '.', '.', '.', '.', '.', '.', 'T'],
    ['T', '.', 'G', 'G', 'G', '.', '.', '.', 'T', 'T', '.', 'T'],
    ['T', '.', 'G', 'G', 'G', 'G', 'G', '.', 'T', '.', '.', 'T'],
    ['T', '.', 'G', 'G', 'G', 'G', 'G', '.', '.', '.', '.', 'T'],
    ['T', '.', '.', '.', '.', '.', '.', '.', '.', 'T', 'T', 'T'],
    ['T', 'T', 'T', 'T', 'T', 'T', 'T', 'T', 'T', 'T', 'T', 'T'],
  ]);

  const generateNewSequence = useCallback(() => {
    let length = 5;
    if (sequenceDifficulty === 'easy') length = 3;
    if (sequenceDifficulty === 'hard') length = 8;

    const newSeq = [];
    for (let i = 0; i < length; i++) {
      newSeq.push(RANDOM_BASES[Math.floor(Math.random() * RANDOM_BASES.length)]);
    }
    setTargetSequence(newSeq);
    setPlayerSequence([]);
  }, [sequenceDifficulty]);

  // Algorithmic soil quadratic curve builder
  const generateSoilPuzzle = useCallback(() => {
    const r1 = Math.floor(Math.random() * 5) + 1; 
    const r2 = r1 + Math.floor(Math.random() * 3) + 1; 

    const a = 1;
    const b = -(r1 + r2);
    const c = r1 * r2;
    const discriminant = b * b - 4 * a * c;

    setSoilQuadratic({ a, b, c, r1, r2, discriminant });
    setSoilDiscInput('');
    setSoilRoot1Input('');
    setSoilRoot2Input('');
    setSoilSuccess(false);
  }, []);

  useEffect(() => {
    generateNewSequence();
    generateSoilPuzzle();
  }, [generateNewSequence, generateSoilPuzzle]);

  // Natural Disaster Trigger (El Niño / Monsoon)
  const triggerNaturalDisaster = () => {
    playWeatherAlertSound();
    
    // Choose disaster
    const disasters = [
      { name: "El Niño Heatwave", desc: "Extreme scorching drought tests palm moisture retention." },
      { name: "Tropical Monsoon Storm", desc: "Fierce coastal winds and flooding tests soil anchoring." }
    ];
    const disaster = disasters[Math.floor(Math.random() * disasters.length)];
    setDisasterActive(disaster.name);

    let report = [];

    if (weatherShields > 0) {
      setWeatherShields(prev => prev - 1);
      report.push(`🛡️ Weather Shield activated! The entire greenhouse was protected from the ${disaster.name}.`);
    } else {
      // Storm hits every single palm
      setInventory(prevInventory => {
        const updated = prevInventory.map(palm => {
          // Reduce resistance by random amount
          const damage = Math.floor(Math.random() * 8) + 6;
          const remainingResistance = Math.max(0, palm.resistance - damage);
          
          // Survival chance = percentage of current resistance
          const survivalChance = remainingResistance / palm.maxResistance;
          const survived = Math.random() < (survivalChance * 0.8 + 0.2); // Base 20% luck

          if (remainingResistance <= 0 || !survived) {
            report.push(`🥀 ${palm.name} succumbed to the severe ${disaster.name} and withered.`);
            return null; // Flag for deletion
          } else {
            report.push(`🌿 ${palm.name} survived! Current Resistance lowered to ${remainingResistance}/${palm.maxResistance}.`);
            return { ...palm, resistance: remainingResistance };
          }
        }).filter(Boolean); // Remove withered trees

        // Keep at least 1 seed stock safe to prevent game over deadlock
        if (updated.length === 0) {
          report.push(`🧬 Site emergency backup: Re-cloned a starter Sabal Sapling from core seed bank!`);
          return [
            { id: Date.now(), name: 'Sabal Sapling', genes: ['EARTH'], level: 1, maxResistance: 25, resistance: 15, stats: { resistance: 25, production: 5 }, sprite: '🌴', alleles: { resistance: ['H', 'h'], production: ['Y', 'y'] } }
          ];
        }
        return updated;
      });
    }

    setDisasterReport(report);
  };

  // Movement Logic with harvest generation
  const movePlayer = useCallback((dx, dy) => {
    if (activeEncounter || excavationMode || disasterActive) return; 

    setPlayerPos(prev => {
      const newX = Math.min(Math.max(prev.x + dx, 0), MAP_SIZE - 1);
      const newY = Math.min(Math.max(prev.y + dy, 0), MAP_SIZE - 1);

      const tileType = mapGrid.current[newY][newX];
      if (tileType === 'T') {
        playBeep(120, 0.05, "square");
        return prev; 
      }

      // 1. Economic fruit harvest calculation per step
      const totalProduction = inventory.reduce((sum, palm) => sum + (palm.stats?.production || 5), 0);
      const fruitEarned = Math.max(1, Math.floor(totalProduction * 0.4)); // earn fruit based on yield
      setFruits(prevFruits => prevFruits + fruitEarned);

      // 2. Chance of random Natural Disaster (El Niño / Tropical Cyclone)
      if (Math.random() < 0.06) {
        triggerNaturalDisaster();
        return { x: newX, y: newY };
      }

      if (tileType === 'G') {
        if (Math.random() < 0.25) {
          const wild = WILD_PALMS[Math.floor(Math.random() * WILD_PALMS.length)];
          setActiveEncounter(wild);
          playBeep(440, 0.2, "sine");
          addLog(`Discovered a genome research zone for ${wild.name}!`);
        } else {
          playBeep(300, 0.05, "sine");
        }
      } else {
        playBeep(330, 0.03, "sine");
      }

      if (tileType === 'L') {
        addLog("At the greenhouse lab interface. You can cross-breed seeds!");
      }

      return { x: newX, y: newY };
    });
  }, [activeEncounter, excavationMode, disasterActive, inventory]);

  // Keyboard Event Handlers
  useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();
      if (key === 'arrowup' || key === 'w') movePlayer(0, -1);
      if (key === 'arrowdown' || key === 's') movePlayer(0, 1);
      if (key === 'arrowleft' || key === 'a') movePlayer(-1, 0);
      if (key === 'arrowright' || key === 'd') movePlayer(1, 0);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movePlayer]);

  // Setup Excavation Grid Game
  const startExcavation = () => {
    if (!activeEncounter) return;

    const items = [
      { type: 'fragment', name: 'Leaf', revealed: false },
      { type: 'fragment', name: 'Bark', revealed: false },
      { type: 'fragment', name: 'Seed', revealed: false },
      { type: 'dna', amount: 15, revealed: false },
      { type: 'dna', amount: 25, revealed: false },
      { type: 'dna', amount: 10, revealed: false },
      { type: 'empty', revealed: false },
      { type: 'empty', revealed: false },
      { type: 'empty', revealed: false }
    ];

    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }

    setExcavationGrid(items);
    setScansLeft(5);
    setCollectedPieces([]);
    setExcavationLog([`Site loaded. Locate Leaf, Bark, and Seed fragments! You have 5 brush actions.`]);
    setExcavationMode(true);
    playBeep(550, 0.15, "triangle");
  };

  // Click handler for uncovering dirt/sand in excavation grid and adding to persistent global inventory
  const handleUncoverTile = (index) => {
    if (scansLeft <= 0 || excavationGrid[index].revealed) return;

    const newGrid = [...excavationGrid];
    const tile = newGrid[index];
    tile.revealed = true;
    setExcavationGrid(newGrid);

    const nextScans = scansLeft - 1;
    setScansLeft(nextScans);

    if (tile.type === 'fragment') {
      playBeep(440, 0.1, "sine");
      setTimeout(() => playBeep(554.37, 0.15, "sine"), 80);
      
      const newCollected = [...collectedPieces, tile.name];
      setCollectedPieces(newCollected);
      
      // Save permanently to global botanist collection!
      if (tile.name === 'Leaf') {
        setStoredLeafPieces(prev => prev + 1);
        addExcavationLog(`🧩 Uncovered a Leaf Fragment! Added to your global puzzle vault.`);
      } else if (tile.name === 'Bark') {
        setStoredBarkPieces(prev => prev + 1);
        addExcavationLog(`🧩 Uncovered a Bark Fragment! Added to your global puzzle vault.`);
      } else if (tile.name === 'Seed') {
        setStoredSeedPieces(prev => prev + 1);
        addExcavationLog(`🧩 Uncovered a Seed Embryo! Added to your global puzzle vault.`);
      }

      // Check if all pieces were successfully uncovered *this run*
      if (newCollected.length === 3) {
        playSuccessSound();
        addExcavationLog(`🎉 Outstanding! You found all 3 fragments in this zone!`);
        
        // Directly cultivate palm as special explorer reward
        setInventory(prev => [...prev, {
          id: Date.now(),
          name: activeEncounter.name,
          genes: activeEncounter.genes,
          level: 1,
          maxResistance: activeEncounter.maxResistance,
          resistance: activeEncounter.maxResistance,
          stats: { resistance: activeEncounter.maxResistance, production: activeEncounter.production },
          sprite: activeEncounter.sprite,
          alleles: activeEncounter.alleles || { resistance: ['H', 'h'], production: ['Y', 'y'] }
        }]);

        activeEncounter.genes.forEach(g => {
          if (!discoveredGenes.includes(g)) {
            setDiscoveredGenes(prev => [...prev, g]);
          }
        });

        addLog(`Successfully cataloged and grown ${activeEncounter.name} directly!`);

        setTimeout(() => {
          setExcavationMode(false);
          setActiveEncounter(null);
        }, 2200);
        return;
      }
    } else if (tile.type === 'dna') {
      playBeep(659.25, 0.1, "triangle");
      setDnaPoints(prev => prev + tile.amount);
      addExcavationLog(`✨ Recovered mineral DNA: +${tile.amount} Points!`);
    } else {
      playBeep(200, 0.15, "sawtooth");
      addExcavationLog(`🍃 Brushed away loose sand... nothing found.`);
    }

    if (nextScans === 0) {
      // Even if you ran out of scans, any pieces you clicked on remain in your global inventory!
      playErrorSound();
      addExcavationLog(`💨 Out of actions! All found fragments are safely stored in your permanent inventory.`);
      setTimeout(() => {
        setExcavationMode(false);
        setActiveEncounter(null);
      }, 2500);
    }
  };

  // Convert compiled pieces into a new palm tree of the player's choice!
  const handleAssemblePalmFromVault = () => {
    if (storedLeafPieces < 1 || storedBarkPieces < 1 || storedSeedPieces < 1) {
      playErrorSound();
      addLog("❌ You need at least 1 Leaf, 1 Bark & 1 Seed in your vault!");
      return;
    }

    // Deduct one of each piece
    setStoredLeafPieces(prev => prev - 1);
    setStoredBarkPieces(prev => prev - 1);
    setStoredSeedPieces(prev => prev - 1);

    // Pick a random palm from the wild pool
    const template = WILD_PALMS[Math.floor(Math.random() * WILD_PALMS.length)];

    const newPalm = {
      id: Date.now(),
      name: template.name,
      genes: template.genes,
      level: 1,
      maxResistance: template.resistance,
      resistance: template.resistance,
      stats: { resistance: template.resistance, production: template.production },
      sprite: template.sprite,
      alleles: template.alleles || { resistance: ['H', 'h'], production: ['Y', 'y'] }
    };

    playSuccessSound();
    setInventory(prev => [...prev, newPalm]);
    addLog(`🎲 Mystery assembly revealed: ${newPalm.name} (${template.rarity})!`);

    // Decode its genes
    newPalm.genes.forEach(g => {
      if (!discoveredGenes.includes(g)) {
        setDiscoveredGenes(prev => [...prev, g]);
      }
    });
  };

  const startFusionProcess = () => {
    if (!fusionParentA || !fusionParentB) return;
    if (dnaPoints < 50) return addLog("Need 50 DNA points to cross-breed.");

    setIsFusing(true);
    setFusionCountdown(3);
    playBeep(440, 0.1, "triangle");
  };

  useEffect(() => {
    if (!isFusing || fusionCountdown === null) return;

    if (fusionCountdown > 0) {
      const timer = setTimeout(() => {
        playBeep(440 + (3 - fusionCountdown) * 110, 0.15, "triangle");
        setFusionCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else {
      completeFusion();
    }
  }, [isFusing, fusionCountdown]);

  // Allelic Botanical Hybridization (Resistance and Production)
  const completeFusion = () => {
    setIsFusing(false);
    
    const parentAAlleles = fusionParentA.alleles || { resistance: ['H', 'h'], production: ['Y', 'y'] };
    const parentBAlleles = fusionParentB.alleles || { resistance: ['H', 'h'], production: ['Y', 'y'] };

    const babyHpAlleles = [
      parentAAlleles.resistance[Math.floor(Math.random() * 2)],
      parentBAlleles.resistance[Math.floor(Math.random() * 2)]
    ].sort(); 

    const babyAtkAlleles = [
      parentAAlleles.production[Math.floor(Math.random() * 2)],
      parentBAlleles.production[Math.floor(Math.random() * 2)]
    ].sort();

    const isWeakHp = babyHpAlleles[0] === 'h' && babyHpAlleles[1] === 'h'; 
    const isWeakAtk = babyAtkAlleles[0] === 'y' && babyAtkAlleles[1] === 'y'; 

    const baseMaxHp = Math.floor((fusionParentA.maxResistance + fusionParentB.maxResistance) * 0.8);
    const baseAtk = Math.floor((fusionParentA.stats.production + fusionParentB.stats.production) * 0.8);

    const finalMaxHp = isWeakHp ? Math.max(10, Math.floor(baseMaxHp * 0.6)) : baseMaxHp;
    const finalAtk = isWeakAtk ? Math.max(2, Math.floor(baseAtk * 0.6)) : baseAtk;

    const combinedGenes = Array.from(new Set([...fusionParentA.genes, ...fusionParentB.genes]));
    
    let prefix = "Hybrid";
    if (isWeakHp && isWeakAtk) prefix = "Dwarf-Sterile";
    else if (isWeakHp) prefix = "Dwarf-Bonsai";
    else if (isWeakAtk) prefix = "Low-Yield";
    else if (babyHpAlleles[0] === 'H' && babyHpAlleles[1] === 'H') prefix = "Giant-Imperial";

    const hybridName = `${prefix}-${fusionParentA.name.split('-')[0]}`;

    const hybrid = {
      id: Date.now(),
      name: hybridName,
      genes: combinedGenes,
      level: 1,
      maxResistance: finalMaxHp,
      resistance: finalMaxHp,
      stats: {
        resistance: finalMaxHp,
        production: finalAtk,
      },
      sprite: '🌴',
      alleles: {
        resistance: babyHpAlleles,
        production: babyAtkAlleles
      }
    };

    playSuccessSound();
    setInventory(prev => [...prev, hybrid]);
    setDnaPoints(prev => prev - 50);
    setFusionParentA(null);
    setFusionParentB(null);
    
    addLog(`Grown Hybrid Palm: ${hybridName}! (Height Genotype: ${babyHpAlleles.join('')}, Yield Genotype: ${babyAtkAlleles.join('')})`);
    
    if (isWeakHp || isWeakAtk) {
      addLog("⚠️ Recessive traits expressed: Offspring displays dwarf resistance or low crops production.");
    }
  };

  const handleBaseClick = (base) => {
    const nextIndex = playerSequence.length;
    const targetBase = targetSequence[nextIndex];
    const expectedComplement = BASE_PAIRS[targetBase].complement;

    if (base === expectedComplement) {
      const newPlayerSeq = [...playerSequence, base];
      setPlayerSequence(newPlayerSeq);

      const baseFreqs = { 'A': 293.66, 'T': 329.63, 'C': 392.00, 'G': 440.00 }; 
      playBeep(baseFreqs[base], 0.1, "sine");

      if (newPlayerSeq.length === targetSequence.length) {
        let rewardDna = 20;
        if (sequenceDifficulty === 'medium') rewardDna = 35;
        if (sequenceDifficulty === 'hard') rewardDna = 60;

        const genePool = Object.keys(GENES);
        const randomGene = genePool[Math.floor(Math.random() * genePool.length)];
        let bonusGeneMsg = "";
        if (Math.random() < 0.4 && !discoveredGenes.includes(randomGene)) {
          setDiscoveredGenes(prev => [...prev, randomGene]);
          bonusGeneMsg = ` & Decoded ${GENES[randomGene].label}!`;
        }

        playSuccessSound();
        setDnaPoints(prev => prev + rewardDna);
        setSequencerScore(prev => prev + 1);
        addLog(`Helix Sequenced Perfectly! +${rewardDna} DNA Points${bonusGeneMsg}.`);
        
        setTimeout(() => {
          generateNewSequence();
        }, 800);
      }
    } else {
      playErrorSound();
      addLog("DNA mismatch detected! Recalibrating sequencer helix...");
      setPlayerSequence([]);
    }
  };

  const handleRelease = (creatureId, name) => {
    if (inventory.length <= 1) {
      addLog("Cannot transplant your final root-stock seed!");
      return;
    }
    setInventory(prev => prev.filter(c => c.id !== creatureId));
    setDnaPoints(prev => prev + 30);
    playBeep(200, 0.2, "triangle");
    addLog(`Transplanted ${name} back into the beach forest. Received +30 DNA points.`);
  };

  const restAllCreatures = () => {
    setInventory(prev => prev.map(c => ({ ...c, resistance: c.maxResistance })));
    playBeep(440, 0.4, "sine");
    addLog("Hydrated and fertilized all specimens to full resistance in the greenhouse!");
  };

  // --- Real-Time Mendelian Calculations ---
  const isHhOutcomePossible = () => {
    if (!fusionParentA || !fusionParentB) return false;
    const pA = fusionParentA.alleles?.resistance || ['H', 'h'];
    const pB = fusionParentB.alleles?.resistance || ['H', 'h'];
    
    const possibleHPs = [
      [pA[0], pB[0]],
      [pA[0], pB[1]],
      [pA[1], pB[0]],
      [pA[1], pB[1]]
    ].map(combo => combo.sort().join(''));

    return possibleHPs.includes('hh');
  };

  const isYyOutcomePossible = () => {
    if (!fusionParentA || !fusionParentB) return false;
    const pA = fusionParentA.alleles?.production || ['Y', 'y'];
    const pB = fusionParentB.alleles?.production || ['Y', 'y'];

    const possibleYIELDs = [
      [pA[0], pB[0]],
      [pA[0], pB[1]],
      [pA[1], pB[0]],
      [pA[1], pB[1]]
    ].map(combo => combo.sort().join(''));

    return possibleYIELDs.includes('yy');
  };

  // --- Real-time Soil Chemistry Validation (Quadratic Solver) ---
  const handleCheckCalibration = () => {
    const numDisc = parseInt(soilDiscInput, 10);
    const numR1 = parseInt(soilRoot1Input, 10);
    const numR2 = parseInt(soilRoot2Input, 10);

    const userRoots = [numR1, numR2].sort((x, y) => x - y);
    const correctRoots = [soilQuadratic.r1, soilQuadratic.r2].sort((x, y) => x - y);

    if (
      numDisc === soilQuadratic.discriminant &&
      userRoots[0] === correctRoots[0] &&
      userRoots[1] === correctRoots[1]
    ) {
      playSuccessSound();
      setDnaPoints(prev => prev + 50);
      setSoilSuccess(true);
      addLog("🏆 Soil Calibrated! Nutrients balanced Perfectly. Received +50 DNA!");
    } else {
      playErrorSound();
      addLog("⚠️ Calibration mismatched! Recalculate discriminant or root coordinates.");
    }
  };

  // --- Sell Fruit for Cash Currency ($) ---
  const handleSellFruits = () => {
    if (fruits <= 0) {
      playErrorSound();
      addLog("❌ You do not have any fruits in storage to trade!");
      return;
    }
    const ratePerFruit = 3; 
    const totalEarnings = fruits * ratePerFruit;
    
    setMoney(prev => prev + totalEarnings);
    setFruits(0);
    playSuccessSound();
    addLog(`🍏 Handed over ${fruits} fruits to the harbor buyer. Earned $${totalEarnings}!`);
  };

  // --- Shop Purchases (With upgraded Fossil Brush granting puzzle pieces) ---
  const handleBuyItem = (itemType, cost) => {
    if (money < cost) {
      playErrorSound();
      addLog("❌ Insufficient funds! Sell fruits at the market to earn more cash ($).");
      return;
    }
    setMoney(prev => prev - cost);
    playBeep(440, 0.1, "sine");
    setTimeout(() => playBeep(523.25, 0.2, "sine"), 80);

    if (itemType === 'fertilizer') {
      setDnaPoints(prev => prev + 25);
      addLog("🛒 Purchased Organic Bio-Fertilizer! Gained +25 DNA points.");
    } else if (itemType === 'irrigation') {
      restAllCreatures();
      addLog("🛒 Ordered automated soil irrigation! All nursery palms restored.");
    } else if (itemType === 'scans') {
      setScansLeft(prev => prev + 3);
      
      // Award random persistent puzzle piece!
      const choices = ['Leaf', 'Bark', 'Seed'];
      const luckyDraw = choices[Math.floor(Math.random() * choices.length)];
      if (luckyDraw === 'Leaf') {
        setStoredLeafPieces(prev => prev + 1);
      } else if (luckyDraw === 'Bark') {
        setStoredBarkPieces(prev => prev + 1);
      } else if (luckyDraw === 'Seed') {
        setStoredSeedPieces(prev => prev + 1);
      }
      
      addLog(`🛒 Upgraded heavy fossil brush! Gained +3 excavation scan charges & Uncovered a bonus ${luckyDraw} Fragment!`);
    } else if (itemType === 'shield') {
      setWeatherShields(prev => prev + 1);
      addLog("🛒 Equipped storm protection shelter! Greenhouses protected from 1 El Niño anomaly.");
    }
  };

  return (
    <div className="min-h-screen bg-emerald-950/20 text-zinc-100 font-mono p-4 md:p-8 select-none">
      {/* Header */}
      <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center mb-8 border-b border-emerald-800/40 pb-4 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tighter text-emerald-400 flex items-center gap-2">
            <Dna className="animate-pulse text-emerald-400" /> PALMFORGE RPG
          </h1>
          <p className="text-xs text-zinc-500 font-bold uppercase">Island Botanist - Puzzle Assembly Edition</p>
        </div>
        
        {/* Wallet & Stats */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <div className="flex items-center gap-2 bg-zinc-900/80 px-3.5 py-1.5 rounded-full border border-zinc-700 text-xs md:text-sm">
            <span className="text-emerald-400 font-bold">🍏 {fruits} Fruit</span>
          </div>
          <div className="flex items-center gap-2 bg-zinc-900/80 px-3.5 py-1.5 rounded-full border border-zinc-700 text-xs md:text-sm">
            <span className="text-yellow-400 font-bold">${money} USD</span>
          </div>
          <div className="flex items-center gap-2 bg-zinc-900/80 px-3.5 py-1.5 rounded-full border border-zinc-700 text-xs md:text-sm">
            <FlaskConical className="text-emerald-400 w-4 h-4 animate-bounce" />
            <span className="font-bold text-emerald-400">{dnaPoints} DNA</span>
          </div>
          <div className="flex items-center gap-1.5 bg-zinc-900/80 px-3.5 py-1.5 rounded-full border border-zinc-700 text-xs">
            <Shield className="text-cyan-400 w-3.5 h-3.5" />
            <span className="text-cyan-400 font-bold">{weatherShields} Shields</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Sidebar Controls */}
        <div className="lg:col-span-3 flex flex-col gap-4">
          <button 
            onClick={() => setView('map')}
            className={`w-full p-4 flex items-center gap-3 rounded-lg border transition ${view === 'map' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'}`}
          >
            <MapIcon size={20} /> Island Exploration
          </button>
          <button 
            onClick={() => setView('sequencer')}
            className={`w-full p-4 flex items-center gap-3 rounded-lg border transition ${view === 'sequencer' ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'}`}
          >
            <Activity size={20} /> Gene Sequencer
          </button>
          <button 
            onClick={() => setView('lab')}
            className={`w-full p-4 flex items-center gap-3 rounded-lg border transition ${view === 'lab' ? 'bg-blue-500/20 border-blue-500 text-blue-400' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'}`}
          >
            <Microscope size={20} /> Cross-breeding Lab
          </button>
          <button 
            onClick={() => setView('soil')}
            className={`w-full p-4 flex items-center gap-3 rounded-lg border transition ${view === 'soil' ? 'bg-amber-500/20 border-amber-500 text-amber-400' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'}`}
          >
            <Award size={20} /> Soil Calibrator
          </button>
          <button 
            onClick={() => setView('market')}
            className={`w-full p-4 flex items-center gap-3 rounded-lg border transition ${view === 'market' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'}`}
          >
            <ShoppingBag size={20} /> Botanist Market
          </button>
          <button 
            onClick={() => setView('collection')}
            className={`w-full p-4 flex items-center gap-3 rounded-lg border transition ${view === 'collection' ? 'bg-purple-500/20 border-purple-500 text-purple-400' : 'bg-zinc-900 border-zinc-800 hover:border-zinc-600'}`}
          >
            <Info size={20} /> Greenhouse Nursery ({inventory.length})
          </button>

          {/* Persistent Genome Puzzle Piece Storage Vault */}
          <div className="bg-black/50 border border-zinc-800 p-4 rounded-xl space-y-3">
            <h3 className="text-xs uppercase text-cyan-400 font-bold flex items-center gap-1.5">
              <Boxes size={14} /> Genome Puzzle Vault
            </h3>
            <div className="grid grid-cols-3 gap-1.5 text-center font-bold text-xs">
              <div className="bg-zinc-900/60 p-2 border border-zinc-800 rounded">
                <span className="block text-lg">🍃</span>
                <span className="text-[10px] text-zinc-400 block mt-1">Leaf</span>
                <span className="text-emerald-400 text-[11px] block mt-0.5">x{storedLeafPieces}</span>
              </div>
              <div className="bg-zinc-900/60 p-2 border border-zinc-800 rounded">
                <span className="block text-lg">🪵</span>
                <span className="text-[10px] text-zinc-400 block mt-1">Bark</span>
                <span className="text-emerald-400 text-[11px] block mt-0.5">x{storedBarkPieces}</span>
              </div>
              <div className="bg-zinc-900/60 p-2 border border-zinc-800 rounded">
                <span className="block text-lg">🥥</span>
                <span className="text-[10px] text-zinc-400 block mt-1">Seed</span>
                <span className="text-emerald-400 text-[11px] block mt-0.5">x{storedSeedPieces}</span>
              </div>
            </div>
          </div>

          <div className="mt-2 bg-black/40 border border-zinc-800 p-4 rounded-lg">
            <h3 className="text-xs uppercase text-zinc-500 mb-2 font-bold">Research Log</h3>
            <div className="space-y-2 font-mono">
              {logs.map((log, i) => (
                <p key={i} className="text-[10px] leading-tight text-zinc-400 border-l border-zinc-700 pl-2 py-0.5">
                  {log}
                </p>
              ))}
            </div>
          </div>
        </div>

        {/* Main Workspace */}
        <div className="lg:col-span-9 bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden min-h-[500px]">
          
          {/* View: Explore (Beach Island Grid Map) */}
          {view === 'map' && (
            <div className="p-4 md:p-6 flex flex-col md:flex-row gap-6 items-center">
              
              <div className="flex-1 bg-amber-950/20 border-4 border-emerald-800/40 rounded-xl p-2 relative w-full aspect-square max-w-[420px] mx-auto overflow-hidden">
                {!excavationMode && !disasterActive && (
                  <div className="grid grid-cols-12 gap-1 w-full h-full">
                    {mapGrid.current.map((row, y) => 
                      row.map((tile, x) => {
                        const isPlayer = playerPos.x === x && playerPos.y === y;
                        let bgClass = "bg-amber-900/10";
                        let content = "";
                        
                        if (tile === 'T') {
                          bgClass = "bg-emerald-950/80 border-emerald-900 text-emerald-500";
                          content = "🌲";
                        } else if (tile === 'G') {
                          bgClass = "bg-emerald-900/40 border-emerald-800 text-emerald-400";
                          content = "🌿";
                        } else if (tile === 'L') {
                          bgClass = "bg-sky-950/60 border-sky-900 text-sky-400";
                          content = "🔬";
                        }
                        
                        return (
                          <div 
                            key={`${x}-${y}`} 
                            className={`aspect-square flex items-center justify-center text-xs md:text-lg border rounded transition-all duration-150 ${bgClass} ${isPlayer ? 'ring-4 ring-emerald-400 ring-offset-2 ring-offset-zinc-950 scale-105 z-10' : 'border-zinc-900/50'}`}
                          >
                            {isPlayer ? "🚶" : content}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* NATURAL DISASTER ACTIVE OVERLAY MODAL */}
                {disasterActive && (
                  <div className="absolute inset-0 bg-black/95 flex flex-col justify-between p-4 z-40 overflow-y-auto">
                    <div className="flex flex-col items-center text-center mt-2">
                      <CloudLightning className="w-16 h-16 text-yellow-500 animate-bounce mb-2" />
                      <h3 className="text-lg font-bold text-red-400 uppercase tracking-widest">{disasterActive} Warning!</h3>
                      <p className="text-xs text-zinc-400 mt-1 max-w-sm">Climatic shock wave detected across the archipelago!</p>
                    </div>

                    <div className="bg-zinc-900/90 border border-zinc-800 p-3 rounded-lg my-3 space-y-1.5 h-44 overflow-y-auto text-left">
                      {disasterReport.map((line, idx) => (
                        <p key={idx} className="text-[10px] text-zinc-300 font-mono leading-tight border-l border-zinc-700 pl-2">
                          {line}
                        </p>
                      ))}
                    </div>

                    <button 
                      onClick={() => { playBeep(330, 0.1); setDisasterActive(null); }}
                      className="w-full bg-red-800 hover:bg-red-700 text-white font-bold py-2 rounded text-xs transition active:scale-95"
                    >
                      CLEAR STORM PROTOCOL
                    </button>
                  </div>
                )}

                {/* Excavation Game Board */}
                {excavationMode && activeEncounter && (
                  <div className="absolute inset-0 bg-zinc-950 flex flex-col justify-between p-4 z-30 overflow-y-auto">
                    <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
                      <span className="text-xs font-semibold text-yellow-500 uppercase tracking-widest flex items-center gap-1">
                        <Search size={12} /> Genome Excavation Site: {activeEncounter.name}
                      </span>
                      <button 
                        onClick={() => { playBeep(200, 0.1); setExcavationMode(false); }}
                        className="text-[10px] bg-zinc-850 hover:bg-zinc-800 px-2 py-0.5 rounded text-zinc-300"
                      >
                        Abandon
                      </button>
                    </div>

                    {/* Progress tracker of found items THIS run */}
                    <div className="grid grid-cols-3 gap-2 text-center py-2">
                      <div className={`p-2 rounded-lg border text-xs font-bold transition ${collectedPieces.includes('Leaf') ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}>
                        Leaf piece
                      </div>
                      <div className={`p-2 rounded-lg border text-xs font-bold transition ${collectedPieces.includes('Bark') ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}>
                        Bark piece
                      </div>
                      <div className={`p-2 rounded-lg border text-xs font-bold transition ${collectedPieces.includes('Seed') ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}>
                        Seed piece
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 aspect-square max-w-[200px] mx-auto my-2">
                      {excavationGrid.map((tile, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleUncoverTile(idx)}
                          disabled={tile.revealed}
                          className={`aspect-square flex items-center justify-center rounded-xl border text-xl transition-all active:scale-95 duration-150 ${
                            tile.revealed
                              ? tile.type === 'fragment'
                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-inner'
                                : tile.type === 'dna'
                                ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400 shadow-inner'
                                : 'bg-zinc-900 border-zinc-800 text-zinc-700 opacity-40 shadow-inner'
                              : 'bg-amber-950/40 border-amber-800/60 hover:bg-amber-900/40 text-amber-500 cursor-pointer'
                          }`}
                        >
                          {tile.revealed 
                            ? tile.type === 'fragment' 
                              ? tile.name === 'Leaf' ? '🍃' : tile.name === 'Bark' ? '🪵' : '🥥'
                              : tile.type === 'dna' 
                              ? '🧬' 
                              : '🕳️'
                            : '🏜️'
                          }
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-between items-center bg-zinc-900/50 p-2.5 rounded-lg border border-zinc-850">
                      <div className="text-[10px] text-zinc-400">
                        Remaining Brush Scans: <strong className="text-yellow-500 text-xs">{scansLeft}</strong>
                      </div>
                      <div className="text-[10px] text-zinc-500 italic truncate max-w-[200px]">
                        {excavationLog[0] || "Begin scanning!"}
                      </div>
                    </div>
                  </div>
                )}

                {/* Encounter Modal: Setup Excavation */}
                {activeEncounter && !excavationMode && (
                  <div className="absolute inset-0 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center text-center p-4 z-20 font-mono">
                    <div className="w-14 h-14 bg-emerald-500/10 rounded-full border border-emerald-500 flex items-center justify-center text-4xl mb-2 animate-bounce">
                      {activeEncounter.sprite}
                    </div>
                    <h3 className="text-md font-bold text-emerald-400">{activeEncounter.name} Research Zone</h3>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-4">Genome Pieces: 3 Buried</p>
                    
                    <p className="text-[11px] text-zinc-450 max-w-xs mb-4">
                      An ancient botanical record of this palm species is buried here in the sand layers! Start an excavation brush scan to unlock its seeds.
                    </p>

                    <div className="flex flex-col gap-2 w-full max-w-xs">
                      <button 
                        onClick={startExcavation}
                        className="bg-emerald-600 hover:bg-emerald-500 py-2 rounded text-xs font-bold text-white transition active:scale-95 flex items-center justify-center gap-1"
                      >
                        <Search size={14} /> Excavate Site (5 Brushes)
                      </button>
                      <button 
                        onClick={() => { playBeep(200, 0.05); setActiveEncounter(null); }}
                        className="text-[10px] text-zinc-500 hover:text-zinc-300 underline mt-2"
                      >
                        Ignore & Walk Away
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* D-Pad Controls & Floating Sell Bar */}
              <div className="w-full md:w-48 flex flex-col items-center gap-4">
                {/* Fast-Sell Interactive Container */}
                <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl w-full text-center">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider block mb-1">Exchange Bin</span>
                  <button 
                    onClick={handleSellFruits}
                    className="w-full bg-emerald-600/20 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-400 hover:text-white py-1.5 px-3 rounded text-xs font-bold flex items-center justify-center gap-1 transition active:scale-95"
                  >
                    <TrendingUp size={12} /> Sell {fruits} Fruits ($3/ea)
                  </button>
                </div>

                <div className="bg-zinc-900/80 p-4 border border-zinc-800 rounded-xl text-center w-full">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Island Nav</h4>
                  <div className="grid grid-cols-3 gap-2 w-32 mx-auto">
                    <div></div>
                    <button 
                      onClick={() => movePlayer(0, -1)}
                      className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg flex items-center justify-center transition active:scale-90"
                    >
                      <ArrowUp size={18} />
                    </button>
                    <div></div>

                    <button 
                      onClick={() => movePlayer(-1, 0)}
                      className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg flex items-center justify-center transition active:scale-90"
                    >
                      <ArrowLeft size={18} />
                    </button>
                    <div className="w-10 h-10 flex items-center justify-center text-[10px] text-zinc-650 font-bold font-mono">OK</div>
                    <button 
                      onClick={() => movePlayer(1, 0)}
                      className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg flex items-center justify-center transition active:scale-90"
                    >
                      <ArrowRight size={18} />
                    </button>

                    <div></div>
                    <button 
                      onClick={() => movePlayer(0, 1)}
                      className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg flex items-center justify-center transition active:scale-90"
                    >
                      <ArrowDown size={18} />
                    </button>
                    <div></div>
                  </div>
                </div>

                <button
                  onClick={restAllCreatures}
                  className="w-full bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-800 text-emerald-300 py-3 px-4 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                >
                  <FlaskConical size={14} /> Irrigate Nursery Greenhouse
                </button>
              </div>

            </div>
          )}

          {/* View: DNA Sequencer */}
          {view === 'sequencer' && (
            <div className="p-6 flex flex-col justify-between h-full min-h-[500px]">
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-cyan-400">
                      <Activity className="animate-pulse" /> 8-Bit Helix Sequencer
                    </h2>
                    <p className="text-xs text-zinc-400">Assemble complementary nucleobases to extract stable DNA!</p>
                  </div>
                  
                  <div className="flex gap-1.5 bg-zinc-950 p-1.5 rounded-lg border border-zinc-850">
                    {['easy', 'medium', 'hard'].map((diff) => (
                      <button
                        key={diff}
                        onClick={() => {
                          setSequenceDifficulty(diff);
                          playBeep(330, 0.1, "sine");
                        }}
                        className={`px-3 py-1 text-[10px] font-bold rounded uppercase transition ${
                          sequenceDifficulty === diff 
                            ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' 
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        {diff}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-black/60 border border-zinc-800 rounded-2xl p-6 md:p-8 mb-6 text-center relative overflow-hidden flex flex-col items-center">
                  <div className="absolute top-2 right-4 text-[10px] text-cyan-500 uppercase font-bold tracking-wider">
                    Bonus: {sequenceDifficulty === 'easy' ? '20' : sequenceDifficulty === 'medium' ? '35' : '60'} DNA
                  </div>

                  <div className="w-full">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-4">TARGET GENE CODE</span>
                    <div className="flex justify-center items-center gap-3 md:gap-4 flex-wrap">
                      {targetSequence.map((base, idx) => {
                        const isMatched = idx < playerSequence.length;
                        const isCurrent = idx === playerSequence.length;
                        return (
                          <div key={idx} className="flex flex-col items-center relative">
                            <div className="w-0.5 h-6 bg-zinc-800 border-dashed border-l my-1 relative">
                              {isMatched && <div className="absolute inset-y-0 left-0 w-0.5 bg-gradient-to-b from-cyan-400 to-emerald-400" />}
                            </div>
                            
                            <div 
                              className={`w-11 h-11 flex items-center justify-center rounded-lg border-2 text-md font-black transition-all duration-300 ${
                                isMatched 
                                  ? BASE_PAIRS[base].color + ' scale-90' 
                                  : isCurrent 
                                  ? 'bg-zinc-850 border-cyan-400 text-zinc-100 animate-pulse scale-105' 
                                  : 'bg-zinc-900 border-zinc-800 text-zinc-600'
                              }`}
                            >
                              {base}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="w-full h-8 flex justify-center items-center opacity-40">
                    <div className="h-0.5 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent w-3/4" />
                  </div>

                  <div className="w-full">
                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest block mb-4">COMPLEMENTARY MATCHES</span>
                    <div className="flex justify-center gap-3 md:gap-4 flex-wrap">
                      {targetSequence.map((_, idx) => {
                        const playerBase = playerSequence[idx];
                        const isFilled = playerBase !== undefined;
                        return (
                          <div key={idx} className="flex flex-col items-center">
                            <div 
                              className={`w-11 h-11 flex items-center justify-center rounded-lg border text-md font-bold transition-all duration-300 ${
                                isFilled 
                                  ? BASE_PAIRS[playerBase].color + ' scale-95 shadow-[0_0_10px_rgba(6,182,212,0.15)]' 
                                  : 'bg-zinc-950/40 border-zinc-850 text-transparent'
                              }`}
                            >
                              {playerBase || '?'}
                            </div>
                            <div className="w-0.5 h-6 bg-zinc-800/40 mt-1" />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center text-xs text-zinc-400 font-bold uppercase tracking-wider max-w-md mx-auto font-mono">
                  <span>Solved Helix: {sequencerScore}</span>
                  <span>Complement Pairs: A&harr;T, C&harr;G</span>
                </div>
                
                <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
                  {RANDOM_BASES.map(base => (
                    <button
                      key={base}
                      onClick={() => handleBaseClick(base)}
                      className="bg-zinc-800 hover:bg-cyan-600 border border-zinc-700 py-3.5 rounded-xl text-xl font-black transition duration-150 active:scale-95 text-cyan-200"
                    >
                      {base}
                    </button>
                  ))}
                </div>

                <div className="flex justify-center pt-2">
                  <button 
                    onClick={() => { playBeep(250, 0.2, "sawtooth"); generateNewSequence(); }} 
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 uppercase font-bold"
                  >
                    <RotateCcw size={12} /> Force Resynthesize Strand
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* View: Soil Calibrator */}
          {view === 'soil' && (
            <div className="p-6 flex flex-col justify-between h-full min-h-[500px]">
              <div>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                  <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-amber-400">
                      <FlaskConical className="animate-pulse" /> Soil Nutrient Calibrator
                    </h2>
                    <p className="text-xs text-zinc-400">Apply the Quadratic Formula to find healthy survival root values!</p>
                  </div>
                  <button 
                    onClick={generateSoilPuzzle}
                    className="text-[10px] bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded text-zinc-300 font-bold flex items-center gap-1"
                  >
                    <RotateCcw size={11} /> Refresh Curve
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Quadratic Details & Text Solver */}
                  <div className="md:col-span-6 bg-zinc-950/70 p-4 border border-zinc-800 rounded-xl space-y-4">
                    <div className="space-y-1">
                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block">CURRENT SOIL CURVE:</span>
                      <p className="text-md font-bold text-amber-300">
                        y = {soilQuadratic.a}x² {soilQuadratic.b >= 0 ? `+ ${soilQuadratic.b}` : `- ${Math.abs(soilQuadratic.b)}`}x {soilQuadratic.c >= 0 ? `+ ${soilQuadratic.c}` : `- ${Math.abs(soilQuadratic.c)}`}
                      </p>
                    </div>

                    <div className="border-t border-zinc-800 my-2 pt-2 text-[11px] text-zinc-400 space-y-2 leading-relaxed">
                      <p>🎓 <strong>Formula Helper:</strong></p>
                      <p>1. Find Discriminant: <strong className="text-amber-200">D = b² - 4ac</strong></p>
                      <p>2. Solve Roots: <strong className="text-amber-200">x = (-b ± √D) / 2a</strong></p>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[10px] text-zinc-500 font-bold block mb-1">DISCRIMINANT (D):</label>
                        <input 
                          type="number"
                          value={soilDiscInput}
                          onChange={(e) => setSoilDiscInput(e.target.value)}
                          disabled={soilSuccess}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded p-1 text-sm font-bold text-cyan-300 focus:outline-none focus:border-amber-400"
                          placeholder="Calculate b² - 4ac..."
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-zinc-500 font-bold block mb-1">SMALLER ROOT (x₁):</label>
                          <input 
                            type="number"
                            value={soilRoot1Input}
                            onChange={(e) => setSoilRoot1Input(e.target.value)}
                            disabled={soilSuccess}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded p-1 text-sm font-bold text-emerald-300 focus:outline-none focus:border-amber-400"
                            placeholder="Lowest Root..."
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-zinc-500 font-bold block mb-1">LARGER ROOT (x₂):</label>
                          <input 
                            type="number"
                            value={soilRoot2Input}
                            onChange={(e) => setSoilRoot2Input(e.target.value)}
                            disabled={soilSuccess}
                            className="w-full bg-zinc-900 border border-zinc-700 rounded p-1 text-sm font-bold text-emerald-300 focus:outline-none focus:border-amber-400"
                            placeholder="Highest Root..."
                          />
                        </div>
                      </div>

                      {soilSuccess ? (
                        <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs text-center font-bold animate-pulse">
                          ✨ Calibration successful! Growth resistance boosted in Greenhouse.
                        </div>
                      ) : (
                        <button
                          onClick={handleCheckCalibration}
                          className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 rounded text-xs transition active:scale-95 flex items-center justify-center gap-1"
                        >
                          <Hammer size={13} /> TEST & RE-ALIGN SOIL
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Gorgeous Live-Plotted Parabola SVG */}
                  <div className="md:col-span-6 flex flex-col items-center">
                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider block mb-2">SOIL SATURATION PARABOLA</span>
                    
                    <div className="bg-black/80 border border-zinc-800 p-4 rounded-2xl w-full aspect-[4/3] flex items-center justify-center relative">
                      <svg viewBox="0 0 300 200" className="w-full h-full text-zinc-600">
                        <line x1="0" y1="120" x2="300" y2="120" stroke="#27272a" strokeWidth="2" /> {/* X Axis */}
                        <line x1="150" y1="0" x2="150" y2="200" stroke="#27272a" strokeWidth="2" /> {/* Y Axis */}

                        <path 
                          d={Array.from({ length: 41 }, (_, idx) => {
                            const mathX = -10 + idx * 0.5;
                            const mathY = soilQuadratic.a * Math.pow(mathX, 2) + soilQuadratic.b * mathX + soilQuadratic.c;
                            const svgX = 150 + mathX * 18;
                            const svgY = 120 - mathY * 6;
                            return `${idx === 0 ? 'M' : 'L'} ${svgX} ${svgY}`;
                          }).join(' ')} 
                          fill="none" 
                          stroke={soilSuccess ? "#10b981" : "#f59e0b"} 
                          strokeWidth="2.5" 
                          className="transition-all duration-500"
                        />

                        {/* Root Markers */}
                        <circle cx={150 + soilQuadratic.r1 * 18} cy="120" r="4" fill="#3b82f6" />
                        <circle cx={150 + soilQuadratic.r2 * 18} cy="120" r="4" fill="#3b82f6" />
                        
                        {/* Vertex Marker */}
                        {(() => {
                          const vX = -soilQuadratic.b / (2 * soilQuadratic.a);
                          const vY = soilQuadratic.a * vX * vX + soilQuadratic.b * vX + soilQuadratic.c;
                          return <circle cx={150 + vX * 18} cy={120 - vY * 6} r="4" fill="#ec4899" />;
                        })()}

                        <text x={150 + soilQuadratic.r1 * 18} y="135" fill="#3b82f6" fontSize="9" textAnchor="middle">x₁</text>
                        <text x={150 + soilQuadratic.r2 * 18} y="135" fill="#3b82f6" fontSize="9" textAnchor="middle">x₂</text>
                        <text x="10" y="115" fill="#52525b" fontSize="8">Ground Threshold (y=0)</text>
                      </svg>
                      
                      <div className="absolute bottom-2 left-4 flex gap-4 text-[8px] text-zinc-500">
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-pink-500 rounded-full"/> Peak Mineral Intake (Vertex)</span>
                        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full"/> Neutralization Points (Roots)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* View: Botanist Shop & Exchange Counter */}
          {view === 'market' && (
            <div className="p-6 space-y-6">
              {/* EXCHANGE SECTION */}
              <div className="bg-emerald-950/20 border border-emerald-800/40 p-5 rounded-2xl text-center space-y-4">
                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="text-md font-bold text-emerald-400 uppercase flex items-center justify-center gap-2">
                    🍏 Harbor Fruit Export Counter
                  </h3>
                  <p className="text-xs text-zinc-400">
                    Trade your harvested biological fruit directly to the trade harbor for official currency.
                  </p>
                  <div className="flex justify-center gap-4 text-sm font-bold text-zinc-300 pt-2">
                    <span>In Storage: <strong className="text-emerald-400">{fruits} Fruits</strong></span>
                    <span>Exchange Price: <strong className="text-yellow-400">$3 / Fruit</strong></span>
                  </div>
                </div>

                <button 
                  onClick={handleSellFruits}
                  disabled={fruits === 0}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-850 disabled:text-zinc-500 text-white font-bold py-3 px-6 rounded-lg text-xs transition active:scale-95 shadow-md"
                >
                  SELL ALL HARVESTED FRUIT (+${fruits * 3})
                </button>
              </div>

              {/* BOTANIST ACCESSORY STORE */}
              <div>
                <h2 className="text-xl font-bold mb-4 text-yellow-500 flex items-center gap-2">
                  <ShoppingBag /> Botanist Accessory Store
                </h2>
                <p className="text-xs text-zinc-400 mb-6">Trade USD ($) collected from fruit sales for active research perks!</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-sm text-emerald-400">📦 Organic Bio-Fertilizer</h3>
                      <p className="text-[10px] text-zinc-400 max-w-[200px] mt-1">Nourishes roots with immediate molecular nutrients.</p>
                      <span className="text-xs text-yellow-400 font-bold block mt-2">Cost: $50</span>
                    </div>
                    <button 
                      onClick={() => handleBuyItem('fertilizer', 50)}
                      className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded text-xs font-bold text-white transition active:scale-95"
                    >
                      Buy (+25 DNA)
                    </button>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-sm text-sky-400">💧 Auto-Irrigation Cycle</h3>
                      <p className="text-[10px] text-zinc-400 max-w-[200px] mt-1">Waters all greenhouse palms to 100% full Resistance.</p>
                      <span className="text-xs text-yellow-400 font-bold block mt-2">Cost: $100</span>
                    </div>
                    <button 
                      onClick={() => handleBuyItem('irrigation', 100)}
                      className="bg-sky-600 hover:bg-sky-500 px-4 py-2 rounded text-xs font-bold text-white transition active:scale-95"
                    >
                      Irrigate All
                    </button>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-sm text-pink-400">🧹 Heavy Fossil Brush</h3>
                      <p className="text-[10px] text-zinc-400 max-w-[200px] mt-1">Gives +3 scans AND unearths a random Genome Fragment.</p>
                      <span className="text-xs text-yellow-400 font-bold block mt-2">Cost: $150</span>
                    </div>
                    <button 
                      onClick={() => handleBuyItem('scans', 150)}
                      className="bg-pink-600 hover:bg-pink-500 px-4 py-2 rounded text-xs font-bold text-white transition active:scale-95"
                    >
                      Buy (+Piece)
                    </button>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-sm text-cyan-400">🛡️ Weather Deflector Shield</h3>
                      <p className="text-[10px] text-zinc-400 max-w-[200px] mt-1">Safely absorbs the next climate event (monsoon or drought).</p>
                      <span className="text-xs text-yellow-400 font-bold block mt-2">Cost: $250</span>
                    </div>
                    <button 
                      onClick={() => handleBuyItem('shield', 250)}
                      className="bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded text-xs font-bold text-white transition active:scale-95"
                    >
                      Buy Shield
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* View: Lab (Cross-breeding, Punnett Predictions, and Puzzle Reconstruction assembly) */}
          {view === 'lab' && (
            <div className="p-6 space-y-8">
              {/* PUZZLE PIECE ASSEMBLY STATION */}
              <div className="bg-cyan-950/10 border border-cyan-800/40 p-5 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <Boxes className="text-cyan-400" />
                  <h3 className="text-md font-bold text-cyan-400 uppercase">Fossil Specimen Assembler</h3>
                </div>
                <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
                  Spend <strong>1 Leaf + 1 Bark + 1 Seed</strong> from your vault to grow a <strong className="text-cyan-300">mystery palm</strong> — the species is randomised from the wild pool!
                </p>

                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* Piece cost display */}
                  <div className="flex gap-3 text-center font-bold">
                    {[
                      { emoji: '🍃', label: 'Leaf', count: storedLeafPieces },
                      { emoji: '🪵', label: 'Bark', count: storedBarkPieces },
                      { emoji: '🥥', label: 'Seed', count: storedSeedPieces },
                    ].map(({ emoji, label, count }) => (
                      <div key={label} className={`px-4 py-3 rounded-xl border text-xs ${count >= 1 ? 'bg-cyan-950/30 border-cyan-700 text-cyan-300' : 'bg-zinc-900 border-zinc-700 text-zinc-500'}`}>
                        <span className="text-2xl block mb-1">{emoji}</span>
                        <span className="block text-[10px] text-zinc-400">{label}</span>
                        <span className="block font-bold">x{count}</span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col items-center gap-2 flex-1">
                    <div className="text-3xl">🎲</div>
                    <p className="text-[10px] text-zinc-500 text-center max-w-[160px]">Species revealed only after assembly!</p>
                    <button
                      disabled={storedLeafPieces < 1 || storedBarkPieces < 1 || storedSeedPieces < 1}
                      onClick={handleAssemblePalmFromVault}
                      className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white font-bold py-2 px-6 rounded-lg text-xs transition active:scale-95 w-full max-w-[180px]"
                    >
                      Assemble Mystery Palm
                    </button>
                  </div>
                </div>
              </div>

              {/* CROSS BREEDING CHAMBER */}
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-blue-400">
                  <FlaskConical /> Cross-breeding Chamber
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center mb-8 bg-zinc-900/40 p-6 rounded-2xl border border-zinc-800">
                  {/* Slot A */}
                  <div 
                    onClick={() => { if (!isFusing) { playBeep(200, 0.05); setFusionParentA(null); } }}
                    className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition ${fusionParentA ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-700 bg-zinc-800/30 hover:border-zinc-500'} ${isFusing ? 'pointer-events-none' : ''}`}
                  >
                    {fusionParentA ? (
                      <>
                        <span className="text-4xl mb-2">{fusionParentA.sprite}</span>
                        <span className="text-xs font-bold text-emerald-400">{fusionParentA.name}</span>
                        <p className="text-[9px] text-zinc-400 mt-1">Resist: {fusionParentA.alleles?.resistance.join('')} | Prod: {fusionParentA.alleles?.production.join('')}</p>
                      </>
                  ) : (
                    <span className="text-zinc-600 text-xs text-center font-bold">SELECT PARENT A</span>
                  )}
                  </div>

                  {/* Countdown / Action Area */}
                  <div className="flex flex-col items-center justify-center min-h-[140px]">
                    {isFusing ? (
                      <div className="text-center w-full animate-bounce">
                        <p className="text-xs uppercase text-zinc-500 mb-1 font-bold">Cross-Breeding Hybrid Seed...</p>
                        <p className="text-4xl font-black text-emerald-400 mb-2">{fusionCountdown}s</p>
                        <div className="h-2 bg-zinc-850 w-full rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-emerald-500 transition-all duration-1000" 
                            style={{ width: `${((3 - fusionCountdown) / 3) * 100}%` }}
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <Dna size={32} className={`mb-2 ${fusionParentA && fusionParentB ? 'text-emerald-400 animate-spin' : 'text-zinc-700'}`} />
                        <button 
                          disabled={!fusionParentA || !fusionParentB}
                          onClick={startFusionProcess}
                          className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-850 disabled:text-zinc-600 text-white px-8 py-2.5 rounded-lg font-bold text-sm transition active:scale-95 shadow-md w-full max-w-[150px]"
                        >
                          HYBRIDIZE (-50 DNA)
                        </button>
                      </>
                    )}
                  </div>

                  {/* Slot B */}
                  <div 
                    onClick={() => { if (!isFusing) { playBeep(200, 0.05); setFusionParentB(null); } }}
                    className={`aspect-square rounded-xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition ${fusionParentB ? 'border-emerald-500 bg-emerald-500/10' : 'border-zinc-700 bg-zinc-800/30 hover:border-zinc-500'} ${isFusing ? 'pointer-events-none' : ''}`}
                  >
                    {fusionParentB ? (
                      <>
                        <span className="text-4xl mb-2">{fusionParentB.sprite}</span>
                        <span className="text-xs font-bold text-emerald-400">{fusionParentB.name}</span>
                        <p className="text-[9px] text-zinc-400 mt-1">Resist: {fusionParentB.alleles?.resistance.join('')} | Prod: {fusionParentB.alleles?.production.join('')}</p>
                      </>
                    ) : (
                      <span className="text-zinc-600 text-xs text-center font-bold">SELECT PARENT B</span>
                    )}
                  </div>
                </div>

                {/* Punnett Square Predictions */}
                {fusionParentA && fusionParentB && !isFusing && (
                  <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-4 mb-6 font-mono">
                    <h3 className="text-xs text-emerald-400 uppercase font-black tracking-wider mb-4 flex items-center gap-1.5">
                      <Award size={14} /> Mendelian Punnett Square Predictions
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* HP Allele Square (Resistance) */}
                      <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">Resistance Probability</p>
                        <div className="grid grid-cols-3 gap-1 text-center font-bold text-xs">
                          <div className="bg-zinc-950 text-zinc-650 p-2 text-[10px]">A \ B</div>
                          <div className="bg-zinc-900 p-2 text-zinc-300">{fusionParentB.alleles?.resistance[0]}</div>
                          <div className="bg-zinc-900 p-2 text-zinc-300">{fusionParentB.alleles?.resistance[1]}</div>
                          <div className="bg-zinc-900 p-2 text-zinc-300">{fusionParentA.alleles?.resistance[0]}</div>
                          <div className="bg-emerald-950/40 p-2 border border-emerald-900 text-emerald-300">{fusionParentA.alleles?.resistance[0]}{fusionParentB.alleles?.resistance[0]}</div>
                          <div className="bg-emerald-950/40 p-2 border border-emerald-900 text-emerald-300">{fusionParentA.alleles?.resistance[0]}{fusionParentB.alleles?.resistance[1]}</div>
                          <div className="bg-zinc-900 p-2 text-zinc-300">{fusionParentA.alleles?.resistance[1]}</div>
                          <div className="bg-emerald-950/40 p-2 border border-emerald-900 text-emerald-300">{fusionParentA.alleles?.resistance[1]}{fusionParentB.alleles?.resistance[0]}</div>
                          <div className="bg-red-950/40 p-2 border border-red-900 text-red-400">{fusionParentA.alleles?.resistance[1]}{fusionParentB.alleles?.resistance[1]}</div>
                        </div>
                        
                        {isHhOutcomePossible() ? (
                          <p className="text-[9px] text-zinc-500 mt-2 leading-relaxed">
                            ⚠️ **hh** (Homozygous Dwarf) yields a **Fragile Phenotype (-40% Resistance)**.
                          </p>
                        ) : (
                          <p className="text-[9px] text-emerald-400 mt-2 leading-relaxed font-bold">
                            ✨ 100% Protected: No risk of expressing recessive dwarf traits with this parent combination!
                          </p>
                        )}
                      </div>

                      {/* Atk Allele Square (Production) */}
                      <div className="bg-zinc-900/50 p-3 rounded-lg border border-zinc-800">
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-2">Production Yield Probability</p>
                        <div className="grid grid-cols-3 gap-1 text-center font-bold text-xs">
                          <div className="bg-zinc-950 text-zinc-650 p-2 text-[10px]">A \ B</div>
                          <div className="bg-zinc-900 p-2 text-zinc-300">{fusionParentB.alleles?.production[0]}</div>
                          <div className="bg-zinc-900 p-2 text-zinc-300">{fusionParentB.alleles?.production[1]}</div>
                          <div className="bg-zinc-900 p-2 text-zinc-300">{fusionParentA.alleles?.production[0]}</div>
                          <div className="bg-emerald-950/40 p-2 border border-emerald-900 text-emerald-300">{fusionParentA.alleles?.production[0]}{fusionParentB.alleles?.production[0]}</div>
                          <div className="bg-emerald-950/40 p-2 border border-emerald-900 text-emerald-300">{fusionParentA.alleles?.production[0]}{fusionParentB.alleles?.production[1]}</div>
                          <div className="bg-zinc-900 p-2 text-zinc-300">{fusionParentA.alleles?.production[1]}</div>
                          <div className="bg-emerald-950/40 p-2 border border-emerald-900 text-emerald-300">{fusionParentA.alleles?.production[1]}{fusionParentB.alleles?.production[0]}</div>
                          <div className="bg-red-950/40 p-2 border border-red-900 text-red-400">{fusionParentA.alleles?.production[1]}{fusionParentB.alleles?.production[1]}</div>
                        </div>
                        
                        {isYyOutcomePossible() ? (
                          <p className="text-[9px] text-zinc-500 mt-2 leading-relaxed">
                            ⚠️ **yy** (Homozygous Low-Yield) yields a **Sub-Yield Phenotype (-40% Fruit Production yield)**.
                          </p>
                        ) : (
                          <p className="text-[9px] text-emerald-400 mt-2 leading-relaxed font-bold">
                            ✨ 100% Protected: No risk of expressing recessive low-yield traits with this parent combination!
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <h3 className="text-xs font-bold text-zinc-500 mb-4 uppercase tracking-widest">Available Rootstocks</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {inventory.map(c => (
                    <button
                      key={c.id}
                      onClick={() => {
                        if (isFusing) return;
                        playBeep(330, 0.08, "sine");
                        if (!fusionParentA) setFusionParentA(c);
                        else if (!fusionParentB && c !== fusionParentA) setFusionParentB(c);
                      }}
                      className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg flex items-center gap-3 hover:border-emerald-400 text-left transition"
                    >
                      <span className="text-2xl">{c.sprite}</span>
                      <div className="truncate flex-1">
                        <p className="text-xs font-bold truncate">{c.name}</p>
                        <p className="text-[9px] text-zinc-500">Resist: {c.alleles?.resistance.join('')} | Prod: {c.alleles?.production.join('')}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* View: Palm Collection */}
          {view === 'collection' && (
            <div className="p-6">
              <h2 className="text-xl font-bold mb-6">Specimen Greenhouse</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inventory.map(c => (
                  <div key={c.id} className="bg-zinc-800/80 border border-zinc-700 p-4 rounded-xl flex gap-4 relative group">
                    <div className="w-20 h-20 bg-black/40 rounded-lg flex items-center justify-center text-4xl shadow-inner border border-zinc-700/50">
                      {c.sprite}
                    </div>
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start">
                          <h3 className="font-bold text-md text-emerald-400">{c.name}</h3>
                          <span className="text-[10px] bg-zinc-750 px-2 py-0.5 rounded uppercase font-bold">GEN-1</span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          {c.genes.map(g => (
                            <span key={g} className="text-[9px] px-2 py-1 rounded-md bg-zinc-900 border border-zinc-700 flex items-center gap-1 font-mono">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: GENES[g]?.color }} />
                              {GENES[g]?.label}
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-2 text-[9px] text-zinc-400 font-mono">
                          <span>Resistance Genotype: <strong className="text-cyan-300">{c.alleles?.resistance.join('')}</strong></span>
                          <span>Production Genotype: <strong className="text-red-300">{c.alleles?.production.join('')}</strong></span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mt-3">
                        <div className="space-y-1">
                          <p className="text-[9px] text-zinc-500 uppercase font-bold">Resistance (HP)</p>
                          <div className="h-1 bg-zinc-700 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${(c.resistance/c.maxResistance)*100}%` }} />
                          </div>
                          <span className="text-[10px] text-zinc-400">{c.resistance} / {c.maxResistance}</span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-[9px] text-zinc-500 uppercase font-bold">Production Rate</p>
                          <p className="text-xs font-bold text-emerald-400 font-mono">🍏 {c.stats.production} Yield</p>
                        </div>
                      </div>

                      <button
                        onClick={() => handleRelease(c.id, c.name)}
                        disabled={inventory.length <= 1}
                        className="mt-3 py-1 bg-emerald-950/40 hover:bg-emerald-900 border border-emerald-800 disabled:opacity-30 disabled:hover:bg-emerald-950/40 text-emerald-300 rounded-md text-[10px] font-bold flex items-center justify-center gap-1 transition font-mono"
                      >
                        <TreePine size={11} /> TRANSPLANT (+30 DNA)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="max-w-5xl mx-auto mt-8 flex justify-between items-center text-[10px] text-zinc-650 uppercase tracking-widest font-bold font-mono">
        <p>Greenhouse Authority: Certified</p>
        <p>Ecosystem Level: Stable</p>
        <p>© 2026 IslandGenomics Ltd.</p>
      </div>
    </div>
  );
}