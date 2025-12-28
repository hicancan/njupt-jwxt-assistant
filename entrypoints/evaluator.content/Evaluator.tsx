import { useEffect, useState, useRef, useCallback } from "react"
import { useConfig } from "@/utils/hooks"
import { storage } from "wxt/storage"
import { Play, RotateCcw, Loader2 } from "lucide-react"

interface EvalState {
    isRunning: boolean
    currentIndex: number
}

const evalStateItem = storage.defineItem<EvalState>('local:evalState', {
    defaultValue: { isRunning: false, currentIndex: 0 }
});

const Evaluator = () => {
    const [evalState, setEvalState] = useState<EvalState>({ isRunning: false, currentIndex: 0 })
    const [config] = useConfig()
    const [status, setStatus] = useState("Ready")
    const [progress, setProgress] = useState(0)
    const [showConfirm, setShowConfirm] = useState<{ message: string; onConfirm: () => void } | null>(null)
    const isMountedRef = useRef(true)
    const configRef = useRef(config)

    useEffect(() => {
        evalStateItem.getValue().then(setEvalState);
        const unwatch = evalStateItem.watch(setEvalState);
        return () => unwatch();
    }, []);

    const updateEvalState = async (newState: EvalState) => {
        await evalStateItem.setValue(newState);
        setEvalState(newState);
    }

    useEffect(() => {
        isMountedRef.current = true
        return () => {
            isMountedRef.current = false
        }
    }, [])

    useEffect(() => {
        configRef.current = config
    }, [config])

    const processEvaluation = useCallback(async () => {
        if (!evalState.isRunning) return

        const pjkc = document.getElementById("pjkc") as HTMLSelectElement | null
        if (!pjkc) return

        const total = pjkc.options.length
        const idx = evalState.currentIndex

        if (isMountedRef.current) {
            setProgress((idx / total) * 100)
        }

        if (idx >= total) {
            if (isMountedRef.current) {
                setStatus("All Completed!")
                updateEvalState({ isRunning: false, currentIndex: idx })

                if (configRef.current?.autoSubmit) {
                    document.getElementById("Button2")?.click()
                } else {
                    setShowConfirm({
                        message: "评价完成，是否提交？",
                        onConfirm: () => document.getElementById("Button2")?.click()
                    })
                }
            }
            return
        }

        if (pjkc.selectedIndex !== idx) {
            if (isMountedRef.current) {
                setStatus(`Switching to course ${idx + 1}...`)
            }
            pjkc.selectedIndex = idx

            await new Promise(r => setTimeout(r, configRef.current?.delay || 500))
            executeScript(`__doPostBack('pjkc', '')`)
            return
        }

        if (isMountedRef.current) {
            setStatus(`Rating course ${idx + 1}...`)
        }
        fillRatings(configRef.current?.comment || "")

        await new Promise(r => setTimeout(r, (configRef.current?.delay || 500) + 300))

        if (!isMountedRef.current) return

        const nextState: EvalState = { isRunning: true, currentIndex: idx + 1 }

        await evalStateItem.setValue(nextState);
        if (isMountedRef.current) {
            document.getElementById("Button1")?.click()
        }
    }, [evalState])

    useEffect(() => {
        processEvaluation()
    }, [processEvaluation])

    const handleStart = useCallback(() => {
        const pjkc = document.getElementById("pjkc") as HTMLSelectElement | null
        const total = pjkc ? pjkc.options.length : 0
        if (evalState.currentIndex >= total && total > 0) {
            setShowConfirm({
                message: "已完成所有评教，是否重新开始？",
                onConfirm: () => updateEvalState({ isRunning: true, currentIndex: 0 })
            })
        } else {
            updateEvalState({ isRunning: true, currentIndex: evalState.currentIndex })
        }
    }, [evalState])

    const handleReset = useCallback(() => {
        setShowConfirm({
            message: "确定要重置进度吗？",
            onConfirm: () => updateEvalState({ isRunning: false, currentIndex: 0 })
        })
    }, [])

    return (
        <>
            {showConfirm && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100000]">
                    <div className="bg-card text-card-foreground rounded-lg shadow-xl p-6 max-w-sm mx-4 animate-in fade-in zoom-in-95 border-2 border-primary/20">
                        <p className="mb-4 text-center text-foreground">{showConfirm.message}</p>
                        <div className="flex gap-3 justify-center">
                            <button
                                onClick={() => {
                                    showConfirm.onConfirm()
                                    setShowConfirm(null)
                                }}
                                className="px-5 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-medium transition-colors shadow-sm"
                            >
                                确定
                            </button>
                            <button
                                onClick={() => setShowConfirm(null)}
                                className="px-5 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg font-medium transition-colors"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed top-24 right-10 w-64 bg-card text-card-foreground border border-border shadow-lg rounded-lg p-4 z-[99999]">
                <h3 className="font-bold border-b pb-2 mb-2 flex justify-between items-center">
                    <span>自动评教</span>
                    <span className="text-xs font-normal text-muted-foreground">
                        {evalState.isRunning ? <span className="text-primary flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />运行中</span> : "待机"}
                    </span>
                </h3>

                <div className="mb-4">
                    <div className="text-xs text-muted-foreground mb-1 flex justify-between">
                        <span>进度</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="text-xs text-center mt-2 text-primary">{status}</div>
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleStart}
                        disabled={evalState.isRunning}
                        className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 py-2 rounded-md text-sm font-medium flex items-center justify-center gap-1 disabled:opacity-50"
                    >
                        {evalState.isRunning ? "运行中" : <><Play className="h-4 w-4" /> 开始</>}
                    </button>
                    <button
                        onClick={handleReset}
                        className="px-3 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-md"
                        title="重置"
                    >
                        <RotateCcw className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </>
    )
}

function fillRatings(comment: string): void {
    const selects = document.querySelectorAll('select[id*="DataGrid1"]')
    const teacherGroups: Record<string, HTMLSelectElement[]> = {}

    selects.forEach(s => {
        const select = s as HTMLSelectElement
        const match = select.id.match(/JS(\d+)/)
        const key = match ? match[1] : "def"
        if (!teacherGroups[key]) teacherGroups[key] = []
        teacherGroups[key].push(select)
    })

    Object.values(teacherGroups).forEach((group) => {
        const targetGoodIndex = Math.floor(Math.random() * group.length)
        group.forEach((select, i) => {
            let best = 1
            let good = 2
            for (let o = 0; o < select.options.length; o++) {
                const txt = select.options[o]?.text || ''
                if (txt.includes("优") || txt.includes("非常")) best = o
                if (txt.includes("良") || txt.includes("较好")) good = o
            }
            select.selectedIndex = (i === targetGoodIndex) ? good : best
        })
    })

    const txt = (document.getElementById("pjxx") || document.getElementById("txt1")) as HTMLTextAreaElement | null
    if (txt && !txt.value) txt.value = comment
}

function executeScript(code: string): void {
    const script = document.createElement('script')
    script.textContent = code
    document.body.appendChild(script)
    script.remove()
}

export default Evaluator
