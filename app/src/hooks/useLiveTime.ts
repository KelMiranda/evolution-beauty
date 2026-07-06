import { useState, useEffect } from 'react'

export function useLiveTime(timezone: string = 'America/El_Salvador') {
  const [time, setTime] = useState(() => {
    return new Date().toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  })

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString('en-US', {
          timeZone: timezone,
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      )
    }
    update()
    const interval = setInterval(update, 10000)
    return () => clearInterval(interval)
  }, [timezone])

  return time
}
