import { useEffect, useState } from "react"
import { usePrefs } from "@/lib/prefs"
import { updateWidgetSettings } from "@/lib/widgets"
import type { HabitTrackerWidgetConfig, Habit } from "@/lib/widgets"
import { Card, CardContent } from "@/components/ui/card"
import { CheckSquare, Plus, X, GripVertical, Edit2, Check } from "lucide-react"
import { Input } from "@/components/ui/input"

type HabitTrackerWidgetProps = {
  config: HabitTrackerWidgetConfig
}

export default function HabitTrackerWidget({ config }: HabitTrackerWidgetProps) {
  const { setPrefs } = usePrefs()
  const [newHabitName, setNewHabitName] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState("")
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  useEffect(() => {
    checkAndResetHabits()
  }, [])

  const checkAndResetHabits = () => {
    const { lastResetDate, resetTime } = config.settings

    if (!lastResetDate) {
      updateSettings({ lastResetDate: new Date().toISOString() })
      return
    }

    const now = new Date()
    const lastReset = new Date(lastResetDate)

    const [hours, minutes] = resetTime.split(':').map(Number)
    const todayResetTime = new Date()
    todayResetTime.setHours(hours, minutes, 0, 0)

    const shouldReset = now >= todayResetTime && lastReset < todayResetTime

    if (shouldReset) {
      const resetHabits = config.settings.habits.map(habit => ({
        ...habit,
        checked: false
      }))
      updateSettings({
        habits: resetHabits,
        lastResetDate: now.toISOString()
      })
    }
  }

  const updateSettings = (settings: Partial<HabitTrackerWidgetConfig["settings"]>) => {
    setPrefs((p) => ({
      ...p,
      widgets: updateWidgetSettings(p.widgets, config.id, settings),
    }))
  }

  const addHabit = () => {
    if (!newHabitName.trim()) return

    const trimmedName = newHabitName.trim().slice(0, 100)

    const newHabit: Habit = {
      id: `habit-${Date.now()}`,
      name: trimmedName,
      checked: false,
    }

    updateSettings({ habits: [...config.settings.habits, newHabit] })
    setNewHabitName("")
  }

  const toggleHabit = (habitId: string) => {
    const updatedHabits = config.settings.habits.map(habit =>
      habit.id === habitId ? { ...habit, checked: !habit.checked } : habit
    )
    updateSettings({ habits: updatedHabits })
  }

  const deleteHabit = (habitId: string) => {
    const updatedHabits = config.settings.habits.filter(h => h.id !== habitId)
    updateSettings({ habits: updatedHabits })
  }

  const startEditing = (habit: Habit) => {
    setEditingId(habit.id)
    setEditingName(habit.name)
  }

  const saveEdit = () => {
    if (!editingName.trim() || !editingId) return

    const trimmedName = editingName.trim().slice(0, 100)

    const updatedHabits = config.settings.habits.map(habit =>
      habit.id === editingId ? { ...habit, name: trimmedName } : habit
    )
    updateSettings({ habits: updatedHabits })
    setEditingId(null)
    setEditingName("")
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditingName("")
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()

    if (draggedIndex === null || draggedIndex === index) return

    const habits = [...config.settings.habits]
    const draggedItem = habits[draggedIndex]
    habits.splice(draggedIndex, 1)
    habits.splice(index, 0, draggedItem)

    updateSettings({ habits })
    setDraggedIndex(index)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  return (
    <Card className="bg-black/35 backdrop-blur border-white/10 text-white w-[18rem] shrink-0 py-0">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <CheckSquare className="w-4 h-4 text-green-400" />
          <span className="text-sm font-medium">Habit Tracker</span>
        </div>

        {config.settings.habits.length === 0 ? (
          <div className="text-white/40 text-sm mb-3">
            No habits yet. Add one below!
          </div>
        ) : (
          <div className={`space-y-1 mb-3 ${config.settings.unlimitedHeight ? '' : 'max-h-[16rem] overflow-y-auto'}`}>
            {config.settings.habits.map((habit, index) => (
              <div
                key={habit.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className="flex items-center gap-2 group cursor-move hover:bg-white/5 rounded px-1.5 py-0.5 transition-colors"
              >
                <GripVertical className="w-3 h-3 text-white/30 shrink-0" />

                <input
                  type="checkbox"
                  checked={habit.checked}
                  onChange={() => toggleHabit(habit.id)}
                  className="w-4 h-4 rounded border-white/20 bg-white/5 checked:bg-green-500 checked:border-green-500 cursor-pointer shrink-0"
                />

                {editingId === habit.id ? (
                  <>
                    <Input
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value.slice(0, 100))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit()
                        if (e.key === 'Escape') cancelEdit()
                      }}
                      className="flex-1 h-6 text-sm bg-white/5 border-white/20 text-white px-2"
                      autoFocus
                    />
                    <button
                      onClick={saveEdit}
                      className="p-0.5 hover:bg-white/10 rounded transition-colors shrink-0"
                    >
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-0.5 hover:bg-white/10 rounded transition-colors shrink-0"
                    >
                      <X className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </>
                ) : (
                  <>
                    <span className={`flex-1 text-sm break-words overflow-hidden ${habit.checked ? 'line-through text-white/50' : ''}`}>
                      {habit.name}
                    </span>
                    <button
                      onClick={() => startEditing(habit)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded transition-all shrink-0"
                    >
                      <Edit2 className="w-3 h-3 text-white/70" />
                    </button>
                    <button
                      onClick={() => deleteHabit(habit.id)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded transition-all shrink-0"
                    >
                      <X className="w-3 h-3 text-red-400" />
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <Input
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value.slice(0, 100))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addHabit()
            }}
            placeholder="Add new habit..."
            className="flex-1 h-8 text-sm bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
          <button
            onClick={addHabit}
            className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded transition-colors shrink-0"
          >
            <Plus className="w-4 h-4 text-white/70" />
          </button>
        </div>
      </CardContent>
    </Card>
  )
}
