import { defineContentScript } from 'wxt/sandbox';
import { createShadowRootUi } from 'wxt/client';
import ReactDOM from 'react-dom/client';
import Evaluator from './Evaluator';
import '@/assets/style.css';

export default defineContentScript({
    matches: [
        "*://202.119.225.134/xsjxpj.aspx*",
        "*://jwxt.njupt.edu.cn/xsjxpj.aspx*"
    ],
    cssInjectionMode: "ui",
    async main(ctx) {
        const ui = await createShadowRootUi(ctx, {
            name: 'njupt-evaluator',
            position: 'overlay',
            zIndex: 99999,
            onMount: (container) => {
                const root = ReactDOM.createRoot(container);
                root.render(<Evaluator />);
                return root;
            },
            onRemove: (root) => {
                root?.unmount();
            },
        });
        ui.mount();
    }
});
