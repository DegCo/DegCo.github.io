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

// Co-authorship network (Home page only). Counts are hand-verified against
// the Publications list: 21 papers, 25 distinct co-authors, 43 total
// co-author credits — both cross-checked to make sure they match. Only the
// top MAX_SHOWN are drawn (sorted largest → smallest, clockwise from the
// top) to keep labels legible; the rest are folded into a "+N more" node.
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

  // Plain descending order around the ring — biggest at the top, shrinking
  // clockwise — reads more predictably than interleaving, and with fewer
  // nodes on the ring there's enough angular gap between labels either way.
  var ordered = shown.slice();
  if (hidden.length) {
    var hiddenTotal = hidden.reduce(function (s, d) { return s + d.count; }, 0);
    ordered.push({
      name: "+" + hidden.length + " more (" + hiddenTotal + " credits)",
      count: 0,
      isMore: true
    });
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

  function colorFor(c) {
    if (c >= 7) return "#6e1423";
    if (c >= 4) return "#8a2a3a";
    if (c === 3) return "#9c3c4c";
    if (c === 2) return "#b0525e";
    return "#c98d94";
  }

  function escapeXml(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  var positions = ordered.map(function (d, i) {
    var angle = (i / ordered.length) * 2 * Math.PI - Math.PI / 2;
    var r = d.isMore ? 5 : minNodeR + (maxNodeR - minNodeR) * Math.sqrt(d.count / maxCount);
    return {
      name: d.name,
      count: d.count,
      isMore: !!d.isMore,
      x: cx + ringR * Math.cos(angle),
      y: cy + ringR * Math.sin(angle),
      r: r,
      angle: angle,
      // alternate every other label a bit further out, so radially close
      // labels on the same side don't sit at exactly the same offset
      stagger: i % 2 === 0 ? 0 : 30
    };
  });

  var svg =
    '<svg viewBox="0 0 ' +
    width +
    " " +
    height +
    '" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;font-family:Inter,sans-serif;">';

  positions.forEach(function (p) {
    if (p.isMore) {
      svg +=
        '<line x1="' + cx + '" y1="' + cy + '" x2="' + p.x.toFixed(1) + '" y2="' + p.y.toFixed(1) +
        '" stroke="var(--text-muted)" stroke-width="1" stroke-dasharray="2 4" stroke-opacity="0.5"/>';
      return;
    }
    var strokeW = minStroke + (maxStroke - minStroke) * (p.count / maxCount);
    svg +=
      '<line x1="' + cx + '" y1="' + cy + '" x2="' + p.x.toFixed(1) + '" y2="' + p.y.toFixed(1) +
      '" stroke="' + colorFor(p.count) + '" stroke-width="' + strokeW.toFixed(2) + '" stroke-opacity="0.5"/>';
  });

  svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + centerR + '" style="fill:var(--accent);"/>';
  svg +=
    '<text x="' + cx + '" y="' + (cy + 5) + '" text-anchor="middle" font-size="21" font-weight="700" fill="#fff">Arturo</text>';

  positions.forEach(function (p, i) {
    if (p.isMore) {
      // Small ellipsis "dots" instead of a solid node, to read as "there's more here" rather than another collaborator.
      [-6, 0, 6].forEach(function (dx) {
        svg += '<circle cx="' + (p.x + dx).toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="2.2" fill="var(--text-muted)"/>';
      });
    } else {
      svg += '<circle cx="' + p.x.toFixed(1) + '" cy="' + p.y.toFixed(1) + '" r="' + p.r.toFixed(1) +
        '" fill="' + colorFor(p.count) + '" style="stroke:var(--surface);stroke-width:1.5;"/>';
      // Count goes inside the node itself now, not appended to the label —
      // keeps the label text short so it doesn't collide with its neighbours.
      var countFontSize = Math.max(13, Math.min(19, p.r * 0.8));
      svg +=
        '<text x="' + p.x.toFixed(1) + '" y="' + (p.y + countFontSize * 0.35).toFixed(1) +
        '" text-anchor="middle" font-size="' + countFontSize.toFixed(1) +
        '" font-weight="700" fill="#fbe9ea">' + p.count + "</text>";
    }

    // The very first node sits exactly at the top of the ring (angle = -90°).
    // A side label there sits almost directly above its right-hand neighbour,
    // so instead give it a centred label straight above the node.
    var isTopNode = i === 0 && !p.isMore;

    if (p.isMore) {
      var isRight = Math.cos(p.angle) >= 0;
      var gap = 18 + p.stagger;
      var labelX = p.x + (isRight ? p.r + gap : -(p.r + gap));
      var anchor = isRight ? "start" : "end";
      svg +=
        '<text x="' + labelX.toFixed(1) + '" y="' + (p.y + 4).toFixed(1) + '" text-anchor="' + anchor +
        '" font-size="19" font-style="italic" style="fill:var(--text-muted);">' + escapeXml(p.name) + "</text>";
    } else if (isTopNode) {
      svg +=
        '<text x="' + p.x.toFixed(1) + '" y="' + (p.y - p.r - 16).toFixed(1) + '" text-anchor="middle" font-size="21" font-weight="500" style="fill:var(--text);">' + escapeXml(p.name) + "</text>";
    } else {
      // Project the label further out along the same line from the centre
      // through the node (rather than a flat horizontal offset), so labels
      // near the top fan out up-and-sideways instead of stacking level with
      // their neighbour.
      var isRight2 = Math.cos(p.angle) >= 0;
      var dist2 = p.r + 12 + p.stagger;
      var labelX2 = p.x + dist2 * Math.cos(p.angle);
      var labelY2 = p.y + dist2 * Math.sin(p.angle) + 5;
      var anchor2 = isRight2 ? "start" : "end";
      svg +=
        '<text x="' + labelX2.toFixed(1) + '" y="' + labelY2.toFixed(1) + '" text-anchor="' + anchor2 +
        '" font-size="21" font-weight="500" style="fill:var(--text);">' + escapeXml(p.name) + "</text>";
    }
  });

  svg += "</svg>";
  container.innerHTML = svg;
}
