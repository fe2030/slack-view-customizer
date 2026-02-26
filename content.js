/**
 * Slack View Customizer - Content Script
 *
 * Adds two toggle buttons:
 *   1. TOP: collapse/expand the top navigation bar + channel header
 *   2. BOTTOM: collapse/expand the message input area + context bar
 *
 * Maximizes the message reading area in Slack.
 */

(function () {
  'use strict';

  // --- Constants ---
  const STORAGE_KEY_TOP = 'slack-vc-top-collapsed';
  const STORAGE_KEY_BOTTOM = 'slack-vc-bottom-collapsed';
  const STORAGE_KEY_LEFT = 'slack-vc-left-collapsed';
  const CLASS_TOP = 'slack-vc--top-collapsed';
  const CLASS_BOTTOM = 'slack-vc--bottom-collapsed';
  const CLASS_LEFT = 'slack-vc--left-collapsed';
  const BTN_TOP_ID = 'slack-vc-toggle-btn-top';
  const BTN_BOTTOM_ID = 'slack-vc-toggle-btn-bottom';
  const BTN_LEFT_ID = 'slack-vc-toggle-btn-left';

  // --- SVG Icons ---
  const ICON_UP = `
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 10L8 5L13 10" stroke="currentColor" stroke-width="1.8"
            stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  const ICON_DOWN = `
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 6L8 11L13 6" stroke="currentColor" stroke-width="1.8"
            stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  const ICON_LEFT = `
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 3L5 8L10 13" stroke="currentColor" stroke-width="1.8"
            stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  const ICON_RIGHT = `
    <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 3L11 8L6 13" stroke="currentColor" stroke-width="1.8"
            stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

  // --- Storage helpers ---
  function getStoredState(key) {
    return new Promise((resolve) => {
      try {
        chrome.storage.local.get([key], (result) => {
          if (chrome.runtime.lastError) {
            console.warn('[Slack VC] storage read error:', chrome.runtime.lastError);
            resolve(false);
            return;
          }
          resolve(result[key] === true);
        });
      } catch (_e) {
        resolve(localStorage.getItem(key) === 'true');
      }
    });
  }

  function setStoredState(key, value) {
    try {
      chrome.storage.local.set({ [key]: value }, () => {
        if (chrome.runtime.lastError) {
          console.warn('[Slack VC] storage write error:', chrome.runtime.lastError);
        }
      });
    } catch (_e) {
      localStorage.setItem(key, String(value));
    }
  }

  // --- State application ---

  /**
   * Apply top collapse state.
   */
  function applyTopState(collapsed, btn) {
    document.body.classList.toggle(CLASS_TOP, collapsed);
    if (btn) {
      // When top is collapsed, show down-arrow (to expand); when expanded, show up-arrow (to collapse)
      btn.innerHTML = collapsed ? ICON_DOWN : ICON_UP;
      const label = collapsed ? 'ヘッダーを表示' : 'ヘッダーを非表示';
      btn.setAttribute('data-tooltip', label);
      btn.setAttribute('aria-label', label);
    }
  }

  /**
   * Apply bottom collapse state.
   */
  function applyBottomState(collapsed, btn) {
    document.body.classList.toggle(CLASS_BOTTOM, collapsed);
    if (btn) {
      // When bottom is collapsed, show up-arrow (to expand); when expanded, show down-arrow (to collapse)
      btn.innerHTML = collapsed ? ICON_UP : ICON_DOWN;
      const label = collapsed ? '入力エリアを表示' : '入力エリアを非表示';
      btn.setAttribute('data-tooltip', label);
      btn.setAttribute('aria-label', label);
    }
  }

  /**
   * Apply left collapse state.
   * Uses CSS class toggle - the actual hiding is done via CSS overrides
   * on .p-ia4_client (--p-ia4_sidebar_width: 0px).
   */
  function applyLeftState(collapsed, btn) {
    document.body.classList.toggle(CLASS_LEFT, collapsed);

    if (btn) {
      btn.innerHTML = collapsed ? ICON_RIGHT : ICON_LEFT;
      const label = collapsed ? 'サイドバーを表示' : 'サイドバーを非表示';
      btn.setAttribute('data-tooltip', label);
      btn.setAttribute('aria-label', label);

      btn.style.top = '50%';
      btn.style.transform = 'translateY(-50%)';
    }
  }

  // --- Left Button Positioning Interval ---
  let lastLeftPos = '';
  setInterval(() => {
    const btn = document.getElementById(BTN_LEFT_ID);
    if (!btn) return;

    const collapsed = document.body.classList.contains(CLASS_LEFT);
    let targetLeft = 0;

    if (!collapsed) {
      const resizer = document.querySelector('.p-ia4_client__resizer--sidebar');
      const sidebar = document.querySelector('.p-view_contents--sidebar') || document.querySelector('.p-ia4_client__sidebar');
      if (resizer && resizer.getBoundingClientRect().left > 0) {
        targetLeft = resizer.getBoundingClientRect().left + 4 - 14;
      } else if (sidebar) {
        targetLeft = sidebar.getBoundingClientRect().right - 14;
      }
    } else {
      const tabRail = document.querySelector('.p-tab_rail') || document.querySelector('.p-ia4_tab_rail');
      if (tabRail) {
        targetLeft = tabRail.getBoundingClientRect().right - 14;
      }
    }

    if (targetLeft > 0) {
      const newPos = targetLeft + 'px';
      if (newPos !== lastLeftPos) {
        btn.style.left = newPos;
        lastLeftPos = newPos;
      }
    }
  }, 100);

  // --- Button creation ---

  function createTopButton(initialCollapsed) {
    const btn = document.createElement('button');
    btn.id = BTN_TOP_ID;
    btn.className = 'slack-vc-toggle-btn slack-vc-toggle-btn--top';
    btn.type = 'button';
    applyTopState(initialCollapsed, btn);

    btn.addEventListener('click', () => {
      const nowCollapsed = document.body.classList.contains(CLASS_TOP);
      const newState = !nowCollapsed;
      applyTopState(newState, btn);
      setStoredState(STORAGE_KEY_TOP, newState);
    });

    return btn;
  }

  function createBottomButton(initialCollapsed) {
    const btn = document.createElement('button');
    btn.id = BTN_BOTTOM_ID;
    btn.className = 'slack-vc-toggle-btn slack-vc-toggle-btn--bottom';
    btn.type = 'button';
    applyBottomState(initialCollapsed, btn);

    btn.addEventListener('click', () => {
      const nowCollapsed = document.body.classList.contains(CLASS_BOTTOM);
      const newState = !nowCollapsed;
      applyBottomState(newState, btn);
      setStoredState(STORAGE_KEY_BOTTOM, newState);
    });

    return btn;
  }

  function createLeftButton(initialCollapsed) {
    const btn = document.createElement('button');
    btn.id = BTN_LEFT_ID;
    btn.className = 'slack-vc-toggle-btn slack-vc-toggle-btn--left';
    btn.type = 'button';
    applyLeftState(initialCollapsed, btn);

    btn.addEventListener('click', () => {
      const nowCollapsed = document.body.classList.contains(CLASS_LEFT);
      const newState = !nowCollapsed;
      applyLeftState(newState, btn);
      setStoredState(STORAGE_KEY_LEFT, newState);
    });

    return btn;
  }

  // --- Initialization ---

  async function init() {
    // Prevent duplicate injection
    if (document.getElementById(BTN_TOP_ID)) return;

    const [topCollapsed, bottomCollapsed, leftCollapsed] = await Promise.all([
      getStoredState(STORAGE_KEY_TOP),
      getStoredState(STORAGE_KEY_BOTTOM),
      getStoredState(STORAGE_KEY_LEFT),
    ]);

    // Wait for Slack's main container to appear
    const maxWait = 15000;
    const interval = 300;
    let elapsed = 0;

    const waitForSlack = setInterval(() => {
      elapsed += interval;
      const container =
        document.querySelector('.p-ia4_top_nav') ||
        document.querySelector('.p-client_container');

      if (container || elapsed >= maxWait) {
        clearInterval(waitForSlack);

        // Create and inject buttons
        const topBtn = createTopButton(topCollapsed);
        const bottomBtn = createBottomButton(bottomCollapsed);
        const leftBtn = createLeftButton(leftCollapsed);
        document.body.appendChild(topBtn);
        document.body.appendChild(bottomBtn);
        document.body.appendChild(leftBtn);

        // Apply initial states
        applyTopState(topCollapsed, topBtn);
        applyBottomState(bottomCollapsed, bottomBtn);
        applyLeftState(leftCollapsed, leftBtn);


        if (!container && elapsed >= maxWait) {
          console.warn('[Slack VC] Timed out waiting for Slack UI. Buttons injected anyway.');
        }
      }
    }, interval);
  }

  // --- Keyboard shortcuts ---
  // Alt+Shift+H  = toggle top
  // Alt+Shift+J  = toggle bottom
  // Alt+Shift+L  = toggle left sidebar
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.shiftKey) {
      if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        const btn = document.getElementById(BTN_TOP_ID);
        if (btn) btn.click();
      } else if (e.key.toLowerCase() === 'j') {
        e.preventDefault();
        const btn = document.getElementById(BTN_BOTTOM_ID);
        if (btn) btn.click();
      } else if (e.key.toLowerCase() === 'l') {
        e.preventDefault();
        const btn = document.getElementById(BTN_LEFT_ID);
        if (btn) btn.click();
      }
    }
  });

  // Run
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
