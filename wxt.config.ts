import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '南邮教务助手',
    description: '从南邮教务系统安全采集并导出全校班级课表',
    permissions: ['storage', 'downloads'],
    host_permissions: ['http://jwglxt.njupt.edu.cn/*'],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
