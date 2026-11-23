package com.qfurnitureapp

import android.location.Address
import android.location.Geocoder
import android.os.Build
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
