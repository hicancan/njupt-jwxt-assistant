# 南邮教务助手

`njupt-jwxt` 是面向南京邮电大学当前教务系统的 Chrome / Edge 扩展。它在你已经
登录教务系统后，受控读取班级课表 JSON，保存采集进度，并导出可校验的全校课表
数据包。

它只做课表采集：不读取密码和 Cookie，不自动评教，不修改教务数据，也不把原始
响应上传到第三方。

## 使用

1. 在 Chrome 或 Edge 中登录 `http://jwglxt.njupt.edu.cn/`。
2. 打开“班级课表查询”。
3. 在右下角的“南邮教务助手”中点击“开始采集”。
4. 采集完成后下载 `TeachingScheduleSource` ZIP。

任务会逐条写入扩展自己的 IndexedDB。页面关闭或浏览器重启后，再次打开班级课表
页即可继续。登录失效、网络错误和空课表都会形成明确状态，不会静默跳过。

## 数据边界

导出包包含课表目录、学期日期、节次时间和规范化的班级课表响应。账号信息、分页
状态、Cookie、Token、密码、电话以及私有在线会议链接不会写入导出包。

`njupt-jwxt` 只支持当前系统：

- 主机：`jwglxt.njupt.edu.cn`
- 全校目录：`bjkbdy_cxBjkbdyTjkbList.html`
- 班级课表：`bjkbdy_cxBjKb.html`
- 学期内部代码由页面当前选择读取，不做日期猜测。

## 开发

```powershell
npm ci
npm run prepare:wxt
npm run typecheck
npm test
npm run build
npm run zip
```

开发构建位于 `.output/chrome-mv3/`。在浏览器扩展管理页开启开发者模式后，选择
“加载已解压的扩展程序”。

## 架构

```text
当前教务系统 JSON
  -> 严格解码与公开字段规范化
  -> 限速、重试、暂停与断点恢复
  -> 扩展 IndexedDB
  -> njupt-teaching-schedule-source
```

导出格式使用确定性 canonical JSON。`source_id` 只由规范化内容决定；采集时间、
目录顺序和教务页面分页状态不会改变内容身份。

## 许可协议

ISC © 2025–2026
