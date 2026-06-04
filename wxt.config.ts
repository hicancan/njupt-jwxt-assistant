import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'NJUPT 教务助手',
    description: '南邮教务系统自动评教助手 — 一键完成满意度调查与教学评价',
    permissions: ['storage'],
    host_permissions: [
      'http://jwxt.njupt.edu.cn/*',
      'http://202.119.225.134/*',
    ],
  },
  vite: () => ({
    plugins: [tailwindcss()],
  }),
});
