/* Ominite Neural Memory — D3 Force Simulation Graph Controller */

const API_BASE = "http://127.0.0.1:8001";

// State management
let memories = [];
let simulation = null;
let svg = null;
let gMain = null;
let linkSel = null;
let nodeSel = null;
let currentUserId = "athrva_test";
let activeTheme = "light";

// D3 Zoom behavior reference
let zoomBehavior = null;

// Physics parameters (synced with slider defaults)
let repulsionStrength = -250;
let linkDistance = 80;
let gravityStrength = 0.1;
let pulseDuration = 2.5; // seconds
let showLabels = true;
let animatePulses = true;

// UI Elements mapping
const els = {
  userIdInput: document.getElementById('user-id-input'),
  userSelect: document.getElementById('user-select'),
  searchInput: document.getElementById('search-input'),
  healthDot: document.getElementById('health-dot'),
  emptyState: document.getElementById('empty-state'),
  loadingState: document.getElementById('loading-state'),
  panel: document.getElementById('panel'),
  panelText: document.getElementById('panel-text'),
  panelId: document.getElementById('panel-id'),
  panelCreated: document.getElementById('panel-created'),
  panelDelete: document.getElementById('panel-delete'),
  panelClose: document.getElementById('panel-close'),
  addDrawer: document.getElementById('add-drawer'),
  addTextarea: document.getElementById('add-textarea'),
  addSubmitBtn: document.getElementById('add-submit-btn'),
  toast: document.getElementById('toast'),
  
  // Theme and Controls
  themeBtn: document.getElementById('theme-btn'),
  refreshBtn: document.getElementById('refresh-btn'),
  addToggleBtn: document.getElementById('add-toggle-btn'),
  downloadBtn: document.getElementById('download-btn'),
  
  // Sliders and controls
  repulsionSlider: document.getElementById('repulsion-slider'),
  repulsionVal: document.getElementById('repulsion-val'),
  linkDistSlider: document.getElementById('link-dist-slider'),
  linkDistVal: document.getElementById('link-dist-val'),
  gravitySlider: document.getElementById('gravity-slider'),
  gravityVal: document.getElementById('gravity-val'),
  pulseDurSlider: document.getElementById('pulse-dur-slider'),
  pulseDurVal: document.getElementById('pulse-dur-val'),
  toggleLabels: document.getElementById('toggle-labels'),
  togglePulses: document.getElementById('toggle-pulses'),
  toggleSettingsVis: document.getElementById('toggle-settings-vis'),
  settingsControlsWrapper: document.getElementById('settings-controls-wrapper'),
  legendContainer: document.getElementById('legend-container'),
  
  // Zoom
  zoomInBtn: document.getElementById('zoom-in-btn'),
  zoomOutBtn: document.getElementById('zoom-out-btn'),
  zoomResetBtn: document.getElementById('zoom-reset-btn'),
};

// Category branch colors palette (bioluminescent style)
const colorPalette = [
  "#22d3ee", // Electric Teal
  "#ec4899", // Magenta Ray
  "#10b981", // Emerald Synapse
  "#a855f7", // Purple Cortex
  "#f59e0b", // Amber Flame
  "#f97316", // Orange Signal
  "#fb7185", // Coral Glow
  "#06b6d4"  // Deep Cyan
];
let categoryColors = {};

// Helper: Show toast notification
function showToast(msg, ms = 3000) {
  els.toast.textContent = msg;
  els.toast.classList.add('show');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.remove('show'), ms);
}

// ---- Theme Management ----
function initTheme() {
  const savedTheme = localStorage.getItem('ominite-theme') || 'light';
  setTheme(savedTheme);
  
  els.themeBtn.addEventListener('click', () => {
    const nextTheme = activeTheme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
  });
}

function setTheme(theme) {
  activeTheme = theme;
  document.documentElement.setAttribute('data-theme', theme);
  els.themeBtn.innerHTML = theme === 'light' ? '🌙 Dark' : '☀ Light';
  localStorage.setItem('ominite-theme', theme);
}

