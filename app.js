// Creator Race Control app logic with localStorage persistence.

// State
const APP_VERSION = '1.1.0';
const STORAGE_KEY = 'creatorRaceControlData_v1';

const CONTENT_STATUSES = ['idea','to record','recorded','editing','ready to post','scheduled','posted'];

const defaultStreamPlan = { title:'', caption:'', tags:'', platform:'', dateTime:'', game:'', car:'', track:'', goals:'', challenge:'', notes:'', status:'planned', createdAt:'', updatedAt:'' };
const defaultClipPromoDraft = { clipTitle:'', clipDescription:'', clipTags:'', clipSourceDescription:'', clipPlatform:'TikTok', clipGame:'', clipTone:'', clipKeyMoment:'' };

const defaultState = {
  appVersion: APP_VERSION,
  streamPlan: { ...defaultStreamPlan },
  clipPromoDraft: { ...defaultClipPromoDraft },
  clips: [],
  contentIdeas: [],
  plannedStreams: []
};

// DOM Elements
const streamFields = [
  ['title','Stream Title'],['caption','Caption / Description'],['tags','Tags'],['platform','Platform'],['dateTime','Stream date/time'],['game','Game (optional)'],['car','Car/build'],
  ['track','Track/activity'],['goals','Goals (optional)'],['challenge','Viewer challenge idea'],['notes','Notes (optional)'],['status','Status']
];

let state = loadState();
let editClipId = null;
let editContentId = null;
let editPlannedStreamId = null;
const contentFilters = { search: '', platform: '', status: '', type: '', sort: 'newest' };

function getStreamFieldType(key) { return key === 'dateTime' ? 'datetime-local' : 'text'; }

function createField(name, label, type='text') {
  if (type === 'textarea') return `<div class="field"><label for="${name}">${label}</label><textarea id="${name}"></textarea></div>`;
  return `<div class="field"><label for="${name}">${label}</label><input id="${name}" type="${type}"></div>`;
}


// Storage
function normalizeStreamPlan(plan = {}) {
  const nowIso = new Date().toISOString();
  const safePlan = isPlainObject(plan) ? plan : {};
  return {
    ...safePlan,
    ...streamFields.reduce((fields, [key]) => ({ ...fields, [key]: safePlan[key] || '' }), {}),
    createdAt: safePlan.createdAt || nowIso,
    updatedAt: safePlan.updatedAt || nowIso
  };
}

function normalizeClip(clip = {}) {
  const nowIso = new Date().toISOString();
  const safeClip = isPlainObject(clip) ? clip : {};
  return {
    ...safeClip,
    id: safeClip.id || uid(),
    timestamp: safeClip.timestamp || '',
    title: safeClip.title || '',
    description: safeClip.description || '',
    type: safeClip.type || 'other',
    priority: safeClip.priority || 'medium',
    status: safeClip.status || 'needs edit',
    createdAt: safeClip.createdAt || nowIso,
    updatedAt: safeClip.updatedAt || nowIso
  };
}

function normalizePlannedStream(stream = {}) {
  const nowIso = new Date().toISOString();
  const safeStream = isPlainObject(stream) ? stream : {};
  return {
    ...safeStream,
    id: safeStream.id || uid(),
    title: safeStream.title || '',
    caption: safeStream.caption || '',
    tags: safeStream.tags || '',
    platform: safeStream.platform || '',
    dateTime: safeStream.dateTime || '',
    game: safeStream.game || '',
    car: safeStream.car || '',
    track: safeStream.track || '',
    goals: safeStream.goals || '',
    challenge: safeStream.challenge || '',
    notes: safeStream.notes || '',
    status: safeStream.status || 'planned',
    createdAt: safeStream.createdAt || nowIso,
    updatedAt: safeStream.updatedAt || nowIso
  };
}

