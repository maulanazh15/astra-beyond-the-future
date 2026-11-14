import {
  BatteryCharging,
  Bot,
  Box,
  Flame,
  PlaneLanding,
  Radio,
  Sun,
  Telescope,
  Thermometer,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ComponentCategory } from '../../types/component'

export const categoryIcons: Record<ComponentCategory, LucideIcon> = {
  bus: Box,
  propulsion: Flame,
  power: Sun,
  battery: BatteryCharging,
  communication: Radio,
  payload: Telescope,
  landing: PlaneLanding,
  thermal: Thermometer,
  robotics: Bot,
}
