# Dust Protocol — A CS2 WebXR Experience

A small WebXR experience built with [A-Frame](https://aframe.io/) for the
*Building Immersive Web Experiences* course. You spawn on a Dust2-style
bombsite, inspect three iconic CS2 weapons on a table, and then defuse the
planted C4 before the round timer runs out.

## How to run it

It's all static files — no build step. Either:

- **Open the live version** (deployed on Vercel — link in the repo description), or
- **Run it locally:** from this folder run a tiny web server and open the page.
  A-Frame needs to be served over `http://`, not opened as a `file://`, so:

  ```bash
  # Python 3
  python -m http.server 8000
  # then open http://localhost:8000
  ```

## Controls

| Platform | Look | Move | Interact |
|----------|------|------|----------|
| Desktop  | drag mouse | `W` `A` `S` `D` | click objects |
| VR       | headset | thumbstick | point + trigger |

For VR on a desktop without a headset, install the free **Immersive Web
Emulator** Chrome extension (shown in the course slides), then press the
goggles button bottom-right.

## What's inside

- `index.html` — the whole A-Frame scene (welcome screen, bombsite, weapon
  table, info panel, C4, defuse zone, player rig).
- `css/style.css` — the welcome screen + the HUD overlay.
- `js/main.js` — the game logic **and** my custom A-Frame component
  `inspectable`, which gives any entity the same hover-lift / click-spin /
  "inspected" behaviour on both desktop and VR.

## Built for two platforms

The player rig uses `movement-controls` + a raycaster cursor on desktop, and
A-Frame automatically swaps in the headset camera and `laser-controls` hand
controllers in VR — so the same scene works as a 2D web page and as an
immersive VR experience.

## Credits / tools

- A-Frame 1.7.1
- aframe-extras 7.5.4 (for `movement-controls`)
- All 3D objects are built from A-Frame primitives (no external models).
