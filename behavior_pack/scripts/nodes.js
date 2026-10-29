import { world, ItemStack } from "@minecraft/server";
import {
  CONTAINER_BLOCKS,
  DEFAULT_AMOUNT,
  DEFAULT_INTERVAL,
  NODE_ITEM,
} from "./constants.js";

const PROP_PREFIX = "mbt:node:";

/** @type {Map<string, Node>} */
const nodes = new Map();
let receiverCache = null;

/**
 * @typedef {Object} Node
 * @property {string} key
 * @property {string} dim  dimension id
 * @property {number} x
 * @property {number} y
 * @property {number} z
 * @property {"sender"|"receiver"} type
 * @property {number} channel 1-8
 * @property {boolean} active  senders only
 * @property {number} amount   senders only, items per transfer
 * @property {number} interval senders only, ticks between transfers
 * @property {number} timer    runtime only
 * @property {number} rr       runtime only, round robin index
 */

export const keyOf = (dim, x, y, z) => `${dim}|${x}|${y}|${z}`;

function save(node) {
  const { type, channel, active, amount, interval } = node;
  world.setDynamicProperty(
    PROP_PREFIX + node.key,
    JSON.stringify({ type, channel, active, amount, interval }),
  );
}

export function loadNodes() {
  nodes.clear();
  receiverCache = null;
  for (const id of world.getDynamicPropertyIds()) {
    if (!id.startsWith(PROP_PREFIX)) continue;
    const key = id.slice(PROP_PREFIX.length);
    const [dim, x, y, z] = key.split("|");
    try {
      const data = JSON.parse(String(world.getDynamicProperty(id)));
      nodes.set(key, makeNode(key, dim, +x, +y, +z, data));
    } catch {
      world.setDynamicProperty(id, undefined);
    }
  }
}

function makeNode(key, dim, x, y, z, data) {
  return {
    key,
    dim,
    x,
    y,
    z,
    type: /** @type {"sender"|"receiver"} */ (data.type === "receiver" ? "receiver" : "sender"),
    channel: data.channel ?? 1,
    active: data.active ?? false,
    amount: data.amount ?? DEFAULT_AMOUNT,
    interval: data.interval ?? DEFAULT_INTERVAL,
    timer: 0,
    rr: 0,
  };
}

export const allNodes = () => nodes.values();
export const nodeAt = (block) =>
  nodes.get(keyOf(block.dimension.id, block.x, block.y, block.z));

export function addNode(block, type, channel = 1) {
  const key = keyOf(block.dimension.id, block.x, block.y, block.z);
  const node = makeNode(key, block.dimension.id, block.x, block.y, block.z, {
    type,
    channel,
  });
  nodes.set(key, node);
  receiverCache = null;
  save(node);
  return node;
}

/** Call after editing a node's settings. */
export function updateNode(node) {
  receiverCache = null;
  save(node);
}

/** Removes the node and drops its module item at the chest. */
export function removeNode(node, dropTo) {
  nodes.delete(node.key);
  receiverCache = null;
  world.setDynamicProperty(PROP_PREFIX + node.key, undefined);
  if (dropTo) {
    try {
      const dim = world.getDimension(node.dim);
      dim.spawnItem(new ItemStack(NODE_ITEM[node.type], 1), {
        x: node.x + 0.5,
        y: node.y + 1,
        z: node.z + 0.5,
      });
    } catch {
      // chunk not loaded; the module is lost
    }
  }
}

/** Receivers grouped by "dim|channel". */
export function receiversFor(dim, channel) {
  if (!receiverCache) {
    receiverCache = new Map();
    for (const n of nodes.values()) {
      if (n.type !== "receiver") continue;
      const k = `${n.dim}|${n.channel}`;
      if (!receiverCache.has(k)) receiverCache.set(k, []);
      receiverCache.get(k).push(n);
    }
  }
  return receiverCache.get(`${dim}|${channel}`) ?? [];
}

/**
 * Resolve the block of a node.
 * @returns {import("@minecraft/server").Block | undefined} undefined if unloaded
 */
export function blockOf(node) {
  try {
    return world
      .getDimension(node.dim)
      .getBlock({ x: node.x, y: node.y, z: node.z });
  } catch {
    return undefined;
  }
}

export function containerOf(node) {
  const block = blockOf(node);
  if (!block || !CONTAINER_BLOCKS.has(block.typeId)) return undefined;
  return block.getComponent("minecraft:inventory")?.container;
}
