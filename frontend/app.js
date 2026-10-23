/* 小游戏总览 · 前端逻辑（现代游戏平台风格 + 主题皮肤）
 *
 * 数据来自 /api/catalog（服务端实时扫描 subprojects/ 目录 + 合并 frontend/catalog.json
 * 里的人工元数据）。页面只做「读 + 呈现」，不写任何东西。
 *
 * 三个交互：
 *   1. 顶部搜索（标题 / 说明 / 标签 / 分类 / 备注 全字段模糊匹配）
 *   2. 分类筛选 chips + 排序
 *   3. 点卡片 → 右侧抽屉（子项目详情，默认行为）；卡片上的「进入游戏」按钮 → 直接打开游戏
 *
 * 主题：模式（跟随系统 / 浅色 / 深色）× 主题色（6 套），存 localStorage，
 * URL 参数优先（?skin=rose&mode=dark）。
 */
(function () {
  'use strict'

  const BASE = location.origin
  const GAME_ICON = { snake: '🐍' }
  const DEFAULT_ICON = '🎮'

  // ————————————————————————
  // 主题皮肤（模式 × 主题色，存 localStorage）
  // ————————————————————————
  const THEME_KEY = 'games.theme'
  const SKINS = [
    { id: 'azure', name: '天青', hue: 210, bgHue: 212 },
    { id: 'violet', name: '紫罗兰', hue: 265, bgHue: 258 },
    { id: 'teal', name: '青碧', hue: 172, bgHue: 186 },
    { id: 'green', name: '苔绿', hue: 145, bgHue: 158 },
    { id: 'amber', name: '琥珀', hue: 35, bgHue: 28 },
    { id: 'rose', name: '玫瑰', hue: 342, bgHue: 336 },
  ]
  const MODE_LABEL = { auto: '跟随系统', light: '浅色', dark: '深色' }

  const themeState = {
    mode: document.documentElement.dataset.mode || 'auto',
    skin: document.documentElement.dataset.skin || 'azure',
  }

  function readThemePref() {
    let raw = {}
    try {
      raw = JSON.parse(localStorage.getItem(THEME_KEY) || '{}') || {}
    } catch (e) { raw = {} }
    try {
      const url = new URLSearchParams(window.location.search)
      if (url.get('mode')) raw.mode = url.get('mode')
      if (url.get('skin')) raw.skin = url.get('skin')
    } catch (e) { /* 旧浏览器不支持 URLSearchParams，忽略 */ }
    return {
      mode: ['auto', 'light', 'dark'].includes(raw.mode) ? raw.mode : 'auto',
      skin: SKINS.some((s) => s.id === raw.skin) ? raw.skin : 'azure',
    }
  }

  function saveThemePref() {
    try {
      localStorage.setItem(THEME_KEY, JSON.stringify(themeState))
    } catch (e) { /* 隐私模式下不持久化，不影响本次使用 */ }
  }

  function resolveTheme(mode) {
    if (mode === 'light' || mode === 'dark') return mode
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  function applyTheme() {
    const root = document.documentElement
    root.dataset.mode = themeState.mode
    root.dataset.theme = resolveTheme(themeState.mode)
    root.dataset.skin = themeState.skin
    saveThemePref()
    syncThemeUi()
  }

  function syncThemeUi() {
    const skin = SKINS.find((s) => s.id === themeState.skin) || SKINS[0]
    const label = $('themeBtnLabel')
    if (label) label.textContent = skin.name + ' · ' + MODE_LABEL[themeState.mode]
    document.querySelectorAll('#modeSeg button').forEach((btn) => {
      btn.classList.toggle('on', btn.dataset.mode === themeState.mode)
      btn.setAttribute('aria-pressed', String(btn.dataset.mode === themeState.mode))
    })
    renderSkins()
    document.querySelectorAll('#skinList .swatch').forEach((btn) => {
      const on = btn.dataset.skin === themeState.skin
      btn.classList.toggle('on', on)
      btn.setAttribute('aria-pressed', String(on))
    })
  }

  function renderSkins() {
    const box = $('skinList')
    if (!box) return
    box.innerHTML = SKINS.map((s) => {
      const darkBg = 'hsl(' + s.bgHue + ' 22% 6%)'
      const lightBg = 'hsl(' + s.bgHue + ' 42% 97%)'
      const isDark = document.documentElement.dataset.theme === 'dark'
      return ('<button type="button" class="swatch" data-skin="' + s.id + '"' +
              ' style="--sw-hue:' + s.hue + ';--sw-bg:' + (isDark ? darkBg : lightBg) + '"' +
              ' title="' + s.name + '（页面背景 + 强调色）">' +
              '<i aria-hidden="true"></i><span>' + s.name + '</span>' +
              '</button>')
    }).join('')
  }

  function setThemeMenu(open) {
    const menu = $('themeMenu')
    const btn = $('themeBtn')
    if (!menu || !btn) return
    menu.hidden = !open
    btn.setAttribute('aria-expanded', String(open))
  }

  function setupTheme() {
    const saved = readThemePref()
    themeState.mode = saved.mode
    themeState.skin = saved.skin
    renderSkins()
    applyTheme()

    const modeSeg = $('modeSeg')
    const skinList = $('skinList')
    const themeBtn = $('themeBtn')
    if (modeSeg) {
      modeSeg.addEventListener('click', (event) => {
        const btn = event.target.closest('button[data-mode]')
        if (!btn) return
        themeState.mode = btn.dataset.mode
        applyTheme()
        event.stopPropagation()
        // 面板保持打开，方便连续切换多个主题设置
      })
    }
    if (skinList) {
      skinList.addEventListener('click', (event) => {
        const btn = event.target.closest('.swatch')
        if (!btn) return
        themeState.skin = btn.dataset.skin
        applyTheme()
        event.stopPropagation()
      })
    }
    if (themeBtn) {
      themeBtn.addEventListener('click', (event) => {
        event.stopPropagation()
        const isOpen = !$('themeMenu').hidden
        setThemeMenu(!isOpen)
      })
    }
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setThemeMenu(false)
    })
  }

  document.addEventListener('click', (event) => {
    if (!event.target.closest('#theme')) setThemeMenu(false)
  })

  // ————————————————————————
  // 拉取与合并数据
  // ————————————————————————
  const $ = (id) => document.getElementById(id)
  const el = {
    projectName: $('projectName'),
    projectPath: $('projectPath'),
    stats: $('stats'),
    search: $('search'),
    searchClear: $('searchClear'),
    sort: $('sort'),
    reload: $('reload'),
    categories: $('categories'),
    resultCount: $('resultCount'),
    generatedAt: $('generatedAt'),
    grid: $('grid'),
    empty: $('empty'),
    drawer: $('drawer'),
    drawerMask: $('drawerMask'),
    drawerClose: $('drawerClose'),
    drawerDir: $('drawerDir'),
    drawerTitle: $('drawerTitle'),
    drawerBody: $('drawerBody'),
  }

  const state = {
    catalog: [],
    query: '',
    category: '全部',
    sort: 'name',
  }

  let lastFocused = null

  async function fetchCatalog() {
    const res = await fetch(`${BASE}/api/catalog`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`catalog ${res.status}`)
    return res.json()
  }

  async function fetchDetail(dir) {
    const res = await fetch(`${BASE}/api/catalog/${encodeURIComponent(dir)}`, { cache: 'no-store' })
    if (!res.ok) throw new Error(`detail ${res.status}`)
    return res.json()
  }

  function iconFor(dir) {
    return GAME_ICON[dir] || DEFAULT_ICON
  }

  // ————————————————————————
  // 渲染
  // ————————————————————————
  function htmlEscape(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
  }

  /* 行内 Markdown：代码 ` `、粗体 **、链接 []() */
  function inlineMD(text) {
    return text
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }

  /* 轻量 Markdown → HTML：标题、列表、段落，行内再交给 inlineMD */
  function renderMarkdown(text) {
    const escaped = htmlEscape(text);
    const blocks = escaped.split(/\n\s*\n/);
    let result = '';
    let inList = false;
    for (const block of blocks) {
      const trimmed = block.trim();
      if (!trimmed) continue;
      const h = trimmed.match(/^(#{1,6})\s+(.*)$/);
      if (h) {
        if (inList) { result += '</ul>'; inList = false; }
        result += '<h' + h[1].length + '>' + inlineMD(h[2]) + '</h' + h[1].length + '>';
        continue;
      }
      if (trimmed.startsWith('- ')) {
        if (!inList) { result += '<ul>'; inList = true; }
        result += '<li>' + inlineMD(trimmed.slice(2)) + '</li>';
        continue;
      }
      if (inList) { result += '</ul>'; inList = false; }
      result += '<p>' + inlineMD(trimmed.replace(/\n/g, ' ')) + '</p>';
    }
    if (inList) result += '</ul>';
    return result;
  }

  function filteredAndSorted() {
    const q = state.query.toLowerCase()
    const cat = state.category
    return state.catalog
      .filter((p) => {
        if (cat !== '全部' && p.category !== cat) return false
        if (!q) return true
        const haystack = [
          p.dir, p.title, p.summary, p.category,
          (p.tags || []).join(' '), (p.notes || ''), (p.command || '')
        ].join(' ').toLowerCase()
        return haystack.includes(q)
      })
      .sort((a, b) => {
        if (state.sort === 'updated') {
          return new Date(b.updated || 0) - new Date(a.updated || 0) ||
            a.dir.localeCompare(b.dir)
        }
        return a.dir.localeCompare(b.dir)
      })
  }

  function renderCategories(list) {
    const cats = ['全部', ...Array.from(new Set(list.map((p) => p.category)))].sort()
    el.categories.innerHTML = cats.map((c) => {
      const on = c === state.category ? 'class="on" aria-pressed="true"' : 'aria-pressed="false"'
      return `<button type="button" data-category="${htmlEscape(c)}" ${on}>${htmlEscape(c)}</button>`
    }).join('')
  }

  function renderGrid(list) {
    const box = el.grid
    box.innerHTML = ''
    if (list.length === 0) {
      el.empty.hidden = false
      el.resultCount.textContent = '0 个'
      return
    }
    el.empty.hidden = true
    el.resultCount.textContent = `${list.length} 个`
    for (const p of list) {
      const entryName = p.entry && p.entry.split('/').pop()
      const icon = iconFor(p.dir)
      const tagsHtml = (p.tags || []).map((t) => `<span class="tag">${htmlEscape(t)}</span>`).join('')
      // 封面优先用预览图（preview.svg / preview.png），没有则用图标占位
      const previewUrl = p.url ? p.url.replace(/\/index\.html$/, '/preview.svg') : ''
      const hasPreview = p.hasEntry && Boolean(p.url)
      const coverHtml = hasPreview
        ? `<div class="cover">
             <div class="cover-bg"></div>
             <img class="cover-img" src="${htmlEscape(previewUrl)}"
                  alt="${htmlEscape(p.title)} 预览"
                  loading="lazy"
                  onerror="this.style.display='none';this.previousElementSibling.style.display='block';this.nextElementSibling.style.display='none';">
             <div class="cover-fallback" aria-hidden="true">${icon}</div>
             <div class="cover-overlay"></div>
           </div>`
        : `<div class="cover">
             <div class="cover-bg"></div>
             <div class="cover-fallback" aria-hidden="true">${icon}</div>
             <div class="cover-overlay"></div>
           </div>`
      const card = document.createElement('article')
      card.className = 'card'
      card.tabIndex = 0
      card.setAttribute('role', 'button')
      card.setAttribute('aria-label', `查看「${p.title}」详情，回车打开详情抽屉`)
      card.dataset.dir = p.dir
      card.innerHTML = `
        ${coverHtml}
        <div class="card-body">
          <div class="card-head">
            <h3 class="card-title">${htmlEscape(p.title)}</h3>
          </div>
          <div class="tags">${tagsHtml}</div>
          <p class="card-summary">${htmlEscape(p.summary)}</p>
          <div class="card-meta">
            <span class="entry-pill">${icon} 入口：${htmlEscape(entryName || 'index.html')}</span>
            <span>${p.fileCount} 个文件 · ${p.lines} 行</span>
          </div>
          <div class="actions">
            <button class="btn-ghost" type="button" data-action="detail" title="查看详情">详情</button>
            <a class="btn-enter" href="${htmlEscape(p.url)}" target="_blank" rel="noopener" data-action="enter">
              ${htmlEscape(p.entryLabel || '进入游戏')}
            </a>
          </div>
        </div>
      `
      const detailBtn = card.querySelector('[data-action="detail"]')
      detailBtn.addEventListener('click', (ev) => {
        ev.stopPropagation()
        openDetail(p.dir)
      })
      card.addEventListener('click', (ev) => {
        if (ev.target.closest('[data-action="enter"]')) return
        openDetail(p.dir)
      })
      card.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault()
          openDetail(p.dir)
        }
      })
      box.appendChild(card)
    }
  }

  function render() {
    const list = filteredAndSorted()
    renderGrid(list)
    renderCategories(list)
    const updated = state.catalog.length ? new Date(Math.max(...state.catalog.map((p) => new Date(p.updated || 0)))).toLocaleString() : '—'
    el.generatedAt.textContent = `生成于 ${updated}`
  }

  async function load() {
    try {
      const data = await fetchCatalog()
      state.catalog = data.projects || []
      el.projectName.textContent = '小游戏总览'
      el.projectPath.textContent = `games · 子游戏集`
      el.stats.textContent = `${state.catalog.length} 个子游戏`
      render()
    } catch (err) {
      console.error(err)
      el.projectPath.textContent = '读取失败：' + err.message
    }
  }

  // ————————————————————————
  // 详情抽屉（顶部带试玩预览）
  // ————————————————————————
  function closeDrawer() {
    el.drawer.classList.remove('open')
    el.drawerMask.hidden = true
    el.drawer.hidden = true
    const preview = el.drawerBody.querySelector('.preview-frame')
    if (preview) { preview.src = 'about:blank'; preview.remove() }
    if (lastFocused) { lastFocused.focus(); lastFocused = null }
  }

  async function openDetail(dir) {
    lastFocused = document.activeElement
    try {
      const p = await fetchDetail(dir)
      const entryName = p.entry && p.entry.split('/').pop()
      const icon = iconFor(p.dir)
      const tagsHtml = (p.tags || []).map((t) => `<span class="tag">${htmlEscape(t)}</span>`).join('')

      // 预览图（抽屉顶部试玩区）
      const previewUrl = p.url ? p.url.replace(/\/index\.html$/, '/preview.svg') : ''
      const previewHtml = p.hasEntry && Boolean(p.url)
        ? `<div class="section" style="margin-bottom:0">
             <h3 class="section-title">试玩预览</h3>
             <img class="preview-img" src="${htmlEscape(previewUrl)}"
                  alt="${htmlEscape(p.title)} 预览"
                  loading="lazy"
                  style="width:100%;height:220px;object-fit:cover;border-radius:14px;border:1px solid var(--line);background:#000;display:block;"
                  onerror="this.style.display='none';this.parentElement.innerHTML='<div style=\\'height:220px;display:flex;align-items:center;justify-content:center;background:var(--card);border:1px solid var(--line);border-radius:14px;color:var(--fg-dim)\\'>(无预览图)</div>';">
           </div>`
        : ''

      // 构建详情内容：只有有值的字段才渲染
      const rows = []
      rows.push(`<div class="detail-row"><span class="detail-k">目录</span><span class="detail-v"><code style="font-size:12px">${htmlEscape(p.dir)}</code></span></div>`)
      if (p.entry) rows.push(`<div class="detail-row"><span class="detail-k">入口</span><span class="detail-v">${htmlEscape(entryName || 'index.html')}</span></div>`)
      if (p.category) rows.push(`<div class="detail-row"><span class="detail-k">分类</span><span class="detail-v">${htmlEscape(p.category)}</span></div>`)
      if ((p.tags || []).length) rows.push(`<div class="detail-row"><span class="detail-k">标签</span><span class="detail-v tag-section">${tagsHtml}</span></div>`)
      if (p.updated) rows.push(`<div class="detail-row"><span class="detail-k">更新</span><span class="detail-v">${new Date(p.updated).toLocaleString()}</span></div>`)
      if (p.fileCount != null || p.lines != null) rows.push(`<div class="detail-row"><span class="detail-k">文件</span><span class="detail-v">${p.fileCount || 0} 个 · ${p.lines || 0} 行</span></div>`)

      const inputsHtml = (p.inputs || []).map((i) => `<li>${htmlEscape(i)}</li>`).join('')
      const outputsHtml = (p.outputs || []).map((o) => `<li>${htmlEscape(o)}</li>`).join('')
      const filesHtml = (p.files || []).map((f) => {
        const kb = (f.size / 1024).toFixed(1)
        return `<div class="file-item" title="${htmlEscape(f.name)} (${kb} KB)">${htmlEscape(f.name)}</div>`
      }).join('')

      let detailHtml = ''
      detailHtml += `<div class="section" style="margin-top:10px">${rows.join('')}</div>`
      if (p.summary) detailHtml += `<p class="card-summary" style="margin:10px 0 0">${htmlEscape(p.summary)}</p>`
      detailHtml += `<div class="actions" style="margin: 10px 0 24px 0"><a class="btn-enter" href="${htmlEscape(p.url)}" target="_blank" rel="noopener">${htmlEscape(p.entryLabel || '进入游戏')}</a></div>`
      if (inputsHtml) detailHtml += `<div class="section"><h3 class="section-title">输入</h3><ul style="margin:0;padding-left:16px;color:var(--fg)">${inputsHtml}</ul></div>`
      if (outputsHtml) detailHtml += `<div class="section"><h3 class="section-title">输出</h3><ul style="margin:0;padding-left:16px;color:var(--fg)">${outputsHtml}</ul></div>`
      if (p.command) detailHtml += `<div class="section"><h3 class="section-title">运行命令</h3><div style="font-size:12px;color:var(--fg-dim);background:var(--bg-soft);border:1px solid var(--line);border-radius:8px;padding:8px 12px;white-space:pre-wrap">${htmlEscape(p.command)}</div></div>`
      if (p.notes) detailHtml += `<div class="section"><h3 class="section-title">备注</h3><p style="margin:0;color:var(--fg-dim);white-space:pre-wrap">${htmlEscape(p.notes)}</p></div>`
      if (p.subprompt) detailHtml += `<div class="section"><h3 class="section-title">子项目说明</h3><div class="subprompt">${renderMarkdown(p.subprompt)}</div></div>`
      if ((p.files || []).length) detailHtml += `<div class="section"><h3 class="section-title">文件 (${p.files.length})</h3><div class="file-list">${filesHtml}</div></div>`

      el.drawerDir.textContent = p.dir
      el.drawerTitle.textContent = p.title
      el.drawerBody.innerHTML = previewHtml + detailHtml

      el.drawer.hidden = false
      el.drawerMask.hidden = false
      requestAnimationFrame(() => el.drawer.classList.add('open'))
    } catch (err) {
      console.error(err)
      alert('读取详情失败：' + err.message)
    }
  }

  // ————————————————————————
  // 事件绑定
  // ————————————————————————
  el.search.addEventListener('input', (ev) => {
    state.query = ev.target.value
    el.searchClear.hidden = !state.query
    render()
  })
  el.searchClear.addEventListener('click', () => {
    el.search.value = ''
    state.query = ''
    el.searchClear.hidden = true
    render()
  })
  el.sort.addEventListener('change', (ev) => {
    state.sort = ev.target.value
    render()
  })
  el.reload.addEventListener('click', load)
  el.categories.addEventListener('click', (ev) => {
    const btn = ev.target.closest('button[data-category]')
    if (!btn) return
    state.category = btn.dataset.category
    render()
  })
  el.drawerClose.addEventListener('click', closeDrawer)
  el.drawerMask.addEventListener('click', closeDrawer)
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && !el.drawer.hidden) closeDrawer()
  })

  setupTheme()
  load()
})()
