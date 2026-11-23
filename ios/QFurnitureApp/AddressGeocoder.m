#import <CoreLocation/CoreLocation.h>
#import <React/RCTBridgeModule.h>

@interface AddressGeocoder : NSObject <RCTBridgeModule>
@end

@implementation AddressGeocoder

RCT_EXPORT_MODULE()

RCT_REMAP_METHOD(
  reverseGeocode,
  latitude:(double)latitude
  longitude:(double)longitude
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
) {
  CLLocation *location = [[CLLocation alloc] initWithLatitude:latitude longitude:longitude];
  CLGeocoder *geocoder = [[CLGeocoder alloc] init];
  [geocoder reverseGeocodeLocation:location
                completionHandler:^(NSArray<CLPlacemark *> *placemarks, NSError *error) {
    if (error) {
      reject(@"E_REVERSE_GEOCODE", error.localizedDescription, error);
      return;
    }

    CLPlacemark *place = placemarks.firstObject;
    if (!place) {
      reject(@"E_NO_ADDRESS", @"No address details were found.", nil);
      return;
    }

    NSMutableArray<NSString *> *streetParts = [NSMutableArray array];
    if (place.subThoroughfare.length) [streetParts addObject:place.subThoroughfare];
    if (place.thoroughfare.length) [streetParts addObject:place.thoroughfare];
    if (place.subLocality.length) [streetParts addObject:place.subLocality];

    resolve(@{
      @"street_address": [streetParts componentsJoinedByString:@", "],
      @"city": place.locality ?: @"",
      @"district": place.subAdministrativeArea ?: @"",
      @"state": place.administrativeArea ?: @"",
      @"country": place.country ?: @"",
      @"zip_code": place.postalCode ?: @"",
    });
  }];
}

@end
