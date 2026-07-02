package com.yourname.dumblauncher.dashboard

import android.app.Notification
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.provider.Settings
import android.view.KeyEvent
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class LauncherDashboardModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext)

  override fun definition() = ModuleDefinition {
    Name("LauncherDashboard")

    Function("isNotificationAccessGranted") {
      isAccessGranted()
    }

    Function("openNotificationAccessSettings") {
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    Function("getMediaInfo") {
      getMediaInfo()
    }

    Function("sendMediaCommand") { action: String ->
      sendMediaCommand(action)
    }

    Function("getLatestEmail") {
      getLatestEmail()
    }
  }

  private fun isAccessGranted(): Boolean {
    val enabled = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners") ?: return false
    return enabled.split(":").any { entry ->
      ComponentName.unflattenFromString(entry)?.packageName == context.packageName
    }
  }

  private fun activeControllers(): List<MediaController> {
    if (!isAccessGranted()) return emptyList()
    return try {
      val manager = context.getSystemService(Context.MEDIA_SESSION_SERVICE) as MediaSessionManager
      val component = ComponentName(context, DashboardNotificationListener::class.java)
      manager.getActiveSessions(component)
    } catch (e: SecurityException) {
      emptyList()
    }
  }

  private fun pickController(): MediaController? {
    val controllers = activeControllers()
    return controllers.firstOrNull { it.playbackState?.state == PlaybackState.STATE_PLAYING }
      ?: controllers.firstOrNull()
  }

  private fun appLabel(packageName: String): String {
    return try {
      val pm = context.packageManager
      pm.getApplicationLabel(pm.getApplicationInfo(packageName, 0)).toString()
    } catch (e: Exception) {
      packageName
    }
  }

  private fun getMediaInfo(): Map<String, Any?>? {
    val controller = pickController() ?: return null
    val metadata = controller.metadata
    val title = metadata?.getString(MediaMetadata.METADATA_KEY_TITLE)
    val artist = metadata?.getString(MediaMetadata.METADATA_KEY_ARTIST)
      ?: metadata?.getString(MediaMetadata.METADATA_KEY_ALBUM_ARTIST)
    val isPlaying = controller.playbackState?.state == PlaybackState.STATE_PLAYING

    return mapOf(
      "isPlaying" to isPlaying,
      "track" to (title ?: ""),
      "artist" to (artist ?: ""),
      "packageName" to controller.packageName,
      "appName" to appLabel(controller.packageName)
    )
  }

  private fun sendMediaCommand(action: String) {
    val controller = pickController()
    if (controller != null) {
      val controls = controller.transportControls
      when (action) {
        "play" -> controls.play()
        "pause" -> controls.pause()
        "playPause" -> {
          if (controller.playbackState?.state == PlaybackState.STATE_PLAYING) controls.pause() else controls.play()
        }
        "next" -> controls.skipToNext()
        "previous" -> controls.skipToPrevious()
      }
      return
    }

    val keyCode = when (action) {
      "play" -> KeyEvent.KEYCODE_MEDIA_PLAY
      "pause" -> KeyEvent.KEYCODE_MEDIA_PAUSE
      "playPause" -> KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE
      "next" -> KeyEvent.KEYCODE_MEDIA_NEXT
      "previous" -> KeyEvent.KEYCODE_MEDIA_PREVIOUS
      else -> return
    }

    val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    audioManager.dispatchMediaKeyEvent(KeyEvent(KeyEvent.ACTION_DOWN, keyCode))
    audioManager.dispatchMediaKeyEvent(KeyEvent(KeyEvent.ACTION_UP, keyCode))
  }

  private val emailPackages = setOf(
    "com.google.android.gm",
    "com.google.android.gm.lite",
    "com.microsoft.office.outlook",
    "com.yahoo.mobile.client.android.mail",
    "com.samsung.android.email.provider",
    "ch.protonmail.android",
    "me.proton.android.mail",
    "com.fsck.k9",
    "ru.mail.mailapp",
    "com.my.mail",
    "org.kman.AquaMail",
    "com.readdle.spark",
    "eu.faircode.email"
  )

  private fun isEmailPackage(packageName: String): Boolean {
    if (packageName == context.packageName) return false
    if (emailPackages.contains(packageName)) return true
    val lower = packageName.lowercase()
    return lower.contains("mail") || lower.contains("email")
  }

  private fun getLatestEmail(): Map<String, Any?>? {
    val listener = DashboardNotificationListener.instance ?: return null
    val notifications = try {
      listener.activeNotifications
    } catch (e: Exception) {
      return null
    } ?: return null

    val emailNotifications = notifications.filter { sbn ->
      isEmailPackage(sbn.packageName) &&
        (sbn.notification.flags and Notification.FLAG_GROUP_SUMMARY) == 0
    }

    if (emailNotifications.isEmpty()) return null

    // Group by package so we can report per-app and aggregate
    val byPackage = emailNotifications.groupBy { it.packageName }
    val totalUnread = emailNotifications.size

    // Build per-app summaries
    val apps = byPackage.map { (pkg, notifs) ->
      val latest = notifs.maxByOrNull { it.postTime } ?: return@map null
      val extras = latest.notification.extras
      val sender = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
      val subject = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
        ?: extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
        ?: ""
      mapOf(
        "packageName" to pkg,
        "appName" to appLabel(pkg),
        "sender" to sender,
        "subject" to subject,
        "count" to notifs.size,
        "postTime" to latest.postTime
      )
    }.filterNotNull().sortedByDescending { it["postTime"] as Long }

    // Overall latest (for backward compat fields)
    val overallLatest = emailNotifications.maxByOrNull { it.postTime } ?: return null
    val latestExtras = overallLatest.notification.extras
    val latestSender = latestExtras.getCharSequence(Notification.EXTRA_TITLE)?.toString() ?: ""
    val latestSubject = latestExtras.getCharSequence(Notification.EXTRA_TEXT)?.toString()
      ?: latestExtras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()
      ?: ""

    return mapOf(
      "sender" to latestSender,
      "subject" to latestSubject,
      "count" to totalUnread,
      "packageName" to overallLatest.packageName,
      "appName" to appLabel(overallLatest.packageName),
      "postTime" to overallLatest.postTime,
      "apps" to apps
    )
  }
}
