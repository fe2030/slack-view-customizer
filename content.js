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
  const CLASS_TOP = 'slack-vc--top-collapsed';
  const CLASS_BOTTOM = 'slack-vc--bottom-collapsed';
  const BTN_TOP_ID = 'slack-vc-toggle-btn-top';
  const BTN_BOTTOM_ID = 'slack-vc-toggle-btn-bottom';

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
      // When collapsed, show down-arrow (to expand); when expanded, show up-arrow (to collapse)
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
      // When collapsed, show up-arrow (to expand upward); when expanded, show down-arrow (to collapse downward)
      btn.innerHTML = collapsed ? ICON_UP : ICON_DOWN;
      const label = collapsed ? '入力エリアを表示' : '入力エリアを非表示';
      btn.setAttribute('data-tooltip', label);
      btn.setAttribute('aria-label', label);
    }
  }

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

  // --- Initialization ---

  async function init() {
    // Prevent duplicate injection
    if (document.getElementById(BTN_TOP_ID)) return;

    const [topCollapsed, bottomCollapsed] = await Promise.all([
      getStoredState(STORAGE_KEY_TOP),
      getStoredState(STORAGE_KEY_BOTTOM),
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

        // Create and inject both buttons
        const topBtn = createTopButton(topCollapsed);
        const bottomBtn = createBottomButton(bottomCollapsed);
        document.body.appendChild(topBtn);
        document.body.appendChild(bottomBtn);

        // Apply initial states
        applyTopState(topCollapsed, topBtn);
        applyBottomState(bottomCollapsed, bottomBtn);

        if (!container && elapsed >= maxWait) {
          console.warn('[Slack VC] Timed out waiting for Slack UI. Buttons injected anyway.');
        }
      }
    }, interval);
  }

  // --- Keyboard shortcuts ---
  // Alt+Shift+H  = toggle top
  // Alt+Shift+J  = toggle bottom
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