// ---- Collapsible Graph Settings ----
els.toggleSettingsVis.addEventListener('click', () => {
  const isHidden = els.settingsControlsWrapper.classList.toggle('hidden');
  els.toggleSettingsVis.textContent = isHidden ? 'expand' : 'collapse';
});

// ---- Hook up Real-time Sliders ----
els.repulsionSlider.addEventListener('input', (e) => {
  repulsionStrength = +e.target.value;
  els.repulsionVal.textContent = repulsionStrength;
  if (simulation) {
    simulation.force("charge").strength(repulsionStrength);
    simulation.alphaTarget(0.1).restart();
  }
});

els.linkDistSlider.addEventListener('input', (e) => {
  linkDistance = +e.target.value;
  els.linkDistVal.textContent = linkDistance;
  if (simulation) {
    simulation.force("link").distance(d => {
      if (d.source.data.type === 'center') return linkDistance * 1.5;
      if (d.source.data.type === 'category') return linkDistance * 0.9;
      return linkDistance * 0.7;
    });
    simulation.alphaTarget(0.1).restart();
  }
});

els.gravitySlider.addEventListener('input', (e) => {
  gravityStrength = +e.target.value;
  els.gravityVal.textContent = gravityStrength;
  if (simulation) {
    simulation.force("radial").strength(gravityStrength);
    simulation.alphaTarget(0.1).restart();
  }
});

els.pulseDurSlider.addEventListener('input', (e) => {
  pulseDuration = +e.target.value;
  els.pulseDurVal.textContent = pulseDuration + "s";
  document.documentElement.style.setProperty('--pulse-duration', pulseDuration + 's');
});

els.toggleLabels.addEventListener('change', (e) => {
  showLabels = e.target.checked;
  if (nodeSel) {
    nodeSel.selectAll('text').style('opacity', showLabels ? 0.9 : 0);
  }
});

els.togglePulses.addEventListener('change', (e) => {
  animatePulses = e.target.checked;
  if (linkSel) {
    linkSel.selectAll('.link-pulse').style('display', animatePulses ? 'block' : 'none');
  }
});

// ---- API Operations ----
async function checkHealth() {
  try {
    const r = await fetch(`${API_BASE}/health`);
    const data = await r.json();
    els.healthDot.className = 'dot ' + (data.ollama_reachable ? 'ok' : 'bad');
  } catch (e) {
    els.healthDot.className = 'dot bad';
  }
}

async function fetchUsers() {
  try {
    const r = await fetch(`${API_BASE}/users/list`);
    const data = await r.json();
    const select = els.userSelect;
    const current = els.userIdInput.value;
    select.innerHTML = '<option value="" disabled selected>switch user...</option>' +
      data.users.map(u => `<option value="${u}" ${u === current ? 'selected' : ''}>${u}</option>`).join('');
  } catch (e) {
    // Non-fatal fallback
  }
}

async function fetchMemories(userId) {
  els.loadingState.classList.remove('hidden');
  els.emptyState.classList.add('hidden');
  try {
    const r = await fetch(`${API_BASE}/memory/all`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.detail || 'request failed');
    }
    const data = await r.json();
    memories = data.result?.results || data.result || [];
    renderGraph();
  } catch (e) {
    showToast('Could not load memories: ' + e.message);
  } finally {
    els.loadingState.classList.add('hidden');
  }
}

