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

// Co-authorship network (Home page only): one ring around Arturo, sized by
// paper count. Colour isn't tied to topic (that read as unclear) — instead
// it rotates smoothly around the ring itself, a jewel-toned hue sweep keyed
// to each node's angular position, so the colour literally follows the
// circle. Per-person counts and the 25/43 totals are hand-verified against
// the Publications list. Only the top MAX_SHOWN are drawn to keep labels
// legible; the rest fold into "+N more".
function renderCollabGraph() {
  var container = document.getElementById("collab-graph");
  if (!container) return;

  var data = [
    { name: "L. Merlo", count: 8 },
    { name: "S. Vogl", count: 4 },
    { name: "S. Pokorski", count: 3 },
    { name: "J. Jaeckel", count: 3 },
    { name: "M. Ramos", count: 2 },
    { name: "J.-L. Tastet", count: 2 },
    { name: "X. Ponce Díaz", count: 2 },
    { name: "J. Turner", count: 2 },
    { name: "J. Ingoldby", count: 1 },
    { name: "V. V. Khoze", count: 1 },
    { name: "D. Naredo-Tuero", count: 1 },
    { name: "Y. G. del Castillo", count: 1 },
    { name: "S. Monath", count: 1 },
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
    { name: "B. Gavela", count: 1 },
    { name: "J. Alonso-Gonzalez", count: 1 }
  ];

  var MAX_SHOWN = 16;
  var sorted = data.slice().sort(function (a, b) { return b.count - a.count; });
  var shown = sorted.slice(0, MAX_SHOWN);
  var hidden = sorted.slice(MAX_SHOWN);

  var ordered = shown.slice();
  if (hidden.length) {
    ordered.push({ name: "+" + hidden.length + " more", count: 0, isMore: true });
  }

  var width = 1440,
    height = 1040,
    cx = width / 2,
    cy = height / 2,
    ringR = 320,
    minNodeR = 10,
    maxNodeR = 32,
    minStroke = 1,
    maxStroke = 6,
    maxCount = 8,
    centerR = 48;

  function escapeXml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  var positions = ordered.map(function (d, i) {
    var angle = (i / ordered.length) * 2 * Math.PI - Math.PI / 2;
    var r = d.isMore ? 5 : minNodeR + (maxNodeR - minNodeR) * Math.sqrt(d.count / maxCount);
    // Hue sweeps a full turn across the ring, in step with each node's own
    // angle — jewel-toned (moderate saturation, mid lightness) so it stays
    // elegant rather than neon.
    var hue = (i / ordered.length) * 360;
    return {
      name: d.name,
      count: d.count,
      isMore: !!d.isMore,
      color: d.isMore ? "var(--text-muted)" : "hsl(" + hue.toFixed(1) + ", 58%, 40%)",
      x: cx + ringR * Math.cos(angle),
      y: cy + ringR * Math.sin(angle),
      r: r,
      angle: angle,
      stagger: i % 2 === 0 ? 0 : 30
    };
  });

  var parts = [];
  parts.push(
    '<svg viewBox="0 0 ' + width + " " + height +
      '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:Inter,sans-serif;">'
  );

  positions.forEach(function (p, i) {
    // Nodes near the very top or very bottom of the ring have almost no
    // horizontal component to their angle, so the usual side-anchored label
    // ends up hanging almost straight down (or up) from the node instead of
    // reading cleanly beside it. Give those a centred label above/below
    // instead.
    var nearVertical = !p.isMore && Math.abs(Math.cos(p.angle)) < 0.35;
    var goesUp = Math.sin(p.angle) < 0;
    parts.push('<g class="node-wrap">');

    if (p.isMore) {
      parts.push(
        '<line class="node-line" x1="' + cx + '" y1="' + cy + '" x2="' + p.x.toFixed(1) + '" y2="' + p.y.toFixed(1) +
          '" stroke="var(--text-muted)" stroke-width="1" stroke-dasharray="2 4" stroke-opacity="0.5"/>'
      );
      parts.push('<g class="node-visual">');
      [-6, 0, 6].forEach(function (dx) {
        parts.push('<circle cx="' + (p.x + dx).toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="2.2" fill="var(--text-muted)"/>');
      });
      parts.push("</g>");
    } else {
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
    }

    if (p.isMore) {
      var isRight = Math.cos(p.angle) >= 0;
      var gap = 18 + p.stagger;
      var labelX = p.x + (isRight ? p.r + gap : -(p.r + gap));
      var anchor = isRight ? "start" : "end";
      parts.push(
        '<text class="node-label" x="' + labelX.toFixed(1) + '" y="' + (p.y + 4).toFixed(1) + '" text-anchor="' + anchor +
          '" font-size="19" font-style="italic" style="fill:var(--text-muted);">' + escapeXml(p.name) + "</text>"
      );
    } else if (nearVertical) {
      var vy = goesUp ? p.y - p.r - 16 : p.y + p.r + 30;
      parts.push(
        '<text class="node-label" x="' + p.x.toFixed(1) + '" y="' + vy.toFixed(1) +
          '" text-anchor="middle" font-size="21" font-weight="500" style="fill:var(--text);">' + escapeXml(p.name) + "</text>"
      );
    } else {
      var isRight2 = Math.cos(p.angle) >= 0;
      var dist2 = p.r + 12 + p.stagger;
      var labelX2 = p.x + dist2 * Math.cos(p.angle);
      var labelY2 = p.y + dist2 * Math.sin(p.angle) + 5;
      var anchor2 = isRight2 ? "start" : "end";
      parts.push(
        '<text class="node-label" x="' + labelX2.toFixed(1) + '" y="' + labelY2.toFixed(1) + '" text-anchor="' + anchor2 +
          '" font-size="21" font-weight="500" style="fill:var(--text);">' + escapeXml(p.name) + "</text>"
      );
    }

    parts.push("</g>");
  });

  parts.push('<circle cx="' + cx + '" cy="' + cy + '" r="' + centerR + '" style="fill:var(--accent);"/>');
  parts.push(
    '<text x="' + cx + '" y="' + (cy + 5) + '" text-anchor="middle" font-size="21" font-weight="700" fill="#fff">Arturo</text>'
  );

  parts.push("</svg>");
  container.innerHTML = parts.join("");
}
