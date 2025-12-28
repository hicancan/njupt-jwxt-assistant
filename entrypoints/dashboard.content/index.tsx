import { defineContentScript } from 'wxt/sandbox';
import { createShadowRootUi } from 'wxt/client';
import ReactDOM from 'react-dom/client';
import Dashboard from './Dashboard';
import '@/assets/style.css';

export default defineContentScript({
    matches: [
        "*://202.119.225.134/xs_main.aspx*",
        "*://jwxt.njupt.edu.cn/xs_main.aspx*"
    ],
    cssInjectionMode: "ui",
    async main(ctx) {
        const ui = await createShadowRootUi(ctx, {
            name: 'njupt-dashboard',
            position: 'overlay',
            zIndex: 99999,
            onMount: (container) => {
                const root = ReactDOM.createRoot(container);
                root.render(<Dashboard />);
                return root;
            },
            onRemove: (root) => {
                root?.unmount();
            },
        });
        ui.mount();
    }
});