async function addMemory(text) {
  if (!text.trim()) return;
  els.addSubmitBtn.disabled = true;
  showToast('Synthesizing memory — extracting dialog features via LLM...', 40000);
  try {
    const r = await fetch(`${API_BASE}/memory/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, user_id: currentUserId })
    });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.detail || 'failed to add');
    }
    const data = await r.json();
    if (data.status === 'skipped_duplicate') {
      showToast('Synapse skipped: a highly similar memory already exists.');
    } else {
      showToast('New memory synapse added successfully.');
    }
    els.addTextarea.value = '';
    els.addDrawer.classList.remove('open');
    fetchMemories(currentUserId);
    fetchUsers();
  } catch (e) {
    showToast('Add failed: ' + e.message);
  } finally {
    els.addSubmitBtn.disabled = false;
  }
}

async function deleteMemory(memoryId) {
  if (!confirm('Are you sure you want to prune/delete this memory?')) return;
  try {
    const r = await fetch(`${API_BASE}/memory/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memory_id: memoryId })
    });
    if (!r.ok) {
      const err = await r.json();
      throw new Error(err.detail || 'failed to delete');
    }
    showToast('Memory pruned');
    closePanel();
    fetchMemories(currentUserId);
  } catch (e) {
    showToast('Prune failed: ' + e.message);
  }
}

// ---- Clustering Algorithm (retained from original) ----
const STOPWORDS = new Set([
  'user', 'users', "user's", 'the', 'is', 'a', 'an', 'of', 'to', 'in', 'for', 'and',
  'my', 'their', 'this', 'that', 'are', 'was', 'has', 'have', 'with', 'on', 'at', 'it'
]);

function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s']/g, '').split(/\s+/)
    .filter(w => w.length > 2 && !STOPWORDS.has(w));
}

function clusterOnce(items, excludeTokens) {
  const clusters = [];
  items.forEach(item => {
    const available = [...item.tokens].filter(t => !excludeTokens.has(t));
    const match = clusters.find(c => available.some(t => c.tokens.has(t)));
    if (match) {
      available.forEach(t => match.tokens.add(t));
      match.items.push(item);
    } else {
      clusters.push({ tokens: new Set(available), items: [item] });
    }
  });
  return clusters;
}

function buildTree(items, excludeTokens, depth) {
  const MAX_DEPTH = 20;
  const toLeaves = list => list.map(it => ({
    id: it.mem.id, full: it.mem.memory, created_at: it.mem.created_at, type: 'memory'
  }));

  if (items.length <= 1 || depth >= MAX_DEPTH) return toLeaves(items);

  const clusters = clusterOnce(items, excludeTokens);
  if (clusters.length === items.length) return toLeaves(items);

  return clusters.map(cluster => {
    if (cluster.items.length === 1) return toLeaves(cluster.items)[0];

    const freq = {};
    cluster.items.forEach(it =>
      [...it.tokens].filter(t => !excludeTokens.has(t)).forEach(t => { freq[t] = (freq[t] || 0) + 1; })
    );
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
    const label = sorted.length ? sorted[0][0] : 'related';
    const nextExclude = new Set(excludeTokens);
    nextExclude.add(label);

    return {
      id: `cluster-${label}-${depth}`,
      full: label.charAt(0).toUpperCase() + label.slice(1),
      type: 'category',
      children: buildTree(cluster.items, nextExclude, depth + 1)
    };
  });
}

function buildMemoryTree(memoryList) {
  const items = memoryList.map(m => ({ mem: m, tokens: new Set(tokenize(m.memory)) }));
  return buildTree(items, new Set(), 0);
}

