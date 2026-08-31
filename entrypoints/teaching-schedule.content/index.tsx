import ReactDOM from 'react-dom/client';
import '../../src/styles/collector.css';
import { CollectorPanel } from '../../src/ui/CollectorPanel';

export default defineContentScript({
  matches: ['http://jwglxt.njupt.edu.cn/kbdy/bjkbdy_cxBjkbdyIndex.html*'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    const ui = await createShadowRootUi(ctx, {
      name: 'njupt-jwxt',
      position: 'inline',
      anchor: 'body',
      onMount(container) {
        const mount = document.createElement('div');
        container.append(mount);
        const root = ReactDOM.createRoot(mount);
        root.render(<CollectorPanel />);
        return root;
      },
      onRemove(root) {
        root?.unmount();
      },
    });
    ui.mount();
    ui.shadowHost.style.pointerEvents = 'none';
    ui.uiContainer.style.pointerEvents = 'none';
    const wrapper = ui.shadowHost.parentElement;
    if (wrapper && wrapper !== document.body) wrapper.style.pointerEvents = 'none';
    ctx.onInvalidated(() => ui.remove());
  },
});
