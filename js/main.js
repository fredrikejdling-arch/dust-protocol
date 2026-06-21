/* ============================================================
   Dust Protocol — game logic + my custom A-Frame component
   Course 7 / FED27 — Building Immersive Web Experiences

   What's in here:
   1. A custom A-Frame component ("inspectable") — this is the part
      I'm proudest of. It makes any entity react to hover and click
      the same way on desktop AND in VR.
   2. The round loop: inspect 3 weapons -> the bomb arms ->
      defuse it -> you win the round.
   ============================================================ */

/* ------------------------------------------------------------
   1) CUSTOM COMPONENT: "inspectable"
   Attach it to an entity and that entity will:
     - gently lift + brighten when you look/hover at it
     - settle back when you look away
     - fire a "weapon-inspected" event when clicked
   This is the equivalent of Laura's "bee-fly" component — one
   small reusable behaviour that I wrote myself and reused on all
   three weapons instead of copy-pasting the same listeners.
------------------------------------------------------------ */
AFRAME.registerComponent("inspectable", {
  schema: {
    hover: { type: "color", default: "#ffffff" },
    lift: { type: "number", default: 0.12 },
  },

  init: function () {
    this.startY = this.el.object3D.position.y;
    this.hovering = false;

    // hover IN — works for mouse pointer and VR laser
    this.el.addEventListener("mouseenter", () => {
      this.hovering = true;
      this.el.setAttribute("animation__lift", {
        property: "object3D.position.y",
        to: this.startY + this.data.lift,
        dur: 200,
        easing: "easeOutQuad",
      });
    });

    // hover OUT
    this.el.addEventListener("mouseleave", () => {
      this.hovering = false;
      this.el.setAttribute("animation__lift", {
        property: "object3D.position.y",
        to: this.startY,
        dur: 200,
        easing: "easeOutQuad",
      });
    });

    // CLICK — spin once, then announce that this weapon was inspected
    this.el.addEventListener("click", () => {
      this.el.setAttribute("animation__spin", {
        property: "object3D.rotation.y",
        from: 0,
        to: 360,
        dur: 900,
        easing: "easeInOutQuad",
      });

      // tell the rest of the app what happened (id + the data-* details)
      this.el.emit("weapon-inspected", {
        id: this.el.id,
        name: this.el.dataset.name,
        info: this.el.dataset.info,
      });
    });
  },
});