// ---- Render Force Graph using D3 ----
function renderGraph() {
  const container = document.getElementById('graph');
  const width = container.clientWidth;
  const height = container.clientHeight;

  if (memories.length === 0) {
    if (gMain) gMain.selectAll('*').remove();
    els.emptyState.classList.remove('hidden');
    els.legendContainer.innerHTML = `<div class="legend-item" style="color: var(--text-muted); font-style: italic;">No circuits loaded.</div>`;
    return;
  }
  els.emptyState.classList.add('hidden');

  // 1. Build hierarchy tree
  const hierarchyData = {
    id: '__center__',
    full: currentUserId,
    type: 'center',
    children: buildMemoryTree(memories)
  };
  const rootNode = d3.hierarchy(hierarchyData);

  // Flatten the hierarchy into nodes and links for force simulation
  const nodesData = rootNode.descendants();
  const linksData = rootNode.links();

  // 2. Generate Palette mapping for Category Branches
  categoryColors = {};
  let colorIdx = 0;
  if (rootNode.children) {
    rootNode.children.forEach(child => {
      if (child.data.type === 'category') {
        const color = colorPalette[colorIdx % colorPalette.length];
        categoryColors[child.data.id] = color;
        colorIdx++;
      }
    });
  }

  // Update Legend Panel UI
  updateLegendUI();

  // Color helper to determine colors based on node branch location
  function getNodeColor(node) {
    if (node.data.type === 'center') return 'var(--n-center)';
    
    // Find parent category
    let cur = node;
    while (cur.parent && cur.parent.data.type !== 'center') {
      cur = cur.parent;
    }
    return categoryColors[cur.data.id] || 'var(--violet)';
  }

  // 3. Initialize SVG elements if not present
  if (!svg) {
    svg = d3.select('#graph');
    gMain = svg.append('g').attr('class', 'graph-g-wrapper');
    
    // Define arrow/glowing filters in SVG defs
    const defs = svg.append('defs');
    
    // Create zoom behavior
    zoomBehavior = d3.zoom()
      .scaleExtent([0.15, 4])
      .on('zoom', (ev) => {
        gMain.attr('transform', ev.transform);
      });
      
    svg.call(zoomBehavior).on("dblclick.zoom", null);
  }

  // Auto-resize viewport size attributes
  svg.attr('viewBox', [0, 0, width, height]);

  // Set initial spawn coordinates to cluster around the center
  nodesData.forEach(d => {
    if (!d.x || !d.y) {
      d.x = width / 2 + (Math.random() - 0.5) * 60;
      d.y = height / 2 + (Math.random() - 0.5) * 60;
    }
  });

  // Pin center node to middle of viewport initially
  const centerNode = nodesData.find(d => d.data.type === 'center');
  if (centerNode) {
    centerNode.fx = width / 2;
    centerNode.fy = height / 2;
  }

  // 4. Force Simulation Setup
  if (simulation) simulation.stop();

  simulation = d3.forceSimulation(nodesData)
    .force("link", d3.forceLink(linksData)
      .id(d => d.data.id)
      .distance(d => {
        if (d.source.data.type === 'center') return linkDistance * 1.5;
        if (d.source.data.type === 'category') return linkDistance * 0.9;
        return linkDistance * 0.7;
      })
      .strength(1)
    )
    .force("charge", d3.forceManyBody().strength(repulsionStrength))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collide", d3.forceCollide().radius(d => {
      if (d.data.type === 'center') return 45;
      if (d.data.type === 'category') return 25;
      return 15;
    }).iterations(2))
    .force("radial", d3.forceRadial(Math.min(width, height) / 3, width / 2, height / 2).strength(gravityStrength));

  // 5. Draw Links (Each link is a group with 3 layered paths: underlay glow, main core, impulse pulse)
  const linkGroups = gMain.selectAll('g.link')
    .data(linksData, d => d.target.data.id)
    .join(
      enter => {
        const le = enter.append('g').attr('class', 'link');
        
        // Glow layer
        le.append('path')
          .attr('class', 'link-underlay')
          .style('--link-color', d => getNodeColor(d.target));
          
        // Thin core line
        le.append('path')
          .attr('class', 'link-core')
          .style('--link-color', d => getNodeColor(d.target));
          
        // Impulse synapse pulsing layer
        le.append('path')
          .attr('class', 'link-pulse')
          .style('--pulse-color', d => getNodeColor(d.target))
          .style('display', animatePulses ? 'block' : 'none');
          
        return le;
      },
      update => {
        update.select('.link-underlay').style('--link-color', d => getNodeColor(d.target));
        update.select('.link-core').style('--link-color', d => getNodeColor(d.target));
        update.select('.link-pulse')
          .style('--pulse-color', d => getNodeColor(d.target))
          .style('display', animatePulses ? 'block' : 'none');
        return update;
      },
      exit => exit.remove()
    );

  // 6. Draw Nodes (Groups of circle + text)
  const nodeGroups = gMain.selectAll('g.node')
    .data(nodesData, d => d.data.id)
    .join(
      enter => {
        const ne = enter.append('g')
          .attr('class', d => `node ${d.data.type}-node`)
          .style('--node-color', d => getNodeColor(d))
          .call(drag(simulation));
          
        ne.append('circle')
          .attr('r', d => d.data.type === 'center' ? 18 : d.data.type === 'category' ? 10 : 6)
          .attr('fill', d => d.data.type === 'center' ? 'var(--n-center)' : 'var(--bg)')
          .attr('stroke', d => getNodeColor(d))
          .attr('stroke-width', d => d.data.type === 'center' ? 0 : 2)
          .style('filter', d => d.data.type === 'center' ? 'drop-shadow(0 0 8px var(--n-center))' : 'none');

        ne.append('text')
          .text(d => d.data.type === 'memory' ? truncate(d.data.full, 24) : d.data.full)
          .attr('x', 0)
          .attr('y', d => d.data.type === 'center' ? 32 : d.data.type === 'category' ? 22 : 16)
          .attr('text-anchor', 'middle')
          .style('opacity', showLabels ? 0.9 : 0)
          .style('font-weight', d => d.data.type === 'center' ? 600 : d.data.type === 'category' ? 500 : 400)
          .style('font-style', d => d.data.type === 'category' ? 'italic' : 'normal');

        return ne;
      },
      update => {
        update.attr('class', d => `node ${d.data.type}-node`)
          .style('--node-color', d => getNodeColor(d));
        update.select('circle')
          .attr('r', d => d.data.type === 'center' ? 18 : d.data.type === 'category' ? 10 : 6)
          .attr('fill', d => d.data.type === 'center' ? 'var(--n-center)' : 'var(--bg)')
          .attr('stroke', d => getNodeColor(d))
          .attr('stroke-width', d => d.data.type === 'center' ? 0 : 2);
        update.select('text')
          .text(d => d.data.type === 'memory' ? truncate(d.data.full, 24) : d.data.full)
          .style('opacity', showLabels ? 0.9 : 0);
        return update;
      },
      exit => exit.remove()
    );

  // Cache selection handles
  linkSel = linkGroups;
  nodeSel = nodeGroups;

  // 7. Physics Simulation Tick Listener
  simulation.on("tick", () => {
    // Keep nodes inside bounds gently
    nodesData.forEach(d => {
      if (d.data.type === 'center') return; // center is fixed
      d.x = Math.max(40, Math.min(width - 40, d.x));
      d.y = Math.max(40, Math.min(height - 40, d.y));
    });

    // Update link path coordinates (straight lines)
    linkSel.selectAll('path').attr('d', d => {
      return `M${d.source.x},${d.source.y} L${d.target.x},${d.target.y}`;
    });

    // Update node positions
    nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
  });

  // 8. Event wiring
  nodeSel.on('click', (ev, d) => {
    ev.stopPropagation();
    if (d.data.type === 'memory') {
      openPanel(d.data);
    }
  });

  // Neural Pathway Activation Hover Effects
  nodeSel.on('mouseenter', function(ev, d) {
    if (!simulation) return;
    
    // Find all nodes in the pathway to highlight
    const pathNodes = new Set();
    const pathLinks = new Set();
    
    pathNodes.add(d.data.id);
    
    if (d.data.type === 'center') {
      // Highlight everything
      nodesData.forEach(n => pathNodes.add(n.data.id));
      linksData.forEach(l => pathLinks.add(l.target.data.id));
    } else if (d.data.type === 'category') {
      // Highlight center, this category, its child memories, and links
      pathNodes.add('__center__');
      d.descendants().forEach(n => pathNodes.add(n.data.id));
      linksData.forEach(l => {
        // if link connects center -> category, or category -> memory child
        if (l.target.data.id === d.data.id || (l.source.data.id === d.data.id)) {
          pathLinks.add(l.target.data.id);
        }
      });
    } else if (d.data.type === 'memory') {
      // Highlight path: memory -> parent category -> center
      let curr = d;
      while (curr) {
        pathNodes.add(curr.data.id);
        if (curr.parent) {
          pathLinks.add(curr.data.id);
        }
        curr = curr.parent;
      }
    }

    // Apply CSS states
    nodeSel.classed('dim', n => !pathNodes.has(n.data.id));
    nodeSel.classed('active-path', n => pathNodes.has(n.data.id));
    
    linkSel.classed('dim', l => !pathLinks.has(l.target.data.id));
    linkSel.classed('active', l => pathLinks.has(l.target.data.id));
  });

  nodeSel.on('mouseleave', () => {
    nodeSel.classed('dim', false);
    nodeSel.classed('active-path', false);
    linkSel.classed('dim', false);
    linkSel.classed('active', false);
  });

  // 9. Initial Zoom Fit
  fitGraphToScreen(500);

  // Apply search query filter if already typed
  applyFilter(els.searchInput.value);
}

