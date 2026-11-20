package com.qfurnitureapp

import android.graphics.Color
import android.os.Build
import android.view.View
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class NavigationBarManagerModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  private var previousNavigationBarColor: Int? = null
  private var previousSystemUiVisibility: Int? = null
  private var previousContrastEnforced: Boolean? = null

  override fun getName(): String = "NavigationBarManager"

  @ReactMethod
  fun setUserNavigationBarAppearance(enabled: Boolean, promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("E_NO_ACTIVITY", "No current Android activity.")
      return
    }

    activity.runOnUiThread {
      val window = activity.window
      if (enabled) {
        if (previousNavigationBarColor == null) {
          previousNavigationBarColor = window.navigationBarColor
          previousSystemUiVisibility = window.decorView.systemUiVisibility
          if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            previousContrastEnforced = window.isNavigationBarContrastEnforced
          }
        }

        window.navigationBarColor = Color.WHITE
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          window.decorView.systemUiVisibility =
            window.decorView.systemUiVisibility or View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          window.isNavigationBarContrastEnforced = false
        }
      } else {
        previousNavigationBarColor?.let { window.navigationBarColor = it }
        previousSystemUiVisibility?.let {
          window.decorView.systemUiVisibility = it
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          previousContrastEnforced?.let {
            window.isNavigationBarContrastEnforced = it
          }
        }

        previousNavigationBarColor = null
        previousSystemUiVisibility = null
        previousContrastEnforced = null
      }

      promise.resolve(null)
    }
  }
}
