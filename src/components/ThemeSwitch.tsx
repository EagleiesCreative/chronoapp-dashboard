"use client"

import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

export function ThemeSwitch() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    useEffect(() => setMounted(true), [])

    if (!mounted) {
        return (
            <button
                className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground"
                aria-label="Toggle theme"
            >
                <Sun className="size-5" />
            </button>
        )
    }

    const isDark = theme === "dark"

    return (
        <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-250 hover:text-foreground hover:bg-accent"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
            {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </button>
    )
}
