// Creator Race Control app logic with localStorage persistence.

// State
const APP_VERSION = '1.1.0';
const STORAGE_KEY = 'creatorRaceControlData_v1';

const CONTENT_STATUSES = ['idea','to record','recorded','editing','ready to post','scheduled','posted'];

const defaultStreamPlan = { title:'', platform:'', game:'', car:'', track:'', goals:'', challenge:'', notes:'', createdAt:'', updatedAt:'' };

const defaultState = {
  appVersion: APP_VERSION,
  streamPlan: { ...defaultStreamPlan },
  clips: [],
  contentIdeas: []
};

// DOM Elements
const streamFields = [
  ['title','Stream title'],['platform','Platform'],['game','Game'],['car','Car/build'],
  ['track','Track/activity'],['goals','Goals for tonight'],['challenge','Viewer challenge idea'],['notes','Notes']
];

let state = loadState();
let editClipId = null;
let editContentId = null;
const contentFilters = { search: '', platform: '', status: '', type: '', sort: 'newest' };

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
    createdAt: safeIdea.createdAt || nowIso,
    updatedAt: safeIdea.updatedAt || nowIso
  };
}

function migrateState(rawState) {
  const safeState = isPlainObject(rawState) ? rawState : {};
  const migrated = { ...structuredClone(defaultState), ...safeState };
  migrated.appVersion = APP_VERSION;
  migrated.streamPlan = normalizeStreamPlan(safeState.streamPlan);
  migrated.clips = Array.isArray(safeState.clips) ? safeState.clips.map(normalizeClip) : [];
  migrated.contentIdeas = Array.isArray(safeState.contentIdeas) ? safeState.contentIdeas.map(normalizeContentIdea) : [];
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

function formatPlannerDate(date) {
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

function getIdeasDueBetween(dateKeys) {
  return state.contentIdeas.filter(i => dateKeys.includes(i.dueDate));
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
  const summary = [
    ['Total scheduled this week', weeklyIdeas.filter(i => i.status === 'scheduled').length],
    ['Ready to post', weeklyIdeas.filter(i => i.status === 'ready to post').length],
    ['Posted this week', weeklyIdeas.filter(i => i.status === 'posted').length]
  ];
  document.getElementById('weeklySummary').innerHTML = summary.map(([label, value]) => `
    <div class="weekly-stat"><div class="value">${value}</div><div class="label">${label}</div></div>`).join('');
  document.getElementById('weeklyPlanner').innerHTML = days.map(day => {
    const ideas = state.contentIdeas.filter(i => i.dueDate === day.key);
    const items = ideas.length ? ideas.map(i => `
      <li><span>${escapeHtml(i.title || '(Untitled idea)')}</span><span class="pill ${i.status==='posted'?'posted':''}">${escapeHtml(i.status)}</span></li>`).join('') : '<li class="small">No planned items.</li>';
    return `
      <article class="planner-day">
        <div class="planner-day-header"><div><h3>${escapeHtml(formatPlannerDate(day.date))}</h3><p class="small mono">${escapeHtml(day.key)}</p></div><button type="button" class="primary" onclick="quickAddScheduledContent('${day.key}')">Quick add</button></div>
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
        <div class="meta"><span>${escapeHtml(i.platform)}</span><span>${escapeHtml(i.type)}</span><span class="pill ${i.status==='posted'?'posted':''}">${escapeHtml(i.status)}</span></div>
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
  document.getElementById('kpiWeekPlanned').textContent = state.contentIdeas.filter(i => weeklyKeys.includes(i.dueDate)).length;
  const s = state.streamPlan;
  document.getElementById('kpiStream').textContent = s.title ? `${s.title} • ${s.platform || 'Platform?'}` : 'No plan';
}

function renderAll() { renderStreamForm(); renderClips(); renderWeeklyPlanner(); renderContent(); renderDashboard(); }

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

window.quickAddScheduledContent = function(dueDate) {
  const nowIso = new Date().toISOString();
  state.contentIdeas.unshift(normalizeContentIdea({
    id: uid(),
    title: 'New scheduled post',
    platform: 'TikTok',
    status: 'scheduled',
    dueDate,
    createdAt: nowIso,
    updatedAt: nowIso
  }));
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
    const nowIso = new Date().toISOString();
    streamFields.forEach(([k]) => state.streamPlan[k] = document.getElementById('stream_'+k).value.trim());
    state.streamPlan.createdAt = state.streamPlan.createdAt || nowIso;
    state.streamPlan.updatedAt = nowIso;
    saveState();
  };

  document.getElementById('clearStream').onclick = () => {
    state.streamPlan = structuredClone(defaultState.streamPlan);
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

  const hookTemplates = {
    hype: [
      'This {type} went from normal to full send in seconds.',
      'I did not expect {topic} to turn into this.',
      'The moment {takeaway} changed the whole run.',
      'Wait for the part where {takeaway}.',
      '{platform} needs to see this {type}.'
    ],
    funny: [
      'POV: {topic} had other plans.',
      'I called this a strategy. The car called it comedy.',
      'Everything was fine until {takeaway}.',
      'This {type} is why my chat does not trust me.',
      'Me: “one clean run.” Also me: {takeaway}.'
    ],
    educational: [
      'Here is what {topic} taught me in one {type}.',
      'The key detail: {takeaway}.',
      'If you struggle with {topic}, watch this part first.',
      'Breaking down why {takeaway} matters.',
      'One small adjustment made this {type} click.'
    ],
    cinematic: [
      'No commentary needed—just {topic} and the moment everything lined up.',
      'The calm before {takeaway}.',
      'Every frame of this {type} felt like a final lap.',
      '{topic}, but make it movie mode.',
      'That split second when {takeaway}.'
    ],
    casual: [
      'Quick clip from {topic}.',
      'This {type} had a little bit of everything.',
      'Not perfect, but {takeaway}.',
      'Trying something new with {topic}.',
      'What would you do differently here?'
    ]
  };
  const captionTemplates = {
    hype: 'Full-send moment from {topic}. {takeaway}. Would you send it or play it safe?',
    funny: 'I had a plan for {topic}, then the clip wrote its own punchline. {takeaway}.',
    educational: 'Small details matter in {topic}. The big takeaway: {takeaway}. Save this for your next run, stream, or edit.',
    cinematic: '{topic} in focus. {takeaway}. Sometimes the best moments are the ones that feel effortless.',
    casual: 'Quick {type} for {platform}: {topic}. {takeaway}. What should I try next?'
  };
  const hashtagSets = {
    'stream clip': ['#streamer', '#streamclip', '#gaming', '#creator'],
    'hot lap': ['#simracing', '#hotlap', '#racing', '#motorsport'],
    tutorial: ['#tutorial', '#howto', '#creatorTips', '#learn'],
    reaction: ['#reaction', '#gaming', '#streamer', '#contentcreator'],
    'car build': ['#carbuild', '#cars', '#simracing', '#garage'],
    meme: ['#meme', '#gamingmemes', '#carmemes', '#streamer'],
    'behind the scenes': ['#bts', '#creatorlife', '#streamsetup', '#contentcreator'],
    other: ['#contentcreator', '#gaming', '#cars', '#streamer']
  };

  function helperData() {
    const topic = helperTopic.value.trim() || 'this run';
    const takeaway = helperTakeaway.value.trim() || 'the key moment finally clicked';
    return { platform: helperPlatform.value, type: helperType.value, vibe: helperVibe.value, topic, takeaway };
  }

  function fillTemplate(template, data) {
    return template
      .replaceAll('{platform}', data.platform)
      .replaceAll('{type}', data.type)
      .replaceAll('{vibe}', data.vibe)
      .replaceAll('{topic}', data.topic)
      .replaceAll('{takeaway}', data.takeaway);
  }

  function renderHookOptions(hooks) {
    hookOptions.innerHTML = hooks.map(hook => `<button type="button" class="ghost hook-choice">${escapeHtml(hook)}</button>`).join('');
    hookOptions.querySelectorAll('button').forEach(button => {
      button.onclick = () => helperOutput.value = button.textContent;
    });
  }

  genHook.onclick = () => {
    const data = helperData();
    const hooks = hookTemplates[data.vibe].map(template => fillTemplate(template, data));
    renderHookOptions(hooks);
    helperOutput.value = hooks.join('\n');
  };
  genCaption.onclick = () => {
    const data = helperData();
    helperOutput.value = fillTemplate(captionTemplates[data.vibe], data);
  };
  genHashtags.onclick = () => {
    const data = helperData();
    const platformTags = data.platform === 'Twitch' ? ['#twitch', '#livestream'] : data.platform === 'YouTube Video' ? ['#youtube', '#creator'] : ['#shorts', '#reels'];
    helperOutput.value = [...hashtagSets[data.type], ...platformTags, `#${data.vibe}`].join(' ');
  };
  copyHelper.onclick = async () => {
    try { await navigator.clipboard.writeText(helperOutput.value || ''); }
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
