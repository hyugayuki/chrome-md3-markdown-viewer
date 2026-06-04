(function() {
  // 1. 生のMarkdownテキストを取得
  const preElement = document.querySelector('pre');
  if (!preElement) return;

  const rawMarkdown = preElement.textContent;

  // 2. 元のbodyの中身をクリア
  document.body.innerHTML = '';
  
  // 3. 基本的なコンテナを作成
  const appContainer = document.createElement('div');
  appContainer.id = 'md3-app-container';
  document.body.appendChild(appContainer);

  // 4. パンくずリストデータの作成
  const path = decodeURIComponent(window.location.pathname);
  const origin = 'file://';
  const pathSegments = path.split('/').filter(p => p !== '');
  
  const isWindows = /^[a-zA-Z]:/.test(pathSegments[0] || '');
  
  let currentPath = isWindows ? '' : '/';
  const breadcrumbs = [];
  
  if (isWindows) {
    currentPath = pathSegments[0] + '/';
    breadcrumbs.push({
      name: pathSegments[0],
      url: origin + '/' + currentPath
    });
  } else {
    breadcrumbs.push({
      name: 'Root',
      url: origin + '/'
    });
  }

  for (let i = (isWindows ? 1 : 0); i < pathSegments.length; i++) {
    const segment = pathSegments[i];
    currentPath += segment + '/';
    
    const isLast = i === pathSegments.length - 1;
    breadcrumbs.push({
      name: segment,
      url: origin + (isWindows ? '/' : '') + currentPath.slice(0, -1),
      isLast: isLast
    });
  }

  // 5. HTMLへのレンダリング
  let renderedHTML = '';
  try {
    renderedHTML = marked.parse(rawMarkdown);
  } catch (e) {
    console.error('Failed to parse markdown with marked:', e);
    renderedHTML = `<div class="error-container"><h3>Markdownのパースに失敗しました</h3><p>${e.message}</p></div>`;
  }

  // 6. 目次（TOC）データの抽出とツリー構築
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = renderedHTML;
  
  const headings = tempDiv.querySelectorAll('h1, h2, h3');
  
  headings.forEach((heading, index) => {
    let id = heading.getAttribute('id');
    if (!id) {
      id = heading.textContent
        .trim()
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5\u3040-\u309f\u30a0-\u30ff]+/g, '-')
        .replace(/(^-|-$)/g, '');
      
      if (!id) {
        id = `heading-${index}`;
      }
      heading.setAttribute('id', id);
    }
  });

  // ツリー構造を構築する関数
  function buildTocTree(headingNodes) {
    const root = { children: [] };
    const stack = [{ level: 0, node: root }];

    headingNodes.forEach((heading) => {
      const level = parseInt(heading.tagName.substring(1)); // 1 for h1, 2 for h2, 3 for h3
      const id = heading.getAttribute('id');
      const text = heading.textContent.trim();
      
      const node = {
        id: id,
        text: text,
        level: level,
        children: []
      };

      while (stack.length > 1 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      stack[stack.length - 1].node.children.push(node);
      stack.push({ level: level, node: node });
    });

    return root.children;
  }

  // ツリー構造をHTMLにレンダリングする再帰関数
  function renderTocHtml(treeItems) {
    if (!treeItems || treeItems.length === 0) return '';
    return `
      <ul class="toc-list">
        ${treeItems.map(node => {
          const hasChildren = node.children && node.children.length > 0;
          const toggleButton = hasChildren 
            ? `<button class="toc-toggle-btn" aria-label="Toggle section"><span class="material-symbols-outlined">expand_more</span></button>` 
            : `<span class="toc-item-spacer"></span>`;
          
          return `
            <li class="toc-item-wrapper toc-h${node.level}" data-has-children="${hasChildren}">
              <div class="toc-item-row">
                ${toggleButton}
                <a href="#${node.id}" class="toc-item" data-id="${node.id}">
                  <span class="toc-item-text">${node.text}</span>
                </a>
              </div>
              ${hasChildren ? renderTocHtml(node.children) : ''}
            </li>
          `;
        }).join('')}
      </ul>
    `;
  }

  const tocTree = buildTocTree(headings);
  renderedHTML = tempDiv.innerHTML;

  // 7. UI構造の構築
  appContainer.innerHTML = `
    <!-- Top App Bar -->
    <header class="top-app-bar">
      <div class="top-app-bar-start">
        <button id="btn-toggle-sidebar" class="icon-button" title="Toggle Sidebar">
          <span class="material-symbols-outlined">menu</span>
        </button>
        <div class="breadcrumbs-container">
          ${breadcrumbs.map((b, idx) => {
            if (b.isLast) {
              return `<span class="breadcrumb-item active" title="${b.name}">${b.name}</span>`;
            } else {
              return `
                <a href="${b.url}" class="breadcrumb-item-link" title="${b.name}">${b.name}</a>
                <span class="breadcrumb-separator">/</span>
              `;
            }
          }).join('')}
        </div>
      </div>
      <div class="top-app-bar-end">
        <!-- Segmented Buttons (Mode Toggle) -->
        <div class="segmented-button-container">
          <button id="btn-preview" class="segmented-button active" aria-selected="true">
            <span class="material-symbols-outlined">visibility</span>
            <span>Preview</span>
          </button>
          <button id="btn-plain" class="segmented-button" aria-selected="false">
            <span class="material-symbols-outlined">code</span>
            <span>Plain</span>
          </button>
        </div>
        
        <!-- Copy Button -->
        <button id="btn-copy-raw" class="icon-button" title="Copy raw markdown">
          <span class="material-symbols-outlined">content_copy</span>
        </button>
      </div>
    </header>

    <!-- Main Workspace -->
    <div class="workspace-container">
      <!-- Left Sidebar (TOC) -->
      <aside class="toc-sidebar">
        <div class="toc-header">
          <span class="material-symbols-outlined">list</span>
          <h3>目次</h3>
        </div>
        <nav class="toc-navigation">
          ${tocTree.length === 0 
            ? '<div class="toc-empty">見出しがありません</div>' 
            : `
              <div class="toc-indicator"></div>
              ${renderTocHtml(tocTree)}
            `
          }
        </nav>
      </aside>

      <!-- Main Content Panel -->
      <main class="content-panel">
        <!-- Preview Mode View -->
        <div id="view-preview" class="view-panel markdown-body active">
          ${renderedHTML}
        </div>

        <!-- Plain Mode View -->
        <div id="view-plain" class="view-panel plain-body">
          <div class="plain-header">
            <span>raw_markdown.md</span>
            <button id="btn-copy-plain" class="text-button">
              <span class="material-symbols-outlined">content_copy</span>
              <span>Copy</span>
            </button>
          </div>
          <pre class="plain-code-container"><code class="plain-code">${escapeHtml(rawMarkdown)}</code></pre>
        </div>
      </main>
    </div>

    <!-- Snackbar (Toast) -->
    <div id="snackbar" class="snackbar">
      <span class="snackbar-text">Copied!</span>
    </div>
  `;

  // Material Symbols Outlined の動的ロード
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200';
  document.head.appendChild(link);

  // フォントファミリー（Inter / JetBrains Mono）の読み込み
  const fontLink = document.createElement('link');
  fontLink.rel = 'stylesheet';
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap';
  document.head.appendChild(fontLink);

  // 8. イベントとインタラクションの実装
  const btnPreview = document.getElementById('btn-preview');
  const btnPlain = document.getElementById('btn-plain');
  const viewPreview = document.getElementById('view-preview');
  const viewPlain = document.getElementById('view-plain');
  
  const btnCopyRaw = document.getElementById('btn-copy-raw');
  const btnCopyPlain = document.getElementById('btn-copy-plain');
  const snackbar = document.getElementById('snackbar');

  // 表示切り替え
  function switchMode(mode) {
    if (mode === 'preview') {
      btnPreview.classList.add('active');
      btnPreview.setAttribute('aria-selected', 'true');
      btnPlain.classList.remove('active');
      btnPlain.setAttribute('aria-selected', 'false');
      
      viewPreview.classList.add('active');
      viewPlain.classList.remove('active');
      
      document.querySelector('.toc-sidebar').style.display = '';
      document.getElementById('btn-toggle-sidebar').style.display = '';
    } else {
      btnPlain.classList.add('active');
      btnPlain.setAttribute('aria-selected', 'true');
      btnPreview.classList.remove('active');
      btnPreview.setAttribute('aria-selected', 'false');
      
      viewPlain.classList.add('active');
      viewPreview.classList.remove('active');
      
      document.querySelector('.toc-sidebar').style.display = 'none';
      document.getElementById('btn-toggle-sidebar').style.display = 'none';
    }
  }

  // サイドバーの開閉制御
  const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
  const tocSidebar = document.querySelector('.toc-sidebar');
  const contentPanel = document.querySelector('.content-panel');
  const tocHeader = document.querySelector('.toc-header');

  function toggleSidebar() {
    tocSidebar.classList.toggle('collapsed-sidebar');
    contentPanel.classList.toggle('full-width');
    
    const icon = btnToggleSidebar.querySelector('.material-symbols-outlined');
    if (tocSidebar.classList.contains('collapsed-sidebar')) {
      icon.textContent = 'menu_open';
    } else {
      icon.textContent = 'menu';
    }
    
    // スライド完了後（300ms）にインジケーター位置を再計算
    setTimeout(updateTocSpy, 350);
  }

  if (btnToggleSidebar) {
    btnToggleSidebar.addEventListener('click', toggleSidebar);
  }
  if (tocHeader) {
    tocHeader.style.cursor = 'pointer';
    tocHeader.title = '目次を閉じる';
    tocHeader.addEventListener('click', toggleSidebar);
  }

  btnPreview.addEventListener('click', () => switchMode('preview'));
  btnPlain.addEventListener('click', () => switchMode('plain'));

  // コピー処理
  function copyText(text) {
    navigator.clipboard.writeText(text).then(() => {
      showSnackbar();
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }

  function showSnackbar() {
    snackbar.classList.add('show');
    setTimeout(() => {
      snackbar.classList.remove('show');
    }, 2500);
  }

  btnCopyRaw.addEventListener('click', () => copyText(rawMarkdown));
  if (btnCopyPlain) {
    btnCopyPlain.addEventListener('click', () => copyText(rawMarkdown));
  }

  // コードブロック内のコピーボタン追加
  const codeBlocks = viewPreview.querySelectorAll('pre');
  codeBlocks.forEach((block) => {
    block.style.position = 'relative';
    const copyBtn = document.createElement('button');
    copyBtn.className = 'code-copy-button';
    copyBtn.innerHTML = '<span class="material-symbols-outlined">content_copy</span>';
    copyBtn.title = 'Copy code';
    
    const code = block.querySelector('code');
    const textToCopy = code ? code.textContent : block.textContent;
    
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(textToCopy).then(() => {
        copyBtn.innerHTML = '<span class="material-symbols-outlined">check</span>';
        copyBtn.classList.add('copied');
        setTimeout(() => {
          copyBtn.innerHTML = '<span class="material-symbols-outlined">content_copy</span>';
          copyBtn.classList.remove('copied');
        }, 2000);
      });
    });
    
    block.appendChild(copyBtn);
  });

  // 9. 目次のスクロールスパイ & スムーズスクロール
  const tocLinks = document.querySelectorAll('.toc-item');
  const tocIndicator = document.querySelector('.toc-indicator');
  const headingElements = Array.from(headings).map(h => document.getElementById(h.getAttribute('id')));

  tocLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('data-id');
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.pushState(null, null, `#${targetId}`);
      }
    });
  });

  let activeLink = null;

  function updateTocSpy() {
    const scrollPosition = window.scrollY + 100;

    let currentHeading = null;
    for (let i = 0; i < headingElements.length; i++) {
      const heading = headingElements[i];
      if (!heading) continue;
      
      const top = heading.offsetTop;
      if (scrollPosition >= top) {
        currentHeading = heading;
      } else {
        break;
      }
    }

    if (!currentHeading && headingElements.length > 0) {
      currentHeading = headingElements[0];
    }

    if (currentHeading) {
      const id = currentHeading.getAttribute('id');
      const matchingLink = document.querySelector(`.toc-item[data-id="${id}"]`);
      
      if (matchingLink && activeLink !== matchingLink) {
        if (activeLink) activeLink.classList.remove('active');
        matchingLink.classList.add('active');
        activeLink = matchingLink;

        // 自動展開処理：親の collapsed を解除
        let parentWrapper = matchingLink.closest('.toc-item-wrapper');
        while (parentWrapper) {
          const grandparentWrapper = parentWrapper.parentElement.closest('.toc-item-wrapper');
          if (grandparentWrapper && grandparentWrapper.classList.contains('collapsed')) {
            grandparentWrapper.classList.remove('collapsed');
          }
          parentWrapper = grandparentWrapper;
        }

        if (tocIndicator) {
          const navEl = document.querySelector('.toc-navigation');
          const navRect = navEl.getBoundingClientRect();
          const linkRect = matchingLink.getBoundingClientRect();
          
          // ビューポートに対する相対位置の差分から正確な offsetTop を算出
          const offsetTop = linkRect.top - navRect.top;
          
          tocIndicator.style.height = `${linkRect.height}px`;
          tocIndicator.style.transform = `translateY(${offsetTop}px)`;
          tocIndicator.style.opacity = '1';
        }
      }
    } else {
      if (activeLink) activeLink.classList.remove('active');
      activeLink = null;
      if (tocIndicator) tocIndicator.style.opacity = '0';
    }
  }

  // 目次の折りたたみ/展開のインタラクション
  const toggleButtons = document.querySelectorAll('.toc-toggle-btn');
  toggleButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // リンククリックなどの親イベントへの伝播を防ぐ
      const wrapper = btn.closest('.toc-item-wrapper');
      if (wrapper) {
        wrapper.classList.toggle('collapsed');
        // 折りたたまれて目次の高さが変わるため、アクティブインジケーター位置を再計算
        setTimeout(updateTocSpy, 50);
      }
    });
  });

  if (tocLinks.length > 0) {
    window.addEventListener('scroll', updateTocSpy);
    setTimeout(updateTocSpy, 100);
  }

  function escapeHtml(string) {
    return String(string)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

})();