// Fit Zoom handler
function fitGraphToScreen(duration = 750) {
  if (!svg || !gMain || !simulation) return;
  const nodes = simulation.nodes();
  if (nodes.length === 0) return;

  const width = svg.node().clientWidth;
  const height = svg.node().clientHeight;

  // Compute bounding box manually
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  nodes.forEach(d => {
    if (d.x < minX) minX = d.x;
    if (d.x > maxX) maxX = d.x;
    if (d.y < minY) minY = d.y;
    if (d.y > maxY) maxY = d.y;
  });

  const graphWidth = maxX - minX + 120;
  const graphHeight = maxY - minY + 120;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  const scale = Math.max(0.25, Math.min(1.5, 0.85 / Math.max(graphWidth / width, graphHeight / height)));
  const transX = width / 2 - scale * centerX;
  const transY = height / 2 - scale * centerY;

  svg.transition().duration(duration).call(
    zoomBehavior.transform,
    d3.zoomIdentity.translate(transX, transY).scale(scale)
  );
}

// Update the legend overlay HTML
function updateLegendUI() {
  const container = els.legendContainer;
  const entries = Object.entries(categoryColors);
  
  if (entries.length === 0) {
    container.innerHTML = `<div class="legend-item" style="color: var(--text-muted); font-style: italic;">No circuits loaded.</div>`;
    return;
  }

  container.innerHTML = entries.map(([id, color]) => {
    // Format label name e.g. "cluster-coding-0" -> "Coding"
    const parts = id.split('-');
    const labelName = parts.length > 1 ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : id;
    
    return `
      <div class="legend-item">
        <span class="legend-color" style="background: ${color}; box-shadow: 0 0 6px ${color};"></span>
        <span class="legend-name" title="${labelName}">${labelName}</span>
      </div>
    `;
  }).join('');
}