function normalizeContentIdea(idea = {}) {
  const nowIso = new Date().toISOString();
  const safeIdea = isPlainObject(idea) ? idea : {};
  const status = CONTENT_STATUSES.includes(safeIdea.status) ? safeIdea.status : 'idea';
  return {
    ...safeIdea,
    id: safeIdea.id || uid(),
    title: safeIdea.title || '',
    platform: safeIdea.platform || 'TikTok',
    type: safeIdea.type || 'stream clip',
    status,
    hook: safeIdea.hook || '',
    caption: safeIdea.caption || '',
    notes: safeIdea.notes || '',
    dueDate: safeIdea.dueDate || '',
    postedUrl: safeIdea.postedUrl || '',
    sourceClipId: safeIdea.sourceClipId || '',
    clipTitle: safeIdea.clipTitle || '',
    clipDescription: safeIdea.clipDescription || '',
    clipTags: safeIdea.clipTags || '',
    clipSourceDescription: safeIdea.clipSourceDescription || '',
    clipPlatform: safeIdea.clipPlatform || safeIdea.platform || 'TikTok',
    clipGame: safeIdea.clipGame || '',
    clipTone: safeIdea.clipTone || '',
    clipKeyMoment: safeIdea.clipKeyMoment || '',
    createdAt: safeIdea.createdAt || nowIso,
    updatedAt: safeIdea.updatedAt || nowIso
  };
}

function normalizeClipPromoDraft(draft = {}) {
  const safeDraft = isPlainObject(draft) ? draft : {};
  return {
    ...safeDraft,
    clipTitle: safeDraft.clipTitle || '',
    clipDescription: safeDraft.clipDescription || '',
    clipTags: safeDraft.clipTags || '',
    clipSourceDescription: safeDraft.clipSourceDescription || '',
    clipPlatform: safeDraft.clipPlatform || 'TikTok',
    clipGame: safeDraft.clipGame || '',
    clipTone: safeDraft.clipTone || '',
    clipKeyMoment: safeDraft.clipKeyMoment || ''
  };
}

function migrateState(rawState) {
  const safeState = isPlainObject(rawState) ? rawState : {};
  const migrated = { ...structuredClone(defaultState), ...safeState };
  migrated.appVersion = APP_VERSION;
  migrated.streamPlan = normalizeStreamPlan(safeState.streamPlan);
  migrated.clipPromoDraft = normalizeClipPromoDraft(safeState.clipPromoDraft);
  migrated.clips = Array.isArray(safeState.clips) ? safeState.clips.map(normalizeClip) : [];
  migrated.contentIdeas = Array.isArray(safeState.contentIdeas) ? safeState.contentIdeas.map(normalizeContentIdea) : [];
  migrated.plannedStreams = Array.isArray(safeState.plannedStreams) ? safeState.plannedStreams.map(normalizePlannedStream) : [];
  return migrated;
}

function normalizeState(rawState) {
  return migrateState(rawState);
}

function validateImportData(parsed) {
  if (!isPlainObject(parsed)) throw new Error('Backup must be a JSON object.');
  if ('streamPlan' in parsed && !isPlainObject(parsed.streamPlan)) throw new Error('streamPlan must be an object.');
  if ('clips' in parsed && !Array.isArray(parsed.clips)) throw new Error('clips must be an array.');
  if ('contentIdeas' in parsed && !Array.isArray(parsed.contentIdeas)) throw new Error('contentIdeas must be an array.');
  if ('plannedStreams' in parsed && !Array.isArray(parsed.plannedStreams)) throw new Error('plannedStreams must be an array.');
  return true;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
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
  state.appVersion = APP_VERSION;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  renderAll();
}

