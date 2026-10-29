export const REMOTE_ITEM = "mbt:remote";
export const SENDER_ITEM = "mbt:sender_module";
export const RECEIVER_ITEM = "mbt:receiver_module";

export const NODE_ITEM = {
  sender: SENDER_ITEM,
  receiver: RECEIVER_ITEM,
};

// Blocks a module can be attached to.
export const CONTAINER_BLOCKS = new Set([
  "minecraft:chest",
  "minecraft:trapped_chest",
  "minecraft:barrel",
]);

export const CHANNEL_COUNT = 8;

// Defaults: one item per transfer, one transfer per tick.
export const DEFAULT_AMOUNT = 1;
export const DEFAULT_INTERVAL = 1;
export const MAX_AMOUNT = 64;
export const MAX_INTERVAL = 100;

// Ticks a sender waits before retrying when nothing could be moved.
export const IDLE_RETRY_TICKS = 5;

// Aura (remote held) settings.
export const AURA_RANGE = 24;
export const AURA_MAX_NODES = 24;
export const AURA_PERIOD_TICKS = 4;

export const PARTICLE = {
  senderOn: "mbt:aura_sender",
  senderOff: "mbt:aura_sender_idle",
  receiver: "mbt:aura_receiver",
  transfer: "mbt:transfer",
};
