// Creator Race Control app logic with localStorage persistence.

// State
const STORAGE_KEY = 'creatorRaceControlData_v1';

const CONTENT_STATUSES = ['idea','to record','recorded','editing','ready to post','scheduled','posted'];

const defaultState = {
  streamPlan: { title:'', platform:'', game:'', car:'', track:'', goals:'', challenge:'', notes:'' },
  clips: [],
  contentIdeas: []
};

let state = loadState();
let editClipId = null;
let editContentId = null;

// DOM Elements
const streamFields = [
  ['title','Stream title'],['platform','Platform'],['game','Game'],['car','Car/build'],
  ['track','Track/activity'],['goals','Goals for tonight'],['challenge','Viewer challenge idea'],['notes','Notes']
];

function createField(name, label, type='text') {
  if (type === 'textarea') return `<div class="field"><label for="${name}">${label}</label><textarea id="${name}"></textarea></div>`;
  return `<div class="field"><label for="${name}">${label}</label><input id="${name}" type="${type}"></div>`;
}


// Storage
function normalizeContentIdea(idea = {}) {
  const nowIso = new Date().toISOString();
  const status = CONTENT_STATUSES.includes(idea.status) ? idea.status : 'idea';
  return {
    id: idea.id || uid(),
    title: idea.title || '',
    platform: idea.platform || 'TikTok',
    type: idea.type || 'stream clip',
    status,
    hook: idea.hook || '',
    caption: idea.caption || '',
    notes: idea.notes || '',
    dueDate: idea.dueDate || '',
    postedUrl: idea.postedUrl || '',
    createdAt: idea.createdAt || nowIso,
    updatedAt: idea.updatedAt || nowIso
  };
}

