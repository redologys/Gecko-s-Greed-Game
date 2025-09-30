
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, EnemyType, PickupType, RiskLevel, HazardState } from './types';
import type { Player, Enemy, Projectile, FloatingText, Pickup, Particle, UserData, Curse, Vector2D, Hazard, ShopItem, PermanentUpgrade, Boon } from './types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PLAYER_MAX_HEALTH,
  PLAYER_SIZE,
  PLAYER_SPEED,
  PROJECTILE_SIZE,
  PROJECTILE_SPEED,
  PLAYER_ATTACK_COOLDOWN,
  ENEMY_SIZE,
  ENEMY_SPEED,
  ENEMY_PROJECTILE_SIZE,
  ENEMY_PROJECTILE_SPEED,
  FLOATING_TEXT_LIFESPAN,
  PICKUP_SIZE,
  PICKUP_LIFESPAN,
  TREASURE_PICKUP_BASE_VALUE,
  CRITICAL_HIT_ZONE_RADIUS,
  CRITICAL_HIT_MULTIPLIER,
  ENEMY_ATTACK_COOLDOWN,
  PLAYER_INVULNERABILITY_DURATION,
  ELITE_CHANCE,
  ELITE_SPEED_MULTIPLIER,
  ELITE_HEALTH_BONUS,
  ELITE_DAMAGE,
  SPIKE_TRAP_SIZE,
  SPIKE_TRAP_ARM_TIME,
  SPIKE_TRAP_ACTIVE_TIME,
  SPIKE_TRAP_IDLE_TIME,
  CURSED_TOMB_DEATH_CHANCE,
  RISK_REWARDS,
  CHAMPION_STATS,
  PERMANENT_UPGRADES,
  TOMB_FRAGMENT_CONVERSION_RATE,
} from './constants';
import GameCanvas from './components/GameCanvas';
import { ALL_CURSES, ALL_SHOP_ITEMS } from './gameConfig';
import { distance, getRandomElements } from './utils';
import GeckoIcon from './components/GeckoIcon';
import CoinIcon from './components/CoinIcon';
import TempleIcon from './components/TempleIcon';
import ShieldIcon from './components/ShieldIcon';
import { loadAssets, gameAssets, GameAssets } from './assets';

const DB_KEY = 'geckos-greed-db-v2';

