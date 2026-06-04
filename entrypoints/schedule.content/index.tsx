import '../../src/styles/app.css';
import ReactDOM from 'react-dom/client';
import { ScheduleExporter } from '../../src/schedule/ScheduleExporter';

async function waitForBody(): Promise<void> {
  if (document.body) return;
  await new Promise<void>((resolve) => {
    const o = new MutationObserver(() => { if (document.body) { o.disconnect(); resolve(); } });
    o.observe(document.documentElement, { childList: true, subtree: true });
  });
}

export default defineContentScript({
  matches: [
    'http://jwxt.njupt.edu.cn/xskbcx.aspx*',
    'http://202.119.225.134/xskbcx.aspx*',
  ],
  runAt: 'document_start',
  cssInjectionMode: 'ui',
  async main(ctx) {
    await waitForBody();
    const ui = await createShadowRootUi(ctx, {
      name: 'njupt-schedule-btn',
      position: 'inline',
      anchor: 'body',
      onMount: (container) => {
        const node = document.createElement('div');
        container.append(node);
        const root = ReactDOM.createRoot(node);
        root.render(<ScheduleExporter />);
        return root;
      },
      onRemove: (root) => {
        root?.unmount();
      },
    });
    ui.mount();
    (ui.shadowHost as HTMLElement).style.pointerEvents = 'none';
    (ui.uiContainer as HTMLElement).style.pointerEvents = 'none';
    ctx.onInvalidated(() => ui.remove());
  },
});
