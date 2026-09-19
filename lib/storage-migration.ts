/**
 * One-time migration for localStorage/sessionStorage keys
 * Migrates hurmo_* and hurmo-* keys to talvera_* and talvera-*
 * TODO: Remove this migration after migration period (e.g., 30 days)
 */

const MIGRATIONS: Record<string, string> = {
  // hurmo_* → talvera_*
  'hurmo_sync_timestamps': 'talvera_sync_timestamps',
  'hurmo_anomaly_threshold': 'talvera_anomaly_threshold',
  'hurmo_threshold_history': 'talvera_threshold_history',
  'hurmo_auto_refresh_interval': 'talvera_auto_refresh_interval',
  'hurmo_quality_warn': 'talvera_quality_warn',
  'hurmo_quality_crit': 'talvera_quality_crit',
  'hurmo_show_anomaly_banner': 'talvera_show_anomaly_banner',
  'hurmo_tg_webhook': 'talvera_tg_webhook',
  'hurmo_tg_chat_id': 'talvera_tg_chat_id',
  'hurmo_csv_delimiter': 'talvera_csv_delimiter',
  'hurmo_csv_bom': 'talvera_csv_bom',
  'hurmo_export_format': 'talvera_export_format',
  'hurmo_data_retention_days': 'talvera_data_retention_days',
  'hurmo_enable_auto_cleanup': 'talvera_enable_auto_cleanup',
  'hurmo_enable_audit_log': 'talvera_enable_audit_log',
  'hurmo_api_rate_limit_enabled': 'talvera_api_rate_limit_enabled',
  'hurmo_api_rate_limit_per_minute': 'talvera_api_rate_limit_per_minute',
  'hurmo_enable_performance_monitoring': 'talvera_enable_performance_monitoring',
  'hurmo_sidebar-width': 'talvera_sidebar-width',
  'hurmo-sidebar-collapsed': 'talvera-sidebar-collapsed',
  'hurmo_table-settings-': 'talvera-table-settings-',
  'hurmo-saved-filters-': 'talvera-saved-filters-',
  'hurmo-datatable-cache-': 'talvera-datatable-cache-',
  'hurmo-dashboard-cache-v1': 'talvera-dashboard-cache-v1',
  'hurmo-dashboard-cache-v2': 'talvera-dashboard-cache-v2',
  'hurmo-overview-analytics-v1': 'talvera-overview-analytics-v1',
  'hurmo_anomaly_notifications': 'talvera_anomaly_notifications',
  // hurmo-* → talvera-
  'hurmo-audit-log': 'talvera-audit-log',
};

export function migrateStorage() {
  if (typeof window === 'undefined') return;

  // Migrate localStorage
  Object.entries(MIGRATIONS).forEach(([oldKey, newKey]) => {
    const oldValue = localStorage.getItem(oldKey);
    if (oldValue !== null && localStorage.getItem(newKey) === null) {
      localStorage.setItem(newKey, oldValue);
      localStorage.removeItem(oldKey);
    }
  });

  // Handle pattern-based keys (e.g., hurmo-table-settings-main)
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith('hurmo-table-settings-')) {
      const newKey = key.replace('hurmo-table-settings-', 'talvera-table-settings-');
      if (localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, localStorage.getItem(key)!);
        localStorage.removeItem(key);
      }
    }
    if (key.startsWith('hurmo-saved-filters-')) {
      const newKey = key.replace('hurmo-saved-filters-', 'talvera-saved-filters-');
      if (localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, localStorage.getItem(key)!);
        localStorage.removeItem(key);
      }
    }
    if (key.startsWith('hurmo-datatable-cache-')) {
      const newKey = key.replace('hurmo-datatable-cache-', 'talvera-datatable-cache-');
      if (localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, localStorage.getItem(key)!);
        localStorage.removeItem(key);
      }
    }
  });

  // Migrate sessionStorage similarly
  Object.keys(sessionStorage).forEach(key => {
    if (key.startsWith('hurmo-')) {
      const newKey = key.replace('hurmo-', 'talvera-');
      if (sessionStorage.getItem(newKey) === null) {
        sessionStorage.setItem(newKey, sessionStorage.getItem(key)!);
        sessionStorage.removeItem(key);
      }
    }
  });
}

// Run migration once on app load
if (typeof window !== 'undefined') {
  migrateStorage();
}