function normalizeState(rawState) {
  const merged = { ...structuredClone(defaultState), ...(rawState || {}) };
  if (!Array.isArray(merged.clips)) merged.clips = [];
  if (!Array.isArray(merged.contentIdeas)) merged.contentIdeas = [];
  merged.contentIdeas = merged.contentIdeas.map(normalizeContentIdea);
  return merged;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? normalizeState(JSON.parse(raw)) : normalizeState(defaultState);
  } catch {
    return normalizeState(defaultState);
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAll();
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

// Build forms dynamically to keep structure easy to edit later.
function buildForms() {
  const streamForm = document.getElementById('streamForm');
  streamForm.innerHTML = streamFields.map(([n,l]) => createField('stream_'+n, l, ['goals','challenge','notes'].includes(n) ? 'textarea' : 'text')).join('') +
  `<div class="actions"><button type="button" class="primary" id="saveStream">Save stream plan</button><button type="button" class="ghost" id="clearStream">Clear stream plan</button></div>`;

  document.getElementById('clipForm').innerHTML = `
    <div class="row two">
      ${createField('clip_timestamp','Timestamp')}
      ${createField('clip_title','Clip title')}
    </div>
    ${createField('clip_description','Description','textarea')}
    <div class="row two">
      <div class="field"><label for="clip_type">Clip type</label><select id="clip_type"><option>clean drift</option><option>funny moment</option><option>fail</option><option>tune test</option><option>reaction</option><option>race highlight</option><option>other</option></select></div>
      <div class="field"><label for="clip_priority">Priority</label><select id="clip_priority"><option>low</option><option>medium</option><option>high</option></select></div>
    </div>
    <div class="field"><label for="clip_status">Status</label><select id="clip_status"><option>needs edit</option><option>editing</option><option>edited</option><option>posted</option></select></div>
    <div class="actions"><button type="button" id="addClip" class="primary">Add clip</button><button type="button" id="updateClip" class="alt" disabled>Edit clip</button></div>`;

  document.getElementById('contentForm').innerHTML = `
    <div class="row two">${createField('content_title','Content title')}<div class="field"><label for="content_platform">Platform</label><select id="content_platform"><option>TikTok</option><option>Instagram Reels</option><option>YouTube Shorts</option><option>YouTube Video</option><option>Other</option></select></div></div>
    <div class="row two"><div class="field"><label for="content_type">Content type</label><select id="content_type"><option>stream clip</option><option>car photo</option><option>tune video</option><option>before/after</option><option>tutorial</option><option>meme</option><option>other</option></select></div><div class="field"><label for="content_status">Status</label><select id="content_status">${CONTENT_STATUSES.map(status => `<option>${status}</option>`).join('')}</select></div></div>
    ${createField('content_hook','Hook text')}
    ${createField('content_caption','Caption','textarea')}
    ${createField('content_notes','Notes','textarea')}
    <div class="row two">${createField('content_dueDate','Due date','date')}${createField('content_postedUrl','Posted URL','url')}</div>
    <div class="actions"><button type="button" id="addContent" class="primary">Add content idea</button><button type="button" id="updateContent" class="alt" disabled>Edit idea</button></div>`;
}

// Render Functions
function renderStreamForm() {
  for (const [key] of streamFields) document.getElementById('stream_'+key).value = state.streamPlan[key] || '';
}

function renderClips() {
  const holder = document.getElementById('clipList');
  holder.innerHTML = state.clips.length ? state.clips.map(c => `
    <article class="item">
      <h3>${escapeHtml(c.title || '(Untitled clip)')}</h3>
      <div class="meta"><span>${escapeHtml(c.timestamp || 'No time')}</span><span>${escapeHtml(c.type)}</span><span class="pill ${c.priority==='high'?'high':''}">${escapeHtml(c.priority)}</span><span class="pill ${c.status==='posted'?'posted':''}">${escapeHtml(c.status)}</span></div>
      <p>${escapeHtml(c.description || '')}</p>
      <div class="actions"><button type="button" onclick="startEditClip('${c.id}')">Edit clip</button><button type="button" class="danger" onclick="deleteClip('${c.id}')">Delete clip</button></div>
    </article>`).join('') : '<p class="small">No clips logged yet.</p>';
}

function renderContent() {
  const holder = document.getElementById('contentList');
  const columns = CONTENT_STATUSES.map(status => {
    const ideas = state.contentIdeas.filter(i => i.status === status);
    const cards = ideas.length ? ideas.map(i => `
      <article class="item">
        <h3>${escapeHtml(i.title || '(Untitled idea)')}</h3>
        <div class="meta"><span>${escapeHtml(i.platform)}</span><span>${escapeHtml(i.type)}</span><span class="pill ${i.status==='posted'?'posted':''}">${escapeHtml(i.status)}</span></div>
        <p><strong>Hook:</strong> ${escapeHtml(i.hook || '-')}</p>
        ${i.dueDate ? `<p><strong>Due:</strong> ${escapeHtml(i.dueDate)}</p>` : ''}
        ${i.postedUrl ? `<p><strong>Posted URL:</strong> <a href="${escapeHtml(i.postedUrl)}" target="_blank" rel="noopener noreferrer">Open link</a></p>` : ''}
        <div class="actions"><button type="button" onclick="startEditContent('${i.id}')">Edit</button><button type="button" class="danger" onclick="deleteContent('${i.id}')">Delete</button><button type="button" class="primary" onclick="advanceContentStatus('${i.id}')" ${i.status === 'posted' ? 'disabled' : ''}>Move status forward</button></div>
      </article>`).join('') : '<p class="small">No items in this status.</p>';
    return `<section class="kanban-column"><h3>${escapeHtml(status)} (${ideas.length})</h3><div class="kanban-stack">${cards}</div></section>`;
  });
  holder.innerHTML = state.contentIdeas.length ? columns.join('') : '<p class="small">No content ideas yet.</p>';
}

function renderDashboard() {
  document.getElementById('kpiClips').textContent = state.clips.length;
  document.getElementById('kpiIdeas').textContent = state.contentIdeas.length;
  const posted = state.clips.filter(c => c.status==='posted').length + state.contentIdeas.filter(i => i.status==='posted').length;
  document.getElementById('kpiPosted').textContent = posted;
  const s = state.streamPlan;
  document.getElementById('kpiStream').textContent = s.title ? `${s.title} • ${s.platform || 'Platform?'}` : 'No plan';
}

function renderAll() { renderStreamForm(); renderClips(); renderContent(); renderDashboard(); }

function escapeHtml(str) {
  return String(str).replace(/[&<>"]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
}

// Event Handlers
// Global handlers for inline card buttons.
window.startEditClip = function(id) {
  const c = state.clips.find(x => x.id === id); if (!c) return;
  editClipId = id;
  ['timestamp','title','description','type','priority','status'].forEach(k => document.getElementById('clip_'+k).value = c[k] || '');
  document.getElementById('updateClip').disabled = false;
};

window.deleteClip = function(id) {
  state.clips = state.clips.filter(c => c.id !== id);
  if (editClipId === id) editClipId = null;
  saveState();
};

window.startEditContent = function(id) {
  const i = state.contentIdeas.find(x => x.id === id); if (!i) return;
  editContentId = id;
  ['title','platform','type','hook','caption','notes','status','dueDate','postedUrl'].forEach(k => document.getElementById('content_'+k).value = i[k] || '');
  document.getElementById('updateContent').disabled = false;
};

window.advanceContentStatus = function(id) {
  const i = state.contentIdeas.find(x => x.id === id); if (!i) return;
  const currentIndex = CONTENT_STATUSES.indexOf(i.status);
  if (currentIndex < 0 || currentIndex >= CONTENT_STATUSES.length - 1) return;
  i.status = CONTENT_STATUSES[currentIndex + 1];
  i.updatedAt = new Date().toISOString();
  saveState();
};

window.deleteContent = function(id) {
  state.contentIdeas = state.contentIdeas.filter(i => i.id !== id);
  if (editContentId === id) editContentId = null;
  saveState();
};

function wireEvents() {
  document.getElementById('saveStream').onclick = () => {
    streamFields.forEach(([k]) => state.streamPlan[k] = document.getElementById('stream_'+k).value.trim());
    saveState();
  };

  document.getElementById('clearStream').onclick = () => {
    state.streamPlan = structuredClone(defaultState.streamPlan);
    saveState();
  };

  document.getElementById('addClip').onclick = () => {
    const clip = { id: uid(), timestamp: clip_timestamp.value.trim(), title: clip_title.value.trim(), description: clip_description.value.trim(), type: clip_type.value, priority: clip_priority.value, status: clip_status.value };
    state.clips.unshift(clip);
    clipForm.reset();
    saveState();
  };

  document.getElementById('updateClip').onclick = () => {
    if (!editClipId) return;
    const c = state.clips.find(x => x.id === editClipId); if (!c) return;
    Object.assign(c, { timestamp: clip_timestamp.value.trim(), title: clip_title.value.trim(), description: clip_description.value.trim(), type: clip_type.value, priority: clip_priority.value, status: clip_status.value });
    editClipId = null; document.getElementById('updateClip').disabled = true; clipForm.reset(); saveState();
  };

  document.getElementById('addContent').onclick = () => {
    const nowIso = new Date().toISOString();
    const idea = normalizeContentIdea({ id: uid(), title: content_title.value.trim(), platform: content_platform.value, type: content_type.value, hook: content_hook.value.trim(), caption: content_caption.value.trim(), notes: content_notes.value.trim(), status: content_status.value, dueDate: content_dueDate.value, postedUrl: content_postedUrl.value.trim(), createdAt: nowIso, updatedAt: nowIso });
    state.contentIdeas.unshift(idea);
    contentForm.reset();
    saveState();
  };

  document.getElementById('updateContent').onclick = () => {
    if (!editContentId) return;
    const i = state.contentIdeas.find(x => x.id === editContentId); if (!i) return;
    Object.assign(i, normalizeContentIdea({ ...i, title: content_title.value.trim(), platform: content_platform.value, type: content_type.value, hook: content_hook.value.trim(), caption: content_caption.value.trim(), notes: content_notes.value.trim(), status: content_status.value, dueDate: content_dueDate.value, postedUrl: content_postedUrl.value.trim(), updatedAt: new Date().toISOString() }));
    editContentId = null; document.getElementById('updateContent').disabled = true; contentForm.reset(); saveState();
  };

  const hooks = [
    'This tune completely changed the car…',
    'I finally fixed the drift setup…',
    'POV: you found the perfect corner entry…',
    'The cleanest run I’ve had all week.',
    'From understeer to dialed-in in one session.',
    'Watch this lap delta drop in real time.'
  ];
  const captions = [
    'Tonight\'s setup notes in the comments. What should I test next?',
    'Rate this line 1-10. Would you brake later here?',
    'Built for consistency over one-lap pace—worth it?',
    'Clip from stream practice. Full session recap coming next.'
  ];

  genHook.onclick = () => helperOutput.value = hooks[Math.floor(Math.random()*hooks.length)];
  genCaption.onclick = () => helperOutput.value = captions[Math.floor(Math.random()*captions.length)];
  copyHelper.onclick = async () => {
    try { await navigator.clipboard.writeText(helperOutput.value || ''); }
    catch { alert('Copy failed. You can still select and copy manually.'); }
  };

  exportBtn.onclick = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'creator-race-control-backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  importBtn.onclick = () => importFile.click();
  importFile.onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      state = normalizeState(parsed);
      saveState();
      alert('Import successful.');
    } catch {
      alert('Import failed. Invalid JSON backup.');
    }
    importFile.value = '';
  };

  clearAllBtn.onclick = () => {
    if (!confirm('Clear all saved stream, clip, and content data?')) return;
    state = structuredClone(defaultState);
    saveState();
  };
}

buildForms();
wireEvents();
renderAll();