function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function formatBackupTimestamp(date) {
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

function generateHookFromClip(clip) {
  const title = clip.title || clip.type || 'this clip';
  return `POV: ${title} turned into a must-post ${clip.type || 'stream clip'} moment.`;
}

async function generateStreamPromo({ game = '', goals = '', notes = '' } = {}) {
  // Placeholder generator: replace this function body with a real AI API call later.
  const cleanGame = game.trim();
  const cleanGoals = goals.trim();
  const cleanNotes = notes.trim();
  const focus = cleanGame || 'live creator stream';
  const goalPhrase = cleanGoals || 'good vibes, big moments, and chat-powered decisions';
  const notePhrase = cleanNotes ? ` Expect ${cleanNotes}.` : ' Come hang out and help shape the next highlight.';
  const tagSeed = cleanGame ? cleanGame.replace(/[^a-z0-9]+/gi, ' ').trim().split(/\s+/).slice(0, 2).join('') : 'LiveStream';

  return {
    title: cleanGame ? `${cleanGame} Live: ${cleanGoals || 'New Goals, Big Plays'}` : 'Live Tonight: Big Plays, Fresh Goals, Good Vibes',
    caption: `Going live with ${focus}. Tonight's focus: ${goalPhrase}.${notePhrase}`,
    tags: [`#${tagSeed || 'LiveStream'}`, '#livestream', '#gaming', '#contentcreator', '#streamer'].join(' ')
  };
}

function getStreamFormValues() {
  const values = {};
  streamFields.forEach(([key]) => values[key] = document.getElementById('stream_'+key).value.trim());
  return values;
}

function setStreamPromoStatus(message = '', isError = false) {
  const status = document.getElementById('streamPromoStatus');
  if (!status) return;
  status.textContent = message;
  status.className = isError ? 'inline-error' : 'small';
}

function getTime(value) {
  const time = Date.parse(value || '');
  return Number.isNaN(time) ? 0 : time;
}

function toDateKey(date) {
  const pad = value => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function getTodayKey() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return toDateKey(today);
}

function getNextSevenDays() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() + index);
    return { date, key: toDateKey(date) };
  });
}

function formatPlannerDayName(date) {
  return date.toLocaleDateString(undefined, { weekday: 'long' });
}

