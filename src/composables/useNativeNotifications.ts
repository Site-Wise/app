import { ref, onMounted } from 'vue'

// Dynamically import Tauri API to avoid build issues
async function invokeTauri(command: string, args?: Record<string, any>): Promise<any> {
  try {
    const { invoke } = await import('@tauri-apps/api/core')
    return invoke(command, args)
  } catch {
    throw new Error('Tauri API not available')
  }
}

export interface NotificationOptions {
  title: string
  body: string
  icon?: string
  tag?: string
  silent?: boolean
}

export function useNativeNotifications() {
  const isSupported = ref(false)
  const isTauri = ref(false)
  const permission = ref<NotificationPermission>('default')

  // Check if running in Tauri
  onMounted(async () => {
    try {
      // Try to access Tauri API
      await invokeTauri('get_platform_info')
      isTauri.value = true
      isSupported.value = true
      permission.value = 'granted' // Tauri handles permissions internally
    } catch {
      // Fallback to web notifications
      isTauri.value = false
      isSupported.value = 'Notification' in window
      if (isSupported.value) {
        permission.value = Notification.permission
      }
    }
  })

  const requestPermission = async (): Promise<NotificationPermission> => {
    if (isTauri.value) {
      // Tauri handles permissions internally
      permission.value = 'granted'
      return 'granted'
    }

    if (!isSupported.value) {
      return 'denied'
    }

    try {
      const result = await Notification.requestPermission()
      permission.value = result
      return result
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      permission.value = 'denied'
      return 'denied'
    }
  }

  const showNotification = async (options: NotificationOptions): Promise<void> => {
    if (permission.value !== 'granted') {
      await requestPermission()
    }

    if (permission.value !== 'granted') {
      throw new Error('Notification permission not granted')
    }

    try {
      if (isTauri.value) {
        // Use Tauri's native notification
        await invokeTauri('show_notification', {
          title: options.title,
          body: options.body
        })
      } else {
        // Use web notification
        const notification = new Notification(options.title, {
          body: options.body,
          icon: options.icon,
          tag: options.tag,
          silent: options.silent
        })

        // Auto close after 5 seconds if not interacted with
        setTimeout(() => {
          notification.close()
        }, 5000)
      }
    } catch (error) {
      console.error('Error showing notification:', error)
      throw error
    }
  }

  const showDeliveryNotification = async (itemName: string, vendorName: string) => {
    await showNotification({
      title: 'New Delivery Recorded',
      body: `${itemName} has been delivered by ${vendorName}`,
      tag: 'delivery'
    })
  }

  const showPaymentNotification = async (amount: number, vendorName: string) => {
    await showNotification({
      title: 'Payment Recorded',
      body: `Payment of ₹${amount.toLocaleString()} recorded for ${vendorName}`,
      tag: 'payment'
    })
  }

  const showQuotationNotification = async (itemName: string, vendorName: string) => {
    await showNotification({
      title: 'New Quotation Received',
      body: `Quotation for ${itemName} received from ${vendorName}`,
      tag: 'quotation'
    })
  }

  const showServiceBookingNotification = async (serviceName: string, date: string) => {
    await showNotification({
      title: 'Service Booking Confirmed',
      body: `${serviceName} scheduled for ${date}`,
      tag: 'service'
    })
  }

  return {
    isSupported,
    isTauri,
    permission,
    requestPermission,
    showNotification,
    showDeliveryNotification,
    showPaymentNotification,
    showQuotationNotification,
    showServiceBookingNotification
  }
}