import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import confetti from 'canvas-confetti'
import { driver, type DriveStep, type Driver } from 'driver.js'
import 'driver.js/dist/driver.css'
import './tour.css'
import { TOUR_STOPS } from './tourSteps'
import { useMoreMenuStore } from '../../store/useMoreMenuStore'
import { markTourCompleted } from './api'
import { playConfirm } from '../../lib/sound'

const DEMO_SESSION_KEY = 'spiderpos-demo-tour-seen'
const MOBILE_BREAKPOINT = 768

interface TourMember {
  id: string
  role: string
  tour_completed_at?: string | null
  stores?: { is_demo?: boolean | null } | null
}

function getVisibleElement(selector: string): HTMLElement | null {
  const candidates = Array.from(document.querySelectorAll<HTMLElement>(selector))
  return candidates.find((el) => el.getBoundingClientRect().width > 0) ?? null
}

function waitForElement(selector: string, timeoutMs = 3000): Promise<void> {
  return new Promise((resolve) => {
    if (getVisibleElement(selector)) return resolve()
    const start = performance.now()
    const tick = () => {
      if (getVisibleElement(selector) || performance.now() - start > timeoutMs) {
        resolve()
        return
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

function fireConfetti() {
  confetti({
    particleCount: 130,
    spread: 85,
    origin: { y: 0.6 },
    colors: ['#4f46e5', '#7c3aed', '#818cf8', '#fbbf24'],
    zIndex: 100000001,
  })
}

/** Onboarding: bienvenida + tour guiado con driver.js. Ver [[onboarding-tour]]. */
export function useProductTour(member: TourMember | null | undefined) {
  const navigate = useNavigate()
  const setMoreOpen = useMoreMenuStore((state) => state.setOpen)
  const driverRef = useRef<Driver | null>(null)
  const [welcomeOpen, setWelcomeOpen] = useState(false)
  // Recuerda para qué socio ya se decidió si mostrar la bienvenida, para
  // decidirlo una sola vez por sesión sin depender de un efecto (ver "You
  // Might Not Need an Effect" — ajustar estado durante el render es el
  // patrón recomendado quando depende de datos que llegan después, como
  // member de una query).
  const [promptedForId, setPromptedForId] = useState<string | undefined>(undefined)

  const isDemo = !!member?.stores?.is_demo
  const isOwner = member?.role === 'owner'

  if (member && isOwner && member.id !== promptedForId) {
    setPromptedForId(member.id)
    const shouldShow = isDemo
      ? !sessionStorage.getItem(DEMO_SESSION_KEY)
      : !member.tour_completed_at
    if (shouldShow) setWelcomeOpen(true)
  }

  useEffect(() => () => driverRef.current?.destroy(), [])

  /** Marca que este dueño ya vio la invitación al tour — evita que se le
   * vuelva a mostrar en cada login, sin importar si lo terminó o lo saltó. */
  const markSeen = useCallback(() => {
    if (member?.stores?.is_demo) {
      sessionStorage.setItem(DEMO_SESSION_KEY, '1')
    } else if (member?.id) {
      markTourCompleted(member.id).catch(() => {})
    }
  }, [member])

  const dismissWelcome = useCallback(() => {
    setWelcomeOpen(false)
    markSeen()
  }, [markSeen])

  const startTour = useCallback(() => {
    setWelcomeOpen(false)

    const closingDescription = isDemo
      ? 'Ahora te toca a ti: haz una venta de prueba y descubre el resto explorando.'
      : 'Termina de configurar tu tienda con la lista de abajo — en unos minutos estarás listo para tu primera venta real.'

    async function goToStop(
      target: { route: string; selector: string; mobileMenu?: boolean } | null,
    ) {
      if (!target) return
      if (window.location.pathname !== target.route) navigate(target.route)
      setMoreOpen(!!target.mobileMenu && window.innerWidth < MOBILE_BREAKPOINT)
      await waitForElement(target.selector)
    }

    const steps: DriveStep[] = TOUR_STOPS.map((stop, index) => ({
      element: () => getVisibleElement(stop.selector) ?? document.body,
      popover: {
        title: stop.title,
        description: stop.description,
        side: stop.side,
        showButtons: ['next'],
        onNextClick: (_el, _step, opts) => {
          const next = TOUR_STOPS[index + 1]
          void goToStop(next ?? null).then(() => opts.driver.moveNext())
        },
      },
    }))

    steps.push({
      popover: {
        title: '¡Listo, ya conoces lo esencial! 🎉',
        description: closingDescription,
        showButtons: ['next'],
        doneBtnText: 'Entendido',
      },
    })

    const driverObj = driver({
      animate: true,
      overlayOpacity: 0.65,
      stagePadding: 6,
      stageRadius: 12,
      allowClose: true,
      allowKeyboardControl: true,
      showProgress: true,
      progressText: '{{current}} de {{total}}',
      nextBtnText: 'Siguiente',
      doneBtnText: 'Entendido',
      steps,
      onDestroyed: (_el, _step, opts) => {
        setMoreOpen(false)
        markSeen()
        if (opts.state.activeIndex === TOUR_STOPS.length) {
          fireConfetti()
          playConfirm()
        }
        driverRef.current = null
      },
    })
    driverRef.current = driverObj

    void goToStop(TOUR_STOPS[0] ?? null).then(() => driverObj.drive(0))
  }, [isDemo, markSeen, navigate, setMoreOpen])

  return { welcomeOpen, dismissWelcome, startTour, isDemo }
}

export type TourApi = ReturnType<typeof useProductTour>

/** Permite reproducir el tour desde otras pantallas (ej. "Ver el tour de
 * nuevo" en Perfil) sin instanciar un segundo driver.js ni duplicar el
 * efecto de auto-bienvenida — un solo useProductTour vive en BackofficeLayout. */
export const TourContext = createContext<TourApi | null>(null)

export function useTourContext(): TourApi | null {
  return useContext(TourContext)
}
