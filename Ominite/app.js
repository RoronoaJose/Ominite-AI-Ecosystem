/**
 * Ominite AI Ecosystem — Frontend Controller
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- STATE MANAGEMENT ---
  const state = {
    isLoggedIn: false,
    user: {
      name: 'Guest User',
      email: 'guest@ominite.ai'
    },
    activeModule: 'chat',
    activeView: 'landing', // 'landing' or 'dashboard'
    notes: [],
    activeNoteId: null,
    todos: [],
    chatCount: 1,
    summaryCount: 0
  };

  // --- CONFIGURATIONS & PRESETS ---
  const moduleData = {
    chat: {
      sem: 'Semester 1',
      title: 'AI Chat Assistant',
      desc: 'An intelligent conversation partner powered by advanced language processing, capable of adjusting personalities to solve technical, creative, and customer support problems instantly.',
      features: ['Contextual Memory', 'Multiple Personas', 'Realtime Streaming', 'Markdown Rendering']
    },
    notes: {
      sem: 'Semester 1',
      title: 'AI Notes workspace',
      desc: 'A smart document creator that continuously saves text drafts locally. Integrates text parsing prompts to restructure or format notes on the fly.',
      features: ['Automatic Saving', 'Fast Search indexing', 'CRUD Note Actions', 'Metadata Tags']
    },
    summarizer: {
      sem: 'Semester 1',
      title: 'AI Text Summarizer',
      desc: 'An information reducer designed to consume lengthy papers, reports, or articles and output condensed summaries along with structural bullet lists.',
      features: ['Scan Line Animation', 'Bulleted key points', 'Sentence extraction', 'Document analysis']
    },
    todo: {
      sem: 'Semester 1',
      title: 'AI Priority To-Do',
      desc: 'A task management board with category indicators and priority hierarchies. Helps organize daily goals into clean lists.',
      features: ['Priority Levels', 'Category Grouping', 'Checklist items', 'State persistence']
    },
    study: {
      sem: 'Semester 2',
      title: 'AI Study Assistant',
      desc: 'An academic tutor module designed to generate study cards, custom quizzes, and summary review sheets from standard text uploads.',
      features: ['Quiz Generation', 'Flashcard Builder', 'Spaced Repetition', 'Academic Help']
    },
    resume: {
      sem: 'Semester 2',
      title: 'AI Resume Builder',
      desc: 'A career assistant that automatically aligns resume descriptions to specific job requirements, adjusting tone and format.',
      features: ['Job Description Sync', 'Tailored Bulletpoints', 'PDF Templates', 'Cover Letter Engine']
    },
    translator: {
      sem: 'Semester 2',
      title: 'AI Translator',
      desc: 'A real-time translation module designed to maintain formatting across document layouts while translating between 30+ languages.',
      features: ['Format Preservation', 'Contextual Slang', 'Fast Translations', 'Slang Adaptation']
    },
    planner: {
      sem: 'Semester 2',
      title: 'AI Planner',
      desc: 'An automated scheduling assistant that maps long-term project deliverables to specific daily calendar events.',
      features: ['Timeline Generator', 'Gantt visualization', 'Automated Blocking', 'Slack Reminders']
    }
  };

  const chatAnswers = {
    helpful: {
      default: "I'd be happy to assist you with anything regarding Ominite AI! What details are you looking for?",
      roadmap: "Our Semester 1 core is currently operational (Chat, Notes, Summarizer, and Tasks). Semester 2 introduces study modules, translation, and planning. Semesters 3 and 4 build out shared contexts and scalability.",
      features: "Ominite centralizes multiple tools under a single account. This eliminates context switching between apps and enables cross-module data sharing.",
      notes: "The AI Notes workspace lets you record thoughts and format them. All note drafts are stored directly inside your browser storage.",
      summarizer: "The Summarizer takes complex text and reduces it to brief summaries and lists of key takeaways instantly.",
      sso: "Single Sign-On allows you to access Chat, Notes, Summarizer, and To-Do lists without ever managing separate profile accounts."
    },
    technical: {
      default: "Console ready. System state active. What technical inquiry or architectural details do you require?",
      roadmap: "Sem 1: Core frontend structures. Sem 2: Integration of advanced utilities. Sem 3: Graph DB layers for shared context. Sem 4: Plugins SDK and third-party Webhook integration.",
      features: "Ominite runs an event-driven decoupled client system where all modules share parent application credentials.",
      notes: "Notes utilizes browser-level LocalStorage APIs. Notes are stored as JSON structures with schema tracking id, title, content, and modified timestamps.",
      summarizer: "The Summarizer module utilizes token-based extraction rules to process text sections and compile sentences with high thematic score values.",
      sso: "SSO is simulated with local storage keys, but maps to unified OAuth authentication layers in production."
    },
    creative: {
      default: "Hello writer! Let's weave some magic together. What stories are we telling or what ideas are we bringing to life today?",
      roadmap: "Think of Ominite as a seed growing into a tree: starting with Semester 1 roots (Chat, Notes, Summarizer, Tasks), growing Semester 2 branches (study, translation, planners), and blooming in Semester 3 & 4 with deep, unified ecosystem intelligence.",
      features: "Imagine a master canvas where all your thoughts, tasks, translations, and writings exist in beautiful, synchronized harmony.",
      notes: "Your notes are safe sanctuaries for your words, saved silently in the background while you focus on creating.",
      summarizer: "The Summarizer acts as a filter, clearing away the fog from walls of text to highlight the bright stars of core information.",
      sso: "A single key to open all doors. SSO ensures your thoughts remain connected as you step from chat channels into document writers."
    }
  };

  // --- INITIALIZATION ---
  initCanvas();
  loadLocalStorageData();
  bindEvents();
  updateView();
  updateDashboardOverview();

  // --- CANVAS PARTICLE BACKGROUND ---
  function initCanvas() {
    const canvas = document.getElementById('particle-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const particles = [];
    const particleCount = Math.min(60, Math.floor((width * height) / 25000));
    const connectionDistance = 120;
    
    const mouse = { x: null, y: null, radius: 150 };

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    window.addEventListener('mousemove', (e) => {
      mouse.x = e.x;
      mouse.y = e.y;
    });

    window.addEventListener('mouseout', () => {
      mouse.x = null;
      mouse.y = null;
    });

    class Particle {
      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.size = Math.random() * 2 + 1;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        // Mouse interaction
        if (mouse.x !== null) {
          const dx = this.x - mouse.x;
          const dy = this.y - mouse.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < mouse.radius) {
            const force = (mouse.radius - dist) / mouse.radius;
            this.x += (dx / dist) * force * 1.5;
            this.y += (dy / dist) * force * 1.5;
          }
        }
      }

      draw() {
        ctx.fillStyle = 'rgba(139, 92, 246, 0.4)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle core gradient glow behind core
      if (state.activeView === 'landing') {
        const grad = ctx.createRadialGradient(width/2, height/2, 10, width/2, height/2, width * 0.4);
        grad.addColorStop(0, 'rgba(15, 17, 35, 0.6)');
        grad.addColorStop(1, 'rgba(4, 4, 8, 1)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }

      particles.forEach((p) => {
        p.update();
        p.draw();
      });

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance) {
            const alpha = (1 - dist / connectionDistance) * 0.15;
            ctx.strokeStyle = `rgba(6, 182, 212, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      requestAnimationFrame(animate);
    }

    animate();
  }

  // --- DYNAMIC CARD INTERACTIVE LIGHT ---
  document.querySelectorAll('.glass-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });

  // --- LOCAL STORAGE SERVICES ---
  function loadLocalStorageData() {
    const savedUser = localStorage.getItem('ominite_user');
    if (savedUser) {
      state.user = JSON.parse(savedUser);
      state.isLoggedIn = true;
    }

    const savedNotes = localStorage.getItem('ominite_notes');
    if (savedNotes) {
      state.notes = JSON.parse(savedNotes);
    } else {
      state.notes = [
        { id: '1', title: 'Getting Started with Ominite', content: 'Welcome to your AI Notes workspace!\n\nHere are three key things you can do:\n1. Create and delete notes locally.\n2. Paste note content directly into the Summarizer module to extract key ideas.\n3. Chat with different AI personas in the Chat tab.', date: new Date().toLocaleDateString() }
      ];
      localStorage.setItem('ominite_notes', JSON.stringify(state.notes));
    }

    const savedTodos = localStorage.getItem('ominite_todos');
    if (savedTodos) {
      state.todos = JSON.parse(savedTodos);
    } else {
      state.todos = [
        { id: '1', text: 'Set up Ominite Sandbox profile credentials', completed: false, priority: 'high', category: 'personal' },
        { id: '2', text: 'Test AI Chat using Technical persona', completed: false, priority: 'medium', category: 'study' },
        { id: '3', text: 'Verify Notes local saving mechanism works', completed: true, priority: 'low', category: 'work' }
      ];
      localStorage.setItem('ominite_todos', JSON.stringify(state.todos));
    }
  }

  // --- EVENT BINDINGS ---
  function bindEvents() {
    // Nav view transitions
    document.getElementById('nav-logo').addEventListener('click', (e) => {
      e.preventDefault();
      switchView('landing');
    });

    document.getElementById('btn-launch-dashboard').addEventListener('click', () => {
      switchView('dashboard');
    });

    document.getElementById('hero-btn-launch').addEventListener('click', () => {
      switchView('dashboard');
    });

    // Auth simulation modal handlers
    const authOverlay = document.getElementById('auth-modal-overlay');
    const openAuthBtn = document.getElementById('btn-open-login');
    const dashAuthBtn = document.getElementById('dash-btn-auth');

    const openAuthModal = () => {
      document.getElementById('auth-input-username').value = state.isLoggedIn ? state.user.name : '';
      document.getElementById('auth-input-email').value = state.isLoggedIn ? state.user.email : '';
      document.getElementById('auth-title').innerText = state.isLoggedIn ? 'Manage Sandbox Profile' : 'Sign In to Sandbox';
      document.getElementById('auth-switch-prompt').innerText = state.isLoggedIn ? 'Reset your mock dashboard configuration?' : 'Need to switch states?';
      document.getElementById('auth-toggle-link').innerText = state.isLoggedIn ? 'Reset Profile' : 'Guest Sign In';
      
      authOverlay.classList.add('active');
    };

    openAuthBtn.addEventListener('click', openAuthModal);
    dashAuthBtn.addEventListener('click', openAuthModal);

    authOverlay.addEventListener('click', (e) => {
      if (e.target === authOverlay) authOverlay.classList.remove('active');
    });

    document.getElementById('auth-submit-btn').addEventListener('click', () => {
      const usernameInput = document.getElementById('auth-input-username').value.trim();
      const emailInput = document.getElementById('auth-input-email').value.trim();
      if (!usernameInput) return;

      state.user.name = usernameInput;
      state.user.email = emailInput || 'guest@ominite.ai';
      state.isLoggedIn = true;

      localStorage.setItem('ominite_user', JSON.stringify(state.user));
      updateView();
      updateDashboardOverview();
      authOverlay.classList.remove('active');
    });

    document.getElementById('auth-toggle-link').addEventListener('click', () => {
      if (state.isLoggedIn) {
        // Reset profile
        localStorage.removeItem('ominite_user');
        state.isLoggedIn = false;
        state.user = { name: 'Guest User', email: 'guest@ominite.ai' };
        updateView();
        updateDashboardOverview();
      } else {
        // Quick log in as guest
        state.user = { name: 'Dev Guest', email: 'dev@ominite.ai' };
        state.isLoggedIn = true;
        localStorage.setItem('ominite_user', JSON.stringify(state.user));
        updateView();
        updateDashboardOverview();
      }
      authOverlay.classList.remove('active');
    });

    // Orbit Map interaction
    const orbitNodes = document.querySelectorAll('.module-node');
    orbitNodes.forEach(node => {
      node.addEventListener('click', () => {
        orbitNodes.forEach(n => n.classList.remove('active'));
        node.classList.add('active');
        const modKey = node.getAttribute('data-module');
        const data = moduleData[modKey];
        if (data) {
          document.getElementById('detail-tag').innerText = data.sem;
          document.getElementById('detail-title').innerText = data.title;
          document.getElementById('detail-desc').innerText = data.desc;

          const featuresUl = document.getElementById('detail-features');
          featuresUl.innerHTML = '';
          data.features.forEach(f => {
            const li = document.createElement('li');
            li.innerHTML = `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg> ${f}`;
            featuresUl.appendChild(li);
          });
        }
      });
    });

    // Dashboard sidebar tab navigation
    const sidebarBtns = document.querySelectorAll('.sidebar-btn');
    sidebarBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        sidebarBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const targetPanel = btn.getAttribute('data-target');
        
        document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`panel-${targetPanel}`).classList.add('active');

        // Note editor layout check when entering notes tab
        if (targetPanel === 'notes') {
          renderNotesList();
          if (state.notes.length > 0 && !state.activeNoteId) {
            selectNote(state.notes[0].id);
          }
        }
      });
    });

    // --- AI CHAT MODULE HANDLERS ---
    const chatInput = document.getElementById('chat-user-input');
    const sendChatBtn = document.getElementById('chat-send-btn');
    
    // Switch personas
    document.querySelectorAll('.persona-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.persona-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    const triggerSendChat = () => {
      const text = chatInput.value.trim();
      if (!text) return;

      appendChatMessage(text, 'user');
      chatInput.value = '';

      state.chatCount++;
      document.getElementById('stat-chat-count').innerText = state.chatCount;

      // Simulate bot writing
      setTimeout(() => {
        const activePersona = document.querySelector('.persona-btn.active').getAttribute('data-persona');
        const reply = matchAIResponse(text, activePersona);
        appendChatMessageWithTyping(reply, 'bot');
      }, 600);
    };

    sendChatBtn.addEventListener('click', triggerSendChat);
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') triggerSendChat();
    });

    // --- AI NOTES MODULE HANDLERS ---
    document.getElementById('notes-new-btn').addEventListener('click', () => {
      const newNote = {
        id: Date.now().toString(),
        title: 'Untitled Note',
        content: '',
        date: new Date().toLocaleDateString()
      };
      state.notes.unshift(newNote);
      localStorage.setItem('ominite_notes', JSON.stringify(state.notes));
      renderNotesList();
      selectNote(newNote.id);
      document.getElementById('stat-notes-count').innerText = state.notes.length;
    });

    document.getElementById('notes-save-btn').addEventListener('click', () => {
      if (!state.activeNoteId) return;
      const index = state.notes.findIndex(n => n.id === state.activeNoteId);
      if (index === -1) return;

      const titleVal = document.getElementById('note-editor-title').value.trim() || 'Untitled Note';
      const contentVal = document.getElementById('note-editor-body').value;

      state.notes[index].title = titleVal;
      state.notes[index].content = contentVal;
      state.notes[index].date = new Date().toLocaleDateString();

      localStorage.setItem('ominite_notes', JSON.stringify(state.notes));
      renderNotesList();
      
      // Visual feedback
      const saveBtn = document.getElementById('notes-save-btn');
      const originalText = saveBtn.innerText;
      saveBtn.innerText = 'Saved!';
      saveBtn.style.background = 'linear-gradient(135deg, var(--accent-teal) 0%, var(--accent-blue) 100%)';
      setTimeout(() => {
        saveBtn.innerText = originalText;
        saveBtn.style.background = '';
      }, 1200);
    });

    document.getElementById('notes-delete-btn').addEventListener('click', () => {
      if (!state.activeNoteId) return;
      state.notes = state.notes.filter(n => n.id !== state.activeNoteId);
      localStorage.setItem('ominite_notes', JSON.stringify(state.notes));
      renderNotesList();
      if (state.notes.length > 0) {
        selectNote(state.notes[0].id);
      } else {
        state.activeNoteId = null;
        document.getElementById('note-editor-title').value = '';
        document.getElementById('note-editor-body').value = '';
      }
      document.getElementById('stat-notes-count').innerText = state.notes.length;
    });

    // --- AI SUMMARIZER HANDLERS ---
    const summaryInput = document.getElementById('summary-input-text');
    const summarizeBtn = document.getElementById('summary-btn');
    const scanner = document.getElementById('summary-scanner');
    const summaryPlaceholder = document.getElementById('summary-output-placeholder');
    const summaryOutputContent = document.getElementById('summary-output-content');

    // Preset buttons
    document.querySelectorAll('.preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const type = btn.getAttribute('data-preset');
        if (type === 'roadmap') {
          summaryInput.value = `Roadmap of Ominite development states:
Semester 1 focuses on releasing basic utility assets: User Authentication, high performance Dashboard interfaces, AI Chat, Notes workspaces, simple Summarizers, and priority To-Do lists.
Semester 2 introduces advanced utilities: AI Study cards, a template builder for resumes, document translators, and calendars.
Semester 3 unifies the services into a centralized contextual ecosystem graph.
Semester 4 provides scaling with developer plugins and collaborative folders.`;
        } else if (type === 'problems') {
          summaryInput.value = `Problem Statement of modern applications:
Currently, digital workflows are fragmented across multiple web apps. Notes, chat channels, summarizers, and calendars operate independently. This fragmentation forces users to manage separate accounts, switch screens, recreate contexts, and struggle with inconsistent data formats. It reduces overall productivity and creates friction in daily tasks.`;
        }
      });
    });

    summarizeBtn.addEventListener('click', () => {
      const text = summaryInput.value.trim();
      if (!text) return;

      scanner.style.display = 'block';
      summaryPlaceholder.style.display = 'none';
      summaryOutputContent.style.display = 'none';

      // Simulate model analysis delay
      setTimeout(() => {
        scanner.style.display = 'none';
        summaryOutputContent.style.display = 'block';
        
        state.summaryCount++;
        document.getElementById('stat-summary-count').innerText = state.summaryCount;

        // Perform mock extraction
        const lines = text.split('\n');
        const mainSummary = lines[0] ? `The document addresses: ${lines[0].substring(0, 120)}...` : "The text provides general context regarding technical structures.";
        
        document.getElementById('summary-text-p').innerText = mainSummary;

        const bulletsUl = document.getElementById('summary-bullets-ul');
        bulletsUl.innerHTML = '';
        
        const bulletPoints = [
          "Identifies primary entities and conceptual processes mentioned in the file.",
          "Synthesizes structural timeline updates or key constraints.",
          "Suggests actions to execute or integrate within Ominite services."
        ];

        // Custom points based on input contents
        if (text.toLowerCase().includes('semester')) {
          bulletPoints[0] = "Highlights development progression across 4 Semesters.";
          bulletPoints[1] = "Outlines shift from Semester 1 foundations to Semester 3 intelligence.";
        }
        if (text.toLowerCase().includes('fragment')) {
          bulletPoints[0] = "Friction caused by multiple independent logins and context loss.";
          bulletPoints[1] = "Need for integrated ecosystem dashboards to boost work speed.";
        }

        bulletPoints.forEach(pt => {
          const li = document.createElement('li');
          li.innerText = pt;
          bulletsUl.appendChild(li);
        });

      }, 2000);
    });

    // --- AI TO-DO HANDLERS ---
    const todoInputText = document.getElementById('todo-input-text');
    const todoAddBtn = document.getElementById('todo-add-btn');

    todoAddBtn.addEventListener('click', () => {
      const text = todoInputText.value.trim();
      if (!text) return;

      const priority = document.getElementById('todo-input-priority').value;
      const category = document.getElementById('todo-input-category').value;

      const newItem = {
        id: Date.now().toString(),
        text: text,
        completed: false,
        priority: priority,
        category: category
      };

      state.todos.push(newItem);
      localStorage.setItem('ominite_todos', JSON.stringify(state.todos));
      
      todoInputText.value = '';
      renderTodoList();
    });

    todoInputText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') todoAddBtn.click();
    });
  }

  // --- RENDERING ROUTINES ---
  function switchView(view) {
    state.activeView = view;
    document.getElementById('landing-view').classList.remove('active');
    document.getElementById('dashboard-view').classList.remove('active');

    const openAuthBtn = document.getElementById('btn-open-login');

    if (view === 'landing') {
      document.getElementById('landing-view').classList.add('active');
      openAuthBtn.style.display = 'inline-flex';
      window.scrollTo(0, 0);
    } else {
      document.getElementById('dashboard-view').classList.add('active');
      openAuthBtn.style.display = 'none'; // Hide login on dashboard, user profiles are integrated in sidebar footer
      renderNotesList();
      renderTodoList();
    }
    updateView();
  }

  function updateView() {
    // Header actions update
    const btnLaunch = document.getElementById('btn-launch-dashboard');
    const btnOpenLogin = document.getElementById('btn-open-login');

    if (state.isLoggedIn) {
      btnOpenLogin.innerText = `Sign Out (${state.user.name.split(' ')[0]})`;
      btnOpenLogin.style.borderColor = 'var(--accent-purple)';
      btnLaunch.innerText = 'Go to Workspace';
      
      // Update sidebar footer
      document.getElementById('sidebar-username').innerText = state.user.name;
      document.getElementById('sidebar-userstatus').innerText = 'Standard Profile';
      document.getElementById('sidebar-avatar').innerText = state.user.name.charAt(0).toUpperCase();
      document.getElementById('sidebar-avatar').classList.remove('guest');

      // Update overview greetings
      document.getElementById('overview-greeting').innerText = state.user.name;
      document.getElementById('profile-text-desc').innerText = `Logged in as ${state.user.name} (${state.user.email}). Synced context configuration database keys active.`;
      document.getElementById('dash-btn-auth').innerText = 'Manage Sandbox Profile';
    } else {
      btnOpenLogin.innerText = 'Sign In';
      btnOpenLogin.style.borderColor = '';
      btnLaunch.innerText = 'Launch App';

      // Sidebar footer guest update
      document.getElementById('sidebar-username').innerText = 'Guest User';
      document.getElementById('sidebar-userstatus').innerText = 'Limited Sandbox';
      document.getElementById('sidebar-avatar').innerText = 'G';
      document.getElementById('sidebar-avatar').classList.add('guest');

      document.getElementById('overview-greeting').innerText = 'Guest';
      document.getElementById('profile-text-desc').innerText = 'You are exploring as a guest. Click Sign In in the navigation bar to personalize your sandbox name.';
      document.getElementById('dash-btn-auth').innerText = 'Configure Session Profile';
    }
  }

  function updateDashboardOverview() {
    document.getElementById('stat-chat-count').innerText = state.chatCount;
    document.getElementById('stat-notes-count').innerText = state.notes.length;
    document.getElementById('stat-summary-count').innerText = state.summaryCount;
    document.getElementById('stat-todo-count').innerText = state.todos.filter(t => !t.completed).length;
  }

  // AI Chat Replies
  function matchAIResponse(input, persona) {
    const text = input.toLowerCase();
    const responses = chatAnswers[persona] || chatAnswers.helpful;

    if (text.includes('roadmap') || text.includes('semester')) return responses.roadmap;
    if (text.includes('feature') || text.includes('benefit') || text.includes('why')) return responses.features;
    if (text.includes('note') || text.includes('draft')) return responses.notes;
    if (text.includes('summarize') || text.includes('summary')) return responses.summarizer;
    if (text.includes('login') || text.includes('sso') || text.includes('sign')) return responses.sso;
    
    return responses.default;
  }

  function appendChatMessage(text, sender) {
    const container = document.getElementById('chat-messages-container');
    const msg = document.createElement('div');
    msg.className = `chat-msg ${sender}`;
    msg.innerText = text;
    container.appendChild(msg);
    container.scrollTop = container.scrollHeight;
  }

  function appendChatMessageWithTyping(text, sender) {
    const container = document.getElementById('chat-messages-container');
    const msg = document.createElement('div');
    msg.className = `chat-msg ${sender}`;
    container.appendChild(msg);
    
    let i = 0;
    const speed = 25; // ms per char

    function typeChar() {
      if (i < text.length) {
        msg.innerHTML += text.charAt(i);
        i++;
        container.scrollTop = container.scrollHeight;
        setTimeout(typeChar, speed);
      }
    }
    typeChar();
  }

  // AI Notes list drawer
  function renderNotesList() {
    const container = document.getElementById('notes-list-container');
    container.innerHTML = '';

    state.notes.forEach(note => {
      const btn = document.createElement('button');
      btn.className = `note-item-btn ${state.activeNoteId === note.id ? 'active' : ''}`;
      btn.innerHTML = `
        <span class="note-item-title">${note.title || 'Untitled Note'}</span>
        <span class="note-item-date">${note.date}</span>
      `;
      btn.addEventListener('click', () => selectNote(note.id));
      container.appendChild(btn);
    });
    updateDashboardOverview();
  }

  function selectNote(noteId) {
    state.activeNoteId = noteId;
    
    // update highlights
    document.querySelectorAll('.note-item-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    const activeBtn = Array.from(document.querySelectorAll('.note-item-btn')).find((_, i) => state.notes[i] && state.notes[i].id === noteId);
    if (activeBtn) activeBtn.classList.add('active');

    const note = state.notes.find(n => n.id === noteId);
    if (note) {
      document.getElementById('note-editor-title').value = note.title;
      document.getElementById('note-editor-body').value = note.content;
    }
  }

  // AI Todo list rendering
  function renderTodoList() {
    const container = document.getElementById('todo-list-container');
    container.innerHTML = '';

    state.todos.forEach(todo => {
      const item = document.createElement('div');
      item.className = 'todo-item';
      item.innerHTML = `
        <div class="todo-item-left">
          <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" data-id="${todo.id}"></div>
          <span class="todo-item-text ${todo.completed ? 'completed' : ''}">${todo.text}</span>
        </div>
        <div class="todo-item-left" style="gap: 16px;">
          <div class="todo-item-tags">
            <span class="todo-tag priority-${todo.priority}">${todo.priority}</span>
            <span class="todo-tag category-${todo.category}">${todo.category}</span>
          </div>
          <button class="todo-item-delete" data-id="${todo.id}">
            <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
          </button>
        </div>
      `;

      // Checkbox click
      item.querySelector('.todo-checkbox').addEventListener('click', () => {
        todo.completed = !todo.completed;
        localStorage.setItem('ominite_todos', JSON.stringify(state.todos));
        renderTodoList();
      });

      // Delete click
      item.querySelector('.todo-item-delete').addEventListener('click', () => {
        state.todos = state.todos.filter(t => t.id !== todo.id);
        localStorage.setItem('ominite_todos', JSON.stringify(state.todos));
        renderTodoList();
      });

      container.appendChild(item);
    });

    updateDashboardOverview();
  }
});