function App() {
  const [gameState, setGameState] = useState<GameState>(GameState.LOADING);
  const [assets, setAssets] = useState<GameAssets>(gameAssets);
  const [player, setPlayer] = useState<Player>({
    position: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
    health: PLAYER_MAX_HEALTH,
    maxHealth: PLAYER_MAX_HEALTH,
    size: PLAYER_SIZE,
    invulnerabilityTimer: 0,
    activeBoon: null,
    shotsFiredThisRoom: 0,
    damageMultiplier: 1,
  });
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [playerProjectiles, setPlayerProjectiles] = useState<Projectile[]>([]);
  const [enemyProjectiles, setEnemyProjectiles] = useState<Projectile[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingText[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [hazards, setHazards] = useState<Hazard[]>([]);

  // --- User & Meta Progression State ---
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [userData, setUserData] = useState<UserData>({ bankedTreasure: 0, deepestRoom: 0, tombFragments: 0, unlocks: [] });
  
  // --- In-Run State ---
  const [selectedRisk, setSelectedRisk] = useState<RiskLevel>(RiskLevel.SAFE);
  const [offeredCurses, setOfferedCurses] = useState<Curse[]>([]);
  const [selectedCurse, setSelectedCurse] = useState<Curse | null>(null);
  const [offeredShopItems, setOfferedShopItems] = useState<ShopItem[]>([]);
  const [hasInsurance, setHasInsurance] = useState(false);
  const [hadInsuranceOnDeath, setHadInsuranceOnDeath] = useState(false);
  
  const [currentRoom, setCurrentRoom] = useState(1);
  const [accumulatedTreasure, setAccumulatedTreasure] = useState(0);
  const [wager, setWager] = useState(0);
  
  // --- UI & Game Over State ---
  const [gameOverMessage, setGameOverMessage] = useState('');
  const [subMessage, setSubMessage] = useState('');

  const [shakeIntensity, setShakeIntensity] = useState(0);
  const [damageFlash, setDamageFlash] = useState(0);
  const [gameOverOpacity, setGameOverOpacity] = useState(0);

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const mousePos = useRef({ x: 0, y: 0 });
  const isMouseDown = useRef(false);
  const lastPlayerAttackTime = useRef(0);
  const gameLoopRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  // --- Initial Load ---
  useEffect(() => {
    loadAssets().then(() => {
        setAssets({ ...gameAssets, loaded: true });
        setGameState(GameState.LOGIN_SCREEN);
    });
  }, []);
  
  // --- Game State Management ---
  const resetGame = (startingBonuses: UserData['unlocks']) => {
    const baseHealth = PLAYER_MAX_HEALTH + (startingBonuses.includes('bonus_start_hp') ? 1 : 0);
    const startWithInsurance = startingBonuses.includes('bonus_start_insurance');

    setCurrentRoom(1);
    setAccumulatedTreasure(50); // Start with some seed money
    setWager(50);
    setPlayer({
      position: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
      health: baseHealth,
      maxHealth: baseHealth,
      size: PLAYER_SIZE,
      invulnerabilityTimer: 0,
      activeBoon: null,
      shotsFiredThisRoom: 0,
      damageMultiplier: 1,
    });
    setEnemies([]);
    setPlayerProjectiles([]);
    setEnemyProjectiles([]);
    setFloatingTexts([]);
    setPickups([]);
    setParticles([]);
    setHazards([]);
    setGameOverMessage('');
    setSubMessage('');
    setGameOverOpacity(0);
    setHadInsuranceOnDeath(false);
    setHasInsurance(startWithInsurance);
    setSelectedCurse(null);
    setSelectedRisk(RiskLevel.SAFE);
  };

  const startGame = () => {
    resetGame(userData.unlocks);
    generateRoom(1, RiskLevel.SAFE, null);
    setGameState(GameState.ROUND_START);
  };
  
  const generateRoom = (roomNumber: number, riskLevel: RiskLevel, curse: Curse | null) => {
    setPlayer(p => ({ ...p, shotsFiredThisRoom: 0, damageMultiplier: 1 })); // Reset one-room effects

    // Handle Champion Duel
    if (riskLevel === RiskLevel.CHAMPION_DUEL) {
        setEnemies([{
            id: Date.now(),
            position: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 4 },
            type: EnemyType.CHAMPION,
            size: CHAMPION_STATS.size,
            speed: CHAMPION_STATS.speed,
            health: CHAMPION_STATS.health * (1 + roomNumber * 0.2),
            maxHealth: CHAMPION_STATS.health * (1 + roomNumber * 0.2),
            attackCooldown: CHAMPION_STATS.attackCooldown,
            lastAttackTime: Date.now(),
            isElite: true,
        }]);
        setHazards([]);
        return;
    }

    let enemyCount = roomNumber + 1;
    let newEnemies: Enemy[] = [];
    
    if(curse?.id === 'elite_hunters') {
        enemyCount = Math.floor(enemyCount * 0.75); // Fewer enemies, but all are elite
    }

    for (let i = 0; i < enemyCount; i++) {
        const isElite = curse?.id === 'elite_hunters' || Math.random() < ELITE_CHANCE;
        newEnemies.push({ 
            id: Date.now() + i, position: { x: Math.random() * CANVAS_WIDTH, y: -ENEMY_SIZE*2 }, type: EnemyType.NORMAL,
            size: ENEMY_SIZE, 
            speed: isElite ? ENEMY_SPEED * ELITE_SPEED_MULTIPLIER : ENEMY_SPEED, 
            health: isElite ? 1 + ELITE_HEALTH_BONUS : 1, 
            maxHealth: isElite ? 1 + ELITE_HEALTH_BONUS : 1, 
            attackCooldown: ENEMY_ATTACK_COOLDOWN, lastAttackTime: Date.now() + Math.random() * 1000,
            isElite,
        });
    }
    setEnemies(newEnemies);
    setHazards([]); // Simplified for this version
  };
  
  // --- Event Handlers ---
  const handleKeyDown = useCallback((e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = true; }, []);
  const handleKeyUp = useCallback((e: KeyboardEvent) => { keysPressed.current[e.key.toLowerCase()] = false; }, []);
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (canvasRef.current) {
        const rect = canvasRef.current.getBoundingClientRect();
        mousePos.current.x = e.clientX - rect.left;
        mousePos.current.y = e.clientY - rect.top;
    }
  }, []);
  const handleMouseDown = useCallback(() => { isMouseDown.current = true; }, []);
  const handleMouseUp = useCallback(() => { isMouseDown.current = false; }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown); window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove); window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove); window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleKeyDown, handleKeyUp, handleMouseMove, handleMouseDown, handleMouseUp]);
  
  const stateRef = useRef({ player, enemies, gameState, hazards });
  useEffect(() => { stateRef.current = { player, enemies, gameState, hazards }; }, [player, enemies, gameState, hazards]);

  const gameLoop = useCallback(() => {
    // --- Update Non-Gameplay States ---
    if (stateRef.current.gameState !== GameState.IN_GAME) {
        setParticles(ps => ps.map(p => ({...p, life: p.life - 1, position: {x: p.position.x + p.velocity.x, y: p.position.y + p.velocity.y}})).filter(p => p.life > 0));
        setFloatingTexts(texts => texts.map(ft => ({...ft, life: ft.life - 1, position: {x: ft.position.x, y: ft.position.y - 0.5}})).filter(ft => ft.life > 0));
        setPickups(pickups => pickups.map(p => ({...p, life: p.life -1})).filter(p => p.life > 0));
        gameLoopRef.current = requestAnimationFrame(gameLoop);
        return;
    }

    // --- Core Game Loop ---
    const now = Date.now();
    let { player } = stateRef.current;
    
    // Player Movement
    let newPlayerPos = { ...player.position };
    if (keysPressed.current['w']) newPlayerPos.y -= PLAYER_SPEED;
    if (keysPressed.current['s']) newPlayerPos.y += PLAYER_SPEED;
    if (keysPressed.current['a']) newPlayerPos.x -= PLAYER_SPEED;
    if (keysPressed.current['d']) newPlayerPos.x += PLAYER_SPEED;
    newPlayerPos.x = Math.max(player.size, Math.min(CANVAS_WIDTH - player.size, newPlayerPos.x));
    newPlayerPos.y = Math.max(player.size, Math.min(CANVAS_HEIGHT - player.size, newPlayerPos.y));
    let playerHealth = player.health;
    let newInvulnerabilityTimer = Math.max(0, player.invulnerabilityTimer - 1);
    
    // Player Attack
    const newPlayerProjectiles: Projectile[] = [];
    if ((keysPressed.current[' '] || isMouseDown.current) && now - lastPlayerAttackTime.current > PLAYER_ATTACK_COOLDOWN) {
        lastPlayerAttackTime.current = now;
        const dx = mousePos.current.x - newPlayerPos.x;
        const dy = mousePos.current.y - newPlayerPos.y;
        const magnitude = Math.sqrt(dx * dx + dy * dy) || 1;
        const velocity = { x: (dx / magnitude) * PROJECTILE_SPEED, y: (dy / magnitude) * PROJECTILE_SPEED };
        newPlayerProjectiles.push({ id: now, position: { ...newPlayerPos }, velocity, size: PROJECTILE_SIZE, isPlayerProjectile: true, bounces: selectedCurse?.id === 'ricochet_hell' ? 2 : 0 });
        setPlayer(p => ({ ...p, shotsFiredThisRoom: p.shotsFiredThisRoom + 1 }));
    }
    
    // Enemy Update
    const updatedEnemies = [...stateRef.current.enemies].map(e => ({...e, hitTimer: Math.max(0, (e.hitTimer || 0) - 1)}));
    const newEnemyProjectiles: Projectile[] = [];
    updatedEnemies.forEach(enemy => {
        // Movement
        const distToPlayer = distance(enemy.position, newPlayerPos);
        const dx = newPlayerPos.x - enemy.position.x;
        const dy = newPlayerPos.y - enemy.position.y;
        enemy.position.x += (dx / distToPlayer) * enemy.speed;
        enemy.position.y += (dy / distToPlayer) * enemy.speed;

        // Attack
        if (now - enemy.lastAttackTime > enemy.attackCooldown) {
            enemy.lastAttackTime = now;
            const velocity = { x: (dx / distToPlayer) * ENEMY_PROJECTILE_SPEED, y: (dy / distToPlayer) * ENEMY_PROJECTILE_SPEED };
            newEnemyProjectiles.push({ id: now + Math.random(), position: { ...enemy.position }, velocity, size: ENEMY_PROJECTILE_SIZE, isPlayerProjectile: false, bounces: selectedCurse?.id === 'ricochet_hell' ? 2 : 0 });
        }
    });

    // Projectile Update
    const updateProjectile = (p: Projectile) => {
        p.position.x += p.velocity.x;
        p.position.y += p.velocity.y;

        // Homing Boon
        if (p.isPlayerProjectile && player.activeBoon?.id === 'homing' && updatedEnemies.length > 0) {
            let target = p.homingTarget && updatedEnemies.find(e => e.id === p.homingTarget?.id) ? p.homingTarget : updatedEnemies[0];
            p.homingTarget = target;
            const dx = target.position.x - p.position.x;
            const dy = target.position.y - p.position.y;
            const mag = Math.sqrt(dx*dx + dy*dy) || 1;
            p.velocity.x = p.velocity.x * 0.9 + (dx/mag) * PROJECTILE_SPEED * 0.1;
            p.velocity.y = p.velocity.y * 0.9 + (dy/mag) * PROJECTILE_SPEED * 0.1;
        }

        // Wall Bouncing
        if (p.bounces > 0) {
            if (p.position.x <= p.size || p.position.x >= CANVAS_WIDTH - p.size) { p.velocity.x *= -1; p.bounces--; }
            if (p.position.y <= p.size || p.position.y >= CANVAS_HEIGHT - p.size) { p.velocity.y *= -1; p.bounces--; }
        }
        return p;
    };
    const projectileIsOnScreen = (p: Projectile) => p.bounces > 0 || (p.position.x > 0 && p.position.x < CANVAS_WIDTH && p.position.y > 0 && p.position.y < CANVAS_HEIGHT);
    let currentPlProjs = playerProjectiles.map(updateProjectile).filter(projectileIsOnScreen);
    let currentEnProjs = enemyProjectiles.map(updateProjectile).filter(projectileIsOnScreen);
    
    // Damage Handling
    const newFloatingTexts: FloatingText[] = [];
    const newPickups: Pickup[] = [];
    const takeDamage = (amount: number) => {
        if (newInvulnerabilityTimer > 0) return;
        playerHealth -= amount;
        setDamageFlash(0.4); setShakeIntensity(10);
        newFloatingTexts.push({ id: now + Math.random(), text: `-${amount}`, position: player.position, life: FLOATING_TEXT_LIFESPAN, color: 'red' });
        newInvulnerabilityTimer = PLAYER_INVULNERABILITY_DURATION;
        return amount; // Return damage taken for vampirism
    };

    // Collision Detection
    currentPlProjs = currentPlProjs.filter(proj => {
        for (const enemy of updatedEnemies) {
            if (distance(proj.position, enemy.position) < proj.size + enemy.size) {
                const damageDealt = 1 * player.damageMultiplier;
                enemy.health -= damageDealt;
                enemy.hitTimer = 5;
                const isCrit = distance(proj.position, enemy.position) < CRITICAL_HIT_ZONE_RADIUS;
                const value = TREASURE_PICKUP_BASE_VALUE * (isCrit ? CRITICAL_HIT_MULTIPLIER : 1);
                newFloatingTexts.push({ id: now + Math.random(), text: isCrit ? "CRIT!" : damageDealt.toFixed(0), position: enemy.position, life: FLOATING_TEXT_LIFESPAN, color: isCrit ? 'orange' : 'white' });
                
                if (enemy.health <= 0) {
                    newPickups.push({ id: now + Math.random(), type: PickupType.TREASURE, position: enemy.position, size: PICKUP_SIZE, life: PICKUP_LIFESPAN, value });
                }
                return false; // Projectile is consumed
            }
        }
        return true;
    });

    currentEnProjs = currentEnProjs.filter(p => {
        if (distance(p.position, newPlayerPos) < p.size + player.size) {
            const damageTaken = takeDamage(1);
            if(selectedCurse?.id === 'vampiric_foes') {
                // Find and heal the attacker (not perfect, but good enough)
                const attacker = updatedEnemies.find(e => distance(e.position, player.position) < 200);
                if(attacker) attacker.health = Math.min(attacker.maxHealth, attacker.health + damageTaken);
            }
            return false;
        }
        return true;
    });
    
    const remainingEnemies = updatedEnemies.filter(enemy => {
        if(enemy.health <= 0) { return false; }
        if(distance(enemy.position, newPlayerPos) < enemy.size + player.size) {
            const damageTaken = takeDamage(enemy.isElite ? ELITE_DAMAGE : 1);
            if(selectedCurse?.id === 'vampiric_foes') {
                 enemy.health = Math.min(enemy.maxHealth, enemy.health + damageTaken);
            }
            return false; // Enemy is consumed on collision
        }
        return true;
    });
    
    let treasureGained = 0;
    const remainingPickups = pickups.filter(pickup => {
        if (distance(pickup.position, newPlayerPos) < pickup.size + player.size) {
             if (pickup.type === PickupType.TREASURE && pickup.value) {
                treasureGained += pickup.value;
                newFloatingTexts.push({ id: now + Math.random(), text: `+$${pickup.value}`, position: newPlayerPos, life: FLOATING_TEXT_LIFESPAN, color: 'gold', animation: 'scale' });
            }
            return false;
        }
        return true;
    });
    if (treasureGained > 0) setAccumulatedTreasure(t => t + treasureGained);
    
    // --- State Updates ---
    setPlayer(p => ({ ...p, position: newPlayerPos, health: playerHealth, invulnerabilityTimer: newInvulnerabilityTimer }));
    setEnemies(remainingEnemies);
    setPlayerProjectiles([...currentPlProjs, ...newPlayerProjectiles]);
    setEnemyProjectiles(currentEnProjs);
    setPickups(pickups => [...remainingPickups, ...newPickups].map(p => ({...p, life: p.life -1})).filter(p => p.life > 0));
    setFloatingTexts(texts => [...texts, ...newFloatingTexts].map(ft => ({...ft, life: ft.life - 1, position: {x: ft.position.x, y: ft.position.y - 0.5}})).filter(ft => ft.life > 0));
    setDamageFlash(f => Math.max(0, f - 0.05));
    setShakeIntensity(s => Math.max(0, s - 0.5));

    // --- Win/Loss Conditions ---
    if (playerHealth <= 0) {
        setGameOver("You were slain...");
        return;
    }

    if (remainingEnemies.length === 0 && stateRef.current.enemies.length > 0) {
        setGameState(GameState.ROOM_CLEAR);
        const reward = Math.floor(wager * (RISK_REWARDS[selectedRisk].multiplier) * (selectedCurse?.multiplier || 1));
        const totalNewTreasure = (accumulatedTreasure - wager) + reward;
        
        setTimeout(() => {
            setFloatingTexts(texts => [...texts, { id: Date.now(), text: `WAGER WON! +$${reward}`, position: {x: CANVAS_WIDTH/2, y: CANVAS_HEIGHT/2 + 40}, life: 180, color: 'gold'}]);
            setAccumulatedTreasure(totalNewTreasure);
            
            const unlockedCurses = ALL_CURSES.filter(c => c.isUnlocked || userData.unlocks.includes(c.id));
            setOfferedCurses(getRandomElements(unlockedCurses, 3));

            const unlockedShopItems = ALL_SHOP_ITEMS.filter(i => userData.unlocks.includes(i.id) || i.id === 'insurance');
            setOfferedShopItems(getRandomElements(unlockedShopItems, 3));

            setGameState(GameState.BETTING_SCREEN);
            setSelectedCurse(null);
            setPlayer(p => ({...p, activeBoon: null}));
        }, 2000);
        return;
    }
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [playerProjectiles, enemyProjectiles, pickups, hasInsurance, accumulatedTreasure, wager, selectedRisk, selectedCurse, userData.unlocks]);
  
  const setGameOver = (message: string, subMsg: string = "") => {
    setHadInsuranceOnDeath(hasInsurance);
    setGameOverMessage(message);
    setSubMessage(subMsg);
    
    const finalTreasure = hasInsurance ? (accumulatedTreasure - wager) + Math.floor(wager / 2) : accumulatedTreasure - wager;
    setAccumulatedTreasure(finalTreasure);

    // Grant Tomb Fragments
    if(currentUser) {
        const fragmentsGained = Math.floor(finalTreasure * TOMB_FRAGMENT_CONVERSION_RATE);
        const db = JSON.parse(localStorage.getItem(DB_KEY) || '{}');
        const currentData = db[currentUser];
        currentData.tombFragments += fragmentsGained;
        db[currentUser] = currentData;
        localStorage.setItem(DB_KEY, JSON.stringify(db));
        setUserData(currentData);
        setSubMessage(subMsg + ` You collected ${fragmentsGained} Tomb Fragments.`);
    }

    setGameState(GameState.PLAYER_DYING);
    setTimeout(() => setGameState(GameState.GAME_OVER), 1500);
  };

  useEffect(() => {
    if ([GameState.IN_GAME, GameState.PLAYER_DYING, GameState.ROOM_CLEAR, GameState.ROUND_START].includes(gameState)) {
      gameLoopRef.current = requestAnimationFrame(gameLoop);
    } else { if(gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current); }
    return () => { if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current); };
  }, [gameState, gameLoop]);

  useEffect(() => {
    if (gameState === GameState.ROUND_START) {
        const timer = setTimeout(() => {
            let p = player;
            if(selectedCurse?.id === 'glass_cannon') {
                p = {...p, health: 1, maxHealth: 1, damageMultiplier: 2};
            }
            setPlayer(p);
            setGameState(GameState.IN_GAME);
        }, 2000);
        return () => clearTimeout(timer);
    }
  }, [gameState, player, selectedCurse]);

  const handleStartNextRoom = () => {
    if (wager > accumulatedTreasure) return; // Should not happen with slider

    if (Math.random() < CURSED_TOMB_DEATH_CHANCE) {
        setGameOver("The tomb's curse claimed you...", "An unfortunate end.");
        return;
    }
    
    const nextRoom = currentRoom + 1;
    setCurrentRoom(nextRoom);
    generateRoom(nextRoom, selectedRisk, selectedCurse);
    setGameState(GameState.ROUND_START);
  };
  
  const cashOut = () => {
      if (currentUser) {
          const finalWinnings = accumulatedTreasure;
          const fragmentsGained = Math.floor(finalWinnings * TOMB_FRAGMENT_CONVERSION_RATE);
          
          const db = JSON.parse(localStorage.getItem(DB_KEY) || '{}');
          const currentData = db[currentUser];
          const newBankedAmount = currentData.bankedTreasure + finalWinnings;
          const newDeepest = Math.max(currentData.deepestRoom, currentRoom);
          const newFragments = currentData.tombFragments + fragmentsGained;
          
          db[currentUser] = { ...currentData, bankedTreasure: newBankedAmount, deepestRoom: newDeepest, tombFragments: newFragments };
          localStorage.setItem(DB_KEY, JSON.stringify(db));
          setUserData(db[currentUser]);
      }
      setGameOverMessage('You escaped!');
      setSubMessage(`You banked $${accumulatedTreasure}!`);
      setGameState(GameState.GAME_OVER);
  };

  // --- Login & Meta-Progression ---
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameInput.trim()) {
      const user = usernameInput.trim();
      const db = JSON.parse(localStorage.getItem(DB_KEY) || '{}');
      if (!db[user]) {
          db[user] = { bankedTreasure: 0, deepestRoom: 0, tombFragments: 0, unlocks: [] };
          localStorage.setItem(DB_KEY, JSON.stringify(db));
      }
      setUserData(db[user]);
      setCurrentUser(user);
      setGameState(GameState.MAIN_MENU);
    }
  };
   useEffect(() => {
    if (gameState === GameState.GAME_OVER && currentUser) {
      const db = JSON.parse(localStorage.getItem(DB_KEY) || '{}');
      const currentData = db[currentUser];
      const newDeepest = Math.max(currentData.deepestRoom, currentRoom);
      if (newDeepest > currentData.deepestRoom) {
        db[currentUser] = { ...currentData, deepestRoom: newDeepest };
        localStorage.setItem(DB_KEY, JSON.stringify(db));
        setUserData(db[currentUser]);
      }
    }
  }, [gameState, currentUser, currentRoom]);
  const handleLogout = () => {
    setCurrentUser(null);
    setUsernameInput('');
    setGameState(GameState.LOGIN_SCREEN);
  };

  const buyPermanentUpgrade = (upgrade: PermanentUpgrade) => {
    if(userData.tombFragments >= upgrade.cost && !userData.unlocks.includes(upgrade.id)) {
        const newUserData = {
            ...userData,
            tombFragments: userData.tombFragments - upgrade.cost,
            unlocks: [...userData.unlocks, upgrade.id],
        };
        setUserData(newUserData);
        const db = JSON.parse(localStorage.getItem(DB_KEY) || '{}');
        db[currentUser!] = newUserData;
        localStorage.setItem(DB_KEY, JSON.stringify(db));
    }
  };

  const buyShopItem = (item: ShopItem) => {
    if (accumulatedTreasure >= item.cost) {
        setAccumulatedTreasure(t => t - item.cost);
        if(item.type === 'INSURANCE') setHasInsurance(true);
        if(item.type === 'HEALTH_POTION') setPlayer(p => ({...p, health: Math.min(p.maxHealth, p.health + 2)}));
        if(item.type === 'BOON' && item.boon) setPlayer(p => ({...p, activeBoon: item.boon}));

        // Remove from offer
        setOfferedShopItems(items => items.filter(i => i.id !== item.id));
    }
  };


  const renderContent = () => {
    // ... UI rendering logic ...
    switch (gameState) {
      case GameState.LOGIN_SCREEN:
        return (
          <form onSubmit={handleLogin} className="flex flex-col items-center gap-4">
            <GeckoIcon />
            <h1 className="text-4xl font-bold text-emerald-400">Gecko's Greed</h1>
            <p className="text-lg text-gray-300">Enter a username to begin your descent.</p>
            <input type="text" value={usernameInput} onChange={(e) => setUsernameInput(e.target.value)} className="w-64 px-4 py-2 text-lg text-center bg-gray-800 border-2 border-gray-600 rounded-lg focus:outline-none focus:border-emerald-500" placeholder="Your Name" />
            <button type="submit" className="px-6 py-2 text-xl font-bold text-white transition-transform bg-emerald-600 rounded-lg hover:bg-emerald-700 active:scale-95">Enter the Tomb</button>
          </form>
        );
      
      case GameState.MAIN_MENU:
        return (
            <div className="flex flex-col items-center gap-4 text-center">
                <h1 className="text-5xl font-bold text-emerald-400">Welcome, {currentUser}!</h1>
                <div className="grid grid-cols-3 gap-4 p-4 my-2 text-lg bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2"><CoinIcon /><span className="font-semibold">${userData.bankedTreasure}</span></div>
                    <div className="flex items-center gap-2"><TempleIcon /><span className="font-semibold">Max Room: {userData.deepestRoom}</span></div>
                    <div className="flex items-center gap-2">💎<span className="font-semibold">{userData.tombFragments}</span></div>
                </div>
                <div className="flex flex-col w-64 gap-3">
                    <button onClick={startGame} className="w-full px-8 py-4 text-2xl font-bold text-white transition-transform bg-emerald-600 rounded-lg hover:bg-emerald-700 active:scale-95">New Run</button>
                    <button onClick={() => setGameState(GameState.WORKSHOP)} className="w-full px-8 py-3 text-xl font-bold text-white transition-transform bg-sky-600 rounded-lg hover:bg-sky-700 active:scale-95">Workshop</button>
                    <button onClick={handleLogout} className="text-sm text-gray-400 hover:text-white">Logout</button>
                </div>
            </div>
        );
    
    case GameState.WORKSHOP:
        return (
            <div className="flex flex-col w-full h-full max-w-4xl p-4 text-center">
                <h1 className="text-4xl font-bold text-sky-400">Workshop</h1>
                <p className="mb-4 text-lg">Spend Tomb Fragments 💎 to unlock permanent upgrades. You have: <span className="font-bold text-white">{userData.tombFragments}</span></p>
                <div className="flex-grow overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 p-2 bg-gray-800 rounded-lg">
                    {PERMANENT_UPGRADES.map(upgrade => {
                        const isUnlocked = userData.unlocks.includes(upgrade.id);
                        const canAfford = userData.tombFragments >= upgrade.cost;
                        return (
                            <div key={upgrade.id} className={`p-3 text-left rounded-lg ${isUnlocked ? 'bg-emerald-900' : 'bg-gray-700'}`}>
                                <h3 className={`font-bold text-lg ${isUnlocked ? 'text-emerald-300' : 'text-white'}`}>{upgrade.name}</h3>
                                <p className="text-sm text-gray-300">{upgrade.description}</p>
                                <div className="mt-2 text-right">
                                    {isUnlocked ? (
                                        <span className="px-3 py-1 text-sm font-bold text-white bg-green-600 rounded-full">UNLOCKED</span>
                                    ) : (
                                        <button onClick={() => buyPermanentUpgrade(upgrade)} disabled={!canAfford} className="px-4 py-1 font-bold text-white transition-transform bg-sky-600 rounded-full disabled:bg-gray-500 disabled:cursor-not-allowed hover:bg-sky-500 active:scale-95">
                                            💎 {upgrade.cost}
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
                <button onClick={() => setGameState(GameState.MAIN_MENU)} className="px-6 py-2 mt-4 text-lg font-bold text-white transition-transform bg-gray-600 rounded-lg hover:bg-gray-500 active:scale-95">Back to Menu</button>
            </div>
        );

      case GameState.BETTING_SCREEN:
        const potentialReward = Math.floor(wager * (RISK_REWARDS[selectedRisk]?.multiplier || 1) * (selectedCurse?.multiplier || 1));
        return (
          <div className="flex flex-col w-full h-full p-6 text-center text-white">
            <h2 className="text-3xl font-bold text-amber-400">Room {currentRoom} Cleared!</h2>
            <div className="my-2 text-lg">Total Treasure: <span className="font-bold text-green-400">${accumulatedTreasure}</span> | Player Health: <span className="font-bold text-red-400">{player.health}/{player.maxHealth}</span></div>
            <div className="mt-2 text-2xl font-bold text-yellow-300">Potential Reward: <span className="text-4xl">${potentialReward}</span></div>
            
            <div className="grid flex-grow grid-cols-3 gap-4 my-4">
                {/* 1. Wager */}
                <div className="flex flex-col gap-2 p-4 bg-gray-800 rounded-lg">
                    <h3 className="text-xl font-bold">1. Set Wager</h3>
                    <div className="text-2xl font-bold text-green-400">${wager}</div>
                    <input type="range" min="0" max={accumulatedTreasure} value={wager} onChange={(e) => setWager(parseInt(e.target.value))} className="w-full" />
                    <div className="flex justify-between text-xs"><span>$0</span><span>${accumulatedTreasure}</span></div>
                </div>
                {/* 2. Risk & Curse */}
                <div className="flex flex-col gap-2 p-4 bg-gray-800 rounded-lg">
                    <h3 className="text-xl font-bold">2. Choose Risk</h3>
                    {Object.values(RiskLevel).map(risk => (
                        <button key={risk} onClick={() => setSelectedRisk(risk)} className={`p-2 rounded-md transition-all ${selectedRisk === risk ? 'bg-emerald-500 font-bold' : 'bg-gray-600 hover:bg-gray-500'}`}>
                           {risk} ({RISK_REWARDS[risk].multiplier}x)
                        </button>
                    ))}
                    <h3 className="mt-2 text-lg font-bold">Curse (Optional)</h3>
                     {offeredCurses.map(curse => (
                        <button key={curse.id} onClick={() => setSelectedCurse(c => c?.id === curse.id ? null : curse)} className={`p-2 text-left rounded-md transition-all ${selectedCurse?.id === curse.id ? 'bg-purple-600 font-bold' : 'bg-gray-600 hover:bg-gray-500'}`}>
                           <p className="font-semibold">{curse.name} ({curse.multiplier}x)</p>
                        </button>
                    ))}
                </div>
                {/* 3. The Black Market */}
                <div className="flex flex-col gap-2 p-4 bg-gray-800 rounded-lg">
                    <h3 className="text-xl font-bold">3. Black Market</h3>
                    {offeredShopItems.map(item => (
                        <button key={item.id} onClick={() => buyShopItem(item)} disabled={accumulatedTreasure < item.cost} className="p-2 text-left rounded-md transition-all bg-gray-600 hover:bg-gray-500 disabled:bg-gray-900 disabled:text-gray-500 disabled:cursor-not-allowed">
                            <p className="font-semibold">{item.name} (${item.cost})</p>
                            <p className="text-xs opacity-80">{item.description}</p>
                        </button>
                    ))}
                    {hasInsurance && <p className="p-2 text-sm text-center text-blue-300 bg-blue-900 rounded-md">Insurance Active</p>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <button onClick={cashOut} className="px-6 py-3 text-xl font-bold text-white transition-transform bg-amber-600 rounded-lg hover:bg-amber-700 active:scale-95">Cash Out</button>
                <button onClick={handleStartNextRoom} className="px-6 py-3 text-xl font-bold text-white transition-transform bg-emerald-600 rounded-lg hover:bg-emerald-700 active:scale-95">Descend Deeper</button>
            </div>
          </div>
        );

      case GameState.GAME_OVER:
        return (
          <div className="flex flex-col items-center gap-4 text-center">
            <h1 className="text-6xl font-bold text-red-500">{gameOverMessage}</h1>
            <p className="text-2xl text-gray-300">{subMessage}</p>
            {hadInsuranceOnDeath && <p className="p-2 text-lg bg-blue-800 rounded-lg">Your insurance paid out! You recovered half your wager.</p>}
            <p className="text-xl">You reached Room <span className="font-bold text-emerald-400">{currentRoom}</span>.</p>
            <button onClick={() => setGameState(GameState.MAIN_MENU)} className="px-8 py-3 mt-4 text-xl font-bold text-white transition-transform bg-gray-600 rounded-lg hover:bg-gray-500 active:scale-95">Main Menu</button>
          </div>
        );
      default:
        return null;
    }
  };

  const renderHUD = () => {
    return (
      <div className="absolute top-0 left-0 flex items-center justify-between w-full p-4 text-white pointer-events-none">
        <div className="flex items-center gap-2 p-2 bg-black rounded-lg bg-opacity-40">
          <GeckoIcon />
          <span className="text-xl font-bold">{player.health} / {player.maxHealth}</span>
        </div>
        <div className="flex items-center gap-2 p-2 bg-black rounded-lg bg-opacity-40">
          <TempleIcon /> <span className="text-xl font-bold">{currentRoom}</span>
        </div>
        <div className="flex items-center gap-3 p-2 bg-black rounded-lg bg-opacity-40">
          <div className="flex items-center gap-2">
            <CoinIcon />
            <span className="text-xl font-bold text-amber-400">{accumulatedTreasure}</span>
          </div>
          {hasInsurance && <div className="pl-3 border-l-2 border-gray-500"><ShieldIcon className="w-6 h-6 text-blue-400" /></div>}
        </div>
      </div>
    );
  };
  
   return (
    <div className="flex items-center justify-center min-h-screen bg-gray-800 text-white select-none">
      <div ref={canvasRef} className="relative bg-gray-700 rounded-lg overflow-hidden" style={{width: CANVAS_WIDTH, height: CANVAS_HEIGHT}}>
         {![GameState.LOADING, GameState.IN_GAME, GameState.PLAYER_DYING, GameState.ROOM_CLEAR, GameState.ROUND_START].includes(gameState) ? (
            <div className="absolute inset-0 flex items-center justify-center p-4 bg-gray-700">
                {renderContent()}
            </div>
         ) : (
            <>
                <GameCanvas gameState={gameState} player={player} enemies={enemies} playerProjectiles={playerProjectiles} enemyProjectiles={enemyProjectiles} floatingTexts={floatingTexts} pickups={pickups} particles={particles} hazards={hazards} shakeIntensity={shakeIntensity} damageFlash={damageFlash} gameOverOpacity={gameOverOpacity} currentRoom={currentRoom} assets={assets} activeCurseEffect={selectedCurse?.id === 'fog_of_war' ? 'fog' : undefined} />
                {gameState === GameState.IN_GAME && renderHUD()}
            </>
         )}
         {gameState === GameState.LOADING && 
            <div className="absolute inset-0 flex items-center justify-center p-4 bg-gray-700">
                <h1 className="text-4xl font-bold text-gray-300 animate-pulse">Loading Assets...</h1>
            </div>
         }
      </div>
    </div>
  );
}

export default App;