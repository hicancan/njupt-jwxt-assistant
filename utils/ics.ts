import type { Course } from "@/utils/parser"

export const DEFAULT_TIMES: Record<number, { s: string; e: string }> = {
    1: { s: '0800', e: '0845' },
    2: { s: '0855', e: '0940' },
    3: { s: '1000', e: '1045' },
    4: { s: '1055', e: '1140' },
    5: { s: '1150', e: '1235' },
    6: { s: '1345', e: '1430' },
    7: { s: '1440', e: '1525' },
    8: { s: '1540', e: '1625' },
    9: { s: '1635', e: '1720' },
    10: { s: '1830', e: '1915' },
    11: { s: '1925', e: '2010' },
    12: { s: '2020', e: '2105' }
}

function generateUID(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 10)
    return `${timestamp}-${random}@njupt.edu.cn`
}

function formatDateUTC(date: Date): string {
    const y = date.getUTCFullYear()
    const m = (date.getUTCMonth() + 1).toString().padStart(2, '0')
    const d = date.getUTCDate().toString().padStart(2, '0')
    return `${y}${m}${d}`
}

function formatTimeUTC(date: Date): string {
    const h = date.getUTCHours().toString().padStart(2, '0')
    const m = date.getUTCMinutes().toString().padStart(2, '0')
    const s = date.getUTCSeconds().toString().padStart(2, '0')
    return `${h}${m}${s}`
}

function formatDateLocal(date: Date): string {
    const y = date.getFullYear()
    const m = (date.getMonth() + 1).toString().padStart(2, '0')
    const d = date.getDate().toString().padStart(2, '0')
    return `${y}${m}${d}`
}

function escapeICS(text: string): string {
    return text
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n')
}

export function generateICS(
    courses: Course[],
    semesterStartStr: string,
    customTimes?: Record<number, { s: string; e: string }>
): string {
    if (!semesterStartStr) {
        throw new Error("Missing Semester Start Date")
    }

    const semesterStart = new Date(semesterStartStr)
    if (isNaN(semesterStart.getTime())) {
        throw new Error("Invalid Semester Start Date")
    }

    const timeMap = customTimes || DEFAULT_TIMES
    const now = new Date()
    const dtstamp = `${formatDateUTC(now)}T${formatTimeUTC(now)}Z`

    const vcal: string[] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//NJUPT//Course Schedule//CN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-TIMEZONE:Asia/Shanghai",
        "BEGIN:VTIMEZONE",
        "TZID:Asia/Shanghai",
        "X-LIC-LOCATION:Asia/Shanghai",
        "BEGIN:STANDARD",
        "TZOFFSETFROM:+0800",
        "TZOFFSETTO:+0800",
        "TZNAME:CST",
        "DTSTART:19700101T000000",
        "END:STANDARD",
        "END:VTIMEZONE"
    ]

    for (const c of courses) {
        for (let w = c.startWeek; w <= c.endWeek; w++) {
            if (c.weekType.includes('单') && w % 2 === 0) continue
            if (c.weekType.includes('双') && w % 2 !== 0) continue

            const eventDate = new Date(semesterStart)
            eventDate.setDate(semesterStart.getDate() + (w - 1) * 7 + (c.day - 1))

            const startSlot = c.slots[0]
            const endSlot = c.slots[c.slots.length - 1]

            if (startSlot === undefined || endSlot === undefined) continue

            const startTime = timeMap[startSlot]
            const endTime = timeMap[endSlot]

            const sTime = startTime ? startTime.s : '0000'
            const eTime = endTime ? endTime.e : '0000'

            const dayStr = formatDateLocal(eventDate)
            const dtStart = `${dayStr}T${sTime}00`
            const dtEnd = `${dayStr}T${eTime}00`

            vcal.push("BEGIN:VEVENT")
            vcal.push(`UID:${generateUID()}`)
            vcal.push(`DTSTAMP:${dtstamp}`)
            vcal.push(`DTSTART;TZID=Asia/Shanghai:${dtStart}`)
            vcal.push(`DTEND;TZID=Asia/Shanghai:${dtEnd}`)
            vcal.push(`SUMMARY:${escapeICS(c.name)}`)
            vcal.push(`DESCRIPTION:第${w}周 ${escapeICS(c.teacher || '')}`)
            vcal.push(`LOCATION:${escapeICS(c.location)}`)
            vcal.push("END:VEVENT")
        }
    }

    vcal.push("END:VCALENDAR")
    return vcal.join("\r\n")
}
