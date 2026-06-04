import '../../src/styles/app.css';
import ReactDOM from 'react-dom/client';
import { EvalPanelApp } from '../../src/content/EvalPanelApp';

async function waitForBody(): Promise<void> {
  if (document.body) return;

  await new Promise<void>((resolve) => {
    const observer = new MutationObserver(() => {
      if (document.body) {
        observer.disconnect();
        resolve();
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  });
}

export default defineContentScript({
  matches: [
    'http://jwxt.njupt.edu.cn/*',
    'http://202.119.225.134/*',
  ],
  runAt: 'document_start',
  cssInjectionMode: 'ui',
  async main(ctx) {
    // Suppress ASP.NET alerts/confirms that pop up after save/submit.
    // Running at document_start ensures this is in place before page scripts.
    const originalAlert = window.alert;
    const originalConfirm = window.confirm;
    window.alert = () => true;
    window.confirm = () => true;
    // Also patch unsafeWindow if present (Tampermonkey-style injection)
    try { (window as any).unsafeWindow && ((window as any).unsafeWindow.alert = window.alert, (window as any).unsafeWindow.confirm = window.confirm); } catch {}

    await waitForBody();

    const ui = await createShadowRootUi(ctx, {
      name: 'njupt-eval-panel',
      position: 'inline',
      anchor: 'body',
      onMount: (container) => {
        const mountNode = document.createElement('div');
        mountNode.id = 'njupt-eval-panel-root';
        container.append(mountNode);

        const root = ReactDOM.createRoot(mountNode);
        root.render(<EvalPanelApp />);
        return root;
      },
      onRemove: (root) => {
        root?.unmount();
      },
    });

    ui.mount();

    // Fix: WXT's shadow host and parent wrapper block page clicks.
    // Set pointer-events: none on all WXT-injected host elements,
    // re-enable only on the visible panel via Tailwind pointer-events-auto.
    (ui.shadowHost as HTMLElement).style.pointerEvents = 'none';
    (ui.uiContainer as HTMLElement).style.pointerEvents = 'none';
    // The shadowHost's parent is the WXT position wrapper
    const wrapper = (ui.shadowHost as HTMLElement).parentElement;
    if (wrapper && wrapper !== document.body) {
      wrapper.style.pointerEvents = 'none';
    }

    ctx.onInvalidated(() => {
      ui.remove();
    });
  },
});
