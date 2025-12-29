import { useState, useCallback } from "react"
import { useConfig, type Config, DEFAULT_CONFIG } from "@/utils/hooks"
import { parseSchedule, type Course } from "@/utils/parser"
import { generateICS } from "@/utils/ics"
import { Download, Loader2, Calendar, X } from "lucide-react"
import { z } from "zod"

const TimeConfigSchema = z.record(z.coerce.number(), z.object({ s: z.string(), e: z.string() }))

const ScheduleExporter = () => {
    const [appConfig, setAppConfig] = useConfig()
    const [loading, setLoading] = useState(false)
    const [showDateModal, setShowDateModal] = useState(false)
    const [dateInput, setDateInput] = useState("")
    const [pendingCourses, setPendingCourses] = useState<Course[]>([])

    const getDefaultDate = useCallback((): string => {
        const now = new Date()
        const month = now.getMonth() + 1
        const year = now.getFullYear()
        return (month >= 2 && month <= 7)
            ? `${year}-02-17`
            : `${month >= 8 ? year : year - 1}-09-02`
    }, [])

    const updateConfig = useCallback((updates: Partial<Config>) => {
        setAppConfig({ ...(appConfig || DEFAULT_CONFIG), ...updates })
    }, [appConfig, setAppConfig])

    const doExport = useCallback((courses: Course[], startDate: string): void => {
        try {
            let timeConfig: Record<number, { s: string; e: string }> | undefined
            if (appConfig?.timeJson) {
                const parsed = TimeConfigSchema.safeParse(JSON.parse(appConfig.timeJson))
                if (parsed.success) timeConfig = parsed.data
            }

            const ics = generateICS(courses, startDate, timeConfig)

            const blob = new Blob([ics], { type: 'text/calendar' })
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = `njupt_schedule.ics`
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

        } catch (e: unknown) {
            alert("导出失败: " + (e instanceof Error ? e.message : String(e)))
        } finally {
            setLoading(false)
            setPendingCourses([])
        }
    }, [appConfig?.timeJson])

    const handleExport = useCallback(async (): Promise<void> => {
        setLoading(true)
        try {
            const courses = parseSchedule(document)
            if (courses.length === 0) {
                alert("未识别到课程，请确认当前页面有课表表格。")
                setLoading(false)
                return
            }

            if (!appConfig?.startDate) {
                setPendingCourses(courses)
                setDateInput(getDefaultDate())
                setShowDateModal(true)
                setLoading(false)
                return
            }

            doExport(courses, appConfig.startDate)

        } catch (e: unknown) {
            alert("导出失败: " + (e instanceof Error ? e.message : String(e)))
            setLoading(false)
        }
    }, [appConfig?.startDate, getDefaultDate, doExport])

    const handleDateConfirm = useCallback((): void => {
        if (!dateInput) return

        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
            alert("日期格式不正确，请使用 YYYY-MM-DD 格式")
            return
        }

        updateConfig({ startDate: dateInput })
        setShowDateModal(false)

        setLoading(true)
        doExport(pendingCourses, dateInput)
    }, [dateInput, pendingCourses, updateConfig, doExport])

    const handleCloseModal = useCallback((): void => {
        setShowDateModal(false)
    }, [])

    return (
        <>
            {showDateModal && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100000]">
                    <div className="bg-card text-card-foreground rounded-xl shadow-2xl p-6 max-w-md mx-4 animate-in fade-in zoom-in-95 border-2 border-primary/20">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-primary" />
                                设置学期开始日期
                            </h3>
                            <button
                                onClick={handleCloseModal}
                                className="p-1 hover:bg-muted rounded-md"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <p className="text-muted-foreground text-sm mb-4">
                            请输入本学期<strong>第1周周一</strong>的日期，用于计算课程所在的具体日期。
                        </p>

                        <input
                            type="date"
                            value={dateInput}
                            onChange={e => setDateInput(e.target.value)}
                            className="w-full p-3 border border-border rounded-lg mb-4 focus:ring-2 focus:ring-primary focus:border-primary outline-none bg-background text-foreground"
                        />

                        <div className="flex gap-3">
                            <button
                                onClick={handleDateConfirm}
                                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground py-2.5 rounded-lg font-medium transition-colors shadow-sm"
                            >
                                确认导出
                            </button>
                            <button
                                onClick={handleCloseModal}
                                className="px-5 py-2.5 bg-secondary hover:bg-secondary/80 rounded-lg text-secondary-foreground font-medium transition-colors"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="fixed top-20 right-10 z-[1000]">
                <button
                    onClick={handleExport}
                    disabled={loading}
                    className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2.5 rounded-lg shadow-lg transition-all font-medium disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    <span>导出 ICS 日历</span>
                </button>
            </div>
        </>
    )
}

export default ScheduleExporter