function formatPlannerDate(date) {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getIdeasDueBetween(dateKeys) {
  return state.contentIdeas.filter(i => dateKeys.includes(i.dueDate));
}

function getStreamDateKey(stream) {
  return String(stream.dateTime || '').slice(0, 10);
}

function getStreamsDueBetween(dateKeys) {
  return state.plannedStreams.filter(stream => dateKeys.includes(getStreamDateKey(stream)));
}


function getStatusPillClass(status) {
  return `status-${String(status || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
}

function getFilteredContentIdeas() {
  const search = contentFilters.search.toLowerCase();
  return state.contentIdeas
    .filter(i => !search || [i.title, i.hook, i.caption, i.notes].some(value => String(value || '').toLowerCase().includes(search)))
    .filter(i => !contentFilters.platform || i.platform === contentFilters.platform)
    .filter(i => !contentFilters.status || i.status === contentFilters.status)
    .filter(i => !contentFilters.type || i.type === contentFilters.type)
    .sort((a, b) => {
      if (contentFilters.sort === 'oldest') return getTime(a.createdAt) - getTime(b.createdAt);
      if (contentFilters.sort === 'due') return (a.dueDate ? getTime(a.dueDate) : Infinity) - (b.dueDate ? getTime(b.dueDate) : Infinity);
      if (contentFilters.sort === 'status') return CONTENT_STATUSES.indexOf(a.status) - CONTENT_STATUSES.indexOf(b.status) || getTime(b.createdAt) - getTime(a.createdAt);
      return getTime(b.createdAt) - getTime(a.createdAt);
    });
}

// Build forms dynamically to keep structure easy to edit later.
function buildForms() {
  const streamForm = document.getElementById('streamForm');
  streamForm.innerHTML = `
    <div class="stream-form-grid">
      <section class="stream-form-panel">
        <h3>Stream Promo</h3>
        ${createField('stream_title','Stream Title')}
        ${createField('stream_caption','Caption / Description','textarea')}
        ${createField('stream_tags','Tags')}
        <div class="actions promo-actions"><button type="button" class="alt" id="generateStreamPromoBtn">Generate Stream Promo</button><span id="streamPromoStatus" class="small" aria-live="polite"></span></div>
      </section>
      <section class="stream-form-panel">
        <h3>Stream Details</h3>
        <div class="row two">${createField('stream_platform','Platform')}${createField('stream_dateTime','Stream date/time', 'datetime-local')}</div>
        <div class="row two">${createField('stream_game','Game (optional)')}${createField('stream_status','Status')}</div>
        <div class="row two">${createField('stream_car','Car/build')}${createField('stream_track','Track/activity')}</div>
        ${createField('stream_goals','Goals (optional)','textarea')}
        ${createField('stream_challenge','Viewer challenge idea','textarea')}
        ${createField('stream_notes','Notes (optional)','textarea')}
      </section>
    </div>
    <div class="actions"><button type="button" class="primary" id="saveStream">Save future stream</button><button type="button" class="alt" id="updatePlannedStream" disabled>Update stream</button><button type="button" class="ghost" id="clearStream">Clear stream details</button></div>
    <div id="plannedStreamList" class="items"></div>`;

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

function renderPlannedStreams() {
  const holder = document.getElementById('plannedStreamList');
  holder.innerHTML = state.plannedStreams.length ? state.plannedStreams.map(stream => `
    <article class="item">
      <h3>${escapeHtml(stream.title || 'Untitled Stream')}</h3>
      <div class="meta"><span>${escapeHtml(stream.dateTime || 'No date')}</span><span>${escapeHtml(stream.game || 'No game')}</span><span class="pill">${escapeHtml(stream.status || 'planned')}</span></div>
      ${stream.caption ? `<p><strong>Caption:</strong> ${escapeHtml(stream.caption)}</p>` : ''}
      ${stream.tags ? `<p><strong>Tags:</strong> ${escapeHtml(stream.tags)}</p>` : ''}
      ${stream.notes ? `<p><strong>Notes:</strong> ${escapeHtml(stream.notes)}</p>` : ''}
      <div class="actions"><button type="button" onclick="startEditPlannedStream('${stream.id}')">Edit stream</button><button type="button" class="danger" onclick="deletePlannedStream('${stream.id}')">Delete stream</button></div>
    </article>`).join('') : '<p class="small">No planned streams yet.</p>';
}

function renderClips() {
  const holder = document.getElementById('clipList');
  holder.innerHTML = state.clips.length ? state.clips.map(c => {
    const hasContentIdea = state.contentIdeas.some(i => i.sourceClipId === c.id);
    return `
    <article class="item">
      <h3>${escapeHtml(c.title || '(Untitled clip)')}</h3>
      <div class="meta"><span>${escapeHtml(c.timestamp || 'No time')}</span><span>${escapeHtml(c.type)}</span><span class="pill ${c.priority==='high'?'high':''}">${escapeHtml(c.priority)}</span><span class="pill ${c.status==='posted'?'posted':''}">${escapeHtml(c.status)}</span></div>
      <p>${escapeHtml(c.description || '')}</p>
      <div class="actions"><button type="button" onclick="startEditClip('${c.id}')">Edit clip</button><button type="button" class="danger" onclick="deleteClip('${c.id}')">Delete clip</button><button type="button" class="primary" onclick="turnClipIntoContentIdea('${c.id}')" ${hasContentIdea ? 'disabled' : ''}>${hasContentIdea ? 'Content idea created' : 'Turn into Content Idea'}</button></div>
    </article>`;
  }).join('') : '<p class="small">No clips logged yet.</p>';
}

function renderWeeklyPlanner() {
  const days = getNextSevenDays();
  const dayKeys = days.map(day => day.key);
  const weeklyIdeas = getIdeasDueBetween(dayKeys);
  const weeklyStreams = getStreamsDueBetween(dayKeys);
  const summary = [
    ['Total scheduled this week', weeklyIdeas.filter(i => i.status === 'scheduled').length],
    ['Ready to post', weeklyIdeas.filter(i => i.status === 'ready to post').length],
    ['Planned streams', weeklyStreams.filter(stream => stream.status === 'planned').length]
  ];
  document.getElementById('weeklySummary').innerHTML = summary.map(([label, value]) => `
    <div class="weekly-stat"><div class="value">${value}</div><div class="label">${label}</div></div>`).join('');
  document.getElementById('weeklyPlanner').innerHTML = days.map(day => {
    const ideas = state.contentIdeas.filter(i => i.dueDate === day.key);
    const streams = state.plannedStreams.filter(stream => getStreamDateKey(stream) === day.key);
    const ideaItems = ideas.map(i => `
      <li><span>${escapeHtml(i.title || '(Untitled idea)')}</span><span class="pill ${getStatusPillClass(i.status)}">${escapeHtml(i.status)}</span></li>`).join('');
    const streamItems = streams.map(stream => `
      <li><span>🎥 ${escapeHtml(stream.title || 'Untitled Stream')}</span><span class="pill">${escapeHtml(stream.status || 'planned')}</span></li>`).join('');
    const items = ideaItems || streamItems ? ideaItems + streamItems : '<li class="small">No planned items.</li>';
    return `
      <article class="planner-day">
        <div class="planner-day-header"><h3>${escapeHtml(formatPlannerDayName(day.date))}</h3><p class="small mono">${escapeHtml(formatPlannerDate(day.date))}</p></div>
        <div class="quick-add" aria-label="Quick add item for ${escapeHtml(day.key)}">
          <select id="quickAddType_${day.key}" aria-label="Quick add type"><option value="post">Clip/Post</option><option value="stream">Stream</option></select>
          <div class="quick-add-date-wrap"><input id="quickAddDate_${day.key}" type="datetime-local" value="${escapeHtml(day.key)}T12:00" aria-label="Quick add date and time"></div>
          <button type="button" class="primary" onclick="quickAddPlannerItem('${day.key}')">Add item</button>
        </div>
        <ul>${items}</ul>
      </article>`;
  }).join('');
}

function renderContent() {
  const holder = document.getElementById('contentList');
  const filteredIdeas = getFilteredContentIdeas();
  const columns = CONTENT_STATUSES.map(status => {
    const ideas = filteredIdeas.filter(i => i.status === status);
    const cards = ideas.length ? ideas.map(i => `
      <article class="item">
        <h3>${escapeHtml(i.title || '(Untitled idea)')}</h3>
        <div class="meta"><span>${escapeHtml(i.platform)}</span><span>${escapeHtml(i.type)}</span><span class="pill ${getStatusPillClass(i.status)}">${escapeHtml(i.status)}</span></div>
        <p><strong>Hook:</strong> ${escapeHtml(i.hook || '-')}</p>
        ${i.dueDate ? `<p><strong>Due:</strong> ${escapeHtml(i.dueDate)}</p>` : ''}
        ${i.postedUrl ? `<p><strong>Posted URL:</strong> <a href="${escapeHtml(i.postedUrl)}" target="_blank" rel="noopener noreferrer">Open link</a></p>` : ''}
        <div class="actions"><button type="button" onclick="startEditContent('${i.id}')">Edit</button><button type="button" class="danger" onclick="deleteContent('${i.id}')">Delete</button><button type="button" class="primary" onclick="advanceContentStatus('${i.id}')" ${i.status === 'posted' ? 'disabled' : ''}>Move status forward</button></div>
      </article>`).join('') : '<p class="small">No items in this status.</p>';
    return `<section class="kanban-column"><h3>${escapeHtml(status)} (${ideas.length})</h3><div class="kanban-stack">${cards}</div></section>`;
  });
  holder.innerHTML = state.contentIdeas.length ? columns.join('') : '<p class="small">No content ideas yet.</p>';
  if (state.contentIdeas.length && !filteredIdeas.length) holder.innerHTML = '<p class="small">No content ideas match the current filters.</p>';
}


function renderDashboard() {
  const weeklyKeys = getNextSevenDays().map(day => day.key);
  const todayKey = getTodayKey();
  document.getElementById('kpiClips').textContent = state.clips.length;
  document.getElementById('kpiIdeas').textContent = state.contentIdeas.length;
  document.getElementById('kpiReady').textContent = state.contentIdeas.filter(i => i.status === 'ready to post').length;
  document.getElementById('kpiScheduled').textContent = state.contentIdeas.filter(i => i.status === 'scheduled').length;
  document.getElementById('kpiPosted').textContent = state.contentIdeas.filter(i => i.status === 'posted').length;
  document.getElementById('kpiOverdue').textContent = state.contentIdeas.filter(i => i.dueDate && i.dueDate < todayKey && i.status !== 'posted').length;
  document.getElementById('kpiWeekPlanned').textContent = state.contentIdeas.filter(i => weeklyKeys.includes(i.dueDate)).length + state.plannedStreams.filter(stream => weeklyKeys.includes(getStreamDateKey(stream))).length;
  const nextStream = state.plannedStreams.find(stream => getStreamDateKey(stream) >= todayKey) || state.streamPlan;
  document.getElementById('kpiStream').textContent = nextStream.title ? `${nextStream.title} • ${nextStream.platform || nextStream.game || 'Details?'}` : 'No plan';
}

function renderAll() { renderStreamForm(); renderPlannedStreams(); renderClips(); renderWeeklyPlanner(); renderContent(); renderDashboard(); }

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

window.turnClipIntoContentIdea = function(id) {
  const clip = state.clips.find(c => c.id === id); if (!clip) return;
  if (state.contentIdeas.some(i => i.sourceClipId === id)) {
    alert('A content idea was already created from this clip.');
    return;
  }
  const nowIso = new Date().toISOString();
  state.contentIdeas.unshift(normalizeContentIdea({
    id: uid(),
    title: clip.title || '(Untitled clip)',
    platform: 'TikTok',
    type: 'stream clip',
    status: 'recorded',
    hook: generateHookFromClip(clip),
    caption: clip.description ? `Clip description: ${clip.description}` : '',
    notes: `Original clip timestamp: ${clip.timestamp || 'No time'}\nPriority: ${clip.priority || 'medium'}`,
    sourceClipId: id,
    createdAt: nowIso,
    updatedAt: nowIso
  }));
  saveState();
};

window.quickAddPlannerItem = function(dayKey) {
  const type = document.getElementById('quickAddType_'+dayKey).value;
  const dateTime = document.getElementById('quickAddDate_'+dayKey).value || `${dayKey}T12:00`;
  const nowIso = new Date().toISOString();
  if (type === 'stream') {
    state.plannedStreams.unshift(normalizePlannedStream({
      id: uid(),
      title: 'Untitled Stream',
      dateTime,
      status: 'planned',
      createdAt: nowIso,
      updatedAt: nowIso
    }));
  } else {
    state.contentIdeas.unshift(normalizeContentIdea({
      id: uid(),
      title: 'New scheduled post',
      platform: 'TikTok',
      status: 'scheduled',
      dueDate: dateTime.slice(0, 10) || dayKey,
      createdAt: nowIso,
      updatedAt: nowIso
    }));
  }
  saveState();
};

window.startEditPlannedStream = function(id) {
  const stream = state.plannedStreams.find(x => x.id === id); if (!stream) return;
  editPlannedStreamId = id;
  streamFields.forEach(([key]) => document.getElementById('stream_'+key).value = stream[key] || '');
  setStreamPromoStatus('Editing saved stream.');
  document.getElementById('updatePlannedStream').disabled = false;
};

window.deletePlannedStream = function(id) {
  state.plannedStreams = state.plannedStreams.filter(stream => stream.id !== id);
  if (editPlannedStreamId === id) editPlannedStreamId = null;
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
  document.getElementById('generateStreamPromoBtn').onclick = async () => {
    const button = document.getElementById('generateStreamPromoBtn');
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Generating...';
    setStreamPromoStatus('Generating stream promo...');
    try {
      const promo = await generateStreamPromo(getStreamFormValues());
      document.getElementById('stream_title').value = promo.title || '';
      document.getElementById('stream_caption').value = promo.caption || '';
      document.getElementById('stream_tags').value = promo.tags || '';
      setStreamPromoStatus('Promo generated. Edit anything before saving.');
    } catch {
      setStreamPromoStatus('Sorry, stream promo generation failed. Try again or write your own promo details.', true);
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  };

  document.getElementById('saveStream').onclick = () => {
    const nowIso = new Date().toISOString();
    const values = getStreamFormValues();
    state.plannedStreams.unshift(normalizePlannedStream({ id: uid(), ...values, createdAt: nowIso, updatedAt: nowIso }));
    state.streamPlan = structuredClone(defaultState.streamPlan);
    editPlannedStreamId = null;
    document.getElementById('updatePlannedStream').disabled = true;
    streamForm.reset();
    setStreamPromoStatus('Stream saved.');
    saveState();
  };

  document.getElementById('updatePlannedStream').onclick = () => {
    if (!editPlannedStreamId) return;
    const stream = state.plannedStreams.find(x => x.id === editPlannedStreamId); if (!stream) return;
    const values = getStreamFormValues();
    Object.assign(stream, normalizePlannedStream({ ...stream, ...values, updatedAt: new Date().toISOString() }));
    editPlannedStreamId = null;
    document.getElementById('updatePlannedStream').disabled = true;
    streamForm.reset();
    setStreamPromoStatus('Stream updated.');
    saveState();
  };

  document.getElementById('clearStream').onclick = () => {
    state.streamPlan = structuredClone(defaultState.streamPlan);
    editPlannedStreamId = null;
    document.getElementById('updatePlannedStream').disabled = true;
    setStreamPromoStatus('');
    saveState();
  };

  document.getElementById('addClip').onclick = () => {
    const nowIso = new Date().toISOString();
    const clip = normalizeClip({ id: uid(), timestamp: clip_timestamp.value.trim(), title: clip_title.value.trim(), description: clip_description.value.trim(), type: clip_type.value, priority: clip_priority.value, status: clip_status.value, createdAt: nowIso, updatedAt: nowIso });
    state.clips.unshift(clip);
    clipForm.reset();
    saveState();
  };

  document.getElementById('updateClip').onclick = () => {
    if (!editClipId) return;
    const c = state.clips.find(x => x.id === editClipId); if (!c) return;
    Object.assign(c, normalizeClip({ ...c, timestamp: clip_timestamp.value.trim(), title: clip_title.value.trim(), description: clip_description.value.trim(), type: clip_type.value, priority: clip_priority.value, status: clip_status.value, updatedAt: new Date().toISOString() }));
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

  ['search','platform','status','type','sort'].forEach(key => {
    const control = document.getElementById('contentFilter_'+key);
    control.oninput = control.onchange = () => {
      contentFilters[key] = control.value;
      renderContent();
    };
  });

  document.getElementById('clearContentFilters').onclick = () => {
    Object.assign(contentFilters, { search: '', platform: '', status: '', type: '', sort: 'newest' });
    ['search','platform','status','type','sort'].forEach(key => document.getElementById('contentFilter_'+key).value = contentFilters[key]);
    renderContent();
  };

  const clipPromoFields = {
    clipPlatform: helperPlatform,
    clipGame: helperGame,
    clipSourceDescription: helperSourceDescription,
    clipTone: helperTone,
    clipKeyMoment: helperKeyMoment,
    clipTitle: helperTitle,
    clipDescription: helperDescription,
    clipTags: helperTags
  };

  function getClipPromoFormValues() {
    return {
      clipPlatform: helperPlatform.value,
      clipGame: helperGame.value.trim(),
      clipSourceDescription: helperSourceDescription.value.trim(),
      clipTone: helperTone.value.trim(),
      clipKeyMoment: helperKeyMoment.value.trim(),
      clipTitle: helperTitle.value.trim(),
      clipDescription: helperDescription.value.trim(),
      clipTags: helperTags.value.trim()
    };
  }

  function setClipPromoStatus(message = '', isError = false) {
    clipPromoStatus.textContent = message;
    clipPromoStatus.className = isError ? 'inline-error' : 'small';
  }

  function saveClipPromoDraft() {
    state.clipPromoDraft = normalizeClipPromoDraft(getClipPromoFormValues());
    state.appVersion = APP_VERSION;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function loadClipPromoDraft() {
    const draft = normalizeClipPromoDraft(state.clipPromoDraft);
    Object.entries(clipPromoFields).forEach(([key, element]) => element.value = draft[key] || (key === 'clipPlatform' ? 'TikTok' : ''));
  }

  function toTitleCase(value) {
    return value
      .toLowerCase()
      .replace(/\b\w/g, letter => letter.toUpperCase());
  }

  function keywordTags(value) {
    return value
      .replace(/[^a-z0-9\s]/gi, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 4)
      .map(word => `#${toTitleCase(word).replace(/\s/g, '')}`);
  }

  function tagFromText(value) {
    const clean = value.replace(/[^a-z0-9]+/gi, ' ').trim();
    return clean ? `#${clean.split(/\s+/).map(toTitleCase).join('')}` : '';
  }

  function generateClipPromoPlaceholder() {
    const data = getClipPromoFormValues();
    if (!data.clipSourceDescription) {
      setClipPromoStatus('Describe the clip first, then I can generate a title, caption, and tags.', true);
      return null;
    }

    const source = data.clipSourceDescription.replace(/\s+/g, ' ');
    const moment = data.clipKeyMoment || source;
    const game = data.clipGame;
    const tone = data.clipTone || 'hype';
    const platform = data.clipPlatform;
    const titleSeed = data.clipKeyMoment || source;
    const titleWords = titleSeed
      .replace(/[#@]/g, '')
      .replace(/[^a-z0-9\s]/gi, ' ')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 7)
      .join(' ');
    const gamePrefix = game && !titleWords.toLowerCase().includes(game.toLowerCase()) ? `${game} ` : '';
    const title = `${gamePrefix}${toTitleCase(titleWords || 'Clip Highlight')}`.trim();
    const platformNudge = platform === 'YouTube Shorts' ? 'Drop a comment if you would have held it together.' : 'Would you save it or send it?';
    const toneLine = tone ? ` ${toTitleCase(tone)} energy all the way through.` : '';
    const description = `${moment.charAt(0).toUpperCase()}${moment.slice(1)} 😮‍💨${toneLine} ${platformNudge}`.trim();
    const platformTags = platform === 'TikTok' ? ['#TikTokGaming'] : platform === 'Instagram' ? ['#Reels'] : platform === 'YouTube Shorts' ? ['#Shorts'] : platform === 'Facebook Reels' ? ['#FacebookReels'] : ['#Clip'];
    const gameTag = game ? [tagFromText(game)] : [];
    const toneTag = tone ? [tagFromText(tone)] : [];
    const tags = [...gameTag, ...keywordTags(source), ...toneTag, ...platformTags, '#GamingClip', '#ContentCreator']
      .filter(Boolean)
      .filter((tag, index, tags) => tags.indexOf(tag) === index)
      .slice(0, 8)
      .join(' ');

    setClipPromoStatus('Generated placeholder promo copy. Edit anything you want before posting.');
    return { title, description, tags };
  }

  function applyClipPromo(parts = {}) {
    if (parts.title !== undefined) helperTitle.value = parts.title;
    if (parts.description !== undefined) helperDescription.value = parts.description;
    if (parts.tags !== undefined) helperTags.value = parts.tags;
    saveClipPromoDraft();
  }

  Object.values(clipPromoFields).forEach(element => {
    element.oninput = element.onchange = () => {
      setClipPromoStatus('');
      saveClipPromoDraft();
    };
  });

  loadClipPromoDraft();

  genAll.onclick = () => {
    const promo = generateClipPromoPlaceholder();
    if (!promo) return;
    applyClipPromo(promo);
  };
  genTitle.onclick = () => {
    const promo = generateClipPromoPlaceholder();
    if (!promo) return;
    applyClipPromo({ title: promo.title });
  };
  genDescription.onclick = () => {
    const promo = generateClipPromoPlaceholder();
    if (!promo) return;
    applyClipPromo({ description: promo.description });
  };
  genTags.onclick = () => {
    const promo = generateClipPromoPlaceholder();
    if (!promo) return;
    applyClipPromo({ tags: promo.tags });
  };
  copyHelper.onclick = async () => {
    const copyText = [
      helperTitle.value.trim() && `Title: ${helperTitle.value.trim()}`,
      helperDescription.value.trim() && `Description: ${helperDescription.value.trim()}`,
      helperTags.value.trim() && `Tags: ${helperTags.value.trim()}`
    ].filter(Boolean).join('\n\n');
    try {
      await navigator.clipboard.writeText(copyText);
      setClipPromoStatus('Copied generated title, description, and tags.');
    }
    catch { alert('Copy failed. You can still select and copy manually.'); }
  };

  exportBtn.onclick = () => {
    const exportState = migrateState(state);
    const blob = new Blob([JSON.stringify(exportState, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `creator-race-control-backup-${formatBackupTimestamp(new Date())}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  importBtn.onclick = () => importFile.click();
  importFile.onchange = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      validateImportData(parsed);
      state = migrateState(parsed);
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
