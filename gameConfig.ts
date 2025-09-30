import type { Curse, ShopItem, Boon } from './types';

export const ALL_CURSES: Curse[] = [
  {
    id: 'swarm',
    name: 'Swarm',
    description: 'Doubles the number of enemies.',
    multiplier: 2.5,
    isUnlocked: true,
  },
  {
    id: 'fast_enemies',
    name: 'Frenzy',
    description: 'All enemies are significantly faster.',
    multiplier: 1.8,
    isUnlocked: true,
  },
  {
    id: 'fog_of_war',
    name: 'Fog of War',
    description: 'Your vision is severely limited.',
    multiplier: 2.0,
    isUnlocked: true,
  },
  {
    id: 'elite_patrol',
    name: 'Elite Patrol',
    description: 'Enemies have more health.',
    multiplier: 2.2,
    isUnlocked: true,
  },
  // --- Unlockable Curses ---
  {
    id: 'glass_cannon',
    name: 'Glass Cannon',
    description: 'Deal +100% damage, but die in one hit.',
    multiplier: 3.0,
  },
  {
    id: 'elite_hunters',
    name: 'Elite Hunters',
    description: 'All enemies are replaced by Elites.',
    multiplier: 3.5,
  },
  {
    id: 'vampiric_foes',
    name: 'Vampiric Foes',
    description: 'Enemies heal when they damage you.',
    multiplier: 2.5,
  },
  {
    id: 'ricochet_hell',
    name: 'Ricochet Hell',
    description: 'All projectiles bounce off walls twice.',
    multiplier: 2.0,
  },
];

export const ALL_SHOP_ITEMS: ShopItem[] = [
    {
        id: 'insurance',
        name: 'Buy Insurance',
        description: 'If you die, recover 50% of your wager.',
        cost: 25,
        type: 'INSURANCE',
    },
    // --- Unlockable Shop Items ---
    {
        id: 'health_potion',
        name: 'Health Potion',
        description: 'Restore 2 lost HP before the next room.',
        cost: 25,
        type: 'HEALTH_POTION'
    },
    {
        id: 'boon_homing',
        name: 'Boon: Homing Shots',
        description: 'Your projectiles will home in on enemies for one room.',
        cost: 40,
        type: 'BOON',
        boon: { id: 'homing', name: 'Homing Shots', description: '', duration: 1 }
    }
];
