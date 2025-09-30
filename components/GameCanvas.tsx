import React, { useRef, useEffect, useState } from 'react';
import type { Player, Enemy, Projectile, FloatingText, Pickup, Particle, Hazard } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, FLOATING_TEXT_LIFESPAN } from '../constants';
import { EnemyType, PickupType, GameState, HazardState } from '../types';
import { GameAssets } from '../assets';

interface GameCanvasProps {
  gameState: GameState;
  player: Player;
  enemies: Enemy[];
  playerProjectiles: Projectile[];
  enemyProjectiles: Projectile[];
  floatingTexts: FloatingText[];
  pickups: Pickup[];
  particles: Particle[];
  hazards: Hazard[];
  shakeIntensity: number;
  damageFlash: number;
  gameOverOpacity: number;
  currentRoom: number;
  assets: GameAssets;
  activeCurseEffect?: 'fog';
}

// --- Drawing Functions ---

function drawPlayer(ctx: CanvasRenderingContext2D, player: Player, isDying: boolean, asset: HTMLImageElement) {
    ctx.save();
    if (isDying) {
      ctx.globalAlpha = Math.max(0, 1 - (1 - player.health / player.maxHealth) * 2);
    }
    // Blink effect when invulnerable
    if (player.invulnerabilityTimer > 0 && Math.floor(player.invulnerabilityTimer / 6) % 2 === 0) {
        ctx.globalAlpha = 0.5;
    }
    ctx.drawImage(asset, player.position.x - player.size, player.position.y - player.size, player.size * 2, player.size * 2);
    ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, assets: GameAssets) {
    let asset;
    switch (enemy.type) {
        case EnemyType.NORMAL: asset = assets.enemyNormal; break;
        case EnemyType.RANGER: asset = assets.enemyRanger; break;
        case EnemyType.FAST: asset = assets.enemyFast; break;
        case EnemyType.TANK: asset = assets.enemyTank; break;
        case EnemyType.CHAMPION: asset = assets.enemyChampion; break;
        default: asset = assets.enemyNormal;
    }
    
    // Draw elite aura
    if (enemy.isElite) {
        ctx.shadowColor = '#A855F7'; // Purple
        ctx.shadowBlur = 15;
    }
    
    ctx.drawImage(asset, enemy.position.x - enemy.size, enemy.position.y - enemy.size, enemy.size * 2, enemy.size * 2);
    ctx.shadowBlur = 0; // Reset shadow

    if (enemy.hitTimer && enemy.hitTimer > 0) {
        ctx.globalAlpha = enemy.hitTimer / 5;
        ctx.fillStyle = 'white';
        ctx.fillRect(enemy.position.x - enemy.size, enemy.position.y - enemy.size, enemy.size * 2, enemy.size * 2);
        ctx.globalAlpha = 1.0;
    }
}

function drawHazard(ctx: CanvasRenderingContext2D, hazard: Hazard) {
    ctx.save();
    const x = hazard.position.x - hazard.size;
    const y = hazard.position.y - hazard.size;
    const size = hazard.size * 2;
    
    switch(hazard.state) {
        case HazardState.IDLE:
            ctx.fillStyle = '#4B5563'; // Gray
            ctx.fillRect(x, y, size, size);
            break;
        case HazardState.ARMING:
            ctx.fillStyle = '#FBBF24'; // Yellow
            const pulse = Math.abs(Math.sin(hazard.timer / 10));
            ctx.globalAlpha = 0.5 + pulse * 0.5;
            ctx.fillRect(x, y, size, size);
            break;
        case HazardState.ACTIVE:
            ctx.fillStyle = '#EF4444'; // Red
            // Draw simple spikes
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + size / 2, y + size / 2);
            ctx.lineTo(x, y + size);
            ctx.moveTo(x + size, y);
            ctx.lineTo(x + size / 2, y + size / 2);
            ctx.lineTo(x + size, y + size);
            ctx.strokeStyle = '#DC2626';
            ctx.lineWidth = 2;
            ctx.stroke();
            break;
    }
    ctx.restore();
}


