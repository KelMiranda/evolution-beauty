import { useState } from 'react'
import { Bell, CheckCircle2, Loader2, TriangleAlert } from 'lucide-react'
import { api } from '@/services/api'
import { ensureNotificationPermission, isPushSupported, urlBase64ToUint8Array } from '@/lib/pushNotifications'

type SubscriptionState = 'idle' | 'loading' | 'success' | 'error'

function getVapidPublicKey(): string {
  const key = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (!key) throw new Error('Falta configurar VITE_VAPID_PUBLIC_KEY')
  return key
}

export function NotificationSubscriptionCard() {
  const [state, setState] = useState<SubscriptionState>('idle')
  const [message, setMessage] = useState('')

  const handleEnableNotifications = async () => {
    try {
      setState('loading')
      setMessage('')

      if (!isPushSupported()) {
        throw new Error('Este navegador no soporta notificaciones push.')
      }

      const permission = await ensureNotificationPermission()
      if (permission === 'denied') {
        throw new Error('Las notificaciones están bloqueadas en este navegador.')
      }

      if (permission !== 'granted') {
        throw new Error('No se pudo obtener permiso para notificaciones.')
      }

      const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      const existingSubscription = await registration.pushManager.getSubscription()
      const subscription = existingSubscription ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(getVapidPublicKey()) as BufferSource,
      })

      const payload = subscription.toJSON()
      await api.post('/api/push-subscriptions', payload)

      setState('success')
      setMessage('Notificaciones activadas y suscripción registrada correctamente.')
    } catch (error) {
      setState('error')
      setMessage(error instanceof Error ? error.message : 'No se pudo activar las notificaciones.')
    }
  }

  return (
    <section className="rounded-xl border border-warm-tan/10 bg-charcoal-light p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-gold/10 p-2 text-gold">
          <Bell className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="font-display text-lg text-ivory">Notificaciones del navegador</h3>
          <p className="mt-1 text-sm text-warm-gray">Activa alertas para recibir avisos del panel en tiempo real.</p>

          <button
            type="button"
            onClick={handleEnableNotifications}
            disabled={state === 'loading'}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gold px-4 py-2 text-sm font-medium text-charcoal transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {state === 'loading' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bell className="h-4 w-4" />}
            Activar notificaciones
          </button>

          {message ? (
            <div className={`mt-4 flex items-start gap-2 rounded-lg border p-3 text-sm ${state === 'success' ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200' : 'border-red-500/20 bg-red-500/10 text-red-200'}`}>
              {state === 'success' ? <CheckCircle2 className="mt-0.5 h-4 w-4" /> : <TriangleAlert className="mt-0.5 h-4 w-4" />}
              <span>{message}</span>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
