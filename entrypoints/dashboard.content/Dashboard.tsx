import { useCallback, useState } from "react"
import Draggable from "react-draggable"
import { useCredentials } from "@/utils/hooks"
import { GraduationCap, Minimize2, X, ClipboardList, Calendar, Settings, ExternalLink } from "lucide-react"

type PageType = 'eval' | 'satis' | 'schedule'

const PAGE_URLS: Record<PageType, (username: string) => string> = {
    eval: (username) => `xsjxpj.aspx?xh=${username}&gnmkdm=N12141`,
    satis: (username) => `xs_jsmydpj.aspx?xh=${username}&gnmkdm=N121801`,
    schedule: (username) => `xskbcx.aspx?xh=${username}&gnmkdm=N121603`,
}

const Dashboard = () => {
    const [creds] = useCredentials()
    const [minimized, setMinimized] = useState(false)
    const [visible, setVisible] = useState(true)

    const username = creds?.username

    const handleOpen = useCallback((type: PageType): void => {
        if (!username) {
            chrome.runtime.openOptionsPage()
            return
        }
        window.open(PAGE_URLS[type](username), '_blank')
    }, [username])

    const handleMinimize = useCallback((): void => {
        setMinimized(true)
    }, [])

    const handleExpand = useCallback((): void => {
        setMinimized(false)
    }, [])

    const handleClose = useCallback((): void => {
        setVisible(false)
    }, [])

    if (!visible) return null

    if (minimized) {
        return (
            <div
                className="fixed bottom-10 right-10 z-[99999] cursor-pointer bg-primary text-primary-foreground p-3 rounded-full shadow-lg hover:scale-110 transition-transform"
                onClick={handleExpand}
                title="展开助手"
            >
                <GraduationCap className="h-6 w-6" />
            </div>
        )
    }

    return (
        <Draggable handle=".handle">
            <div className="fixed bottom-20 right-20 z-[99999] w-80 bg-card text-card-foreground rounded-xl shadow-2xl border border-border flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5">
                <div className="handle flex justify-between items-center bg-muted/50 p-3 cursor-move select-none border-b border-border">
                    <div className="flex items-center gap-2 font-semibold">
                        <GraduationCap className="h-5 w-5 text-primary" />
                        <span>南邮教务助手</span>
                    </div>
                    <div className="flex gap-1">
                        <button
                            onClick={handleMinimize}
                            className="p-1 hover:bg-muted rounded-md transition-colors"
                            title="最小化"
                        >
                            <Minimize2 className="h-4 w-4" />
                        </button>
                        <button
                            onClick={handleClose}
                            className="p-1 hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors"
                            title="关闭"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                <div className="p-4 space-y-3">
                    {!username && (
                        <div className="bg-destructive/10 text-destructive text-xs p-2 rounded border border-destructive/20 mb-2">
                            未检测到学号，请先设置
                        </div>
                    )}

                    <button
                        onClick={() => handleOpen('satis')}
                        className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-emerald-100 text-emerald-600 p-2 rounded-md group-hover:bg-emerald-200 transition-colors">
                                <ClipboardList className="h-5 w-5" />
                            </div>
                            <span>教师满意度调查</span>
                        </div>
                        <ExternalLink className="h-4 w-4 opacity-50" />
                    </button>

                    <button
                        onClick={() => handleOpen('eval')}
                        className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-100 text-blue-600 p-2 rounded-md group-hover:bg-blue-200 transition-colors">
                                <Settings className="h-5 w-5" />
                            </div>
                            <span>一键评教</span>
                        </div>
                        <ExternalLink className="h-4 w-4 opacity-50" />
                    </button>

                    <button
                        onClick={() => handleOpen('schedule')}
                        className="w-full flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent hover:text-accent-foreground transition-all group"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-purple-100 text-purple-600 p-2 rounded-md group-hover:bg-purple-200 transition-colors">
                                <Calendar className="h-5 w-5" />
                            </div>
                            <span>查看课表</span>
                        </div>
                        <ExternalLink className="h-4 w-4 opacity-50" />
                    </button>
                </div>
            </div>
        </Draggable>
    )
}

export default Dashboard
