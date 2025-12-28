import { defineContentScript } from 'wxt/sandbox';
import { createShadowRootUi } from 'wxt/client';
import ReactDOM from 'react-dom/client';
import ScheduleExporter from './ScheduleExporter';
import '@/assets/style.css';

export default defineContentScript({
    matches: [
        "*://202.119.225.134/xskbcx.aspx*",
        "*://jwxt.njupt.edu.cn/xskbcx.aspx*"
    ],
    cssInjectionMode: "ui",
    async main(ctx) {
        const ui = await createShadowRootUi(ctx, {
            name: 'njupt-schedule',
            position: 'overlay',
            zIndex: 99999,
            onMount: (container) => {
                const root = ReactDOM.createRoot(container);
                root.render(<ScheduleExporter />);
                return root;
            },
            onRemove: (root) => {
                root?.unmount();
            },
        });
        ui.mount();
    }
});
