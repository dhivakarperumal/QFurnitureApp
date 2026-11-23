package com.qfurnitureapp

import android.location.Address
import android.location.Geocoder
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.IOException
import java.util.Locale

class AddressGeocoderModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = "AddressGeocoder"

  @ReactMethod
  fun openLocationPermissionSettings(promise: Promise) {
    val activity = reactApplicationContext.currentActivity
    if (activity == null) {
      promise.reject("E_NO_ACTIVITY", "No current Android activity.")
      return
    }

    try {
      val permissionIntent = Intent("android.intent.action.MANAGE_APP_PERMISSION").apply {
        putExtra("android.intent.extra.PACKAGE_NAME", activity.packageName)
        putExtra(
          "android.intent.extra.PERMISSION_NAME",
          android.Manifest.permission.ACCESS_FINE_LOCATION,
        )
      }
      if (
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
        permissionIntent.resolveActivity(activity.packageManager) != null
      ) {
        activity.startActivity(permissionIntent)
      } else {
        activity.startActivity(
          Intent(
            Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
            Uri.parse("package:${activity.packageName}"),
          ),
        )
      }
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_OPEN_SETTINGS", "Could not open location permission settings.", error)
    }
  }

  @ReactMethod
  fun reverseGeocode(latitude: Double, longitude: Double, promise: Promise) {
    if (!Geocoder.isPresent()) {
      promise.reject("E_GEOCODER_UNAVAILABLE", "Address lookup is unavailable.")
      return
    }

    val geocoder = Geocoder(reactApplicationContext, Locale.getDefault())
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      geocoder.getFromLocation(latitude, longitude, 1, object : Geocoder.GeocodeListener {
        override fun onGeocode(addresses: MutableList<Address>) {
          resolveAddress(addresses.firstOrNull(), promise)
        }

        override fun onError(errorMessage: String?) {
          promise.reject(
            "E_REVERSE_GEOCODE",
            errorMessage ?: "Could not look up this location.",
          )
        }
      })
      return
    }

    try {
      @Suppress("DEPRECATION")
      val addresses = geocoder.getFromLocation(latitude, longitude, 1)
      resolveAddress(addresses?.firstOrNull(), promise)
    } catch (error: IOException) {
      promise.reject("E_REVERSE_GEOCODE", "Could not look up this location.", error)
    } catch (error: IllegalArgumentException) {
      promise.reject("E_REVERSE_GEOCODE", "Could not look up this location.", error)
    }
  }

  private fun resolveAddress(address: Address?, promise: Promise) {
    if (address == null) {
      promise.reject("E_NO_ADDRESS", "No address details were found.")
      return
    }

    val streetParts = listOfNotNull(
      address.subThoroughfare?.takeIf(String::isNotBlank),
      address.thoroughfare?.takeIf(String::isNotBlank),
      address.subLocality?.takeIf(String::isNotBlank),
    )
    val street = streetParts.joinToString(", ").ifBlank {
      address.getAddressLine(0)?.takeIf(String::isNotBlank) ?: ""
    }
    val result = Arguments.createMap().apply {
      putString("street_address", street)
      putString("city", address.locality.orEmpty())
      putString("district", address.subAdminArea.orEmpty())
      putString("state", address.adminArea.orEmpty())
      putString("country", address.countryName.orEmpty())
      putString("zip_code", address.postalCode.orEmpty())
    }
    promise.resolve(result)
  }
}
