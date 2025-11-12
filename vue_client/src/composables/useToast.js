import { ref, readonly } from 'vue'

// Global state - shared across all components
const toasts = ref([])
let nextId = 0

/**
 * Toast notification composable
 * Provides methods to show success, error, info, and warning toasts
 */
export function useToast() {
  /**
   * Show a toast notification
   * @param {string} message - The message to display
   * @param {string} type - Toast type: 'success', 'error', 'info', 'warning'
   * @param {number} duration - Duration in ms (0 = no auto-dismiss)
   * @returns {number} Toast ID for manual removal
   */
  function show(message, type = 'success', duration = 3000) {
    const id = nextId++
    const toast = {
      id,
      message,
      type,
      duration,
      createdAt: Date.now()
    }

    toasts.value.push(toast)

    // Auto-dismiss if duration is set
    if (duration > 0) {
      setTimeout(() => remove(id), duration)
    }

    return id
  }

  /**
   * Remove a specific toast by ID
   * @param {number} id - Toast ID to remove
   */
  function remove(id) {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  /**
   * Clear all toasts
   */
  function clear() {
    toasts.value = []
  }

  // Convenience methods for different toast types
  function success(message, duration = 3000) {
    return show(message, 'success', duration)
  }

  function error(message, duration = 5000) {
    return show(message, 'error', duration)
  }

  function info(message, duration = 3000) {
    return show(message, 'info', duration)
  }

  function warning(message, duration = 4000) {
    return show(message, 'warning', duration)
  }

  return {
    toasts: readonly(toasts),
    show,
    success,
    error,
    info,
    warning,
    remove,
    clear
  }
}
