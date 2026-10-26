'use strict';

(() => {
  const $ = (id) => document.getElementById(id);
  const ui = Object.fromEntries([
    'archive', 'archive-summary', 'load-status', 'load-message', 'retry', 'vocal-feature',
    'vocal-title', 'select-vocal', 'search', 'theme-filter', 'type-filter', 'result-count',
    'track-list', 'empty-state', 'reset-filters', 'selected-title', 'selected-subtitle',
    'selected-meta', 'outside-filter', 'audio', 'main-play', 'previous', 'next',
    'playback-state', 'player-message', 'description', 'lyrics-panel', 'lyrics',
    'production-panel', 'production-values', 'voice-note', 'track-links', 'selected-theme',
    'selected-source', 'selected-source-link', 'theme-credits'
  ].map((id) => [id, $(id)]));
  let catalog = null;
  let selected = null;
  let featured = null;
  let visible = [];
  let rows = new Map();
  let loading = false;
  let playing = false;
  let hasStarted = false;
  let failed = false;
  let playIntent = 0;
  let requestNumber = 0;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function text(value) { return typeof value === 'string' ? value : ''; }
  function duration(seconds) {
    const value = Math.max(0, Math.floor(Number(seconds) || 0));
    return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
  }
  function externalURL(value) {
    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
    } catch { return null; }
  }
  function audioURL(value) {
    // Only repository-local AAC assets. No absolute, remote, or traversal paths.
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const decoded = decodeURIComponent(value);
      if (/^[a-z][a-z\d+.-]*:/i.test(decoded) || /^[\/\\]/.test(decoded) || /[\\?#\x00-\x1f\x7f]/.test(decoded)) return null;
      const parts = decoded.replace(/^\.\//, '').split('/');
      if (parts.some((part) => !part || part === '.' || part === '..') || !/\.(m4a|aac)$/i.test(parts.at(-1))) return null;
      return './' + parts.map(encodeURIComponent).join('/');
    } catch { return null; }
  }
  function validate(data) {
    if (!data || data.schemaVersion !== 1 || !Array.isArray(data.themes) || !Array.isArray(data.tracks)) throw new Error('schema');
    if (!text(data.artist).trim() || !text(data.updatedAt).trim() || !Number.isFinite(Date.parse(data.updatedAt))) throw new Error('metadata');
    const themeIds = new Set();
    for (const theme of data.themes) {
      if (!theme || !text(theme.id).trim() || themeIds.has(theme.id) || !text(theme.title).trim() || !['released', 'in-progress'].includes(theme.status)) throw new Error('theme');
      if (!theme.source || typeof theme.source !== 'object') throw new Error('source');
      themeIds.add(theme.id);
    }
    const ids = new Set();
    for (const track of data.tracks) {
      if (!track || !text(track.id).trim() || ids.has(track.id) || !text(track.title).trim() || !themeIds.has(track.themeId)) throw new Error('track');
      if (!['instrumental', 'vocal'].includes(track.kind) || !Number.isFinite(track.duration) || track.duration < 0 || !audioURL(track.audio)) throw new Error('audio');
      ids.add(track.id);
    }
    return data;
  }
  const themeOf = (track) => catalog.themes.find((theme) => theme.id === track.themeId);
  const kindLabel = (track) => track.kind === 'vocal' ? '보컬' : '연주곡';
  function hashTrack() {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    return catalog?.tracks.find((track) => track.id === hash.get('track')) || null;
  }
  function updateHash(track) {
    const hash = '#track=' + encodeURIComponent(track.id);
    if (window.location.hash !== hash) {
      // Avoid adding a history entry on every automatic track advance.
      try { window.history.replaceState(null, '', hash); } catch { /* Selection still works without History API. */ }
    }
  }
  function makeLink(label, href) {
    const safe = externalURL(href);
    if (!safe) return null;
    const link = element('a', '', label);
    link.href = safe;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    return link;
  }
  function sourceText(theme) {
    return [text(theme.source.composer), text(theme.source.work)].filter(Boolean).join(' · ');
  }
  function renderCredits() {
    ui['theme-credits'].replaceChildren();
    for (const theme of catalog.themes) {
      const article = element('article', 'theme-credit');
      const heading = element('div');
      heading.append(element('h3', '', theme.title));
      heading.append(element('span', 'theme-status', theme.status === 'released' ? '공개된 테마' : '작업 중인 테마'));
      const info = element('div');
      if (text(theme.subtitle)) info.append(element('p', '', theme.subtitle));
      const credit = sourceText(theme);
      if (credit) info.append(element('p', 'source-copy', credit));
      if (text(theme.source.note)) info.append(element('p', 'source-copy', theme.source.note));
      const link = makeLink('작품 출처 살펴보기', theme.source.url);
      if (link) info.append(link);
      article.append(heading, info);
      ui['theme-credits'].append(article);
    }
  }
  function renderDetails() {
    if (!selected) return;
    const theme = themeOf(selected);
    ui['selected-title'].textContent = selected.title;
    ui['selected-subtitle'].textContent = text(selected.subtitle);
    ui['selected-meta'].textContent = [kindLabel(selected), text(selected.genre), theme.title, duration(selected.duration)].filter(Boolean).join(' · ');
    ui.audio.setAttribute('aria-label', selected.title + ' 재생');
    ui.description.textContent = text(selected.description);
    ui['lyrics-panel'].open = false;
    ui['lyrics-panel'].hidden = !text(selected.lyrics).trim();
    ui.lyrics.textContent = text(selected.lyrics);
    ui['production-panel'].open = false;
    ui['production-values'].replaceChildren();
    const design = selected.design || {};
    for (const [label, value] of [['조성 설계값', design.key], ['BPM 설계값', design.bpm]]) {
      ui['production-values'].append(element('dt', '', label), element('dd', '', value === undefined || value === null || value === '' ? '미기재' : String(value)));
    }
    ui['voice-note'].hidden = !text(selected.voice).trim();
    ui['voice-note'].textContent = '보컬 제작 메모: ' + text(selected.voice);
    ui['track-links'].replaceChildren();
    for (const [key, label] of [['a', 'Suno 버전 A'], ['b', 'Suno 버전 B']]) {
      const link = makeLink(label, selected.links?.[key]);
      if (link) ui['track-links'].append(link);
    }
    ui['track-links'].hidden = !ui['track-links'].childElementCount;
    ui['selected-theme'].textContent = theme.title;
    ui['selected-source'].textContent = [sourceText(theme), text(theme.source.note)].filter(Boolean).join('\n');
    const source = externalURL(theme.source.url);
    ui['selected-source-link'].hidden = !source;
    if (source) ui['selected-source-link'].href = source;
    else ui['selected-source-link'].removeAttribute('href');
  }
  function syncState() {
    const state = failed ? '재생 오류' : playing ? '재생 중' : hasStarted ? '일시 정지' : '선택됨';
    ui['playback-state'].textContent = state;
    ui['main-play'].textContent = playing ? '일시 정지' : '재생';
    ui['main-play'].setAttribute('aria-label', selected ? selected.title + (playing ? ' 일시 정지' : ' 재생') : '재생');
    ui['main-play'].disabled = !selected;
    for (const [id, row] of rows) {
      const current = id === selected?.id;
      row.item.classList.toggle('is-selected', current);
      row.item.classList.toggle('is-playing', current && playing);
      row.select.setAttribute('aria-pressed', String(current));
      row.state.textContent = current ? state : '';
      row.state.hidden = !current;
      row.play.textContent = current && playing ? '정지' : '재생';
      row.play.setAttribute('aria-label', row.title + (current && playing ? ' 일시 정지' : ' 재생'));
    }
    const queue = navigationQueue();
    const index = queue.findIndex((track) => track.id === selected?.id);
    ui.previous.disabled = !selected || index <= 0;
    ui.next.disabled = !selected || index < 0 || index >= queue.length - 1;
    ui['outside-filter'].hidden = !selected || visible.some((track) => track.id === selected.id);
  }
  function renderList() {
    const term = ui.search.value.trim().toLocaleLowerCase('ko');
    visible = catalog.tracks.filter((track) => {
      const theme = themeOf(track);
      const haystack = [track.title, track.subtitle, track.genre, track.description, theme.title, theme.subtitle, kindLabel(track)].map(text).join(' ').toLocaleLowerCase('ko');
      return (!term || haystack.includes(term)) && (!ui['theme-filter'].value || track.themeId === ui['theme-filter'].value) && (!ui['type-filter'].value || track.kind === ui['type-filter'].value);
    });
    rows = new Map();
    ui['track-list'].replaceChildren();
    visible.forEach((track) => {
      const item = element('li', 'track-row');
      const number = element('span', 'track-number', String(catalog.tracks.indexOf(track) + 1).padStart(2, '0'));
      number.setAttribute('aria-hidden', 'true');
      const select = element('button', 'track-select');
      select.type = 'button';
      select.setAttribute('aria-label', track.title + ' 선택');
      select.append(element('span', 'track-name', track.title));
      select.append(element('span', 'track-info', [kindLabel(track), text(track.genre), duration(track.duration)].filter(Boolean).join(' · ')));
      const state = element('span', 'track-state');
      select.append(state);
      select.addEventListener('click', () => selectTrack(track));
      const play = element('button', 'row-play', '재생');
      play.type = 'button';
      play.addEventListener('click', () => {
        if (selected?.id === track.id && playing) { pausePlayback(); return; }
        if (selected?.id !== track.id) selectTrack(track);
        startPlayback();
      });
      item.append(number, select, play);
      ui['track-list'].append(item);
      rows.set(track.id, { item, select, state, play, title: track.title });
    });
    ui['result-count'].textContent = `${visible.length} / ${catalog.tracks.length}곡`;
    ui['empty-state'].hidden = visible.length > 0;
    syncState();
  }
  function pausePlayback() {
    playIntent++;
    ui.audio.pause();
    playing = false;
    syncState();
  }
  function selectTrack(track, writeHash = true) {
    if (!track) return;
    if (selected?.id !== track.id) {
      pausePlayback();
      selected = track;
      hasStarted = false;
      failed = false;
      ui['player-message'].textContent = '';
      ui.audio.src = audioURL(track.audio);
      renderDetails();
    }
    if (writeHash) updateHash(track);
    syncState();
  }
  async function startPlayback() {
    if (!selected) return;
    const intent = ++playIntent;
    failed = false;
    ui['player-message'].textContent = '';
    try {
      await ui.audio.play();
    } catch (error) {
      if (intent !== playIntent || error?.name === 'AbortError') return;
      failed = true;
      ui['player-message'].textContent = error?.name === 'NotAllowedError'
        ? '브라우저에서 재생이 제한되었습니다. 오디오 재생 버튼을 직접 눌러 주세요.'
        : '음원을 재생할 수 없습니다. 파일이 공개되어 있고 이 브라우저에서 AAC를 지원하는지 확인해 주세요.';
      syncState();
    }
  }
  function navigationQueue() {
    return selected && visible.some((track) => track.id === selected.id) ? visible : catalog?.tracks || [];
  }
  function move(offset, continuePlaying = false) {
    const queue = navigationQueue();
    const index = queue.findIndex((track) => track.id === selected?.id);
    const next = queue[index + offset];
    if (!next || index < 0) return;
    selectTrack(next);
    if (continuePlaying) startPlayback();
  }
  function resetFilters() {
    ui.search.value = '';
    ui['theme-filter'].value = '';
    ui['type-filter'].value = '';
    renderList();
  }
  async function loadCatalog() {
    if (loading) return;
    loading = true;
    const request = ++requestNumber;
    ui.retry.hidden = true;
    ui['load-status'].hidden = false;
    ui['load-message'].textContent = '음악 목록을 불러오는 중입니다.';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('./catalog.json', { signal: controller.signal, cache: 'no-cache', credentials: 'omit' });
      if (!response.ok) throw new Error('http');
      const data = validate(await response.json());
      if (request !== requestNumber) return;
      catalog = data;
      ui['theme-filter'].replaceChildren(new Option('전체 테마', ''));
      catalog.themes.forEach((theme) => ui['theme-filter'].append(new Option(theme.title, theme.id)));
      const vocalCount = catalog.tracks.filter((track) => track.kind === 'vocal').length;
      ui['archive-summary'].textContent = `${catalog.tracks.length}곡 · 연주곡 ${catalog.tracks.length - vocalCount} · 보컬 ${vocalCount} · ${catalog.themes.length}개 테마`;
      featured = catalog.tracks.find((track) => track.kind === 'vocal') || null;
      ui['vocal-feature'].hidden = !featured;
      if (featured) ui['vocal-title'].textContent = featured.title;
      renderCredits();
      renderList();
      const initial = hashTrack() || featured || catalog.tracks[0];
      if (initial) selectTrack(initial, false);
      ui.archive.hidden = false;
      ui['load-status'].hidden = true;
      if (!catalog.tracks.length) {
        ui['load-message'].textContent = '아직 공개된 곡이 없습니다. 새로운 음악을 준비하고 있습니다.';
        ui['load-status'].hidden = false;
      }
    } catch {
      ui['load-message'].textContent = '음악 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
      ui['archive-summary'].textContent = '음악 목록을 확인할 수 없습니다.';
      ui.retry.hidden = false;
    } finally {
      clearTimeout(timer);
      loading = false;
    }
  }
  ui.retry.addEventListener('click', loadCatalog);
  ui.search.addEventListener('input', () => catalog && renderList());
  ui['theme-filter'].addEventListener('change', () => catalog && renderList());
  ui['type-filter'].addEventListener('change', () => catalog && renderList());
  ui['reset-filters'].addEventListener('click', resetFilters);
  ui['select-vocal'].addEventListener('click', () => {
    if (!featured) return;
    resetFilters();
    selectTrack(featured);
    ui['selected-title'].setAttribute('tabindex', '-1');
    ui['selected-title'].focus();
  });
  ui['main-play'].addEventListener('click', () => playing ? pausePlayback() : startPlayback());
  ui.previous.addEventListener('click', () => move(-1));
  ui.next.addEventListener('click', () => move(1));
  ui.audio.addEventListener('playing', () => {
    playing = true;
    hasStarted = true;
    failed = false;
    ui['player-message'].textContent = '';
    syncState();
  });
  ui.audio.addEventListener('pause', () => { playing = false; syncState(); });
  ui.audio.addEventListener('waiting', () => {
    if (!ui.audio.paused) ui['playback-state'].textContent = '음원 불러오는 중';
  });
  ui.audio.addEventListener('ended', () => {
    playing = false;
    hasStarted = false;
    syncState();
    move(1, true);
  });
  ui.audio.addEventListener('error', () => {
    if (!selected) return;
    playing = false;
    failed = true;
    ui['player-message'].textContent = '음원을 불러올 수 없습니다. 잠시 후 다시 재생해 주세요. 문제가 계속되면 음원 파일 또는 브라우저의 AAC 지원을 확인해 주세요.';
    syncState();
  });
  window.addEventListener('hashchange', () => {
    const track = hashTrack();
    if (track) selectTrack(track, false);
  });
  loadCatalog();
})();
