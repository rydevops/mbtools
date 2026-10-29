# mbtools – Chest Logistics (Minecraft Bedrock)

Attach a **Sender** or **Receiver** module to a chest, tune them to one of 8 channels with the
**Logistics Remote**, and items flow from sender chests to receiver chests. Uses the **stable**
Script API only (`@minecraft/server` 2.0.0, `@minecraft/server-ui` 2.0.0) – no Beta APIs or
experimental toggles are required.

## Installing / updating

`behavior_pack.zip` and `resource_pack.zip` contain the pack files at the zip root. Extract each
into its development folder (overwriting existing files):

| Zip | Extract into |
| --- | --- |
| `behavior_pack.zip` | `.../minecraftWorlds/<world>/behavior_packs/` or `development_behavior_packs/mbtools_BP/` |
| `resource_pack.zip` | `.../resource_packs/` or `development_resource_packs/mbtools_RP/` |

Activate both packs on the world (the BP declares the RP as a dependency).

## Using it

| Item | How to get it | Use |
| --- | --- | --- |
| Logistics Sender Module | Creative menu / recipe | Use on a chest, trapped chest or barrel |
| Logistics Receiver Module | Creative menu / recipe | Use on a chest, trapped chest or barrel |
| Logistics Remote | Creative menu / recipe | Use on a module chest → settings form; sneak-use on a sender → toggle it on/off |

Sender settings (defaults): channel 1, **inactive**, **1 item per transfer**, **1 tick** between
transfers. Receiver setting: channel (1–8). The form also has "Remove module" to get the item back.
Breaking the chest drops the module.

* **Aura:** while the remote is in your selected hotbar slot, nearby modules glow –
  orange = active sender, grey = idle sender, green = receiver.
* **Transfer particle:** every transfer sends a small glowing dot from the sender to the receiver.
* Multiple receivers on a channel are served round-robin. Sender and receiver must be in the
  same dimension. Senders retry every 5 ticks while nothing can be moved.

## Repo layout

* `behavior_pack/` – manifest, items, recipes, scripts (`scripts/*.js`)
* `resource_pack/` – manifest, item textures, particles
* `behavior_pack.zip`, `resource_pack.zip` – distributable zips (no `.mcpack`/`.mcaddon`)
* `tools/generate_assets.py` – regenerates textures/particles
* `tools/build_zips.py` – rebuilds both zips deterministically

**After every change to a pack folder, run `python3 tools/build_zips.py` and commit the zips.**
