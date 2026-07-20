// Shared behaviour for the rebuilt pages (mobile nav toggle, dark mode, collab graph).
document.addEventListener("DOMContentLoaded", function () {
  var toggle = document.querySelector(".nav-toggle");
  var links = document.querySelector(".nav-links");
  if (toggle && links) {
    toggle.addEventListener("click", function () {
      links.classList.toggle("open");
    });
  }

  // Dark mode toggle. The theme itself is already applied by the inline
  // head script (to avoid a flash of the wrong theme) — this just wires
  // up the button and keeps its icon in sync.
  var themeBtn = document.querySelector(".theme-toggle");
  if (themeBtn) {
    var updateIcon = function () {
      var isDark = document.documentElement.getAttribute("data-theme") === "dark";
      themeBtn.textContent = isDark ? "☀️" : "🌙";
      themeBtn.setAttribute("aria-label", isDark ? "Switch to light mode" : "Switch to dark mode");
    };
    updateIcon();
    themeBtn.addEventListener("click", function () {
      var next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem("theme", next);
      } catch (e) {
        /* private browsing / storage disabled — theme just won't persist */
      }
      updateIcon();
    });
  }

  renderCollabGraph();
});

// Co-authorship network (Home page only): two concentric rings around
// Arturo. The inner ring holds collaborators with 2+ papers together; the
// outer ring holds everyone else. Every co-author is shown — no "+N more"
// bucket needed. Colour rotates independently around each ring (a richer
// hue sweep for the inner ring, a softer one for the outer) so 26 names
// stay readable at once. Per-person counts and totals are hand-verified
// against the Publications list.
function renderCollabGraph() {
  var container = document.getElementById("collab-graph");
  if (!container) return;

  var data = [
    { name: "L. Merlo", count: 8 },
    { name: "S. Vogl", count: 4 },
    { name: "S. Pokorski", count: 3 },
    { name: "J. Jaeckel", count: 4 },
    { name: "M. Ramos", count: 2 },
    { name: "J.-L. Tastet", count: 2 },
    { name: "X. Ponce Díaz", count: 2 },
    { name: "J. Turner", count: 2 },
    { name: "J. Ingoldby", count: 1 },
    { name: "V. V. Khoze", count: 1 },
    { name: "D. Naredo-Tuero", count: 1 },
    { name: "B. Gavela", count: 1 },
    { name: "V. Takhistov", count: 1 },
    { name: "I. M. Soler", count: 1 },
    { name: "S. Sevillano Muñoz", count: 1 },
    { name: "D. Pasari", count: 1 },
    { name: "M. B. Marcos", count: 1 },
    { name: "M. F. Zamoro", count: 1 },
    { name: "S. Rigolin", count: 1 },
    { name: "F. Koutroulis", count: 1 },
    { name: "G. Piazza", count: 1 },
    { name: "J. Bonilla", count: 1 },
    { name: "Y. G. del Castillo", count: 1 },
    { name: "J. Alonso-Gonzalez", count: 1 },
    { name: "M. Marcoli", count: 1 },
    { name: "F. Silvetti", count: 1 }
  ];

  var inner = data.filter(function (d) { return d.count >= 2; })
    .sort(function (a, b) { return b.count - a.count; });
  var outer = data.filter(function (d) { return d.count === 1; });

  var width = 1160,
    height = 1040,
    cx = width / 2,
    cy = height / 2,
    innerRingR = 230,
    outerRingR = 400,
    minNodeR = 10,
    maxNodeR = 32,
    minStroke = 1,
    maxStroke = 6,
    maxCount = 8,
    centerR = 55,
    labelFontSize = 20;

  function escapeXml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function layoutRing(list, ringR, ringName, sat, light, staggerAmount) {
    return list.map(function (d, i) {
      var angle = (i / list.length) * 2 * Math.PI - Math.PI / 2;
      var r = minNodeR + (maxNodeR - minNodeR) * Math.sqrt(d.count / maxCount);
      // Hue sweeps a full turn across each ring independently, in step with
      // every node's own angle — jewel-toned (moderate saturation, mid
      // lightness) so it stays elegant rather than neon.
      var hue = (i / list.length) * 360;
      return {
        name: d.name,
        count: d.count,
        ring: ringName,
        color: "hsl(" + hue.toFixed(1) + ", " + sat + "%, " + light + "%)",
        x: cx + ringR * Math.cos(angle),
        y: cy + ringR * Math.sin(angle),
        r: r,
        angle: angle,
        stagger: i % 2 === 0 ? 0 : staggerAmount
      };
    });
  }

  // Outer ring is drawn first so its lines sit *below* everything from the
  // inner ring in SVG paint order — otherwise an outer line could cross
  // straight over an inner node's name.
  var positions = layoutRing(outer, outerRingR, "outer", 45, 58, 22).concat(
    layoutRing(inner, innerRingR, "inner", 58, 40, 30)
  );

  var parts = [];
  parts.push(
    '<svg viewBox="0 0 ' + width + " " + height +
      '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:Inter,sans-serif;">'
  );

  positions.forEach(function (p) {
    // Nodes near the very top or very bottom of a ring have almost no
    // horizontal component to their angle, so the usual side-anchored label
    // ends up hanging almost straight down (or up) from the node instead of
    // reading cleanly beside it. Give those a centred label above/below
    // instead. The outer ring has more, closer-together nodes, so it needs
    // a tighter threshold to avoid catching a near-neighbour too.
    var vThreshold = p.ring === "inner" ? 0.35 : 0.3;
    var nearVertical = Math.abs(Math.cos(p.angle)) < vThreshold;
    var goesUp = Math.sin(p.angle) < 0;
    parts.push('<g class="node-wrap">');

    var strokeW = minStroke + (maxStroke - minStroke) * (p.count / maxCount);
    parts.push(
      '<line class="node-line" x1="' + cx + '" y1="' + cy + '" x2="' + p.x.toFixed(1) + '" y2="' + p.y.toFixed(1) +
        '" stroke="' + p.color + '" stroke-width="' + strokeW.toFixed(2) + '" stroke-opacity="0.55"/>'
    );
    parts.push("<title>" + escapeXml(p.name) + " — " + p.count + " co-authored paper" + (p.count === 1 ? "" : "s") + "</title>");
    parts.push('<g class="node-visual">');
    parts.push(
      '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + p.r.toFixed(1) +
        '" fill="' + p.color + '" stroke="var(--surface)" stroke-width="1.5"/>'
    );
    var countFontSize = Math.max(13, Math.min(19, p.r * 0.8));
    parts.push(
      '<text x="' + p.x.toFixed(1) + '" y="' + (p.y + countFontSize * 0.35).toFixed(1) +
        '" text-anchor="middle" font-size="' + countFontSize.toFixed(1) + '" font-weight="700" fill="#ffffff">' + p.count + "</text>"
    );
    parts.push("</g>");

    // Labels get a soft halo in the card's own background colour, painted
    // behind the letters (paint-order: stroke first, then fill). Without
    // it, a line from the *other* ring can cross straight through a name
    // and make it unreadable; the halo blocks that without needing real
    // backdrop blur, which inline SVG can't do reliably.
    var haloAttrs =
      ' paint-order="stroke fill" stroke="var(--surface)" stroke-width="6" stroke-linejoin="round" stroke-opacity="0.9"';

    if (nearVertical) {
      var vy = goesUp ? p.y - p.r - 16 : p.y + p.r + labelFontSize + 14;
      parts.push(
        '<text class="node-label" x="' + p.x.toFixed(1) + '" y="' + vy.toFixed(1) +
          '" text-anchor="middle" font-size="' + labelFontSize + '" font-weight="500"' + haloAttrs +
          ' style="fill:var(--text);">' + escapeXml(p.name) + "</text>"
      );
    } else {
      var isRight = Math.cos(p.angle) >= 0;
      var dist = p.r + 12 + p.stagger;
      var labelX = p.x + dist * Math.cos(p.angle);
      var labelY = p.y + dist * Math.sin(p.angle) + 5;
      var anchor = isRight ? "start" : "end";
      parts.push(
        '<text class="node-label" x="' + labelX.toFixed(1) + '" y="' + labelY.toFixed(1) + '" text-anchor="' + anchor +
          '" font-size="' + labelFontSize + '" font-weight="500"' + haloAttrs +
          ' style="fill:var(--text);">' + escapeXml(p.name) + "</text>"
      );
    }

    parts.push("</g>");
  });

  parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + centerR + '" style="fill:var(--accent);"/>');
  parts.push(
    '<text x="' + cx + '" y="' + (cy + 6) + '" text-anchor="middle" font-size="22" font-weight="700" fill="#fff">Arturo</text>'
  );

  parts.push("</svg>");
  container.innerHTML = parts.join("");
}