// D3 Drag behaviour
function drag(sim) {
  function dragstarted(ev, d) {
    if (!ev.active) sim.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }
  
  function dragged(ev, d) {
    // Cap positions inside the bounds
    const width = svg.node().clientWidth;
    const height = svg.node().clientHeight;
    d.fx = Math.max(20, Math.min(width - 20, ev.x));
    d.fy = Math.max(20, Math.min(height - 20, ev.y));
  }
  
  function dragended(ev, d) {
    if (!ev.active) sim.alphaTarget(0);
    // Don't unpin the center node
    if (d.data.type !== 'center') {
      d.fx = null;
      d.fy = null;
    }
  }
  
  return d3.drag()
    .on('start', dragstarted)
    .on('drag', dragged)
    .on('end', dragended);
}

// Search and filter synapses
function applyFilter(query) {
  if (!nodeSel) return;
  const q = query.trim().toLowerCase();
  
  function nodeMatches(d, queryStr) {
    if (!queryStr) return false;
    if (d.data.type === 'memory') return d.data.full.toLowerCase().includes(queryStr);
    if (d.data.type === 'category') return d.data.full.toLowerCase().includes(queryStr) || d.leaves().some(l => l.data.full.toLowerCase().includes(queryStr));
    return false;
  }

  nodeSel.classed('dim', d => d.data.type !== 'center' && q && !nodeMatches(d, q));
  nodeSel.classed('match', d => nodeMatches(d, q));
  
  if (linkSel) {
    linkSel.classed('match', l => nodeMatches(l.target, q));
    linkSel.classed('dim', l => q && !nodeMatches(l.target, q));
  }
}

