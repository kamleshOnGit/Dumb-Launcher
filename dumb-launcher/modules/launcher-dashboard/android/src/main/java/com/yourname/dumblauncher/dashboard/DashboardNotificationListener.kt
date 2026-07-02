package com.yourname.dumblauncher.dashboard

import android.service.notification.NotificationListenerService

class DashboardNotificationListener : NotificationListenerService() {
  companion object {
    @Volatile
    var instance: DashboardNotificationListener? = null
      private set
  }

  override fun onListenerConnected() {
    super.onListenerConnected()
    instance = this
  }

  override fun onListenerDisconnected() {
    instance = null
    super.onListenerDisconnected()
  }

  override fun onDestroy() {
    instance = null
    super.onDestroy()
  }
}