function drawPickup(ctx: CanvasRenderingContext2D, pickup: Pickup) {
    ctx.globalAlpha = pickup.life < 120 ? (pickup.life % 30 < 15 ? 1.0 : 0.5) : 1.0; 
    
    const bobOffset = Math.sin(Date.now() / 200 + pickup.id) * 3;
    const yPos = pickup.position.y + bobOffset;

    if (pickup.type === PickupType.HEALTH) {
        ctx.fillStyle = '#22C55E'; // Green
        ctx.beginPath();
        ctx.moveTo(pickup.position.x, yPos - pickup.size);
        ctx.quadraticCurveTo(pickup.position.x + pickup.size, yPos, pickup.position.x, yPos + pickup.size);
        ctx.quadraticCurveTo(pickup.position.x - pickup.size, yPos, pickup.position.x, yPos - pickup.size);
        ctx.fill();
    } else {
        ctx.fillStyle = '#FBBF24';
        ctx.beginPath();
        ctx.arc(pickup.position.x, yPos, pickup.size, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#F59E0B';
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('$', pickup.position.x, yPos);
    }
    ctx.globalAlpha = 1.0;
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
    particles.forEach(p => {
        ctx.globalAlpha = p.life / 60;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.position.x, p.position.y, p.size, 0, 2 * Math.PI);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;
}


const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  player,
  enemies,
  playerProjectiles,
  enemyProjectiles,
  floatingTexts,
  pickups,
  particles,
  hazards,
  shakeIntensity,
  damageFlash,
  gameOverOpacity,
  currentRoom,
  assets,
  activeCurseEffect
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [roomClearOpacity, setRoomClearOpacity] = useState(0);
  const [roundStartOpacity, setRoundStartOpacity] = useState(0);
  const [roundStartScale, setRoundStartScale] = useState(1);

  useEffect(() => {
    if (gameState === GameState.ROOM_CLEAR) {
        let start: number | null = null;
        const animate = (timestamp: number) => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            setRoomClearOpacity(Math.min(1, progress / 500));
            if (progress < 500) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    } else {
        setRoomClearOpacity(0);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === GameState.ROUND_START) {
        let start: number | null = null;
        const animate = (timestamp: number) => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            const duration = 2000;
            if (progress < duration * 0.25) {
                setRoundStartOpacity(progress / (duration * 0.25));
                setRoundStartScale(0.8 + 0.2 * (progress / (duration * 0.25)));
            } else if (progress < duration * 0.75) {
                setRoundStartOpacity(1); setRoundStartScale(1);
            } else if (progress < duration) {
                setRoundStartOpacity(1 - (progress - duration * 0.75) / (duration * 0.25)); setRoundStartScale(1);
            }
            if (progress < duration) requestAnimationFrame(animate);
            else setRoundStartOpacity(0);
        };
        requestAnimationFrame(animate);
    } else {
        setRoundStartOpacity(0); setRoundStartScale(1);
    }
}, [gameState]);


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !assets.loaded) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.save();
    context.fillStyle = '#374151';
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (shakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * shakeIntensity * 2;
      const shakeY = (Math.random() - 0.5) * shakeIntensity * 2;
      context.translate(shakeX, shakeY);
    }
    
    hazards.forEach(hazard => drawHazard(context, hazard));
    pickups.forEach(pickup => drawPickup(context, pickup));
    drawParticles(context, particles);
    drawPlayer(context, player, gameState === GameState.PLAYER_DYING, assets.player);
    enemies.forEach(enemy => drawEnemy(context, enemy, assets));

    context.fillStyle = '#F9FAFB';
    context.shadowColor = 'white';
    context.shadowBlur = 10;
    playerProjectiles.forEach(projectile => {
      context.beginPath();
      context.arc(projectile.position.x, projectile.position.y, projectile.size, 0, 2 * Math.PI);
      context.fill();
    });
    context.shadowBlur = 0;
    
    context.fillStyle = '#EC4899';
    enemyProjectiles.forEach(projectile => {
      context.beginPath();
      context.arc(projectile.position.x, projectile.position.y, projectile.size, 0, 2 * Math.PI);
      context.fill();
    });

    floatingTexts.forEach(ft => {
        context.save();
        context.globalAlpha = ft.life / FLOATING_TEXT_LIFESPAN;
        context.fillStyle = ft.color;
        if(ft.animation === 'scale') {
          const scaleProgress = (FLOATING_TEXT_LIFESPAN - ft.life) / FLOATING_TEXT_LIFESPAN;
          const scale = 1 + scaleProgress;
          context.font = `bold ${24 * scale}px sans-serif`;
          context.globalAlpha = 1 - scaleProgress;
        } else {
          context.font = "bold 20px sans-serif";
        }
        context.textAlign = 'center';
        context.fillText(ft.text, ft.position.x, ft.position.y);
        context.restore();
    });

    if (activeCurseEffect === 'fog') {
        const gradient = context.createRadialGradient(player.position.x, player.position.y, 100, player.position.x, player.position.y, 300);
        gradient.addColorStop(0, 'rgba(0,0,0,0)');
        gradient.addColorStop(1, 'rgba(0,0,0,1)');
        context.fillStyle = gradient;
        context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
    
    context.restore();

    if (damageFlash > 0) {
        context.fillStyle = `rgba(255, 0, 0, ${damageFlash})`;
        context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    if (gameState === GameState.ROOM_CLEAR && roomClearOpacity > 0) {
        context.fillStyle = `rgba(0, 0, 0, ${roomClearOpacity * 0.7})`;
        context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        context.fillStyle = `rgba(255, 255, 255, ${roomClearOpacity})`;
        context.font = "bold 48px sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.fillText("Room Cleared!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    }
    
    if (roundStartOpacity > 0) {
        context.save();
        context.fillStyle = `rgba(0, 0, 0, ${roundStartOpacity * 0.5})`;
        context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        context.fillStyle = `rgba(255, 255, 255, ${roundStartOpacity})`;
        context.font = "bold 60px sans-serif";
        context.textAlign = "center";
        context.textBaseline = "middle";
        context.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
        context.scale(roundStartScale, roundStartScale);
        context.fillText(`Room ${currentRoom}`, 0, 0);
        context.restore();
    }

    if (gameOverOpacity > 0) {
        context.fillStyle = `rgba(0, 0, 0, ${gameOverOpacity})`;
        context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

  }, [gameState, player, enemies, playerProjectiles, enemyProjectiles, floatingTexts, pickups, particles, hazards, shakeIntensity, damageFlash, gameOverOpacity, roomClearOpacity, roundStartOpacity, roundStartScale, currentRoom, assets, activeCurseEffect]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="border-2 border-gray-600 rounded-lg"
    />
  );
};

export default GameCanvas;