// ---- Details and Drawers ----
function openPanel(data) {
  els.panelText.textContent = data.full;
  els.panelId.textContent = data.id;
  els.panelCreated.textContent = data.created_at ? new Date(data.created_at).toLocaleString() : '—';
  els.panelDelete.dataset.memoryId = data.id;
  els.panel.classList.add('open');
}

function closePanel() {
  els.panel.classList.remove('open');
}

function truncate(str, n) {
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

// Export as markdown
function downloadMarkdown() {
  if (memories.length === 0) {
    showToast('Nothing to export');
    return;
  }
  const lines = [
    `# Ominite Memories — ${currentUserId}`,
    ``,
    `_Exported ${new Date().toLocaleString()}_`,
    ``
  ];
  memories.forEach(m => {
    const date = m.created_at ? new Date(m.created_at).toLocaleDateString() : '';
    lines.push(`- ${m.memory} ${date ? `_(${date})_` : ''}`);
  });
  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ominite-memories-${currentUserId}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- UI Bindings and Event Listeners ----
els.refreshBtn.addEventListener('click', () => fetchMemories(currentUserId));
els.downloadBtn.addEventListener('click', downloadMarkdown);
els.panelClose.addEventListener('click', closePanel);
els.panelDelete.addEventListener('click', (e) => deleteMemory(e.target.dataset.memoryId));

els.addToggleBtn.addEventListener('click', () => {
  els.addDrawer.classList.toggle('open');
  if (els.addDrawer.classList.contains('open')) {
    els.addTextarea.focus();
  }
});

els.addSubmitBtn.addEventListener('click', () => addMemory(els.addTextarea.value));

els.searchInput.addEventListener('input', (e) => applyFilter(e.target.value));

els.userIdInput.addEventListener('change', (e) => {
  currentUserId = e.target.value.trim() || 'athrva_test';
  fetchMemories(currentUserId);
});

els.userSelect.addEventListener('change', (e) => {
  currentUserId = e.target.value;
  els.userIdInput.value = currentUserId;
  fetchMemories(currentUserId);
});

// Zoom Controls Event Hookups
els.zoomInBtn.addEventListener('click', () => {
  if (svg) svg.transition().duration(250).call(zoomBehavior.scaleBy, 1.3);
});

els.zoomOutBtn.addEventListener('click', () => {
  if (svg) svg.transition().duration(250).call(zoomBehavior.scaleBy, 0.7);
});

els.zoomResetBtn.addEventListener('click', () => {
  fitGraphToScreen(500);
});

// Window resize listener
window.addEventListener('resize', () => {
  if (svg && simulation) {
    const w = document.getElementById('graph').clientWidth;
    const h = document.getElementById('graph').clientHeight;
    svg.attr('viewBox', [0, 0, w, h]);
    simulation.force("center", d3.forceCenter(w / 2, h / 2));
    simulation.force("radial", d3.forceRadial(Math.min(w, h) / 3, w / 2, h / 2).strength(gravityStrength));
    simulation.alphaTarget(0.05).restart();
  }
});

// ---- Initialization ----
initTheme();
checkHealth();
setInterval(checkHealth, 15000);
fetchUsers();
fetchMemories(currentUserId);
