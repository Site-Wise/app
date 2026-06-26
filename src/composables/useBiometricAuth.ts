/**
 * Reactive wrapper around the biometric "Quick Unlock" service.
 *
 * Holds a single app-wide reactive state (support detection runs once) and
 * exposes ergonomic enable/disable/unlock helpers wired into the i18n copy and
 * toast feedback so views stay thin.
 */
import { ref, computed } from 'vue';
import { useI18n } from './useI18n';
import { useToast } from './useToast';
import {
  isSupported as svcIsSupported,
  detectMethod,
  enable as svcEnable,
  disable as svcDisable,
  unlock as svcUnlock,
  hasVault,
  getVaultMethod,
  getVaultEmail,
  hasOfferedSetup,
  markSetupOffered,
  BiometricCancelledError,
  BiometricSessionExpiredError,
  type BiometricMethod,
} from '../services/biometricAuth';

// Module-level singletons so every consumer shares the same reactive state.
const supported = ref<boolean | null>(null); // null = not yet checked
const enabled = ref<boolean>(hasVault());
const method = ref<BiometricMethod>(getVaultMethod() || 'biometrics');
const busy = ref<boolean>(false);
let supportCheck: Promise<boolean> | null = null;

export function useBiometricAuth() {
  const { t } = useI18n();
  const toast = useToast();

  /** Localised name of the biometric method, for copy ("Enable Face ID"). */
  const methodLabel = computed(() => {
    switch (method.value) {
      case 'face':
        return t('biometric.faceId');
      case 'fingerprint':
        return t('biometric.fingerprint');
      default:
        return t('biometric.biometrics');
    }
  });

  const isEnabled = computed(() => enabled.value);
  const isSupported = computed(() => supported.value === true);
  const isBusy = computed(() => busy.value);

  /** Run support + method detection once; safe to call repeatedly. */
  async function ensureChecked(): Promise<boolean> {
    if (supported.value !== null) return supported.value;
    if (!supportCheck) {
      supportCheck = (async () => {
        const ok = await svcIsSupported();
        if (ok) method.value = getVaultMethod() || (await detectMethod());
        supported.value = ok;
        return ok;
      })();
    }
    return supportCheck;
  }

  /**
   * Whether to surface the first-sign-in setup prompt: supported, not already
   * enabled, and not previously offered.
   */
  async function shouldOfferSetup(): Promise<boolean> {
    if (hasOfferedSetup() || enabled.value) return false;
    return ensureChecked();
  }

  function dismissSetupOffer(): void {
    markSetupOffered();
  }

  /** Enable biometric unlock for the current (already signed-in) session. */
  async function enable(silent = false): Promise<boolean> {
    if (busy.value) return false;
    busy.value = true;
    try {
      const { method: m } = await svcEnable(t('biometric.reason'));
      method.value = m;
      enabled.value = true;
      markSetupOffered();
      if (!silent) {
        toast.success(t('biometric.enabled'));
      }
      return true;
    } catch (err: unknown) {
      if (err instanceof BiometricCancelledError) {
        // User backed out of the OS prompt — not an error worth a toast.
        return false;
      }
      toast.error(t('biometric.enableFailed'));
      return false;
    } finally {
      busy.value = false;
    }
  }

  /** Disable biometric unlock and wipe the on-device vault. */
  function disable(silent = false): void {
    svcDisable();
    enabled.value = false;
    if (!silent) toast.info(t('biometric.disabled'));
  }

  /**
   * Run the unlock ceremony and restore the session. Returns true on success.
   * `onExpired` lets the caller react when the saved session is rejected.
   */
  async function unlock(opts?: { onExpired?: () => void }): Promise<boolean> {
    if (busy.value) return false;
    busy.value = true;
    try {
      await svcUnlock(t('biometric.reason'));
      return true;
    } catch (err: unknown) {
      if (err instanceof BiometricCancelledError) {
        return false; // silent — user chose to cancel
      }
      if (err instanceof BiometricSessionExpiredError) {
        enabled.value = false;
        toast.warning(t('biometric.sessionExpired'));
        opts?.onExpired?.();
        return false;
      }
      toast.error(t('biometric.unlockFailed'));
      return false;
    } finally {
      busy.value = false;
    }
  }

  return {
    // state
    isSupported,
    isEnabled,
    isBusy,
    method: computed(() => method.value),
    methodLabel,
    vaultEmail: computed(() => getVaultEmail()),
    hasVault: () => hasVault(),
    // lifecycle
    ensureChecked,
    shouldOfferSetup,
    dismissSetupOffer,
    enable,
    disable,
    unlock,
  };
}
