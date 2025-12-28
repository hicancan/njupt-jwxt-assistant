import { useCallback } from "react"
import type { Config, Credentials } from "@/utils/hooks"
import { useConfig, useCredentials, DEFAULT_CONFIG, DEFAULT_CREDENTIALS } from "@/utils/hooks"
import { User, MessageSquare, Calendar, CheckCircle } from "lucide-react"

function Options() {
    const [creds, setCreds] = useCredentials()
    const [config, setConfig] = useConfig()

    const updateCreds = useCallback((updates: Partial<Credentials>) => {
        setCreds({ ...(creds || DEFAULT_CREDENTIALS), ...updates })
    }, [creds, setCreds])

    const updateConfig = useCallback((updates: Partial<Config>) => {
        setConfig({ ...(config || DEFAULT_CONFIG), ...updates })
    }, [config, setConfig])

    return (
        <div className="min-h-screen bg-background flex items-center justify-center py-10 px-4">
            <div className="w-full max-w-2xl bg-card rounded-xl shadow-lg border border-border overflow-hidden">
                <div className="bg-primary text-primary-foreground p-6">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <span className="text-primary-foreground/80">南邮</span>教务助手设置
                    </h1>
                    <p className="text-primary-foreground/60 mt-1">Config & Parameters</p>
                </div>

                <div className="p-6 space-y-8">
                    <section>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-foreground">
                            <User className="h-5 w-5 text-primary" />
                            账号设置
                        </h3>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">学号</label>
                                <input
                                    type="text"
                                    className="w-full p-2 border border-input rounded-md focus:ring-2 focus:ring-ring outline-none bg-background text-foreground"
                                    value={creds?.username || ""}
                                    onChange={e => updateCreds({ username: e.target.value })}
                                    placeholder="Bxxxxxxx"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">密码 (可选)</label>
                                <input
                                    type="password"
                                    className="w-full p-2 border border-input rounded-md focus:ring-2 focus:ring-ring outline-none bg-background text-foreground"
                                    value={creds?.password || ""}
                                    onChange={e => updateCreds({ password: e.target.value })}
                                    placeholder="用于自动登录"
                                />
                            </div>
                        </div>
                    </section>

                    <hr className="border-border" />

                    <section>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-foreground">
                            <MessageSquare className="h-5 w-5 text-primary" />
                            评教设置
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">评教语</label>
                                <textarea
                                    className="w-full p-2 border border-input rounded-md focus:ring-2 focus:ring-ring outline-none h-20 bg-background text-foreground"
                                    value={config?.comment || ""}
                                    onChange={e => updateConfig({ comment: e.target.value })}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="autoSubmit"
                                    checked={config?.autoSubmit || false}
                                    onChange={e => updateConfig({ autoSubmit: e.target.checked })}
                                    className="h-4 w-4 text-primary rounded"
                                />
                                <label htmlFor="autoSubmit" className="text-sm text-foreground">评教完成后自动提交</label>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">操作延迟 (ms)</label>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="range"
                                        min="200" max="2000" step="100"
                                        value={config?.delay || 500}
                                        onChange={e => updateConfig({ delay: parseInt(e.target.value, 10) })}
                                        className="flex-1"
                                    />
                                    <span className="w-12 text-center font-mono text-foreground">{config?.delay || 500}</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <hr className="border-border" />

                    <section>
                        <h3 className="text-lg font-semibold flex items-center gap-2 mb-4 text-foreground">
                            <Calendar className="h-5 w-5 text-primary" />
                            课表设置
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">学期开始日期</label>
                                <input
                                    type="date"
                                    className="w-full p-2 border border-input rounded-md focus:ring-2 focus:ring-ring outline-none bg-background text-foreground"
                                    value={config?.startDate || ""}
                                    onChange={e => updateConfig({ startDate: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">用于生成 ICS 日历时计算周次</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-foreground">课程时间表 (JSON)</label>
                                <textarea
                                    className="w-full p-2 border border-input rounded-md focus:ring-2 focus:ring-ring outline-none h-24 font-mono text-xs bg-background text-foreground"
                                    value={config?.timeJson || ""}
                                    onChange={e => updateConfig({ timeJson: e.target.value })}
                                    placeholder='{"1": {"s":"0800", "e":"0845"}, ...}'
                                />
                            </div>
                        </div>
                    </section>

                    <div className="pt-4 flex items-center justify-end gap-2 text-sm text-muted-foreground">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        <span>设置自动保存 (WXT Storage)</span>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Options
