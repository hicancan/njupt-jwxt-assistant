import { z } from 'zod';

export const CourseSchema = z.object({
    name: z.string(),
    teacher: z.string(),
    location: z.string(),
    day: z.number(),
    startWeek: z.number(),
    endWeek: z.number(),
    weekType: z.string(),
    slots: z.array(z.number())
});

export type Course = z.infer<typeof CourseSchema>;

export function parseSchedule(doc: Document | Element = document): Course[] {
    const table = doc.querySelector('#Table1') as HTMLTableElement | null
    if (!table) return []

    const rows = Array.from(table.querySelectorAll('tr'))
    if (rows.length === 0) return []

    const grid: boolean[][] = Array.from({ length: 15 }, () => new Array(8).fill(false))
    const courses: Course[] = []

    let startRow = -1
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i]
        if (row && row.innerText.includes('第1节')) {
            startRow = i
            break
        }
    }

    if (startRow === -1) return []

    let logicalRow = 1

    for (let r = startRow; r < rows.length; r++) {
        const tr = rows[r]
        if (!tr) continue

        const cells = Array.from(tr.children) as HTMLElement[]
        let cellIndex = 0

        for (let c = 0; c <= 7; c++) {
            const currentGridRow = grid[logicalRow - 1]
            if (currentGridRow && currentGridRow[c]) {
                continue
            }

            if (cellIndex >= cells.length) break

            const cell = cells[cellIndex]
            if (!cell) {
                cellIndex++
                continue
            }

            const rowSpan = parseInt(cell.getAttribute('rowspan') || "1", 10)
            const colSpan = parseInt(cell.getAttribute('colspan') || "1", 10)

            for (let rs = 0; rs < rowSpan; rs++) {
                for (let cs = 0; cs < colSpan; cs++) {
                    const targetRow = grid[logicalRow - 1 + rs]
                    if (targetRow) {
                        targetRow[c + cs] = true
                    }
                }
            }

            if (c >= 2 && c <= 8) {
                parseCell(cell, c - 1, courses)
            }

            cellIndex++
        }
        logicalRow++
    }

    return courses
}

function parseCell(cell: HTMLElement, dayIndex: number, courseList: Course[]): void {
    let html = cell.innerHTML.trim()
    if (!html || html === '&nbsp;') return

    html = html.replace(/<br\s*\/?>/gi, '\n')
    const blocks = html.split(/\n\s*\n/)

    for (const block of blocks) {
        const lines = block.split('\n').map(l => l.trim()).filter(l => l)
        if (lines.length < 3) continue

        const name = lines[0]
        if (!name) continue

        const timeStr = lines.find(l => l.includes('{') && l.includes('}')) || lines[1] || ''
        const teacher = (lines[2] === timeStr) ? (lines[1] || '') : (lines[2] || '')
        const location = lines[3] || '未知地点'

        const weekMatch = timeStr.match(/\{.*?(第)?(\d+)-(\d+)周.*?(\|.*?)?\}/)
        const startWeek = weekMatch ? parseInt(weekMatch[2], 10) : 1
        const endWeek = weekMatch ? parseInt(weekMatch[3], 10) : 16
        const type = weekMatch && weekMatch[4] ? weekMatch[4].replace('|', '') : 'all'

        const slotMatch = timeStr.match(/第([\d,]+)节/)
        const slots = slotMatch ? slotMatch[1].split(',').map(Number).filter(n => !isNaN(n)) : []

        if (name && slots.length > 0) {
            const course = {
                name,
                teacher,
                location,
                day: dayIndex,
                startWeek,
                endWeek,
                weekType: type,
                slots
            };

            const result = CourseSchema.safeParse(course);
            if (result.success) {
                courseList.push(result.data);
            }
        }
    }
}