/* ------------------------------------------------------------
   2) ROUND LOGIC
   Runs once the DOM is ready.
------------------------------------------------------------ */
window.addEventListener("DOMContentLoaded", () => {
  const welcome = document.getElementById("welcome");
  const enterBtn = document.getElementById("enter-btn");
  const hud = document.getElementById("hud");

  const countEl = document.getElementById("count");
  const timerEl = document.getElementById("timer");
  const hintEl = document.getElementById("hint");

  const infoPanel = document.getElementById("info-panel");
  const infoTitle = document.getElementById("info-title");
  const infoBody = document.getElementById("info-body");

  const defuse = document.getElementById("defuse");
  const defuseLabel = document.getElementById("defuse-label");
  const bombTimer = document.getElementById("bomb-timer");
  const bombLight = document.getElementById("bomb-light");

  const result = document.getElementById("result");
  const resultText = document.getElementById("result-text");

  // keep track of which weapons have been inspected (a Set = no duplicates)
  const inspected = new Set();
  const TOTAL_WEAPONS = 3;

  let roundStarted = false;
  let bombArmed = false;
  let bombSeconds = 40; // C4 timer once it's armed
  let roundClock = 0; // how long the player has been in the round
  let timerInterval = null;
  let infoTimeout = null;

  /* ---------- START THE ROUND (from the welcome screen) ---------- */
  enterBtn.addEventListener("click", () => {
    welcome.classList.add("hidden");
    hud.classList.remove("hidden");
    startRound();
  });

  function startRound() {
    if (roundStarted) return;
    roundStarted = true;

    // a simple round clock that ticks up every second
    timerInterval = setInterval(() => {
      roundClock++;
      if (!bombArmed) {
        timerEl.textContent = formatTime(roundClock);
      } else {
        // once armed, count the bomb DOWN instead
        bombSeconds--;
        timerEl.textContent = formatTime(bombSeconds) + " TO DEFUSE";
        bombTimer.setAttribute("value", bombSeconds);
        // make the light blink faster as time runs out (tension!)
        const speed = Math.max(120, bombSeconds * 12);
        bombLight.setAttribute(
          "animation",
          `property: material.opacity; from: 1; to: 0.1; dir: alternate; dur: ${speed}; loop: true`
        );
        if (bombSeconds <= 0) endRound(false);
      }
    }, 1000);
  }

  /* ---------- WHEN A WEAPON IS INSPECTED ---------- */
  // every weapon emits "weapon-inspected"; we listen on the whole scene
  document.querySelector("a-scene").addEventListener("weapon-inspected", (e) => {
    const { id, name, info } = e.detail;

    // show the floating info panel
    showInfo(name, info);

    // count it (Set ignores repeats)
    if (!inspected.has(id)) {
      inspected.add(id);
      countEl.textContent = inspected.size;

      // hide that weapon's glow ring — visual feedback that it's "done"
      const ring = document
        .getElementById(id)
        .querySelector(".glow-ring");
      if (ring) ring.setAttribute("visible", false);
    }

    // all three done -> arm the bomb
    if (inspected.size === TOTAL_WEAPONS && !bombArmed) {
      armBomb();
    }
  });

  function showInfo(name, info) {
    infoTitle.setAttribute("value", name);
    // the data-info uses \n for line breaks; turn those into real newlines
    infoBody.setAttribute("value", (info || "").replace(/\\n/g, "\n"));
    infoPanel.setAttribute("visible", true);

    clearTimeout(infoTimeout);
    infoTimeout = setTimeout(() => {
      infoPanel.setAttribute("visible", false);
    }, 6000);
  }

  /* ---------- ARM THE BOMB (unlock the defuse) ---------- */
  function armBomb() {
    bombArmed = true;
    hintEl.textContent = "C4 ARMED — get to the bomb and click the defuse zone!";

    // light up + unlock the defuse pad
    defuse.setAttribute("visible", true);
    defuse.setAttribute("material", "color: #3cff6a; opacity: 0.65; shader: flat");
    defuse.classList.remove("locked");
    defuse.classList.add("clickable");
    defuseLabel.setAttribute("value", "DEFUSE");

    // give the defuse pad a soft pulse so it reads as interactive
    defuse.setAttribute(
      "animation",
      "property: scale; to: 1.15 1 1.15; dir: alternate; dur: 700; loop: true"
    );

    // make sure every cursor/laser raycaster now sees the unlocked defuse pad
    document.querySelectorAll("[raycaster]").forEach((el) => {
      if (el.components && el.components.raycaster) {
        el.components.raycaster.refreshObjects();
      }
    });
  }

  /* ---------- DEFUSE CLICK ---------- */
  defuse.addEventListener("click", () => {
    if (!bombArmed) return; // ignore clicks before it's armed
    endRound(true);
  });

  /* ---------- END OF ROUND ---------- */
  function endRound(won) {
    clearInterval(timerInterval);

    if (won) {
      bombLight.setAttribute("visible", false);
      bombTimer.setAttribute("value", "");
      resultText.setAttribute(
        "value",
        "BOMB DEFUSED\n\nCounter-Terrorists Win\nRound complete — nice clutch."
      );
      result.setAttribute("material", "color: #06210f; opacity: 0.95");
      resultText.setAttribute("color", "#3cff6a");
      hintEl.textContent = "Round won. Refresh to play again.";
    } else {
      resultText.setAttribute(
        "value",
        "BOOM\n\nTerrorists Win\nThe bomb went off — you were too slow."
      );
      result.setAttribute("material", "color: #2a0606; opacity: 0.95");
      resultText.setAttribute("color", "#ff5a3c");
      hintEl.textContent = "Round lost. Refresh to try again.";
    }

    result.setAttribute("visible", true);
    timerEl.textContent = "OVER";
  }

  /* ---------- small helper: seconds -> M:SS ---------- */
  function formatTime(totalSeconds) {
    const s = Math.max(0, totalSeconds);
    const m = Math.floor(s / 60);
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  }
});
