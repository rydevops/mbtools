import { system } from "@minecraft/server";
import { CONTAINER_BLOCKS, IDLE_RETRY_TICKS } from "./constants.js";
import { addTransferPacket } from "./fx.js";
import {
  allNodes,
  blockOf,
  containerOf,
  receiversFor,
  removeNode,
} from "./nodes.js";

const VALIDATE_PERIOD = 20;
let tickCount = 0;

/** Move up to `amount` items from src to dst. Returns the number moved. */
function move(src, dst, amount) {
  let moved = 0;
  for (let i = 0; i < src.size && moved < amount; i++) {
    const stack = src.getItem(i);
    if (!stack) continue;
    const n = Math.min(stack.amount, amount - moved);
    const part = stack.clone();
    part.amount = n;
    const leftover = dst.addItem(part);
    const done = n - (leftover ? leftover.amount : 0);
    if (done <= 0) continue;
    if (done >= stack.amount) {
      src.setItem(i, undefined);
    } else {
      stack.amount -= done;
      src.setItem(i, stack);
    }
    moved += done;
  }
  return moved;
}

function runSender(sender) {
  if (sender.timer > 0) {
    sender.timer--;
    return;
  }
  const receivers = receiversFor(sender.dim, sender.channel);
  if (receivers.length === 0) {
    sender.timer = IDLE_RETRY_TICKS;
    return;
  }
  const src = containerOf(sender);
  if (!src) return;

  for (let k = 0; k < receivers.length; k++) {
    const receiver = receivers[(sender.rr + k) % receivers.length];
    if (receiver.key === sender.key) continue;
    const dst = containerOf(receiver);
    if (!dst) continue;
    if (move(src, dst, sender.amount) > 0) {
      sender.rr = (sender.rr + k + 1) % receivers.length;
      sender.timer = sender.interval - 1;
      addTransferPacket(sender, receiver);
      return;
    }
  }
  sender.timer = IDLE_RETRY_TICKS;
}

/** Drop modules whose chest no longer exists. */
function validate() {
  for (const node of [...allNodes()]) {
    const block = blockOf(node);
    if (block && !CONTAINER_BLOCKS.has(block.typeId)) removeNode(node, true);
  }
}

export function startTransfers() {
  system.runInterval(() => {
    tickCount++;
    if (tickCount % VALIDATE_PERIOD === 0) validate();
    for (const node of allNodes()) {
      if (node.type !== "sender" || !node.active) continue;
      try {
        runSender(node);
      } catch {
        // chunk unloaded mid-transfer; try again next tick
      }
    }
  }, 1);
}
