import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    manifest: {
        name: '南邮教务助手',
        description: '南邮教务系统增强：自动评教、课表导出 (WXT + React)',
        version: '1.0.0',
        host_permissions: [
            '*://jwxt.njupt.edu.cn/*',
            '*://202.119.225.134/*'
        ],
        permissions: ['storage']
    },
    modules: ['@wxt-dev/module-react'],
    runner: {
        startUrls: ['https://jwxt.njupt.edu.cn/xs_main.aspx']
    },
    vite: () => ({
        plugins: [tailwindcss()],
    }),
});
