export enum GameState {
  LOADING,
  LOGIN_SCREEN,
  MAIN_MENU,
  WORKSHOP,
  ROUND_START,
  IN_GAME,
  ROOM_CLEAR,
  BETTING_SCREEN,
  GAME_OVER,
  PLAYER_DYING,
}

export enum EnemyType {
  NORMAL,
  RANGER,
  FAST,
  TANK,
  CHAMPION,
}

export enum PickupType {
  HEALTH,
  TREASURE,
}

export enum RiskLevel {
    SAFE = 'Safe Bet',
    RISKY = 'Risky Bet',
    CHAMPION_DUEL = "Champion's Duel"
}

export enum HazardState {
    IDLE,
    ARMING,
    ACTIVE,
}

export type Boon = {
    id: string;
    name: string;
    description: string;
    duration: number; // in rooms, -1 for permanent for the run
};

export type ShopItem = {
    id: string;
    name: string;
    description: string;
    cost: number;
    type: 'INSURANCE' | 'HEALTH_POTION' | 'BOON';
    boon?: Boon;
};

export type Curse = {
    id: string;
    name: string;
    description: string;
    multiplier: number;
    isUnlocked?: boolean; // Used in config
};

export type PermanentUpgrade = {
    id: string;
    name: string;
    description: string;
    cost: number;
    type: 'UNLOCK_CURSE' | 'UNLOCK_SHOP_ITEM' | 'STARTING_BONUS';
    unlockId?: string; // id of curse/item to unlock
    bonus?: {
        maxHealth?: number;
        insurance?: boolean;
    }
}


export interface Vector2D {
  x: number;
  y: number;
}

export interface Player {
  position: Vector2D;
  health: number;
  maxHealth: number;
  size: number;
  invulnerabilityTimer: number;
  activeBoon: Boon | null;
  shotsFiredThisRoom: number;
  damageMultiplier: number;
}

export interface Enemy {
  id: number;
  position: Vector2D;
  size: number;
  type: EnemyType;
  health: number;
  maxHealth: number;
  speed: number;
  attackCooldown: number;
  lastAttackTime: number;
  hitTimer?: number; 
  strafeDirection?: number; 
  strafeTimer?: number; 
  isElite: boolean;
}

export interface Projectile {
  id: number;
  position: Vector2D;
  velocity: Vector2D;
  size: number;
  isPlayerProjectile: boolean;
  bounces: number;
  homingTarget?: Enemy;
}

export type FloatingText = {
  id: number;
  text: string;
  position: Vector2D;
  life: number;
  color: string;
  animation?: 'scale';
};

export type Pickup = {
  id: number;
  type: PickupType;
  position: Vector2D;
  size: number;
  life: number;
  value?: number;
};

export type Particle = {
  id: number;
  position: Vector2D;
  velocity: Vector2D;
  life: number;
  size: number;
  color: string;
};

export interface Hazard {
    id: number;
    position: Vector2D;
    size: number;
    state: HazardState;
    timer: number;
}

export interface UserData {
    bankedTreasure: number;
    deepestRoom: number;
    tombFragments: number;
    unlocks: string[];
}