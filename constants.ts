import { RiskLevel, PermanentUpgrade } from './types';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const PLAYER_MAX_HEALTH = 3;
export const PLAYER_SIZE = 15;
export const PLAYER_SPEED = 4;
export const PLAYER_ATTACK_COOLDOWN = 500;
export const PLAYER_INVULNERABILITY_DURATION = 60; // 1 second at 60fps

export const ENEMY_SIZE = 15;
export const ENEMY_SPEED = 1;
export const ENEMY_ATTACK_COOLDOWN = 2500;

// --- Elite Enemy Constants ---
export const ELITE_CHANCE = 0.2;
export const ELITE_SPEED_MULTIPLIER = 1.3;
export const ELITE_HEALTH_BONUS = 2;
export const ELITE_DAMAGE = 2;

// --- Champion Constants ---
export const CHAMPION_STATS = {
    size: 40,
    speed: 1.5,
    health: 25,
    attackCooldown: 1500,
};

// --- Hazard Constants ---
export const SPIKE_TRAP_SIZE = 15;
export const SPIKE_TRAP_ARM_TIME = 120; // 2 seconds
export const SPIKE_TRAP_ACTIVE_TIME = 60; // 1 second
export const SPIKE_TRAP_IDLE_TIME = 180; // 3 seconds

export const PROJECTILE_SIZE = 5;
export const PROJECTILE_SPEED = 8;
export const ENEMY_PROJECTILE_SIZE = 6;
export const ENEMY_PROJECTILE_SPEED = 4;

export const FLOATING_TEXT_LIFESPAN = 60;

export const PICKUP_SIZE = 12;
export const PICKUP_LIFESPAN = 600;
export const TREASURE_PICKUP_BASE_VALUE = 25;

export const CRITICAL_HIT_ZONE_RADIUS = 5;
export const CRITICAL_HIT_MULTIPLIER = 3;

// --- Risk, Reward, and Meta Constants ---
export const INSURANCE_COST_PERCENT = 0.25; // No longer used, set in ShopItem
export const CURSED_TOMB_DEATH_CHANCE = 0.02; // 2% chance of instant death

export const RISK_REWARDS = {
    [RiskLevel.SAFE]: { multiplier: 1.5 },
    [RiskLevel.RISKY]: { multiplier: 3.0 },
    [RiskLevel.CHAMPION_DUEL]: { multiplier: 4.0 },
};

export const TOMB_FRAGMENT_CONVERSION_RATE = 0.1; // 10% of score becomes fragments

export const PERMANENT_UPGRADES: PermanentUpgrade[] = [
    { id: 'unlock_curse_glass_cannon', name: 'Unlock Curse: Glass Cannon', description: 'Deal +100% damage, but die in one hit. (3x)', cost: 100, type: 'UNLOCK_CURSE', unlockId: 'glass_cannon'},
    { id: 'unlock_curse_elite_hunters', name: 'Unlock Curse: Elite Hunters', description: 'All enemies are replaced by Elites. (3.5x)', cost: 150, type: 'UNLOCK_CURSE', unlockId: 'elite_hunters'},
    { id: 'unlock_curse_vampiric_foes', name: 'Unlock Curse: Vampiric Foes', description: 'Enemies heal when they damage you. (2.5x)', cost: 120, type: 'UNLOCK_CURSE', unlockId: 'vampiric_foes'},
    { id: 'unlock_curse_ricochet_hell', name: 'Unlock Curse: Ricochet Hell', description: 'All projectiles bounce twice. (2x)', cost: 80, type: 'UNLOCK_CURSE', unlockId: 'ricochet_hell'},

    { id: 'unlock_shop_health_potion', name: 'Unlock Item: Health Potion', description: 'Allows Health Potions to appear in the Black Market.', cost: 50, type: 'UNLOCK_SHOP_ITEM', unlockId: 'health_potion'},
    { id: 'unlock_shop_homing_boon', name: 'Unlock Item: Homing Boon', description: 'Allows Homing Projectile boon to appear in the Market.', cost: 200, type: 'UNLOCK_SHOP_ITEM', unlockId: 'boon_homing'},

    { id: 'bonus_start_hp', name: 'Starting Bonus: +1 Max HP', description: 'Begin every run with an extra heart.', cost: 300, type: 'STARTING_BONUS', bonus: { maxHealth: 1 }},
    { id: 'bonus_start_insurance', name: 'Starting Bonus: Free Insurance', description: 'Begin every run with a free insurance policy.', cost: 250, type: 'STARTING_BONUS', bonus: { insurance: true }},
];