import { ref, computed } from 'vue';

// Global modal state tracking
const activeModals = ref(new Set<string>());

export function useModalState() {
  // Register a modal as open
  const openModal = (modalId: string) => {
    activeModals.value.add(modalId);
  };

  // Register a modal as closed
  const closeModal = (modalId: string) => {
    activeModals.value.delete(modalId);
  };

  // Check if any modal is open
  const isAnyModalOpen = computed(() => activeModals.value.size > 0);

  // Check if a specific modal is open
  const isModalOpen = (modalId: string) => computed(() => activeModals.value.has(modalId));

  // Get count of open modals
  const openModalCount = computed(() => activeModals.value.size);

  return {
    openModal,
    closeModal,
    isAnyModalOpen,
    isModalOpen,
    openModalCount
  };
}